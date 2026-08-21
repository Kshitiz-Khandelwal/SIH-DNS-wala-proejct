# 🛡️ DNS Shield — Master Layer-by-Layer & Model-by-Model Technical Guide

---

## 📌 Executive Summary
**DNS Shield** is an explainable, zero-day DNS threat mitigation architecture designed for Smart India Hackathon (SIH) 2026. It protects corporate, government, and sovereign critical infrastructure (`isro.gov.in`, `nic.in`) against modern cyber threats:
- **Malware DGAs** (Cryptolocker, LockBit 3.0, Mirai, Conficker, Suppobox)
- **Brand Typosquatting & Homoglyphs** (`rnicrosoft.com`, `g00gle-security.com`, `paypa1-update.com`)
- **DNS Tunnelling Data Exfiltration** (Iodine Base64, dnscat2, Hex byte streams)
- **Cobalt Strike / Lazarus C2 Beaconing** (`c2-beacon.dark-infra.cc`, `update.c2-pool.ru`)

---

## 🏗️ Section 1: The 7-Stage Cascade Architecture (Layer-by-Layer)

```
[Inbound DNS Query]
       │
       ▼
[Stage 1: Emergency Bloom Cache & Whitelist] ──(Match)──> ALLOW (0/100, < 0.5ms)
       │ (Miss)
       ▼
[Stage 2: Threat Intelligence Feed Correlator] ──(Hit)──> BLOCK (95-100/100, 1-2ms)
       │ (Clean)
       ▼
[Stage 3: ML Lexical & TreeSHAP Engine] ───────────> Calculate f(x) = φ₀ + ∑ φᵢ (2-5ms)
       │
       ▼
[Stage 4: Behavioral & Tunnelling Engine] ─────────> Sliding Window & PaaS Whitelist (3-8ms)
       │
       ▼
[Stage 5: Geo-Resolver & Anomaly Detection] ──────> Fast-Flux & ASN Risk Matrix (2-4ms)
       │
       ▼
[Stage 6: Safe Active Response & Containment] ────> Sinkhole 0.0.0.0 & Quarantine Queue
       │
       ▼
[Stage 7: Analytics & Append-Only Audit Stream] ──> JSONL Audit Log & Real-time Web Stream
```

---

### 🔹 Layer 1: Emergency Bloom Cache & Whitelist (< 0.5 ms)
- **Purpose**: Ultra-low latency instant bypass for verified high-reputation domains.
- **Engine**: Redis Murmur3 Bloom Filter + In-Memory LRU Cache.
- **Rules**:
  - Whitelists sovereign critical infrastructure (`isro.gov.in`, `nic.in`, `cert-in.org.in`, `drdo.gov.in`).
  - Whitelists enterprise cloud hosting platforms (`*.vercel.app`, `*.vercel.com`, `*.netlify.app`, `*.github.io`).
- **Verdict**: `ALLOW (Score: 0/100)`.

### 🔹 Layer 2: Threat Intelligence Feed Correlator (1–2 ms)
- **Purpose**: Real-time matching against active IOC indicator feeds.
- **Feeds**: STIX 2.1 JSON, Abuse.ch URLhaus, CERT-In advisories, RFC 8805 Response Policy Zones (RPZ).
- **Match Criteria**: Exact FQDN match or parent IP subnet match.
- **Verdict**: `BLOCK (Score: 95-100/100)` with threat actor tagging.

### 🔹 Layer 3: ML Lexical Feature & TreeSHAP Engine (2–5 ms)
- **Purpose**: Zero-day algorithmic threat detection without relying on static blacklists.
- **Classifier**: 150-Tree Random Forest trained on 1.35 Million FQDNs.
- **Explainability**: Exact Additive TreeSHAP decomposition: $f(x) = \phi_0 + \sum \phi_i$.
- **Features Extracted**: 38 lexical features (Shannon Entropy, Consonant Runs, Digit Ratio, Levenshtein Edit Distance, Unicode Homoglyphs).
- **Verdict**: `ALLOW`, `FLAG`, or `BLOCK`.

### 🔹 Layer 4: Stateful Behavioral & Tunnelling Correlation Engine (3–8 ms)
- **Purpose**: Multi-query correlation over sliding temporal windows ($60\text{ seconds}$).
- **Detection Heuristics**:
  - High-frequency query volume bursts ($> 50\text{ QPS}$).
  - Subdomain payload encoding (`Base64` padding `==`, `Hex` streams).
  - Rapid NXDOMAIN error ratios ($> 50\%$).
  - Gated Entropy: Requires payload markers or volume bursts before flagging single-query entropy to eliminate PaaS preview false positives.

### 🔹 Layer 5: Geo-Resolver & Anomaly Detection (2–4 ms)
- **Purpose**: Identifies geographic ASN hops, fast-flux IP shuffling, and dynamic DNS shifts.
- **Detection**: Rapid TTL decay ($< 60\text{s}$), ASN registrar risk matrix.

### 🔹 Layer 6: Safe Active Response & Quarantine Protocol
- **Purpose**: Automatic threat containment without network outages.
- **Actions**:
  - **Sinkhole Routing**: Resolves malicious domains to `0.0.0.0` or `127.0.0.1`.
  - **Human-in-the-Loop Approval Queue**: Quarantines suspicious client IPs (`172.28.0.101`) for SOC analyst review.
  - **Automatic Rollback TTL**: 15-minute auto-release timer to guarantee zero permanent outages.

### 🔹 Layer 7: Analytics & Append-Only Audit Stream
- **Purpose**: Compliance and SOC dashboard telemetry.
- **Output**: JSON-lines structured log (`data/audit.log`), QPS metrics ticker, real-time WebSocket/SSE feed.

---

## 🧮 Section 2: Mathematical Formulations & ML Feature Matrix

### 1. Shannon Entropy Formula
$$H(X) = -\sum_{i=1}^n p(x_i) \log_2 p(x_i)$$
- **Range**: $0.0 \dots 5.0\text{ bits}$
- **Interpretation**: Benign domains average $2.5 \dots 3.2\text{ bits}$. DGA/Tunnelling strings average $> 3.8\text{ bits}$.

### 2. Levenshtein Edit Distance
$$\text{lev}_{a,b}(i, j) = \begin{cases} \max(i, j) & \text{if } \min(i, j) = 0, \\ \min \begin{cases} \text{lev}_{a,b}(i-1, j) + 1 \\ \text{lev}_{a,b}(i, j-1) + 1 \\ \text{lev}_{a,b}(i-1, j-1) + 1_{(a_i \neq b_j)} \end{cases} & \text{otherwise.} \end{cases}$$
- Evaluated against brand dictionary (`microsoft`, `google`, `paypal`, `apple`, `amazon`, `chase`, `wellsfargo`, `slack`).
- Distance $= 1 \dots 2 \to$ Flags visual typosquatting (`rnicrosoft.com`, `g00gle.com`).

### 3. TreeSHAP Additive Decomposition
$$f(x) = \phi_0 + \sum_{i=1}^M \phi_i(x)$$
- $\phi_0 = 0.12$ (Base benign score).
- $\phi_i$: Feature impact ($\text{+Risk}$ or $\text{-Safe}$).
- Final Risk Score $= \min(100, \max(0, \text{round}(f(x) \times 100)))$.

---

## 🎮 Section 3: Interactive Attack Simulation CLI

Run the local terminal simulator:
```bash
python run_attack_simulation.py
```

### Attack Vector Scenarios:
1. **Benign Corporate / Sovereign Stream**: Tests `isro.gov.in`, `nic.in`, `google.com`.
2. **Cryptolocker / LockBit DGA Burst**: Tests high-entropy algorithmic strings (`xq9m2kz7v4naplq.top`).
3. **Brand Typosquatting**: Tests visual homoglyph lures (`rnicrosoft.com`, `paypa1-update.com`).
4. **DNS Tunnelling Exfiltration**: Tests Base64/Hex exfiltration payloads (`YWJjZDEyMzQ1Ng==.attacker-c2.net`).
5. **Cobalt Strike / Lazarus C2**: Tests active C2 beacon controllers (`c2-beacon.dark-infra.cc`).
6. **Continuous Red-Team Attack Stream**: Stress-tests the live SOC dashboard in real time.
