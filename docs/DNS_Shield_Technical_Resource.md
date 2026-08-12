# DNS Shield — Technical Resource Document

> **Project**: DNS Shield — Real-Time Explainable DNS Threat Detection  
> **Author**: Kshitiz Khandelwal  
> **Event**: Smart India Hackathon (SIH) 2026  
> **GitHub**: https://github.com/Kshitiz-Khandelwal/SIH-DNS-wala-proejct  
> **Stack**: Python 3.11 / FastAPI / Redis / scikit-learn / Next.js 16 / TypeScript

---

## 1. Project Overview

| Property | Value |
|---|---|
| Problem type | Real-time DNS threat detection + explainability |
| Threat classes | DGA domains, Typosquat domains, C2 domains, DNS tunnelling |
| Detection method | 7-stage layered pipeline (deterministic + ML + behavioral) |
| Verdict outputs | `ALLOW`, `FLAG`, `BLOCK` |
| Risk score range | 0–100 |
| Confidence levels | `LOW`, `MEDIUM`, `HIGH` |
| Primary metric | Per-stage explainability (XAI) + weighted F1 of ML stage |
| ML algorithm | Random Forest + FeatureUnion (char TF-IDF + engineered features) |
| Threat intelligence | STIX 2.1 IOC database (URLhaus feed + CERT-In compatible) |
| Dashboard | Next.js SOC console with live stream + 3D threat globe |

---

## 2. Repository Structure

```
SIH-DNS-wala-project/
│
├── services/                    # 7 Python FastAPI microservices
│   ├── api-gateway/             # Port 8080 — orchestrator
│   │   └── app.py               # Main pipeline + all endpoints
│   ├── threat-intel/            # Port 8003 — STIX 2.1 IOC database
│   │   └── app.py
│   ├── ml-inference/            # Port 8000 — ML lexical scoring
│   │   └── app.py
│   ├── behavioral-engine/       # Port 8001 — device risk profiles
│   │   └── app.py
│   ├── geo-intel/               # Port 8002 — IP enrichment
│   │   └── app.py
│   ├── active-response/         # Port 8004 — lab-only sinkhole
│   │   └── app.py
│   └── analytics-store/         # Port 8005 — event persistence
│       ├── app.py               # Production: ClickHouse backend
│       └── app_local.py         # Hackathon demo: Redis + in-memory
│
├── dns_shield_features.py       # ← CRITICAL: shared feature module
│                                #   Must be importable by both train.py
│                                #   and ml-inference at runtime
│
├── ml-training/
│   ├── train.py                 # Training script (Random Forest + tuning)
│   └── artifacts/               # .joblib + .metrics.json + .metadata.json
│
├── frontend/                    # Next.js 16 / TypeScript SOC dashboard
│   └── src/
│       ├── app/
│       │   ├── app/             # Authenticated SOC console
│       │   │   ├── queue/       # Live query stream (default view)
│       │   │   ├── pipeline/    # 7-stage pipeline visualization
│       │   │   ├── models/      # ML model + feed health
│       │   │   └── settings/    # Thresholds + simulators
│       │   └── page.tsx         # Public landing page
│       ├── components/
│       │   ├── console/ConsoleNav.tsx
│       │   ├── PipelineCascade.tsx
│       │   └── LexicalScan.tsx
│       └── lib/
│           ├── api.ts           # All backend API calls
│           └── types.ts         # Shared TypeScript types
│
├── infra/
│   ├── docker-compose.yml       # Full production stack
│   ├── simulate.py              # Traffic generator (5 scenarios)
│   └── k8s/                     # Kubernetes manifests (deferred)
│
├── notebooks/
│   └── 01_soc_demo_analysis.ipynb
│
├── data/                        # Training datasets (gitignored)
│
├── docs/                        # All project documentation
│   ├── DNS_Shield_Interview_Report.md
│   ├── DNS_Shield_Flow_Diagram.md
│   ├── DNS_Shield_Technical_Resource.md  ← this file
│   ├── DNS_Shield_Final_Report.md
│   └── PROJECT_REPORT.md
│
├── scratch/
│   └── smoke_test.py
│
├── TEST_PLAN.md
├── PROGRESS.md
├── RUN_AND_TEST.md
└── README.md
```

---

## 3. API Gateway — Full Endpoint Reference

**Base URL**: `http://localhost:8080`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/query` | Optional API key | Main detection pipeline. Returns verdict + XAI pipeline array. |
| `GET` | `/v1/events` | Optional | List recent events from analytics store |
| `GET` | `/v1/events/{id}` | Optional | Single event by ID |
| `POST` | `/v1/events/{id}/feedback` | Optional | Analyst label (FP / Confirmed / Needs Investigation) |
| `GET` | `/v1/stats` | Optional | 24h verdict counts (ALLOW / FLAG / BLOCK + open incidents) |
| `GET` | `/v1/trends` | Optional | Hourly risk trend time series |
| `GET` | `/v1/incidents` | Optional | Correlated multi-signal incidents from behavioral engine |
| `GET` | `/v1/devices/{ip}` | Optional | Full device risk profile + query history |
| `GET` | `/v1/domains/{domain}` | Optional | Domain reputation profile |
| `GET` | `/v1/feed-health` | Optional | Threat feed status (URLhaus, CERT-In) |
| `GET` | `/v1/model-monitoring` | Optional | ML model version, drift indicators |
| `GET` | `/v1/quarantine` | Optional | Lab quarantine list from active-response |
| `DELETE` | `/v1/quarantine/{ip}` | Optional | Release quarantined device |
| `POST` | `/v1/passive/pcap` | Optional | Upload PCAP file, replay DNS queries through pipeline |
| `POST` | `/v1/passive/zeek` | Optional | Upload Zeek TSV log, replay queries |
| `GET` | `/health` | Public | Service health check + detection plane status |
| `GET` | `/metrics` | Configurable | Prometheus counters (request counts, latencies, verdicts) |
| `GET` | `/docs` | Public | Interactive Swagger UI |

### `/v1/query` — Request / Response Schema

**Request:**
```json
{
  "domain": "xq9m2kz7v4na.com",
  "client_ip": "10.0.0.20",
  "source": "dashboard",
  "query_type": "A"
}
```

**Response:**
```json
{
  "event_id": "uuid-v4",
  "domain": "xq9m2kz7v4na.com",
  "client_ip": "10.0.0.20",
  "verdict": "FLAG",
  "domain_risk": 45,
  "device_risk": 0,
  "confidence": "MEDIUM",
  "latency_ms": 2847,
  "pipeline": [
    {"stage": 1, "name": "cache",       "status": "miss",    "contribution": 0,  "reason": "cache miss — full pipeline evaluation", "decided": false},
    {"stage": 2, "name": "threat-intel","status": "clean",   "contribution": 0,  "reason": "no direct IOC match",                   "decided": false},
    {"stage": 3, "name": "ml-lexical",  "status": "flagged", "contribution": 45, "reason": "DGA probability 0.89, entropy 3.81",     "decided": true},
    {"stage": 4, "name": "behavioral",  "status": "clean",   "contribution": 0,  "reason": "no signal",                             "decided": false},
    {"stage": 5, "name": "geo",         "status": "clean",   "contribution": 0,  "reason": "clean region",                          "decided": false},
    {"stage": 6, "name": "active-response","status":"pass",  "contribution": 0,  "reason": "no active response required",           "decided": false},
    {"stage": 7, "name": "analytics",   "status": "logged",  "contribution": 0,  "reason": "final composite score: 45",             "decided": false}
  ],
  "degraded_dependencies": []
}
```

---

## 4. Service-by-Service API Reference

### `threat-intel` (:8003)

| Method | Path | Description |
|---|---|---|
| `GET` | `/lookup/{domain}` | Check a domain against IOC database. Returns `{match: bool, ioc_type: str, confidence: str}` |
| `GET` | `/stix/bundle` | Export all indicators as a STIX 2.1 JSON bundle |
| `POST` | `/indicators` | Add a new indicator |
| `DELETE` | `/indicators/{id}` | Remove an indicator |
| `GET` | `/feeds/health` | Feed ingestion status + last sync time |
| `POST` | `/feeds/urlhaus` | Trigger live URLhaus feed ingestion |
| `GET` | `/health` | Service health |

### `ml-inference` (:8000)

| Method | Path | Description |
|---|---|---|
| `POST` | `/predict` | Accepts `{domain: str}`. Returns `{dga_probability, typosquat_probability, contribution, reasons[], model_version, mode}` |
| `GET` | `/monitoring` | Model drift indicators, model version, feature baseline |
| `GET` | `/health` | Service health |

**Model modes:**
- `heuristic-baseline-1.0` — No trained `.joblib` artifact found; uses deterministic heuristics
- `trained-local-artifact` — Loads from `ml-training/artifacts/dga-v1.joblib`

### `behavioral-engine` (:8001)

| Method | Path | Description |
|---|---|---|
| `POST` | `/observe` | Update device profile and return risk contribution. Input: `{domain, client_ip, ml_probability, threat_hit}` |
| `GET` | `/devices/{ip}` | Full device risk profile + event history |
| `GET` | `/domains/{domain}` | Domain reputation profile + device count |
| `GET` | `/incidents` | Correlated multi-signal incidents |
| `GET` | `/health` | Service health |

### `analytics-store` (:8005) — `app_local.py` (Hackathon Mode)

| Method | Path | Description |
|---|---|---|
| `POST` | `/events` | Persist a new query event |
| `GET` | `/events` | Retrieve recent events (filterable by verdict, domain) |
| `GET` | `/events/{id}` | Single event |
| `POST` | `/events/{id}/feedback` | Analyst label |
| `GET` | `/stats` | 24h verdict counts grouped by verdict |
| `GET` | `/trends` | Hourly risk aggregation (blocked_count, flagged_count, avg_domain_risk) |
| `GET` | `/health` | Service health |

---

## 5. ML Training Script (`ml-training/train.py`) — Full CLI Reference

```bash
python ml-training/train.py \
  --data data/dga_dataset.csv \    # CSV with columns: domain, label [, observed_at]
  --name dga \                     # "dga" or "typosquat"
  --version 1 \                    # Artifact version tag
  --source "Bambenek DGA feed" \   # Human-readable dataset source
  --test-size 0.20 \               # Holdout fraction (0.05–0.49)
  --algorithm rf \                 # "rf" (Random Forest, default) or "logreg"
  --tune \                         # Enable RandomizedSearchCV (default: on)
  --tune-iterations 25 \           # Max candidates for hyperparameter search
  --cv-folds 5                     # CV folds (auto-capped to smallest class count)
```

### Output Artifacts (`artifacts/dga-v1.*`)

| File | Contents |
|---|---|
| `dga-v1.joblib` | Serialized sklearn Pipeline (FeatureUnion → RandomForest) |
| `dga-v1.metrics.json` | Full classification_report (precision, recall, F1 per class + weighted avg) |
| `dga-v1.feature-baseline.json` | Schema version, sample count, entropy mean, engineered feature means |
| `dga-v1.metadata.json` | Training provenance: dataset SHA-256, split strategy, algorithm, hyperparameter tuning results, runtime compatibility note |

### Artifact Schema Version
```json
{
  "artifact_schema_version": "dns-shield-model-v2",
  "name": "dga",
  "version": "1",
  "algorithm": "rf",
  "feature_schema": "char-tfidf-2-4grams+engineered-lexical-v2",
  "engineered_feature_names": ["length","entropy","digit_ratio","vowel_ratio","consonant_ratio","unique_char_ratio","hyphen_ratio","longest_consonant_run","longest_digit_run","label_count","has_digit"],
  "hyperparameter_tuning": {"enabled": true, "cv_folds": 5, "best_params": {...}, "best_cv_f1_weighted": 0.94},
  "runtime_compatibility": "services/ml-inference local_model_probability uses predict_proba([domain]); verified by standalone subprocess reload at export time",
  "feature_module": "dns_shield_features.py must ship alongside this artifact / be importable on the inference service's PYTHONPATH"
}
```

---

## 6. `dns_shield_features.py` — Shared Feature Module (Critical)

This module is the contract between training and inference. It must be importable by both.

```python
ENGINEERED_FEATURE_NAMES = [
    "length", "entropy", "digit_ratio", "vowel_ratio", "consonant_ratio",
    "unique_char_ratio", "hyphen_ratio", "longest_consonant_run",
    "longest_digit_run", "label_count", "has_digit"
]

def domain_features(domains) -> np.ndarray:
    """Accepts any flat iterable of strings.
    Plugs into FeatureUnion the same way TfidfVectorizer does.
    Works unmodified at inference when called as predict_proba([domain])."""
    ...
```

**Why it cannot be in `train.py`**: joblib pickles a `FunctionTransformer` by reference (`module_path.function_name`). A function in `train.py`'s `__main__` pickles as `__main__.domain_features`, which unpickles fine in the same process but raises `AttributeError` in the inference service (different `__main__`). The standalone module resolves to `dns_shield_features.domain_features` in any process.

---

## 7. Simulation Scenarios (`infra/simulate.py`)

```bash
python infra/simulate.py [scenario] --device [ip] --repeat [n]
```

| Scenario | Device IP | What it sends | Expected verdicts |
|---|---|---|---|
| `benign` | 10.0.0.10 | google.com, isro.gov.in, github.com | ALLOW |
| `dga` | 10.0.0.20 | xq9m2kz7v4na.com, lq3zp89vbcx.net | FLAG |
| `c2` | 10.0.0.30 | c2.bad-demo.example | BLOCK |
| `typosquat` | 10.0.0.40 | gooogle.com, gooogle-login.security-update.com | FLAG/ALLOW |
| `tunnelling` | 10.0.0.50 | Very long subdomains (45+ chars) | FLAG (needs >50 repeat) |

---

## 8. Environment Variables

| Variable | Default | Service | Description |
|---|---|---|---|
| `REDIS_URL` | `redis://localhost:6379/0` | All | Redis connection string |
| `ML_URL` | `http://localhost:8000` | Gateway | ML inference service URL |
| `THREAT_INTEL_URL` | `http://localhost:8003` | Gateway | Threat intel service URL |
| `BEHAVIOR_URL` | `http://localhost:8001` | Gateway | Behavioral engine URL |
| `ANALYTICS_STORE_URL` | `http://localhost:8005` | Gateway | Analytics store URL |
| `GATEWAY_API_KEY` | `""` (disabled) | Gateway | Bearer token for API authentication |
| `GATEWAY_RATE_LIMIT_PER_MINUTE` | `240` | Gateway | Per-IP rate limit |
| `VERDICT_CACHE_TTL_SECONDS` | `300` | Gateway | Cache TTL (5 minutes) |
| `CORS_ORIGINS` | `http://localhost:3000` | Gateway | Allowed CORS origins |
| `TRUST_PROXY_HEADERS` | `false` | Gateway | Trust X-Forwarded-For |
| `METRICS_PUBLIC` | `false` | Gateway | Expose /metrics without auth |

---

## 9. How to Start Everything (Local Dev)

```powershell
# 1. Start Redis (required by all services)
redis-server

# 2. Set PYTHONPATH so dns_shield_features.py is importable
$env:PYTHONPATH = "C:\Users\Admin\Desktop\Kshitiz\SIH-DNS-wala-project"
$env:REDIS_URL = "redis://localhost:6379/0"

# 3. Start microservices (each in a separate terminal)
cd services\threat-intel    && uvicorn app:app --port 8003 --host 127.0.0.1
cd services\ml-inference    && uvicorn app:app --port 8000 --host 127.0.0.1
cd services\behavioral-engine && uvicorn app:app --port 8001 --host 127.0.0.1
cd services\analytics-store && uvicorn app_local:app --port 8005 --host 127.0.0.1

# 4. Start API gateway
cd services\api-gateway && uvicorn app:app --port 8080 --host 127.0.0.1

# 5. Start SOC Dashboard (New frontend)
cd frontend && npm run dev -- -p 3001

# 6. Health check
curl http://localhost:8080/health

# 7. Run a domain query
curl -X POST http://localhost:8080/v1/query \
  -H "Content-Type: application/json" \
  -d '{"domain":"xq9m2kz7v4na.com","client_ip":"10.0.0.20","source":"test"}'

# 8. Generate simulation traffic
python infra\simulate.py c2 --device 10.0.0.30 --repeat 3
```

---

## 10. Test Results (Last Verified: 2026-08-12)

### Core Pipeline — Smoke Test Results

| Domain | Expected | Actual | Risk | Confidence | Latency |
|---|---|---|---|---|---|
| `c2.bad-demo.example` | BLOCK | ✅ BLOCK | 100 | HIGH | ~3s |
| `isro.gov.in` | ALLOW | ✅ ALLOW | 0 | LOW | ~3s |
| `xq9m2kz7v4na.com` | FLAG | ✅ FLAG | 45 | MEDIUM | ~3s |
| `gooogle.com` | FLAG/ALLOW | ✅ ALLOW | 30 | LOW | ~3s |
| `google.com` | ALLOW | ✅ ALLOW | 0 | LOW | ~3s |
| `github.com` | ALLOW | ✅ ALLOW | 0 | LOW | ~3s |
| `lq3zp89vbcx.net` | FLAG | ✅ FLAG | 44 | MEDIUM | ~3s |
| `ad7qxm91bz.io` | FLAG | ✅ FLAG | 42 | MEDIUM | ~3s |

### Simulation Traffic Results

| Scenario | Device | Events | Verdicts |
|---|---|---|---|
| benign | 10.0.0.10 | 9 | ALLOW ×9 |
| dga | 10.0.0.20 | 9 | FLAG ×9 |
| c2 | 10.0.0.30 | 3 | BLOCK ×3 |
| typosquat | 10.0.0.40 | 6 | FLAG/ALLOW |
| tunnelling | 10.0.0.50 | 5 | ALLOW* |

*Tunnelling threshold requires >50 queries/60s from the same device. Use `--repeat 60` to trigger.

### Services Status

| Service | Port | Status |
|---|---|---|
| Redis | 6379 | ✅ Running |
| ML Inference | 8000 | ✅ Running (heuristic baseline mode) |
| Behavioral Engine | 8001 | ✅ Running |
| Threat Intel | 8003 | ✅ Running |
| Analytics Store | 8005 | ✅ Running (local mode) |
| API Gateway | 8080 | ✅ Running |
| SOC Dashboard (new) | 3001 | ✅ Running |
| Geo Intel | 8002 | ❌ Offline (needs MaxMind DB) |
| Active Response | 8004 | ❌ Offline (Docker-only lab network) |

---

## 11. Key Design Decisions

| Decision | Rationale |
|---|---|
| `FeatureUnion` not `ColumnTransformer` | Both branches accept a flat list of strings so `predict_proba([domain])` works unchanged in the inference service. A ColumnTransformer keyed on a DataFrame column named "domain" would break the inference contract silently. |
| `dns_shield_features.py` as standalone module | joblib pickles FunctionTransformer by reference. Keeping the feature function in its own module makes the pickle reference stable across processes. Verified by subprocess reload test in train.py. |
| `app_local.py` analytics store | ClickHouse (production) requires Docker. For demo, an in-memory + Redis store with identical API surface allows the dashboard to work without any Docker infrastructure. |
| Graceful degradation | Every service call has a 1.0s timeout. A failed service logs a `degraded_dependency` and continues. ML-only BLOCK downgrades to FLAG. DNS resolution never fails due to a microservice outage. |
| STIX 2.1 for threat intel | Industry standard used by MITRE ATT&CK, CISA, and CERT-In. Using it means the threat intel layer can natively ingest from national TAXII feeds — directly relevant to the SIH problem statement. |
| XAI pipeline array | Every response includes a per-stage breakdown of `status`, `contribution`, and `reason`. This is the core differentiator — no commercial product exposes this level of decision traceability to end users. |
