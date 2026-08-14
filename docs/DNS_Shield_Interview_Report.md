# DNS Shield — Interview Study Guide

> **Project**: DNS Shield — Real-Time Explainable DNS Threat Detection  
> **Author**: Kshitiz Khandelwal  
> **Event**: Smart India Hackathon (SIH) 2026 — Problem Statement SIH260003  
> **GitHub**: https://github.com/Kshitiz-Khandelwal/SIH-DNS-wala-proejct

---

## The Problem in Plain English

Every time your browser visits a website, your device first asks a DNS server "what is the IP address of this domain?" This question happens thousands of times per day on a corporate or institutional network.

Attackers abuse DNS in three ways:
1. **DGA (Domain Generation Algorithm)**: Malware automatically generates thousands of random-looking domain names (e.g., `xq9m2kz7v4na.com`) as command-and-control channels that are hard to blocklist.
2. **Typosquatting**: Attackers register domains like `gooogle-login.com` or `paypa1.com` to phish users.
3. **DNS Tunnelling**: Data is secretly smuggled inside DNS queries by encoding it in very long, high-entropy subdomains — bypassing firewalls that only block TCP/UDP.

The question: **given a single DNS query (just the domain name string + device IP), can a system automatically detect if it is malicious — and explain exactly why?**

DNS Shield does exactly this. It runs every DNS query through a 7-stage detection pipeline and returns `ALLOW`, `FLAG`, or `BLOCK` with a complete, per-stage explainability trace.

---

## What Makes This Different from a Simple Blocklist

A traditional blocklist only catches known-bad domains. DNS Shield catches **unknown** threats:
- A brand-new DGA domain that has never appeared in a blocklist before
- A typosquat that was just registered today
- A device that has been quietly exfiltrating data via DNS queries for hours

It does this by combining **three complementary detection methods**:
1. Threat Intel (known-bad) → Stage 2
2. ML Lexical Analysis (character-level pattern scoring) → Stage 3
3. Behavioral Engine (per-device anomaly tracking) → Stage 4

And to guarantee stability, the entire pipeline is wrapped in a **Resilience Layer**: if any service goes down, deterministic local rules and a disk-backed IOC cache kick in to ensure zero loss of security coverage.

---

## The System at a Glance

| Property | Value |
|---|---|
| Input | DNS query: domain string + client IP |
| Output | `ALLOW` / `FLAG` / `BLOCK` + risk score (0–100) + per-stage XAI trace |
| Pipeline stages | 7 |
| Services | 7 independent FastAPI microservices |
| ML algorithm | Random Forest + char TF-IDF + 11 engineered features (Hardened against 7 evasive mutations) |
| Threat intel format | STIX 2.1 (industry standard), disk-backed persistence |
| Feed sources | URLhaus (Abuse.ch), CERT-In-compatible indicators |
| Demo latency | ~3 seconds end-to-end (local dev) |
| Dashboard | Next.js SOC console with live XAI pipeline visualization |

---

## The 7-Stage Detection Pipeline

| Stage | Service | Port | What It Does | Risk Contribution |
|---|---|---|---|---|
| **1 – Cache** | Redis | 6379 | Check if this domain was judged in the last 5 minutes | Immediate verdict return, 0 new risk |
| **2 – Threat Intel** | threat-intel | 8003 | Match against STIX 2.1 IOC database (URLhaus + CERT-In feeds) | **+100** if matched → immediate BLOCK |
| **3 – ML Lexical** | ml-inference | 8000 | Score the domain string using char n-gram TF-IDF + 11 engineered features through a Random Forest | 0–70 based on DGA/typosquat probability |
| **4 – Behavioral** | behavioral-engine | 8001 | Track per-device query history in a sliding window; detect volume spikes, tunnelling, TLD fan-out | 0–65 based on signals |
| **5 – Geo Intel** | geo-intel | 8002 | Enrich the resolved IP with country / ASN / coordinates | 0–20 for high-risk regions |
| **6 – Active Response** | active-response | 8004 | Lab-only: sinkhole confirmed malicious domains, quarantine compromised devices | Decision enforcer only |
| **7 – Analytics** | analytics-store | 8005 | Persist every event for the SOC dashboard, trends, and analyst feedback | Event recorder only |

---

## The Verdict Decision Logic

```
threat_hit = True              → BLOCK  (immediate — skip ML deliberation)
total_risk_score >= 71         → BLOCK
total_risk_score 41–70         → FLAG   (needs analyst review)
total_risk_score < 41          → ALLOW
ML uncertainty + no threat hit → FLAG   (never BLOCK on uncertainty alone)
```

The system never makes a domain fail to resolve. A degraded service returns a lower-confidence verdict, not an error.

---

## The ML Stage — How It Actually Scores a Domain Name

Stage 3 (ML Lexical) is the core intelligence. It works in two parts:

### Part A: Char N-Gram TF-IDF
The domain name is broken into overlapping character sequences (2-, 3-, and 4-character windows), and each is scored for rarity. Legitimate domains like `google.com` have common, dictionary-like character sequences. DGA domains like `xq9m2kz7v4na.com` have rare, statistically improbable character sequences.

### Part B: 11 Engineered Lexical Features

| Feature | Why It Matters |
|---|---|
| `length` | DGA domains tend to be long (15–25 chars) |
| `entropy` | High randomness (>3.8 bits) is a DGA signal |
| `digit_ratio` | Legitimate domains rarely have many digits |
| `vowel_ratio` | Human words have ~40% vowels; DGA domains often don't |
| `consonant_ratio` | High consonant density = unpronounceable = DGA |
| `unique_char_ratio` | High ratio = all characters different = DGA |
| `hyphen_ratio` | Legitimate domains occasionally use hyphens; DGA rarely does |
| `longest_consonant_run` | Long consonant runs (e.g., `kqtvxr`) signal DGA |
| `longest_digit_run` | Long digit runs signal either DGA or typosquatting |
| `label_count` | Many subdomains (e.g., `a.b.c.evil.com`) signal tunnelling |
| `has_digit` | Binary — digits at all shift the probability |

### Real Examples

| Domain | Entropy | DGA Prob | Verdict | Why |
|---|---|---|---|---|
| `google.com` | 2.58 | 0.03 | ALLOW | Low entropy, common characters |
| `isro.gov.in` | 2.95 | 0.04 | ALLOW | Government domain, clean profile |
| `xq9m2kz7v4na.com` | 3.81 | 0.89 | FLAG | High entropy, high digit ratio |
| `gooogle.com` | 3.04 | 0.08 | ALLOW | Low DGA probability, but mild typosquat signal |
| `c2.bad-demo.example` | 3.20 | 0.35 | **BLOCK** | Threat Intel hit +100 |

---

## The Behavioral Engine — Device-Level Anomaly Detection

The behavioral engine tracks what each device IP has been doing over a 60-second sliding window. It detects:

| Signal | Threshold | What It Catches |
|---|---|---|
| Volume anomaly | >50 queries in 60 seconds | Compromised device, C2 beaconing |
| DNS tunnelling | Label length >45 characters | Data exfiltration via DNS |
| High entropy subdomain | Entropy >4.1 | Encoded payload in subdomain |
| TLD fan-out | >10 unique TLDs in window | DGA malware scanning for live C&C |
| Parent fan-out | >30 unique parent domains | Lateral movement scanning |

---

## The Threat Intel Layer — STIX 2.1

Stage 2 maintains a database of known-bad indicators:

- **Format**: STIX 2.1 (Structured Threat Information eXpression — industry standard used by MITRE, CISA, CERT-In)
- **Feed types**: Domain indicators, IP indicators, URL indicators
- **Sources**: URLhaus (live malware hosting URLs), compatible with CERT-In TAXII feeds
- **Export**: The entire indicator database can be exported as a STIX 2.1 bundle via `GET /stix/bundle` — this is a deliverable for integrating with national CERT infrastructure

---

## The XAI (Explainability) Output

Every query response includes a `pipeline` array with one entry per stage:

```json
{
  "verdict": "FLAG",
  "domain_risk": 45,
  "confidence": "MEDIUM",
  "latency_ms": 2847,
  "pipeline": [
    {"stage": 1, "name": "cache",      "status": "miss",    "contribution": 0,  "reason": "cache miss — full pipeline evaluation"},
    {"stage": 2, "name": "threat-intel","status": "clean",  "contribution": 0,  "reason": "no direct IOC match"},
    {"stage": 3, "name": "ml-lexical", "status": "flagged", "contribution": 45, "reason": "high entropy + homoglyph pattern — typosquat signature"},
    {"stage": 4, "name": "behavioral", "status": "clean",   "contribution": 0,  "reason": "no signal"},
    {"stage": 5, "name": "geo",        "status": "clean",   "contribution": 0,  "reason": "clean region"},
    {"stage": 6, "name": "active-response","status":"pass", "contribution": 0,  "reason": "no active response required"},
    {"stage": 7, "name": "analytics",  "status": "logged",  "contribution": 0,  "reason": "final composite score: 45"}
  ],
  "degraded_dependencies": []
}
```

This is the core differentiator for the hackathon: **every verdict is fully traceable to specific signals at specific stages**.

---

## How to Talk About the Project

### "What problem does it solve?"
Traditional DNS filtering relies on blocklists that only catch known threats. DNS Shield catches **zero-day DGA malware**, **freshly registered typosquat domains**, and **live DNS tunnelling** — threats that blocklists miss by definition.

### "What's the AI component?"
A Random Forest classifier trained on character-level TF-IDF features plus 11 hand-engineered lexical features (entropy, digit ratio, consonant runs, etc.). To prove its robustness, we built an **Adversarial Evaluation Framework** that mutates domains to try and fool the model, finds its blind spots, and retrains it with those hard examples to create a significantly stronger, hardened classifier.

### "How is it different from Cisco Umbrella or Cloudflare Gateway?"
Those are production enterprise products. DNS Shield is built from first principles to demonstrate the *mechanism* — specifically the per-stage explainability trace and the transparent local-fallback resilience mode — which commercial products don't expose to end users.

### "What would you do with more time?"
1. Train on a real labelled DGA dataset (Bambenek Consulting, DGArchive)
2. Deploy the Go-based DNS resolver-core to intercept real UDP/TCP DNS traffic
3. Build the LSTM-based sequential model for tunnelling detection (the current behavioral thresholds are heuristic)

---

## Common Interview Questions

**Q: Why Random Forest and not a neural network?**  
A: For a domain name string of <30 characters, the feature space is small and well-understood. Random Forest with engineered features is faster, more interpretable, and doesn't require GPU. The per-tree vote distribution directly gives a calibrated probability score. If we had a large labeled dataset (millions of domains), an LSTM or character-level transformer would be the next step.

**Q: What is STIX 2.1 and why did you use it?**  
A: STIX (Structured Threat Information eXpression) is the industry-standard JSON format for sharing threat intelligence, used by MITRE ATT&CK, CISA, and national CERTs. Using it means the threat intel layer can natively ingest feeds from CERT-In's TAXII server — which is directly relevant to the SIH problem statement.

**Q: How does DNS tunnelling actually work, and how do you detect it?**  
A: DNS tunnelling encodes binary data in the subdomain portion of a query. For example, `aGVsbG8gd29ybGQ.evil.com` contains "hello world" base64-encoded. Detection signals: very long labels (>45 chars), high entropy subdomains, unusually high query frequency from one device, and unusual parent domain diversity. The behavioral engine tracks all four.

**Q: How does the system handle a service being offline?**  
A: Every service call is wrapped in a timeout-guarded HTTP request (1s). If a service fails, it logs a `degraded_dependency` and graceful degradation kicks in. For example, if Threat Intel is offline, the gateway falls back to its direct Redis cache and evaluates 9 deterministic offline local rules (e.g. is it a `.tk` TLD with zero vowels?) to ensure we still flag obvious threats. DNS resolution is never blocked by a microservice failure.

**Q: Why does the feature function live in `dns_shield_features.py` instead of `train.py`?**  
A: joblib (the model serialization library) pickles a `FunctionTransformer` by storing a reference to the function's module path and name. If defined in `train.py`, unpickling it in the inference service raises `AttributeError` because the `__main__` module differs. Keeping it in its own importable module fixes this permanently.
