# DNS Shield — Flow Diagrams

> **Project**: DNS Shield — Real-Time Explainable DNS Threat Detection  
> **Author**: Kshitiz Khandelwal  
> **Event**: Smart India Hackathon (SIH) 2026

---

## 1. End-to-End System Flow (ASCII)

```
DNS Client / Endpoint Device
(e.g., LAPTOP-01, 10.0.0.10)
          |
          | POST /v1/query {"domain": "...", "client_ip": "..."}
          v
┌──────────────────────────────────────────────────────────┐
│                    API GATEWAY :8080                      │
│         DNS Shield SIEM API  (FastAPI, Python)           │
│         Orchestrates all 7 stages synchronously          │
│         OpenAPI at /openapi.json, Prometheus at /metrics │
└────────────────────────┬─────────────────────────────────┘
                         |
          ┌──────────────▼──────────────┐
          │  STAGE 1 — REDIS CACHE      │
          │  Key: domain string         │
          │  TTL: 300 seconds (5 min)   │
          │  HIT → return cached verdict│
          │  MISS → continue pipeline   │
          └──────────────┬──────────────┘
                         | MISS
          ┌──────────────▼──────────────┐
          │  STAGE 2 — THREAT INTEL     │
          │  Service: threat-intel:8003 │
          │  GET /lookup/{domain}       │
          │  Match against STIX 2.1     │
          │  IOC database               │
          │  Sources: URLhaus, CERT-In  │
          │  HIT → domain_risk += 100   │
          │         → immediate BLOCK   │
          └──────────────┬──────────────┘
                         | (threat_hit flag set)
          ┌──────────────▼──────────────┐
          │  STAGE 3 — ML LEXICAL       │
          │  Service: ml-inference:8000 │
          │  POST /predict              │
          │  Input: domain string       │
          │  Features:                  │
          │  • char 2-4gram TF-IDF      │
          │  • 11 engineered features   │
          │    (entropy, digit_ratio,   │
          │     vowel_ratio, etc.)      │
          │  Models: Random Forest      │
          │  Outputs: dga_probability,  │
          │           typosquat_prob,   │
          │           contribution 0–70 │
          └──────────────┬──────────────┘
                         |
          ┌──────────────▼──────────────┐
          │  STAGE 4 — BEHAVIORAL       │
          │  Service: behavioral:8001   │
          │  POST /observe              │
          │  Tracks per-device 60s      │
          │  sliding window in Redis    │
          │  Detects:                   │
          │  • Volume spike (>50 qps)   │
          │  • DNS tunnelling (label    │
          │    length >45 chars)        │
          │  • TLD fan-out (>10 TLDs)   │
          │  • High entropy subdomain   │
          │  Contribution: 0–65         │
          └──────────────┬──────────────┘
                         |
          ┌──────────────▼──────────────┐
          │  STAGE 5 — GEO INTEL        │
          │  Service: geo-intel:8002    │
          │  Enriches resolved IP with  │
          │  country, ASN, coordinates  │
          │  Contribution: 0–20         │
          │  (high-risk regions)        │
          └──────────────┬──────────────┘
                         |
          ┌──────────────▼──────────────┐
          │  STAGE 6 — ACTIVE RESPONSE  │
          │  Service: active-res.:8004  │
          │  Lab-only: sinkhole / quar. │
          │  Validates client is in lab │
          │  subnet before acting       │
          └──────────────┬──────────────┘
                         |
          ┌──────────────▼──────────────┐
          │  STAGE 7 — ANALYTICS STORE  │
          │  Service: analytics:8005    │
          │  Persists full event:       │
          │  domain, verdict, pipeline, │
          │  timestamp, client_ip       │
          │  Feeds dashboard + feedback │
          └──────────────┬──────────────┘
                         |
          ┌──────────────▼──────────────┐
          │      VERDICT ASSEMBLY       │
          │  total_risk = sum of all    │
          │  stage contributions        │
          │                             │
          │  threat_hit = True → BLOCK  │
          │  risk >= 71    → BLOCK      │
          │  risk 41–70   → FLAG        │
          │  risk < 41    → ALLOW       │
          │                             │
          │  + confidence: LOW/MED/HIGH │
          │  + pipeline XAI array       │
          │  + degraded_dependencies[]  │
          └──────────────┬──────────────┘
                         |
          ┌──────────────▼──────────────┐
          │  Cache write (TTL 300s)      │
          │  → Return JSON response     │
          └─────────────────────────────┘
```

---

## 2. Mermaid Architecture Diagram

```mermaid
graph TD
    CLIENT["DNS Client / Endpoint<br/>POST /v1/query"] --> GW["API Gateway :8080<br/>Orchestrates 7-stage pipeline"]

    GW --> CACHE["Stage 1: Redis Cache :6379<br/>5-minute verdict cache"]
    CACHE -- "HIT" --> RESP["Return cached verdict"]
    CACHE -- "MISS" --> TI["Stage 2: Threat Intel :8003<br/>STIX 2.1 IOC database<br/>URLhaus + CERT-In feeds"]

    TI -- "threat_hit=True (+100)" --> BLOCK["BLOCK verdict"]
    TI -- "clean" --> ML["Stage 3: ML Lexical :8000<br/>Random Forest + TF-IDF<br/>+ 11 engineered features<br/>DGA prob + typosquat prob"]

    ML --> BEH["Stage 4: Behavioral :8001<br/>Device sliding window<br/>Volume, tunnelling, fan-out"]
    BEH --> GEO["Stage 5: Geo Intel :8002<br/>IP → Country / ASN"]
    GEO --> AR["Stage 6: Active Response :8004<br/>Lab-only sinkhole/quarantine"]
    AR --> ANL["Stage 7: Analytics :8005<br/>Event persistence"]

    ANL --> VERDICT["Verdict Assembly<br/>ALLOW / FLAG / BLOCK<br/>+ XAI pipeline array"]
    VERDICT --> DASH["SOC Dashboard :3000<br/>Next.js live query stream<br/>XAI panel + Threat Globe"]
```

---

## 3. ML Training Pipeline Flow

```mermaid
graph TD
    CSV["Labelled domain CSV<br/>domain,label[,observed_at]"] --> LOAD["load_rows()<br/>Validate domain/label format"]
    LOAD --> SPLIT["split_rows()<br/>Stratified random OR<br/>Chronological (observed_at)"]
    SPLIT -- "80% train" --> FE["FeatureUnion<br/>① TF-IDF char 2-4grams<br/>② FunctionTransformer → domain_features()<br/>   (from dns_shield_features.py)<br/>   → StandardScaler"]
    SPLIT -- "20% holdout" --> EVAL

    FE --> TUNE["RandomizedSearchCV<br/>StratifiedKFold (auto-capped folds)<br/>n_iter = min(25, grid_size)"]
    TUNE --> MODEL["Best model: Random Forest<br/>--algorithm rf (default)<br/>OR LogisticRegression (--algorithm logreg)"]
    MODEL --> FIT["model.fit(train_domains, train_labels)"]
    FIT --> DUMP["joblib.dump(model, artifacts/dga-v1.joblib)"]
    DUMP --> VERIFY["_verify_artifact_reloads_standalone()<br/>subprocess reload + predict_proba([domain])<br/>FAILS LOUDLY if pickle contract broken"]
    VERIFY --> ARTIFACTS["artifacts/<br/>dga-v1.joblib<br/>dga-v1.metrics.json<br/>dga-v1.feature-baseline.json<br/>dga-v1.metadata.json"]
    ARTIFACTS --> INFER["ml-inference service loads artifact<br/>model.predict_proba([domain_string])"]
    EVAL --> REPORT["classification_report()<br/>weighted F1, precision, recall"]
```

---

## 4. Dashboard Data Flow

```
analytics-store:8005
        |
        | GET /events  (every 4s auto-refresh)
        | GET /stats   (24h ALLOW/FLAG/BLOCK counts)
        | GET /trends  (hourly risk time series)
        |
        v
SOC Dashboard :3000 (Next.js)
        |
        ├── Live Query Stream Table
        │       Row click → expand → 7-Stage Pipeline Cascade
        │                           (inline XAI breakdown)
        │
        ├── KPI Strip (Allowed / Flagged / Blocked / Open Incidents)
        │
        ├── Investigate Input
        │       → POST api-gateway:8080/v1/query
        │       → Shows real-time pipeline cascade + verdict
        │
        ├── 3D Threat Globe (Three.js)
        │       Red arcs = BLOCK events
        │       GeoLite2 coordinates (when geo-intel is online)
        │
        ├── Hourly Trend Chart
        │       Bar height = average domain risk
        │       Labels = blocked/flagged counts per hour
        │
        ├── Model Monitoring Panel
        │       Model version, metrics status, feature drift
        │
        └── Lab Response Controls
                Quarantine list from active-response:8004
                Release button (DELETE /v1/quarantine/{ip})
```

---

## 5. Graceful Degradation Flow

```
Service call fails or times out (>1.0s)
        |
        v
Gateway logs: degraded_dependencies = ["ml-lexical"]
        |
        ├── If threat-intel offline:
        │       Skip Stage 2, continue with ML only
        │       Downgrade: ML-only BLOCK → FLAG (safety net)
        │
        ├── If ml-inference offline:
        │       Skip Stage 3, contribution = 0
        │       Continue with threat-intel + behavioral only
        │
        ├── If behavioral offline:
        │       Skip Stage 4, continue with available stages
        │
        └── DNS resolution is NEVER blocked by service failure
                Response always includes degraded_dependencies[]
                so downstream systems know to treat verdict with lower confidence
```
