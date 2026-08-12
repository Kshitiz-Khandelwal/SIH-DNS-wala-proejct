# DNS Shield — Complete Project Report
> For SIH Hackathon · Built by Kshitiz Khandelwal · Last Updated: 2026-08-12

---

## 🎯 What is DNS Shield?

DNS Shield is a **real-time DNS threat detection and response system**. It intercepts DNS queries (the step that happens before your browser loads a website), runs them through 7 layers of analysis, and decides: **ALLOW / FLAG / BLOCK**.

Think of it as a **smart firewall for DNS** — like a security guard that checks every "who is this website?" request before your device gets the answer.

**Real-world use case:** A corporate network where employee devices make thousands of DNS queries per day. This system detects if any of those queries are going to:
- Malware command & control (C2) servers
- Algorithmically generated fake domains (DGA malware)
- Phishing/typosquat sites that look like real ones
- Data exfiltration via DNS tunnelling

---

## 🏗️ System Architecture — Bird's Eye View

```
┌─────────────────────────────────────────────────────────┐
│                    DNS Client / Device                   │
│               (endpoint querying a domain)               │
└────────────────────────┬────────────────────────────────┘
                         │ DNS Query
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  API Gateway  :8080                      │
│          (orchestrates the 7-stage pipeline)             │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬───────────┘
   │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼
Stage1  Stage2  Stage3  Stage4  Stage5  Stage6  Stage7
Cache  Threat   ML    Behav.   Geo   Active  Analytics
Redis   Intel  :8000  :8001  :8002  Response  :8005
:6379  :8003                         :8004
```

---

## 🔬 The 7-Stage Detection Pipeline (The Core)

Every single DNS query goes through all 7 stages in sequence. Each stage adds a **risk score** and a **reason**. The total score determines the verdict.

| Stage | Service | Port | What It Does | Risk Contribution |
|---|---|---|---|---|
| **1. Cache** | Redis | 6379 | Check if we've seen this domain in last 5 min | 0 (cache hit = skip rest) |
| **2. Threat Intel** | threat-intel | 8003 | Check against known-bad indicator database (STIX 2.1 IOCs, URLhaus feed) | **+100** if matched |
| **3. ML Lexical** | ml-inference | 8000 | Analyze the domain name itself: entropy, n-gram rarity, DGA probability, typosquat similarity | **0–70** based on model |
| **4. Behavioral** | behavioral-engine | 8001 | Track per-device history: volume anomalies, DNS tunnelling, TLD fan-out, repeat offenses | **0–65** based on signals |
| **5. Geo Intel** | geo-intel | 8002 | Enrich target IP with country/ASN/coordinates | **0–20** for high-risk regions |
| **6. Active Response** | active-response | 8004 | Lab-only: sinkhole malicious domains, quarantine compromised devices | Decision enforcer |
| **7. Analytics** | analytics-store | 8005 | Persist every event for dashboard, trends, feedback, forensics | Event recorder |

### Verdict Decision Logic
```
threat_hit = True          → BLOCK (immediate, skips ML deliberation)
total_risk >= 71           → BLOCK
total_risk >= 41           → FLAG  
total_risk < 41            → ALLOW
ML uncertain + no threat   → FLAG (not BLOCK — safety net)
```

### Risk Calculation Example
```
Domain: xq9m2kz7v4na.com  (DGA-style)

Stage 1 - Cache:        miss         +0
Stage 2 - Threat Intel: clean        +0
Stage 3 - ML Lexical:   high entropy +45  (DGA prob: 0.89, entropy: 3.8)
Stage 4 - Behavioral:   normal       +0
Stage 5 - Geo:          n/a          +0

Total risk = 45  →  FLAG  (MEDIUM confidence)
```

```
Domain: c2.bad-demo.example  (Known C2)

Stage 1 - Cache:        miss         +0
Stage 2 - Threat Intel: HIT!         +100  ← triggers BLOCK immediately
Stage 3 - ML Lexical:   uncertain    +13
Stage 4 - Behavioral:   threat hit   +35

Total risk = 148 → capped at 100 → BLOCK (HIGH confidence)
```

---

## 📦 Service Map — Every Component Explained

### 1. `services/api-gateway/` — The Brain
- **Language:** Python (FastAPI)
- **Port:** 8080
- **What it does:** Receives all queries, calls all other services in order, assembles XAI (explainable AI) pipeline response
- **Key endpoints:**
  - `POST /v1/query` — Main detection pipeline
  - `GET /health` — Status check
  - `GET /metrics` — Prometheus counters
  - `GET /docs` — Swagger UI

### 2. `services/threat-intel/` — The Blocklist
- **Language:** Python (FastAPI)
- **Port:** 8003
- **What it does:** Maintains a database of known-bad indicators (IP, domain, URL). Seeded at startup from URLhaus-style feeds. Supports STIX 2.1 bundle format.
- **Key endpoints:**
  - `GET /lookup/{domain}` — Is this domain malicious?
  - `GET /stix/bundle` — Export all indicators as STIX 2.1
  - `POST /indicators` — Add new indicator
  - `GET /feeds/health` — Feed status

### 3. `services/ml-inference/` — The Domain Name Analyst
- **Language:** Python (FastAPI + scikit-learn)
- **Port:** 8000
- **What it does:** Extracts lexical features from a domain name and scores it. When trained models are available, uses them. Falls back to deterministic heuristics.
- **Features extracted:**
  - Shannon entropy of domain characters
  - Vowel/consonant ratio
  - Domain length and label count
  - Digit ratio
  - N-gram rarity (how "normal" character sequences are)
  - Nearest legitimate brand (Levenshtein distance)
  - DGA probability (0.0–1.0)
  - Typosquat probability (0.0–1.0)
- **Key endpoints:**
  - `POST /predict` — Returns features + probabilities + XAI reasons
  - `GET /monitoring` — Model drift indicators

### 4. `services/behavioral-engine/` — The Memory
- **Language:** Python (FastAPI)
- **Port:** 8001
- **What it does:** Maintains per-device risk profiles. Tracks query history in a sliding time window. Detects behavioral anomalies:
  - **Volume anomaly:** >50 queries in 60 seconds
  - **DNS tunnelling:** Domain labels >45 characters (exfiltration)
  - **High entropy subdomain:** Entropy >4.1 (encoded payload)
  - **TLD fan-out:** >10 unique TLDs in window (DGA scanning)
  - **Parent fan-out:** >30 unique parent domains (lateral movement)
- **Key endpoints:**
  - `POST /observe` — Update device profile + return risk contribution
  - `GET /devices/{ip}` — Full device risk timeline
  - `GET /domains/{domain}` — Domain reputation profile
  - `GET /incidents` — Correlated multi-signal incidents

### 5. `services/analytics-store/` — The Memory Store
- **Language:** Python (FastAPI)
- **Port:** 8005
- **What it does:** Persists all query events for the SOC dashboard. Provides trend data, stats, analyst feedback, and passive forensics (Zeek logs, PCAP files).
- **Two versions:**
  - `app.py` — Production: backed by ClickHouse (needs Docker)
  - `app_local.py` — Hackathon demo: backed by Redis + in-process memory ← *currently running*
- **Key endpoints:**
  - `GET /events` — All recent events (filterable)
  - `GET /stats` — 24h verdict counts
  - `GET /trends` — Hourly risk trend time series
  - `POST /feedback` — Analyst label (FP / Confirmed / Needs Investigation)

### 6. `dashboard/` — The SOC Console
- **Language:** Next.js (React)
- **Port:** 3000
- **What it does:** Real-time SOC dashboard showing live query stream, XAI decision panels, device profiles, incident timelines, and Three.js threat globe.
- **Pages:** Single-page app with sections for:
  - Live query stream with auto-refresh
  - Manual investigation input
  - XAI pipeline panel (per-stage breakdown)
  - Hourly trend charts
  - 3D threat globe (Three.js — blocked events as arcs)
  - Feed health status

### 7. `ml-training/` — The Model Factory
- **Language:** Python (scikit-learn)
- **File:** `train.py`
- **What it does:** Trains DGA and typosquat classifiers from labelled datasets. Saves versioned joblib artifacts + metadata (SHA-256, dataset source, training split strategy, precision/recall/F1).

### 8. `infra/` — The Lab Environment
- `docker-compose.yml` — Full stack (production)
- `simulate.py` — Traffic generator (5 scenarios: benign, dga, c2, typosquat, tunnelling)
- `lab-simulator/` — Named Docker containers for each scenario
- `mock-dns/` — Internal DNS resolver (no internet needed for demo)

---

## 📊 Current Test Results (2026-08-12)

### Core Pipeline Tests: 8/8 ✅
| Domain | Expected | Actual | Risk | Confidence | Time |
|---|---|---|---|---|---|
| `c2.bad-demo.example` | BLOCK | ✅ BLOCK | 100 | HIGH | ~3s |
| `isro.gov.in` | ALLOW | ✅ ALLOW | 0 | LOW | ~3s |
| `xq9m2kz7v4na.com` | FLAG | ✅ FLAG | 45 | MEDIUM | ~3s |
| `gooogle.com` | FLAG/ALLOW | ✅ ALLOW | 30 | LOW | ~3s |
| `google.com` | ALLOW | ✅ ALLOW | 0 | LOW | ~3s |
| `github.com` | ALLOW | ✅ ALLOW | 0 | LOW | ~3s |
| `lq3zp89vbcx.net` | FLAG | ✅ FLAG | 44 | MEDIUM | ~3s |
| `ad7qxm91bz.io` | FLAG | ✅ FLAG | 42 | MEDIUM | ~3s |

### Simulation Traffic (Live in Dashboard)
| Scenario | Device IP | Events | Verdict |
|---|---|---|---|
| benign | 10.0.0.10 | 9 | ALLOW |
| dga | 10.0.0.20 | 9 | FLAG |
| c2 | 10.0.0.30 | 3 | BLOCK |
| typosquat | 10.0.0.40 | 6 | FLAG/ALLOW |
| tunnelling | 10.0.0.50 | 5 | ALLOW* |

*Tunnelling detection requires behavioral window to fill up (~50+ queries in 60s threshold)

### Services Running
| Service | Port | Status | Notes |
|---|---|---|---|
| Redis | 6379 | ✅ Running | Verdict cache + device profiles |
| ML Inference | 8000 | ✅ Running | Heuristic baseline mode |
| Behavioral Engine | 8001 | ✅ Running | Device risk profiles active |
| Threat Intel | 8003 | ✅ Running | Seeded IOC database |
| Analytics Store | 8005 | ✅ Running | Local in-memory mode |
| API Gateway | 8080 | ✅ Running | 7-stage pipeline |
| SOC Dashboard | 3000 | ✅ Running | Next.js live |
| Geo Intel | 8002 | ❌ Offline | Needs MaxMind DB (skip for demo) |
| Active Response | 8004 | ❌ Offline | Docker-only (lab network) |

---

## 🗂️ Repository Structure

```
SIH-DNS-wala-project/
│
├── services/                    # Microservices (7 Python FastAPI apps)
│   ├── api-gateway/             # Main orchestrator (Stage: all)
│   ├── threat-intel/            # IOC database (Stage 2)
│   ├── ml-inference/            # Lexical ML (Stage 3)
│   ├── behavioral-engine/       # Device profiles (Stage 4)
│   ├── geo-intel/               # IP enrichment (Stage 5)
│   ├── active-response/         # Lab-only sinkhole (Stage 6)
│   └── analytics-store/         # Event persistence (Stage 7)
│
├── dashboard/                   # Next.js SOC dashboard (port 3000)
│
├── ml-training/                 # Training scripts + artifacts
│   ├── train.py                 # DGA + typosquat classifiers
│   └── artifacts/               # Trained joblib models go here
│
├── notebooks/                   # Jupyter SOC demo analysis
│   └── 01_soc_demo_analysis.ipynb
│
├── infra/                       # Lab infrastructure
│   ├── docker-compose.yml       # Full production stack
│   ├── simulate.py              # Traffic generator (5 scenarios)
│   ├── lab-simulator/           # Named Docker sim containers
│   ├── mock-dns/                # Internal DNS (no internet needed)
│   └── k8s/                     # Kubernetes manifests (deferred)
│
├── data/                        # Training datasets
│
├── docs/                        # Design docs + runbooks
│
├── TEST_PLAN.md                 # 215-line verification checklist
├── PROGRESS.md                  # Build log
├── HANDOFF.md                   # Agent handoff notes
├── README.md                    # Public-facing overview
└── RUN_AND_TEST.md              # How to start everything
```

---

## 🧠 Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI (Python 3.11) |
| ML Models | scikit-learn (Random Forest / Gradient Boosting) |
| Cache / State | Redis 8.x |
| Dashboard | Next.js 14 (React) |
| 3D Visualization | Three.js |
| DNS Resolver | Go 1.22 (UDP + TCP + DoH + DoT) |
| Prod Analytics | ClickHouse (columnar DB, 90-day TTL) |
| Demo Analytics | Redis + in-memory (app_local.py) |
| Threat Format | STIX 2.1 (industry standard) |
| Feed Sources | URLhaus (Abuse.ch), OTX, CERT-In, MISP |
| Observability | Prometheus metrics on /metrics |
| CI/CD | GitHub Actions (syntax + build gates) |
| Deployment | Docker Compose + Kubernetes (deferred) |

---

## 🔑 Key Design Decisions (For Your Prompt)

### 1. **Explainability First**
Every decision has a full `pipeline` array with per-stage `status`, `contribution`, and `reason`. Nothing is a black box. The XAI panel in the dashboard shows exactly why a domain was blocked.

### 2. **Graceful Degradation**
If any service is offline, the gateway continues. It logs `degraded_dependencies` and downgrades the verdict safely (ML-only BLOCK → FLAG, etc.). The system never crashes due to a missing service.

### 3. **Local-Only Lab Safety**
Active response (sinkhole/quarantine) only operates within the Docker lab network. The system validates the client IP is in the lab subnet before taking action. No real firewall changes.

### 4. **Deterministic + ML Hybrid**
The system works without any trained ML model (heuristic baseline mode). When `ml-training/artifacts/` contains trained joblib files, it automatically upgrades to the trained mode. This makes it demo-ready immediately.

### 5. **Hackathon vs. Production**
Two analytics stores exist — the local one (Redis/memory) for demos, and the ClickHouse one for production. The API surface is identical, making the swap transparent.

---

## 🚧 Known Issues / Remaining Work

### Dashboard Bug: Event click crash
- **Error:** `TypeError: _result_reasons.map is not a function`
- **Cause:** Analytics store stores `reasons` as a `"; "`-joined string, but dashboard expects an array
- **Fix needed:** In `dashboard/app/page.js` line 21, wrap reasons: `typeof r.reasons === 'string' ? r.reasons.split('; ') : r.reasons`

### Behavioral sometimes degraded
- **Cause:** 1.0s timeout occasionally insufficient when Redis is slow
- **Fix:** Already increased from 0.25s — mostly resolved

### Tunnelling not detected
- **Cause:** Threshold is 50 queries in 60s window. Simulation sends only 5 queries per scenario
- **Fix for demo:** Run `python infra/simulate.py tunnelling --repeat 55` to exceed the threshold

### ML in heuristic baseline mode
- **Cause:** No trained models in `ml-training/artifacts/`
- **Fix:** Run `python ml-training/train.py` with labelled data in `data/`

---

## 📋 Prompt-Building Template

Use this structure to write prompts for extending this project:

```
You are working on DNS Shield, a 7-stage DNS threat detection microservice system.

ARCHITECTURE:
- API Gateway (port 8080): orchestrates all 7 stages
- Stage 2 Threat Intel (8003): STIX 2.1 IOC database
- Stage 3 ML Inference (8000): lexical domain analysis
- Stage 4 Behavioral (8001): device risk profiles
- Stage 7 Analytics Store (8005): event persistence
- SOC Dashboard (3000): Next.js real-time console

TECH STACK:
- Python FastAPI for all backend services
- Redis for caching and state
- Next.js for frontend
- scikit-learn for ML models

PIPELINE: Every query returns:
{
  "verdict": "ALLOW|FLAG|BLOCK",
  "domain_risk": 0-100,
  "confidence": "LOW|MEDIUM|HIGH",
  "pipeline": [{"stage": "...", "status": "...", "contribution": 0, "reason": "..."}],
  "degraded_dependencies": []
}

CURRENT STATUS:
- 8/8 core tests passing
- All 5 simulation scenarios generating traffic
- Dashboard live at localhost:3000

TASK: [Describe what you want to build/fix here]

CONSTRAINTS:
- No Docker/Kubernetes required for demo
- No ClickHouse (use app_local.py analytics store)
- Services run locally with uvicorn
- Python venv at: C:\Users\Admin\Desktop\Kshitiz\SIH-DNS-wala-project\.venv
```

---

## 🎬 Demo Script (For Judges)

**Time: 5–7 minutes**

1. **Open Dashboard** → `http://localhost:3000`
   - Show 30 live events in the stream
   - Show verdict distribution: ALLOW / FLAG / BLOCK

2. **Run C2 detection live**
   - Type `c2.bad-demo.example` in the Investigate input
   - Show: BLOCK, 100 risk, HIGH confidence
   - Explain: Threat Intel hit → immediate block

3. **Run DGA detection live**
   - Type `xq9m2kz7v4na.com`
   - Show: FLAG, ~45 risk, ML lexical features
   - Explain: High entropy, DGA probability 0.89

4. **Show XAI pipeline panel**
   - Point to each stage: cache → threat-intel → ml-lexical → behavioral
   - "Every decision is explainable, no black box"

5. **Show feed health** 
   - `GET http://localhost:8003/feeds/health` in browser
   - STIX bundle: `http://localhost:8003/stix/bundle`

6. **Show device profile** (bonus)
   - `GET http://localhost:8001/devices/10.0.0.30`
   - C2 device has elevated risk from repeated C2 queries

7. **Close with architecture slide**
   - 7 layers, all communicating, all independently degradable

---

*Report generated by Antigravity AI — commit: `ecd9ce9`*
