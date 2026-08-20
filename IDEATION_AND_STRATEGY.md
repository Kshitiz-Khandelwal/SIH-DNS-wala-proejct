# 🚀 Project Ideation & Strategic Blueprint

**Project Name:** AI-Powered Secure DNS Filtering Service  
**Problem Statement ID:** SIH260003  
**Organization:** Indian Space Research Organisation (ISRO)  
**Category:** Software | Space Technology

---

## 📌 Overview

A DNS filtering service is not just a URL blocker. It is the first and most critical line of defense in any secure network. Every device — phones, laptops, IoT sensors, servers — must resolve a domain name before it can talk to the internet. **This makes the DNS layer the single best checkpoint to intercept threats before any damage is done.**

This document outlines our strategy, architecture, layers of defense, and unique innovations to build a production-grade, AI-powered DNS Filtering and Threat Intelligence platform.

---

## 🏆 1. The Winning Strategy

Most competing teams will write a Python script that checks a domain against a static list. To win, our approach must mimic a high-end cybersecurity startup product. Judges at ISRO will evaluate based on three pillars:

| Pillar | What it Means |
|---|---|
| **Visual Proof** | Build a stunning, real-time SOC dashboard. Judges evaluate what they can *see*. |
| **Performance Engineering** | The problem mandates **<100ms** lookup time. Proving you architected for this matters. |
| **Industry Alignment** | Use real-world standards (STIX/TAXII, MISP) not custom hacked-together databases. |
| **Working Demo** | Judges specifically downgrade teams with no prototype. A live demo or QR code to a hosted version is non-negotiable. |

---

## ❌ 2. Why Existing Tools Are Not Enough (The Gap We Fill)

Understanding why current tools fail is critical — this is what judges will ask first.

| Existing Tool | What it does | Why it's not enough |
|---|---|---|
| **Pi-hole / AdGuard** | DNS-level blacklist blocker | Static lists only. No ML, no behavioral analysis, no DGA detection. Blind to zero-day threats. |
| **Browser Adblockers** | Block URLs in a browser | Only covers the browser. Malware running in the OS background bypasses it entirely. |
| **Basic Firewall** | IP/port blocking | DNS traffic (port 53) is almost always whitelisted. DNS tunnelling exploits this completely. |
| **Cloudflare 1.1.1.1 / Google DNS** | Fast public resolvers | No custom threat intel, no enterprise-level logging, no ML, no active response. |
| **Commercial NGFW** | Enterprise firewalls | Very expensive, black-box, no STIX/TAXII integration, no explainability, not India-specific. |

**Our system addresses every gap listed above.** It is open, explainable, India-specific (STIX 2.1 format compatible with CERT-In advisory structure `[LAB SIMULATED 🔬]`), and actively responds to threats rather than only logging them.

---

---

## 🧠 2. The Core Filtering Pipeline

Every single DNS request flows through a layered pipeline. The order is important — cheapest checks run first, expensive checks only run when needed.

```
Incoming DNS Request
        │
        ▼
┌───────────────────┐
│   1. DNS Cache    │  ← Redis. Known safe domain? Resolve instantly in <5ms.
└────────┬──────────┘
         │ MISS (unknown domain)
         ▼
┌───────────────────────────┐
│  2. Blacklist / Threat    │  ← STIX/TAXII Feeds (IBM X-Force, AlienVault OTX)
│     Intelligence Check    │     Known bad domain? BLOCK immediately.
└────────┬──────────────────┘
         │ NOT on any list
         ▼
┌─────────────────────────────────────┐
│  3. AI/ML Lexical Analysis Engine   │  ← Zero-day detection.
│     - DGA Detection (entropy/ngram) │    Is the domain machine-generated?
│     - Typosquatting Detection       │    Mimicking Google/ISRO/Bank?
│     - Domain Age & WHOIS check      │    Registered 2 hours ago? Suspicious.
└────────┬────────────────────────────┘
         │ Passes ML check
         ▼
┌──────────────────────────────────┐
│  4. Behavioral / Anomaly Layer   │  ← Real-time traffic analysis.
│     - DNS Tunnelling detection   │    Hiding stolen data in payload?
│     - Request Volume Anomaly     │    One device spamming 1000 requests?
│     - Device Risk Score Check    │    Has this IP been flagged before?
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│   5. Geo Intelligence Layer      │  ← Does domain resolve to a high-risk
│                                  │    country or ASN? Add to risk score.
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│   6. Risk Score Aggregator       │  ← Final decision engine.
│   Score  0-40  → ALLOW           │
│   Score 41-70  → FLAG SUSPICIOUS │
│   Score 71+    → BLOCK           │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│   7. Active Response Engine      │  ← Critical device risk?
│   - Sinkhole (Honeypot redirect) │    Auto-push firewall rule.
│   - Automatic Device Quarantine  │    Isolate device from network.
└──────────────────────────────────┘
```

---

## 🏗️ 3. Microservices Architecture (Tech Stack)

The system is split into independent, scalable services. Each can be deployed, scaled, and updated without affecting the others.

### A. Core DNS Resolver (The Engine)
- **Tech:** Go (Golang) or a custom **CoreDNS** plugin.
- **Why Go:** Python is too slow for real-time network I/O. Go handles 100,000+ concurrent DNS requests with minimal memory overhead.
- **Supports:** DNS over UDP, DNS over HTTPS (DoH), DNS over DTLS — all three protocols required by the problem statement.

### B. Cache Layer (The Speedster)
- **Tech:** Redis (in-memory key-value store).
- **Logic:** If a domain was recently resolved as safe, return instantly. No ML, no blacklist check needed. This handles ~95% of all real-world traffic in under 5ms and keeps us well under the 100ms requirement.

### C. Threat Intelligence Service (The Librarian)
- **Tech:** Python + MISP (Malware Information Sharing Platform).
- **Logic:** A background scheduler that continuously pulls STIX/TAXII feeds from:
  - IBM X-Force Exchange
  - AlienVault OTX (Open Threat Exchange)
  - Abuse.ch URLhaus
  - CERT-In feeds (India-specific threat intelligence)
- Parsed intel is written directly into Redis for instant access by the Core Resolver.

### D. AI/ML Inference Engine (The Brain)
- **Tech:** Python FastAPI + Scikit-Learn / XGBoost.
- **Why lightweight models:** Heavy deep learning (transformers) will blow the 100ms budget. XGBoost inference takes ~2ms. We use the right tool for the job.
- **Features fed into the model:**
  - Shannon Entropy of the domain string
  - Vowel-to-Consonant ratio
  - Domain length & token count
  - N-gram frequency (vs. known DGA corpus signatures)
  - Levenshtein distance to top-1000 Alexa domains (typosquatting)
  - Domain registration age (via WHOIS lookup)

### E. Behavioral Analytics Engine (The Detective)
- **Tech:** Python + time-series anomaly detection.
- **Logic:** Tracks per-device (IP address) DNS request patterns. Detects:
  - Unusual request volume spike from one device → malware C2 beaconing
  - Requests with abnormally long subdomains → DNS Tunnelling
  - Many unique TLDs queried in rapid succession → DGA scanning
- Each device gets its own **Device Risk Score** that persists across sessions.

### F. Geo Intelligence Layer
- **Tech:** MaxMind GeoIP2 database (offline lookup, no API cost).
- **Logic:** Resolve the target IP of the queried domain. If the IP belongs to a high-risk ASN or a flagged country, automatically increment the domain's risk score. Does not block alone — contributes to the aggregate score.

### G. Active Response Engine
- **Tech:** Python + iptables / nftables API calls.
- **Honeypot Sinkholing:** Instead of returning `0.0.0.0` for blocked C2 domains, redirect malware to an isolated honeypot server. The malware connects believing it reached the hacker. We log exactly what it does.
- **Device Quarantine:** When a device's cumulative risk score crosses the critical threshold, the engine auto-pushes a firewall rule to isolate that device from the rest of the network. Zero human intervention required.

### H. Analytics & Passive Analysis (The Historian)
- **Tech:** ClickHouse or ELK Stack (Elasticsearch + Logstash + Kibana).
- **Logic:** Every DNS event (allowed, blocked, flagged) is stored. PCAP files and Zeek TSV logs can be uploaded and parsed offline to detect historical breaches — answering questions like *"Were we compromised last month?"*

---

## ⭐ 4. The X-Factors (What Makes Us Win)

These are features competing teams won't have.

### I. Explainable AI (XAI)
- **The Problem:** Judges see "Blocked by AI" and assume you just called a pre-built API.
- **Our Approach:** Every ML decision comes with a human-readable explanation panel.
  > *"Blocked `xkqz193jd.com` | ML Confidence: 94% | Reason: High Shannon Entropy (8.2 bits), abnormal vowel-to-consonant ratio, N-gram signature matches Conficker botnet DGA corpus."*
- This proves to ISRO judges that we deeply understand what the model is computing.

### II. Dual Risk Scoring (Domain + Device)
- **Standard approach:** Only tracks if a domain is bad.
- **Our approach:** Two independent risk scores — one for the **domain** and one for the **requesting device (IP)**. A moderately suspicious domain from a high-risk device is treated as a critical threat. A known-safe domain requested by an already-quarantined device is still flagged.

### III. Honeypot Sinkholing (Active Deception)
- **Standard approach:** Block the request, return NXDOMAIN or `0.0.0.0`.
- **Our approach:** Resolve malicious C2 requests to a controlled honeypot. The attacker believes the connection succeeded. We observe the attack in a sandboxed environment, log the attack vectors, and automatically generate new threat signatures.

### IV. Automatic Device Quarantine (Zero-Touch Incident Response)
- **Standard approach:** An alert fires, a human reviews it hours later, manually blocks the device.
- **Our approach:** When a device crosses a risk threshold, the system automatically issues a network isolation command via API in milliseconds. This is what enterprise EDR (Endpoint Detection & Response) products sell for thousands of dollars.

### V. Live 3D Threat Map (The "Wow" Factor)
- **Standard approach:** A boring table of blocked domain names.
- **Our approach:** A dark-themed interactive 3D globe (Three.js or Mapbox GL). Every blocked request is visualized as a real-time arc from the network's location to the geographic origin of the malicious server. Gives a real SOC (Security Operations Center) feel.

### VI. SIEM-Ready REST API (Enterprise Integration)
- **Standard approach:** A standalone tool with no integration story.
- **Our approach:** The entire engine is accessible via documented REST API endpoints. Enterprise platforms like Splunk, Wazuh, or Microsoft Sentinel can query our system directly, making it a tool that fits real security stacks, not just a demo.

### VII. Parent Domain Poisoning Analysis
- **Standard approach:** Block only the exact queried domain.
- **Our approach:** If `malicious-subdomain.company.com` is flagged as an attack vector, the system analyzes the parent domain `company.com` to determine if it is being abused as a broader attack launchpad. Prevents partial coverage gaps.

---

## 📋 5. Active vs. Passive Analysis (Dual Mode)

The problem statement explicitly requires both. Here is how we handle them:

| Mode | Description | Input Format | Use Case |
|---|---|---|---|
| **Active (Live)** | Real-time DNS interception & filtering | Live network traffic | Stop attacks as they happen |
| **Passive (Offline)** | Historical log analysis & forensics | PCAP, Zeek TSV files | Investigate past breaches |

---

## 📅 6. Implementation Phases

### Phase 1: Foundation
- [ ] Set up CoreDNS server with basic plugin structure.
- [ ] Implement Redis caching layer.
- [ ] Ingest first static blacklist (Abuse.ch).

### Phase 2: Intelligence & AI
- [ ] Build STIX/TAXII ingestion service via MISP.
- [ ] Train XGBoost model on DGA datasets (open-source academic corpora).
- [ ] Deploy ML model as a FastAPI microservice with <20ms SLA.
- [ ] Build full Lexical Analysis feature pipeline.

### Phase 3: Behavioral & Geo Layers
- [ ] Implement per-device risk scoring with session persistence.
- [ ] Add DNS Tunnelling detection via payload structure analysis.
- [ ] Integrate MaxMind GeoIP2 for geo-intelligence.

### Phase 4: Response & Automation
- [ ] Build Honeypot Sinkholing module.
- [ ] Implement automatic device quarantine via iptables/nftables API.

### Phase 5: Dashboard & Presentation
- [ ] Build the real-time SOC web dashboard.
- [ ] Implement the live 3D Threat Map.
- [ ] Add Explainable AI reasoning display panels.
- [ ] Build PCAP/Zeek file upload interface for passive analysis.

### Phase 6: Polish & Performance
- [ ] Enable DoH and DoT protocol support.
- [ ] Load test to verify <100ms average query time at scale.
- [ ] Document REST API endpoints via Swagger/OpenAPI spec.

---

## 🔑 7. Key Technical Vocabulary (For Judges & Team)

| Term | What it is |
|---|---|
| STIX/TAXII | Standard format and protocol for sharing threat intelligence between organizations |
| DGA | Domain Generation Algorithm — malware technique to auto-generate thousands of random domains |
| Shannon Entropy | Mathematical measure of randomness; high entropy = likely machine-generated |
| Levenshtein Distance | Edit-distance algorithm measuring string similarity; used for typosquatting detection |
| Sinkholing | Redirecting malicious connections to a controlled server instead of the real attacker |
| MISP | Open-source Malware Information Sharing Platform |
| PCAP | Packet Capture — raw recorded network traffic file format |
| Zeek TSV | Structured log format from the Zeek network analysis framework |
| CoreDNS | Open-source DNS server written in Go, used in Kubernetes |
| DoH | DNS over HTTPS — encrypted DNS to prevent eavesdropping and interception |
| ASN | Autonomous System Number — identifies an IP block managed by a single organization |
| EDR | Endpoint Detection and Response — class of enterprise security software |
| SIEM | Security Information and Event Management — enterprise-grade log & alert aggregation |
| XAI | Explainable AI — ML techniques that provide human-readable reasons for model decisions |
| SOC | Security Operations Center — a centralized team and platform for monitoring threats |

---

## 🎯 8. Presentation PPT Structure (Slide-by-Slide Plan)

Based on what SIH judges actually evaluate, here is the exact slide structure we should follow. **Keep slides visual and minimal — no paragraph text on slides.**

| Slide # | Title | What Goes On It |
|---|---|---|
| **1** | Title Slide | Problem ID (SIH260003), Team Name, College, ISRO logo, short one-liner |
| **2** | The Problem & Gap | Stats on DNS-based attacks in India, why existing tools fail (use the table from Section 2) |
| **3** | Our Solution (Overview) | One-line pitch + the 7-layer pipeline diagram (the ASCII art converted to a clean visual) |
| **4** | Technical Architecture | Full microservices diagram — CoreDNS → Redis → Threat Intel → ML Engine → Dashboard |
| **5** | AI/ML Deep Dive | How DGA detection works, what features we feed the model, show example output with XAI explanation |
| **6** | The X-Factors | Honeypot Sinkholing, Dual Risk Scoring, Auto Quarantine, 3D Threat Map — visuals only |
| **7** | Tech Stack | Table: Component → Technology → Why We Chose It (not just a logo dump) |
| **8** | Feasibility & Phases | 6-phase execution plan, timeline bar chart, risk mitigation points |
| **9** | Impact & Scalability | Who benefits (ISRO, CERT-In, Banks, Defence), how it scales, open-source + India-specific angle |
| **10** | Live Demo | QR code linking to the working hosted demo. Screenshot/GIF of the SOC dashboard. |

> **Design Tips:**
> - Use a dark theme (black/deep navy + cyan/red accents) — matches the SOC/security aesthetic
> - Every technical slide needs at least one diagram or flowchart — no walls of text
> - Tools: Figma, Canva, or Eraser.io for clean architecture diagrams
> - Font: Use Inter or Roboto — clean and modern

---

## 🖥️ 9. Demo Strategy (Non-Negotiable for Winning)

Judges at SIH 2024 specifically penalized teams with no working demo. Here is our plan:

### What the Demo Should Show
1. **Live Query Resolution:** Type a domain → show it passing through each layer in real time on the dashboard.
2. **Blocked Domain Demo:** Query a known malicious domain → show the pipeline triggering, the XAI explanation appearing, and the block being logged.
3. **DGA Detection Demo:** Query a machine-generated domain → show ML confidence score and feature breakdown.
4. **Passive Analysis Demo:** Upload a sample PCAP file → show historical threats being identified in the log.
5. **3D Threat Map:** Show real-time arcs firing on the globe as blocked queries roll in.

### Hosting Plan
- Deploy the dashboard on a free-tier **Render** or **Railway** instance before the hackathon.
- The Core DNS resolver can run on a local machine or a **DigitalOcean $6/month** droplet.
- Have a **QR code** printed on the last slide that opens the live dashboard directly.
- Have a **backup screen recording** (GIF/MP4) of the full demo in case internet fails at the venue.

