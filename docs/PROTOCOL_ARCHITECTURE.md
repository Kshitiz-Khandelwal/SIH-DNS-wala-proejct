# DNS Shield — Protocol Architecture & Transport

> **Status**: Architecture is `[IMPLEMENTED ✅]`. DNS-over-UDP/TCP is `[IMPLEMENTED ✅]`. DoH/DoT termination and DoQ are `[PLANNED 🗺️]`.

DNS Shield acts as an **inline recursive resolver proxy**. It does not passively sniff traffic on a SPAN port. It receives raw client queries, processes them synchronously, and proxies them to an upstream resolver if permitted.

## 1. Supported Transport Protocols

DNS Shield must bind to the standard DNS ports to transparently intercept traffic or act as the configured local DNS server for endpoints.

| Protocol | Transport | Port | Status | Use Case |
|---|---|---|---|---|
| **Standard DNS** | UDP / TCP | 53 | `[IMPLEMENTED ✅]` | Legacy devices, IoT, default OS resolvers |
| **DNS-over-TLS (DoT)** | TCP + TLS | 853 | `[PLANNED 🗺️]` | Android devices (Private DNS), secure corporate roaming |
| **DNS-over-HTTPS (DoH)** | TCP 443 + HTTP/2 | 443 | `[PLANNED 🗺️]` | Browsers, modern OS resolvers (RFC 8484) |
| **DNS-over-QUIC (DoQ)** | UDP 853 + QUIC | 853 | `[PLANNED 🗺️]` | Next-gen low latency secure transport (RFC 9250) |

---

## 2. TLS Termination & Certificate Management

To inspect DoT and DoH traffic, DNS Shield must decrypt the traffic before it reaches the API Gateway.

### Architecture
TLS termination happens at the **edge of the Protocol Gateway** (usually an Nginx proxy or directly within the Go resolver core). The unencrypted DNS payload is then sent to the internal API Gateway orchestrator.

### Certificate Strategy
Because DNS Shield acts as the DNS server for endpoints, it must present a valid TLS certificate for its IP/Hostname.

- **Enterprise Deployment**: The enterprise PKI issues a certificate for the DNS Shield appliance (e.g., `dns.corp.example.com`). Endpoints are configured via MDM or DHCP to use this hostname for DoH/DoT.
- **Lab / Eval Deployment**: A self-signed certificate is generated. Client devices must have the Root CA manually installed to avoid certificate errors when testing DoT/DoH.

---

## 3. Preventing Bypass

Users or malware often attempt to bypass enterprise DNS controls by querying external resolvers (like 8.8.8.8) directly over DoH or DoT.

DNS Shield enforces compliance using **Perimeter Firewall Rules**:

1. **Drop Outbound Port 53**: Drops all legacy DNS traffic trying to leave the network, *except* traffic originating from the DNS Shield appliance itself.
2. **Drop Outbound Port 853**: Drops all DoT traffic trying to leave the network.
3. **DoH IP Blacklist**: Drops TCP 443 traffic destined for known public DoH providers (e.g., Cloudflare, Google, Quad9). Since DoH blends with standard HTTPS traffic, IP blacklisting or DPI (Deep Packet Inspection) is required.

---

## 4. DNS-over-QUIC (DoQ) Roadmap

DNS-over-QUIC (RFC 9250) is the next evolution of secure DNS transport. It uses QUIC over UDP port 853.

### Why DoQ is strategically important for DNS Shield
- **Latency reduction**: QUIC removes the TCP head-of-line blocking problem. This gives the DNS Shield ML pipeline a larger time budget (e.g., saving 20ms on transport means 20ms more allowed for ML inference).
- **Connection migration**: Mobile endpoints moving between WiFi and Cellular maintain their secure DNS session without renegotiating TLS.

### Implementation Plan
- Integrate a QUIC listener into the Go resolver core using a library such as `quic-go`.
- Terminate QUIC, extract the DNS wire format payload, and forward to the API Gateway identical to DoH/DoT.
