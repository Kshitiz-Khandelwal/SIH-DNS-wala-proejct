// Standalone miekg/dns resolver implementing UDP, DoH (RFC 8484) and DoT.
package main

import (
 "bytes"; "context"; "crypto/tls"; "encoding/base64"; "encoding/json"; "io"; "log"; "net"; "net/http"; "os"; "strings"; "time"
 "github.com/miekg/dns"
)
type Decision struct { Verdict string `json:"verdict"`; Sinkhole *struct { IP string `json:"sinkhole_ip"` } `json:"sinkhole"` }
func gateway(domain, client string) Decision { b,_:=json.Marshal(map[string]string{"domain":domain,"client_ip":client,"source":"resolver"}); c:=&http.Client{Timeout:90*time.Millisecond}; r,e:=c.Post(os.Getenv("GATEWAY_URL")+"/v1/query","application/json",bytes.NewReader(b)); if e!=nil{return Decision{Verdict:"ALLOW"}}; defer r.Body.Close(); var d Decision; json.NewDecoder(r.Body).Decode(&d); return d }
func resolve(req *dns.Msg, remote net.Addr) *dns.Msg { out:=new(dns.Msg); out.SetReply(req); if len(req.Question)==0{return out}; q:=req.Question[0]; domain:=strings.TrimSuffix(q.Name,"."); client:="unknown"; if h,_,e:=net.SplitHostPort(remote.String());e==nil{client=h}; d:=gateway(domain,client)
 if d.Verdict=="BLOCK" { if d.Sinkhole!=nil && q.Qtype==dns.TypeA { out.Answer=[]dns.RR{&dns.A{Hdr:dns.RR_Header{Name:q.Name,Rrtype:dns.TypeA,Class:dns.ClassINET,Ttl:60},A:net.ParseIP(d.Sinkhole.IP)}} } else { out.Rcode=dns.RcodeNameError }; return out }
 c:=new(dns.Client); c.Timeout=2*time.Second; upstream:=os.Getenv("UPSTREAM_DNS"); if upstream==""{upstream="1.1.1.1:53"}; reply,_,e:=c.Exchange(req,upstream); if e!=nil { out.Rcode=dns.RcodeServerFailure; return out }; return reply }
func udp(w dns.ResponseWriter, r *dns.Msg){ _=w.WriteMsg(resolve(r,w.RemoteAddr())) }
func doh(w http.ResponseWriter,r *http.Request){ var wire []byte; var e error; if r.Method==http.MethodGet{wire,e=base64.RawURLEncoding.DecodeString(r.URL.Query().Get("dns"))}else{wire,e=io.ReadAll(io.LimitReader(r.Body,65535))}; if e!=nil{http.Error(w,"invalid DNS message",400);return}; m:=new(dns.Msg);if e=m.Unpack(wire);e!=nil{http.Error(w,"invalid DNS wire",400);return}; out:=resolve(m,&net.TCPAddr{IP:net.ParseIP(strings.Split(r.RemoteAddr,":")[0])}); b,_:=out.Pack();w.Header().Set("Content-Type","application/dns-message");w.Write(b) }
func main(){ dns.HandleFunc(".",udp); go func(){log.Fatal((&dns.Server{Addr:":53",Net:"udp"}).ListenAndServe())}(); cert,key:=os.Getenv("RESOLVER_TLS_CERT"),os.Getenv("RESOLVER_TLS_KEY"); if cert!=""&&key!="" { pair,e:=tls.LoadX509KeyPair(cert,key);if e==nil{go func(){s:=&dns.Server{Addr:":853",Net:"tcp-tls",TLSConfig:&tls.Config{Certificates:[]tls.Certificate{pair}},Handler:dns.DefaultServeMux};log.Fatal(s.ListenAndServe())}(); http.HandleFunc("/dns-query",doh);log.Fatal(http.ListenAndServeTLS(":443",cert,key,nil))} }; select{} }
