# DNS Shield — System Architecture

## Project
Real-Time Explainable DNS Threat Detection System  
Smart India Hackathon (SIH) 2026 — Problem Statement SIH260003

---

## System Layout

```
DNS Client → API Gateway (8080) → [7-Stage Pipeline] → Verdict + XAI trace
                                            ↓ (fallback)
                                     [Local Rules]
                                            ↓
                              Analytics Store (8005) → SOC Dashboard (3001)
```

---

## Service Map

| Service | Port | File | Role |
|---|---|---|---|
| API Gateway | 8080 | `services/api-gateway/app.py` | Orchestrates all 7 stages, exposes REST API, handles caching, auth, rate-limiting |
| ML Inference | 8000 | `services/ml-inference/app.py` | Loads sklearn pipeline, runs `predict_proba([domain])` |
| Behavioral Engine | 8001 | `services/behavioral-engine/app.py` | Per-device sliding window, tunnelling + volume anomalies |
| Geo Intel | 8002 | `services/geo-intel/app.py` | IP → Country/ASN enrichment via GeoLite2 |
| Threat Intel | 8003 | `services/threat-intel/app.py` | STIX 2.1 IOC database, URLhaus feed ingestion |
| Active Response | 8004 | `services/active-response/app.py` | Lab-only sinkhole and device quarantine |
| Analytics Store | 8005 | `services/analytics-store/app_local.py` | In-memory event persistence (Redis-backed for demo) |
| SOC Dashboard | 3001 | `frontend/` | Next.js 16 TypeScript SOC console |

---

## Shared Module — `dns_shield_features.py`

Location: project root (must be on `PYTHONPATH` for both training and inference)

```python
ENGINEERED_FEATURE_NAMES: list[str]   # 11 feature names in order

def entropy(domain: str) -> float:    # Shannon entropy of character distribution
def domain_features(domains) -> np.ndarray:  # Accepts any flat iterable of strings
                                              # Returns (n_samples, 11) feature matrix
```

**Why it is separate**: joblib serializes `FunctionTransformer` by reference to function name + module. Defined in `train.py`'s `__main__`, it unpickles as `__main__.domain_features` — which fails in the inference service. A standalone module resolves to `dns_shield_features.domain_features` in any process.

---

## ML Pipeline API Signatures

### `ml-training/train.py`

```python
def build_model(algorithm: str) -> sklearn.pipeline.Pipeline:
    """Constructs FeatureUnion([tfidf, engineered]) + classifier Pipeline.
    Both branches accept a flat list of strings."""

def tuning_grid(algorithm: str) -> dict:
    """Hyperparameter search space for RandomizedSearchCV."""

def resolve_cv_folds(labels: list[int], requested: int) -> int:
    """Caps CV folds at smallest class count to prevent crashes on imbalanced data."""

def _verify_artifact_reloads_standalone(artifact_path: Path, sample_domain: str) -> None:
    """Spawns a subprocess and calls predict_proba([domain]) on the saved artifact.
    Raises RuntimeError if pickle contract is broken."""
```

### `ml-training/adversarial_eval.py`

```python
def generate_evasive_candidates(domain: str) -> list[tuple[str, str]]:
    """Applies 7 mutation strategies (e.g. vowel_inject, tld_swap) to a domain."""

# CLI Entrypoint:
# Generates evasive variants, identifies baseline model failures, augments the
# training dataset with hard negatives, and triggers a retraining cycle.
```

### `services/ml-inference/app.py`

```python
@app.post("/predict")
async def predict(body: PredictRequest) -> PredictResponse:
    """body.domain: str
    Uses: model.predict_proba([body.domain])
    Returns: dga_probability, typosquat_probability, contribution, reasons, model_version"""
```

### `services/api-gateway/app.py`

```python
@app.post("/v1/query")
async def query_domain(body: QueryRequest, request: Request) -> QueryResponse:
    """Runs all 7 stages. Every service call is timeout-guarded (1.0s).
    Failed services logged as degraded_dependencies. Never raises HTTP 500."""

@app.post("/v1/passive/pcap")
async def passive_pcap(file: UploadFile) -> PassiveResponse:
    """Extracts DNS queries from PCAP, replays through pipeline."""
```

### `services/behavioral-engine/app.py`

```python
@app.post("/observe")
async def observe(body: ObserveRequest) -> ObserveResponse:
    """body: {domain, client_ip, ml_probability, threat_hit}
    Maintains per-device deque in Redis (60s window).
    Detects: volume spike, tunnelling, TLD fan-out, high entropy subdomain.
    Returns: contribution (0–65), signals_triggered[], device_risk_profile"""
```

---

## Verdict Decision Logic

```python
# In api-gateway/app.py — assemble_verdict()

if threat_hit:
    return "BLOCK", 100, "HIGH"

total_risk = sum(stage.contribution for stage in pipeline)

if total_risk >= 71:
    verdict = "BLOCK"
elif total_risk >= 41:
    verdict = "FLAG"
else:
    verdict = "ALLOW"

# Confidence calculation
ml_prob = pipeline[2].contribution / 70  # Stage 3 contribution
if ml_prob > 0.75:   confidence = "HIGH"
elif ml_prob > 0.45: confidence = "MEDIUM"
else:                confidence = "LOW"

# Graceful degradation
if "ml-lexical" in degraded_deps and verdict == "BLOCK":
    verdict = "FLAG"  # Never BLOCK on uncertainty alone

# Resilience Mode Output
event.update({
    "resilience_mode": "local-fallback" if degraded_deps else "full-pipeline",
    "local_rules_active": LOCAL_RULES_AVAILABLE
})
```

---

## Artifact Naming Convention

All ML artifacts are versioned with `{name}-v{version}.*`:

| File | Contents |
|---|---|
| `dga-v1.joblib` | Serialized sklearn Pipeline. Loaded by ml-inference via `joblib.load()` |
| `dga-v1.metrics.json` | `classification_report` output: per-class precision, recall, F1, weighted avg |
| `dga-v1.feature-baseline.json` | Schema version, dataset stats, engineered feature means |
| `dga-v1.metadata.json` | Full training provenance: SHA-256, algorithm, split strategy, hyperparameter tuning results, runtime compatibility note |
| `typosquat-v1.joblib` | Typosquat classifier (same architecture) |
| `typosquat-v1.metadata.json` | Typosquat provenance |

---

## Frontend — Next.js 16 Component Map

| Component | Path | Purpose |
|---|---|---|
| `ConsoleNav` | `components/console/ConsoleNav.tsx` | Left sidebar (9 nav items) + `StatusStrip` (live QPS, uptime, clock) |
| `PipelineCascade` | `components/PipelineCascade.tsx` | Inline XAI breakdown for expanded queue rows |
| `LexicalScan` | `components/LexicalScan.tsx` | Character-by-character heat-map animation in ML stage |
| `VerdictBadge` | `components/VerdictBadge.tsx` | ALLOW / FLAG / BLOCK styled badge with optional glow |
| `RiskScore` | `components/RiskScore.tsx` | Risk score (0–100) with mini progress bar |
| `KPIStrip` | `components/KPIStrip.tsx` | 4-card stat strip (Allowed, Flagged, Blocked, Open Incidents) |
| `DomainCell` | `components/DomainCell.tsx` | Domain displayed in JetBrains Mono |
| Pipeline page | `app/app/pipeline/page.tsx` | 3D holographic cylinder pipeline + stage detail panel |
| Queue page | `app/app/queue/page.tsx` | Live query stream table with expandable XAI rows |
| Models page | `app/app/models/page.tsx` | ML model metadata + feed health |
| Settings page | `app/app/settings/page.tsx` | Thresholds + lab simulators |

---

## Data Flow — Redis Usage

| Usage | Key Pattern | TTL | Service |
|---|---|---|---|
| Verdict cache | `verdict:{domain}` | 300s | API Gateway |
| Device query history | `device:{ip}:queries` | Session | Behavioral Engine |
| Device risk score | `device:{ip}:risk` | Session | Behavioral Engine |
| Quarantine list | `quarantine:{ip}` | User-set | Active Response |
| Event store (demo) | `events:list` | None | Analytics Store (local) |
| Threat indicators | `ioc:{domain}` | Feed-synced | Threat Intel |

---

## Prometheus Metrics (at `/metrics`)

| Metric | Type | Description |
|---|---|---|
| `dnsshield_requests_total` | Counter | All requests labeled by method + path + status |
| `dnsshield_pipeline_verdicts_total` | Counter | ALLOW / FLAG / BLOCK counts |
| `dnsshield_latency_ms_p50` | Gauge | Median pipeline latency |
| `dnsshield_latency_ms_p95` | Gauge | 95th percentile pipeline latency |
| `dnsshield_degraded_requests_total` | Counter | Requests with at least one degraded service |

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| API key exposure | Optional bearer token via `GATEWAY_API_KEY` env var. Empty = no auth (demo mode) |
| Rate limiting | Per-IP rate limit enforced at gateway. Default: 240 req/min |
| Active Response safety | Only acts on IPs in `LAB_SUBNET` (env var). Never executes on prod traffic |
| Data exfiltration via domain logs | Domain strings logged are hashed in production. Full strings only in dev/demo |
| Reverse proxy trust | `TRUST_PROXY_HEADERS=false` by default. Must be explicitly enabled |
