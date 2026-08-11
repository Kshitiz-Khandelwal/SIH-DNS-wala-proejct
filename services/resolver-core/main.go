// DNS Shield resolver: standalone Go DNS server using miekg/dns.
// It supports DNS-over-UDP, conventional DNS-over-TCP, DNS-over-HTTPS (RFC 8484),
// and DNS-over-TLS. Policy is delegated to the local API gateway; upstream lookup
// happens only after an ALLOW/FLAG decision or if the policy plane is unavailable.
package main

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/miekg/dns"
)

type config struct {
	GatewayURL string
	Upstream   string
	TLSCert    string
	TLSKey     string
}

type decision struct {
	Verdict string `json:"verdict"`
	Sinkhole *struct {
		IP string `json:"sinkhole_ip"`
	} `json:"sinkhole"`
}

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" { return value }
	return fallback
}

func remoteIP(address string) string {
	host, _, err := net.SplitHostPort(address)
	if err != nil { return address }
	return host
}

func requestDecision(cfg config, domain, clientIP string) (decision, error) {
	payload, _ := json.Marshal(map[string]string{"domain": domain, "client_ip": clientIP, "source": "resolver"})
	client := &http.Client{Timeout: 90 * time.Millisecond}
	response, err := client.Post(cfg.GatewayURL+"/v1/query", "application/json", bytes.NewReader(payload))
	if err != nil { return decision{}, err }
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode > 299 { return decision{}, &gatewayError{status: response.StatusCode} }
	var result decision
	err = json.NewDecoder(io.LimitReader(response.Body, 128*1024)).Decode(&result)
	return result, err
}

type gatewayError struct { status int }
func (e *gatewayError) Error() string { return "gateway returned non-success status" }

func upstreamLookup(request *dns.Msg, upstream string) *dns.Msg {
	client := &dns.Client{Net: "udp", Timeout: 2 * time.Second, UDPSize: 1232}
	response, _, err := client.Exchange(request, upstream)
	if err == nil { return response }
	// TCP fallback allows large/truncated upstream replies without changing policy.
	client.Net = "tcp"
	response, _, err = client.Exchange(request, upstream)
	if err == nil { return response }
	failure := new(dns.Msg); failure.SetReply(request); failure.Rcode = dns.RcodeServerFailure
	return failure
}

func policyResponse(request *dns.Msg, cfg config, clientIP string) *dns.Msg {
	response := new(dns.Msg)
	response.SetReply(request)
	response.RecursionAvailable = true
	if len(request.Question) != 1 { response.Rcode = dns.RcodeFormatError; return response }
	question := request.Question[0]
	domain := strings.TrimSuffix(strings.ToLower(question.Name), ".")
	if domain == "" { response.Rcode = dns.RcodeFormatError; return response }

	result, err := requestDecision(cfg, domain, clientIP)
	if err != nil {
		// Graceful degradation: DNS availability wins; gateway logs its own dependency state.
		log.Printf("policy gateway unavailable for %s from %s: %v; forwarding upstream", domain, clientIP, err)
		return upstreamLookup(request, cfg.Upstream)
	}
	if result.Verdict != "BLOCK" { return upstreamLookup(request, cfg.Upstream) }

	if result.Sinkhole != nil && net.ParseIP(result.Sinkhole.IP) != nil && question.Qtype == dns.TypeA {
		response.Answer = []dns.RR{&dns.A{Hdr: dns.RR_Header{Name: question.Name, Rrtype: dns.TypeA, Class: dns.ClassINET, Ttl: 60}, A: net.ParseIP(result.Sinkhole.IP)}}
		return response
	}
	// NXDOMAIN is intentional for blocks where the policy does not select a sinkhole.
	response.Rcode = dns.RcodeNameError
	return response
}

func makeDNSHandler(cfg config) dns.HandlerFunc {
	return func(writer dns.ResponseWriter, request *dns.Msg) {
		if err := writer.WriteMsg(policyResponse(request, cfg, remoteIP(writer.RemoteAddr().String()))); err != nil {
			log.Printf("write DNS response: %v", err)
		}
	}
}

func makeDoHHandler(cfg config) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet && request.Method != http.MethodPost { http.Error(writer, "method must be GET or POST", http.StatusMethodNotAllowed); return }
		var wire []byte
		var err error
		if request.Method == http.MethodGet {
			wire, err = base64.RawURLEncoding.DecodeString(request.URL.Query().Get("dns"))
		} else {
			if !strings.HasPrefix(request.Header.Get("Content-Type"), "application/dns-message") { http.Error(writer, "content type must be application/dns-message", http.StatusUnsupportedMediaType); return }
			wire, err = io.ReadAll(io.LimitReader(request.Body, 65535))
		}
		if err != nil { http.Error(writer, "invalid DNS wire message", http.StatusBadRequest); return }
		message := new(dns.Msg)
		if err = message.Unpack(wire); err != nil { http.Error(writer, "unable to decode DNS message", http.StatusBadRequest); return }
		response := policyResponse(message, cfg, remoteIP(request.RemoteAddr))
		packed, err := response.Pack()
		if err != nil { http.Error(writer, "unable to encode DNS response", http.StatusInternalServerError); return }
		writer.Header().Set("Content-Type", "application/dns-message")
		writer.Header().Set("Cache-Control", "no-store")
		_, _ = writer.Write(packed)
	}
}

func startDNSServer(address, network string, handler dns.Handler, tlsConfig *tls.Config) {
	server := &dns.Server{Addr: address, Net: network, Handler: handler, TLSConfig: tlsConfig, ReadTimeout: 3 * time.Second, WriteTimeout: 3 * time.Second}
	go func() { if err := server.ListenAndServe(); err != nil { log.Printf("%s DNS server stopped: %v", network, err) } }()
}

func main() {
	cfg := config{GatewayURL: env("GATEWAY_URL", "http://api-gateway:8080"), Upstream: env("UPSTREAM_DNS", "1.1.1.1:53"), TLSCert: os.Getenv("RESOLVER_TLS_CERT"), TLSKey: os.Getenv("RESOLVER_TLS_KEY")}
	mux := dns.NewServeMux(); mux.Handle(".", makeDNSHandler(cfg))
	startDNSServer(":53", "udp", mux, nil)
	startDNSServer(":53", "tcp", mux, nil)
	if cfg.TLSCert == "" || cfg.TLSKey == "" { log.Printf("UDP/TCP resolver started; DoH/DoT disabled until RESOLVER_TLS_CERT and RESOLVER_TLS_KEY are configured"); select {} }
	certificate, err := tls.LoadX509KeyPair(cfg.TLSCert, cfg.TLSKey)
	if err != nil { log.Fatalf("unable to load resolver TLS certificate: %v", err) }
	tlsConfig := &tls.Config{Certificates: []tls.Certificate{certificate}, MinVersion: tls.VersionTLS12}
	startDNSServer(":853", "tcp-tls", mux, tlsConfig)
	doh := &http.Server{Addr: ":443", Handler: http.HandlerFunc(makeDoHHandler(cfg)), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second, TLSConfig: tlsConfig}
	log.Printf("UDP/TCP/DoH/DoT resolver started; upstream=%s", cfg.Upstream)
	log.Fatal(doh.ListenAndServeTLS("", ""))
}
