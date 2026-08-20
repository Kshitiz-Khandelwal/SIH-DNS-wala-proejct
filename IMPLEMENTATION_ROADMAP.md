# 🛡️ DNS Shield — Implementation Roadmap & Progress Tracker

> **Last Updated:** 2026-08-20 | **Maintainer:** Kshitiz Khandelwal
>
> This document tracks the full improvement roadmap derived from multi-source technical audits. Each milestone is implemented and committed to GitHub as an independent, verifiable section. All work is organized in phases so every commit reflects measurable, real engineering progress.

---

## 📊 Overall Progress

| Phase | Focus Area | Status | Commits |
|---|---|---|---|
| [Phase 1](#phase-1-credibility-language--documentation-cleanup) | Credibility, Language & Documentation Cleanup | `✅ Complete` | `fix/credibility-language-cleanup` |
| [Phase 2](#phase-2-dataset-documentation--model-card) | Dataset Documentation & Model Card | `✅ Complete` | `feat/dataset-model-card` |
| [Phase 3](#phase-3-ml-benchmarking--metrics-hardening) | ML Benchmarking & Metrics Hardening | `✅ Complete` | `feat/ml-benchmarks` |
| [Phase 4](#phase-4-architecture-protocol--deployment-hardening) | Architecture, Protocol & Deployment Hardening | `✅ Complete` | `feat/architecture-hardening` |
| [Phase 5](#phase-5-ml-engine-improvements) | ML Engine Improvements | `✅ Complete` | `feat/ml-engine-improvements` |
| [Phase 6](#phase-6-behavioral--tunnelling-engine-improvements) | Behavioral & Tunnelling Engine Improvements | `⏳ Not Started` | — |
| [Phase 7](#phase-7-typosquatting-similarity-engine) | Typosquatting Similarity Engine | `⏳ Not Started` | — |
| [Phase 8](#phase-8-xai--explainability-engine) | XAI & Explainability Engine | `⏳ Not Started` | — |
| [Phase 9](#phase-9-active-response--safety-controls) | Active Response & Safety Controls | `⏳ Not Started` | — |
| [Phase 10](#phase-10-live-attack-demonstration--demo-scripts) | Live Attack Demo & Scripted Scenarios | `⏳ Not Started` | — |
| [Phase 11](#phase-11-cicd-testing--monitoring) | CI/CD, Testing & Monitoring | `⏳ Not Started` | — |
| [Phase 12](#phase-12-soc-dashboard-evidence-panels) | SOC Dashboard Evidence Panels | `⏳ Not Started` | — |

**Status Legend**: `⏳ Not Started` · `🔄 In Progress` · `✅ Complete` · `🔁 Needs Review`

---

## Phase 1: Credibility, Language & Documentation Cleanup

> **Goal**: Remove inflated or unverified claims from all public-facing documentation. Every claim must be labelled `[IMPLEMENTED]`, `[PARTIALLY IMPLEMENTED / LAB SIMULATED]`, or `[PLANNED]`.
>
> **Git Branch**: `fix/credibility-language-cleanup`

### Tasks

- [ ] **1.1 — Delete or rewrite the "91% of malware relies on DNS" claim**
  - **File(s)**: `README.md`, `IDEATION_AND_STRATEGY.md`, `docs/DNS_Shield_Interview_Report.md`, `docs/DNS_Shield_Technical_Resource.md`, any presentation slides
  - **Current Text** (to remove/qualify): *"91% of modern malware relies on DNS"*
  - **Replacement Text**: *"DNS is routinely leveraged by adversaries for C2 domain discovery, malware infrastructure resolution, and covert data exfiltration — making it the most exploitable layer in enterprise networks."*
  - **Rationale**: No source, date, or methodology. Any technically literate judge will immediately challenge it.

- [ ] **1.2 — Rewrite "Traditional defenses fail completely"**
  - **Current Text**: *"Traditional defenses fail completely against..."*
  - **Replacement Text**: *"Traditional approaches (Pi-hole, static RPZ blocklists, AdGuard) are effective against known-bad indicators but are structurally unable to detect zero-day algorithmically generated domains (DGAs), newly registered domains (NRDs), and behavioural signals like covert DNS tunnelling."*
  - **Rationale**: Technically indefensible. Static blocklists are still a valid first-line filter.

- [ ] **1.3 — Replace the ">99% accuracy, near-zero false positives" claim**
  - **Current Text**: *">99% accuracy, near-zero false positives"*
  - **Replacement Text**: *"Detection target: ≥95% Recall for known DGA families, with an explicitly measured and budget-constrained False Positive Rate (FPR ≤ 0.5% on Tranco Top-1M benign baseline). Full confusion matrix and empirical metrics are documented in [DATASET_AND_MODEL_SPECS.md](./DATASET_AND_MODEL_SPECS.md)."*
  - **Rationale**: Accuracy is meaningless on imbalanced DNS traffic. Precision/Recall/FPR are what matters.

- [ ] **1.4 — Replace "sub-100ms latency" with empirical percentile targets**
  - **Current Text**: *"sub-100ms classification latency"*
  - **Replacement Text**: *"Target latency profile: P50 < 15ms, P95 < 50ms, P99 < 100ms on defined test hardware. Empirical benchmark results in [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md)."*
  - **Rationale**: "Under 100ms" is meaningless without P95/P99 percentiles.

- [ ] **1.5 — Add capability status badges to README and ARCHITECTURE.md**
  - Add the following label system to every claimed feature:
    - `[IMPLEMENTED ✅]` — Demonstrable with live code and tests
    - `[LAB SIMULATED 🔬]` — Working in controlled environment, not production-enforced
    - `[PLANNED 🗺️]` — Architecturally designed for future releases
  - Features to label:
    - ML Lexical Classifier — `?`
    - Exact TreeSHAP Explainability — `?`
    - STIX 2.1 Threat Intel — `?`
    - CERT-In TAXII Integration — `[PLANNED 🗺️]` *(No public CERT-In feed exists)*
    - DNS-over-HTTPS (DoH) — `?`
    - DNS-over-TLS (DoT) — `?`
    - DNS-over-QUIC (DoQ) — `[PLANNED 🗺️]`
    - Active Host Quarantine — `[LAB SIMULATED 🔬]`
    - Sinkholing — `[LAB SIMULATED 🔬]`
    - Behavioral Sliding Window — `?`
    - Geo/ASN Enrichment — `?`

- [ ] **1.6 — Disclose CERT-In as a simulated integration**
  - Add a note everywhere CERT-In is mentioned: *"Note: CERT-In does not maintain a publicly accessible STIX/TAXII endpoint. This integration uses a locally-hosted mock TAXII feed in the format of CERT-In advisories, demonstrating compatibility with the CERT-In advisory format."*

- [ ] **1.7 — Clarify DoH/DoT architecture as Inline Resolving Gateway**
  - **Fix**: Add explicit paragraph in ARCHITECTURE.md stating: *"DNS Shield operates as an **inline recursive resolver / forwarder**. It terminates TLS (port 853) and HTTPS (port 443) sessions directly, decrypting DNS query content before inspection. This enables full lexical and behavioral analysis on domain names within encrypted sessions. Enterprise enforcement requires a firewall rule blocking outbound ports 53/853/443 to all hosts except the DNS Shield resolver."*

- [ ] **1.8 — Commit all language/documentation changes as a single PR**
  - **Commit message**: `fix(docs): remove unverified claims, add capability status badges, clarify protocol architecture`

---

## Phase 2: Dataset Documentation & Model Card

> **Goal**: Produce a full, auditable dataset card and model card so that any judge or reviewer can understand exactly what data trained the ML models and can challenge the methodology.
>
> **Git Branch**: `feat/dataset-model-card`

### Tasks

- [ ] **2.1 — Create `DATASET_CARD.md`**
  - Document the following for every dataset used:
    ```
    | Dataset | Source URL | Domains | Type | Date Range | Licence |
    |---------|-----------|---------|------|------------|---------|
    | Tranco Top-1M | tranco-list.eu | 1,000,000 | Benign | 2024-01-01 to 2024-06-01 | Public |
    | DGArchive | dgarchive.caad.it | 600,000 | DGA | 2015–2024 | Academic |
    | Abuse.ch URLhaus | urlhaus.abuse.ch | 50,000 | Malicious | Live feed | CC0 |
    | CIRA-CIC-DoHBrw-2020 | unb.ca/cic/datasets | 140k sessions | Tunnelling/DoH | 2020 | Academic |
    ```
  - Document class imbalance ratios (benign vs malicious in real traffic vs training split).
  - Document any data leakage controls (e.g., temporal split, domain deduplication, family holdout).

- [ ] **2.2 — Create `MODEL_CARD.md`**
  - Document:
    - Algorithm: Random Forest, 150 estimators (justify or change)
    - Feature set: list all 38 features (Shannon entropy, bigram perplexity, digit ratio, vowel ratio, longest consonant run, subdomain count, TLD suspicion score, char n-gram score, etc.)
    - Training split: 70% train / 15% validation / 15% test (temporal split recommended)
    - Random seed used for reproducibility
    - Cross-family evaluation: which DGA families were held out from training
    - Known failure modes and adversarial weaknesses

- [ ] **2.3 — Document data leakage prevention measures**
  - Training set must not contain domains from time periods overlapping the test set.
  - DGA families must be split such that at least 3 unseen families exist in the test set.
  - Benign domains must not be re-used across train/test.

- [ ] **2.4 — Commit dataset and model documentation**
  - **Commit message**: `docs(ml): add dataset card and model card with full methodology disclosure`

---

## Phase 3: ML Benchmarking & Metrics Hardening

> **Goal**: Replace all unverified accuracy claims with a real, reproducible benchmark table that can survive a technical judge cross-examination.
>
> **Git Branch**: `feat/ml-benchmarks`

### Tasks

- [ ] **3.1 — Create `BENCHMARK_RESULTS.md`**
  - This file becomes the single source of truth for all performance claims.
  - Template:

    ```markdown
    ## Evaluation Hardware
    - CPU: [e.g., Intel Core i7-12700H, 14 cores]
    - RAM: [e.g., 16GB DDR5]
    - OS: [e.g., Windows 11 / Ubuntu 22.04]
    - Python: 3.11.x

    ## Classification Benchmark (Test Set)
    | Threat Class | Precision | Recall | F1 | FPR |
    |---|---|---|---|---|
    | Benign (Tranco) | ? | ? | ? | — |
    | DGA (Known families) | ? | ? | ? | ? |
    | DGA (Unseen families) | ? | ? | ? | ? |
    | DNS Tunnelling | ? | ? | ? | ? |
    | Typosquatting | ? | ? | ? | ? |

    ## Latency Benchmark (10,000 queries)
    | Stage | P50 | P95 | P99 | Max |
    |---|---|---|---|---|
    | Redis Cache Hit | ? ms | ? ms | ? ms | ? ms |
    | Threat Intel Lookup | ? ms | ? ms | ? ms | ? ms |
    | ML Inference (single domain) | ? ms | ? ms | ? ms | ? ms |
    | Full Pipeline (cache miss) | ? ms | ? ms | ? ms | ? ms |

    ## Throughput
    - Sustained QPS at <100ms P99: ?
    ```

- [ ] **3.2 — Write and run the benchmark script**
  - Create `ml-training/benchmark.py`:
    - Load trained model
    - Run on test set
    - Generate confusion matrix
    - Compute per-class Precision, Recall, F1, FPR
    - Output a reproducible results file

- [ ] **3.3 — Run latency benchmark under simulated load**
  - Create `infra/latency_benchmark.py`:
    - Send N parallel DNS queries to the API gateway
    - Record P50, P95, P99, max latency per stage
    - Output reproducible latency report

- [ ] **3.4 — Baseline comparison**
  - Measure the same metrics for:
    - Blocklist-only (URLhaus exact match)
    - Entropy threshold-only (Shannon > 3.5 = malicious)
    - DNS Shield full pipeline
  - Present as a comparative table in BENCHMARK_RESULTS.md

- [ ] **3.5 — Run adversarial evaluation**
  - Test with dictionary-based DGAs (word-list DGAs that resemble real domains)
  - Test with low-and-slow tunnelling patterns (reduced frequency to evade rate detection)
  - Test with high-entropy benign domains (CDN tokens, hashed subdomains)
  - Document all failure modes honestly

- [ ] **3.6 — Commit benchmark results and scripts**
  - **Commit message**: `feat(ml): add reproducible benchmark script, latency profiler, and adversarial eval results`

---

## Phase 4: Architecture, Protocol & Deployment Hardening

> **Goal**: Produce verifiable proof that the system actually runs, intercepts real DNS traffic, handles DoH/DoT, and recovers from failures.
>
> **Git Branch**: `feat/architecture-hardening`

### Tasks

- [ ] **4.1 — Create `ARCHITECTURE.md` (updated)**
  - Replace the current description-only document with:
    - Labeled 4-layer architecture diagram (Protocol Gateway → Threat Intel → ML + Behavioral → Decision & Response)
    - Each stage: port binding, library used, failure mode, and fallback behavior
    - Explicit TLS termination points
    - Firewall enforcement rules for enterprise deployment

- [ ] **4.2 — Document DoH/DoT socket bindings**
  - Create `docs/PROTOCOL_ARCHITECTURE.md`:
    - Port 53 (UDP/TCP) — Standard DNS
    - Port 853 (TCP + TLS) — DNS-over-TLS
    - Port 443 (HTTPS HTTP/2) — DNS-over-HTTPS (RFC 8484)
    - Certificate management approach (self-signed for lab, enterprise CA for production)
    - How external resolver bypass is prevented

- [ ] **4.3 — Create Docker Compose deployment manifest**
  - Update `infra/docker-compose.yml` to include all services with:
    - Health check endpoints
    - Environment variable injection (no hardcoded secrets)
    - Automatic restart policies
    - Named volumes for persistence

- [ ] **4.4 — Create `SECURITY.md`**
  - TLS certificate management procedures
  - Secret / API key management (environment-only, no repo commits)
  - Vulnerability disclosure policy
  - Data retention and privacy model (DNS telemetry access controls, retention period, anonymization)

- [ ] **4.5 — Add DNS-over-QUIC (DoQ) to roadmap**
  - Document RFC 9250 and why DoQ is strategically important
  - Add `[PLANNED 🗺️]` badge and architecture notes for future DoQ support

- [ ] **4.6 — Create fail-open / fail-closed documentation**
  - What happens if ML service is down? (Degrade to threat intel matching only)
  - What happens if Redis is down? (Full pipeline cold evaluation)
  - What happens if threat intel feed is unreachable? (Local disk cache fallback)

- [ ] **4.7 — Commit all architecture and deployment improvements**
  - **Commit message**: `feat(arch): add 4-layer architecture doc, protocol bindings, docker hardening, SECURITY.md`

---

## Phase 5: ML Engine Improvements

> **Goal**: Improve the ML classifier with justified hyperparameters, proper feature set, and cross-family evaluation.
>
> **Git Branch**: `feat/ml-engine-improvements`

### Tasks

- [ ] **5.1 — Justify or re-evaluate 150 tree count**
  - Run cross-validation with tree counts: 50, 100, 150, 200, 300
  - Plot F1 vs. inference latency trade-off
  - Document the selected count and why

- [ ] **5.2 — Benchmark Random Forest vs XGBoost vs LightGBM**
  - Train all three on identical dataset/split
  - Compare: F1, FPR, inference latency, SHAP compatibility
  - Justify final algorithm selection

- [ ] **5.3 — Validate and expand the 38-feature set**
  - Current features: Shannon entropy, bigram perplexity, digit ratio, vowel ratio, longest consonant run, subdomain count, TLD suspicion score, char n-gram score
  - Missing features to add:
    - Label length histogram
    - Consonant-cluster density
    - Alexa/Tranco rank-based features
    - NRD (newly registered domain) age feature
    - Punycode/IDN detection flag
    - TLD reputation score (from open TLD reputation lists)

- [ ] **5.4 — Implement strict temporal train/test split**
  - Sort all domains by date of first observation
  - Train on domains seen before a cutoff date
  - Test on domains first observed after that cutoff
  - Prevents future-data leakage

- [ ] **5.5 — Implement cross-family evaluation**
  - Hold out at least 3 complete DGA families from training
  - Measure recall on held-out families specifically
  - Report in BENCHMARK_RESULTS.md as "Unseen DGA family recall"

- [ ] **5.6 — Ensure Random Forest is seeded and reproducible**
  - Add `random_state=42` to all sklearn estimators
  - Pin all dependency versions in `requirements.txt`
  - Document exact reproduction steps

- [ ] **5.7 — Commit ML engine improvements**
  - **Commit message**: `feat(ml): justify hyperparameters, expand feature set, add temporal split and cross-family eval`

---

## Phase 6: Behavioral & Tunnelling Engine Improvements

> **Goal**: Upgrade DNS tunnelling detection beyond Shannon entropy to include full multi-dimensional sliding window analysis.
>
> **Git Branch**: `feat/behavioral-engine-upgrade`

### Tasks

- [ ] **6.1 — Implement per-host sliding window feature extraction**
  - Window size: configurable (default 5 minutes)
  - Per-host features to track:
    - Query rate (queries per second)
    - Unique subdomain count in window
    - Average label length
    - Maximum label length
    - Shannon entropy of subdomains
    - Encoding signature detection (base64 patterns, hex sequences)
    - NXDOMAIN ratio (failed lookups / total lookups)
    - Domain concentration (fraction of queries to single parent domain)
    - Inter-arrival time variance

- [ ] **6.2 — Add encoding signature detection**
  - Detect base64-like patterns in subdomain labels
  - Detect hex-encoded patterns
  - Flag high-ratio uppercase-to-lowercase character sequences

- [ ] **6.3 — Add NXDOMAIN ratio tracking per host**
  - High NXDOMAIN rate is a strong tunnelling and DGA indicator

- [ ] **6.4 — Evaluate against CIRA-CIC-DoHBrw-2020 dataset**
  - Download and run on full tunnelling benchmark dataset
  - Document results in BENCHMARK_RESULTS.md

- [ ] **6.5 — Document behavioral detection thresholds**
  - Create `docs/BEHAVIORAL_ENGINE.md`:
    - What thresholds trigger a FLAG vs BLOCK?
    - How are thresholds configured?
    - How is a window reset after quarantine?

- [ ] **6.6 — Commit behavioral engine upgrade**
  - **Commit message**: `feat(behavioral): upgrade tunnelling detection with 9-dimensional sliding window, NXDOMAIN tracking, encoding signatures`

---

## Phase 7: Typosquatting Similarity Engine

> **Goal**: Replace entropy-based typosquatting detection with an explicit string similarity and homoglyph engine.
>
> **Git Branch**: `feat/typosquatting-engine`

### Tasks

- [ ] **7.1 — Implement Levenshtein distance scoring**
  - Compute edit distance between queried domain and top-1000 brand dictionary
  - Flag domains with edit distance ≤ 2 as suspicious

- [ ] **7.2 — Implement Damerau-Levenshtein distance**
  - Adds transposition operations (swap adjacent chars): catches `goolge.com` type errors

- [ ] **7.3 — Implement Unicode homoglyph / confusable detection**
  - Use Unicode TR39 confusable character map
  - Detect Cyrillic/Greek lookalike substitutions (e.g., `аpple.com` with Cyrillic `а`)

- [ ] **7.4 — Build brand dictionary**
  - Create `ml-training/brand_dictionary.txt` containing:
    - Alexa/Tranco Top-500 brand domains
    - Critical infrastructure domains (ISRO, CERT-In, NIC, government portals)
    - Common financial/banking domains

- [ ] **7.5 — Add TLD substitution scoring**
  - Penalize suspicious TLD swaps: `.com` → `.net`, `.io`, `.xyz`, `.top`, `.tk`

- [ ] **7.6 — Integrate similarity features into ML feature vector**
  - Add min_levenshtein_to_brand, min_dameraulevenshtein_to_brand, has_homoglyph, tld_risk_score as new ML input features

- [ ] **7.7 — Commit typosquatting engine**
  - **Commit message**: `feat(typosquatting): add Levenshtein, Damerau-Levenshtein, homoglyph detection, brand dictionary, TLD scoring`

---

## Phase 8: XAI & Explainability Engine

> **Goal**: Ensure TreeSHAP is computed from the actual live model prediction and surfaced as human-readable analyst context, not cosmetic scores.
>
> **Git Branch**: `feat/xai-engine`

### Tasks

- [ ] **8.1 — Verify TreeSHAP is computed from live model**
  - Audit `services/ml-inference/app.py`: confirm `shap.TreeExplainer` is instantiated from the same `joblib` model artifact used for prediction
  - Ensure SHAP values are computed per-prediction, not pre-cached

- [ ] **8.2 — Map raw SHAP values to human-readable analyst reasons**
  - Create `services/ml-inference/xai_formatter.py`:
    - `entropy → "High Shannon entropy ({:.2f}) — indicates algorithmically random character distribution"`
    - `digit_ratio → "Elevated digit ratio ({:.0%}) — unusually high number content"`
    - `tld_suspicion → "Suspicious TLD ({tld}) — high-risk top-level domain"`
    - `char_ngram_score → "Low character n-gram score — unusual character sequence transitions"`
    - etc. for all 38 features

- [ ] **8.3 — Add top-3 feature contribution summary to every API response**
  - Every `/v1/query` response should include:
    ```json
    "xai": {
      "top_contributors": [
        {"feature": "entropy", "value": 4.83, "contribution": 0.71, "reason": "High Shannon entropy — indicates algorithmically random character distribution"},
        {"feature": "tld_suspicion", "value": 0.9, "contribution": 0.42, "reason": "Suspicious TLD (.xyz) — rarely used by legitimate domains"},
        {"feature": "char_ngram_score", "value": 0.12, "contribution": 0.38, "reason": "Low character n-gram score — unusual character sequences"}
      ]
    }
    ```

- [ ] **8.4 — Test SHAP stability on similar inputs**
  - Slightly mutate known domains and verify SHAP attributions remain consistent
  - Flag cases where explanations flip for near-identical inputs (instability)

- [ ] **8.5 — Commit XAI engine improvements**
  - **Commit message**: `feat(xai): verify TreeSHAP from live model, human-readable analyst reasons, top-3 contributors in API response`

---

## Phase 9: Active Response & Safety Controls

> **Goal**: Implement a safe, analyst-approved, reversible quarantine mechanism that prevents operational disruption from false positives.
>
> **Git Branch**: `feat/safe-response`

### Tasks

- [ ] **9.1 — Implement analyst approval workflow**
  - Before any quarantine action: SOC dashboard must show analyst a confirmation dialog with:
    - Host IP, device name, triggering domain, risk score, XAI explanation
    - "Approve Quarantine" / "Override as False Positive" buttons
    - Estimated quarantine duration (default: 30 minutes, configurable)

- [ ] **9.2 — Implement dry-run mode**
  - Add `QUARANTINE_MODE=dry_run` environment flag
  - In dry-run mode: all quarantine actions are logged but never executed

- [ ] **9.3 — Implement quarantine expiration and auto-rollback**
  - Each quarantine record stores: host, triggered at, duration, analyst who approved
  - Automatic rollback after TTL expires (default: 30 minutes)
  - Manual rollback button in SOC dashboard

- [ ] **9.4 — Add emergency bypass / allowlist**
  - `dns_shield_allowlist.txt` — domains that are always ALLOW regardless of ML scores
  - `device_allowlist.txt` — endpoints that are never quarantined (critical infrastructure)

- [ ] **9.5 — Implement audit log**
  - Every BLOCK/QUARANTINE action writes to tamper-evident audit log:
    - Timestamp, Domain, Client IP, Risk Score, XAI Reason, Action, Analyst, Rollback Status

- [ ] **9.6 — Commit safe response controls**
  - **Commit message**: `feat(response): add analyst approval workflow, dry-run mode, auto-expiry rollback, allowlist, audit log`

---

## Phase 10: Live Attack Demonstration & Demo Scripts

> **Goal**: Build a 5-minute offline, reproducible, scripted attack demonstration that any judge can verify locally without internet connectivity.
>
> **Git Branch**: `feat/demo-scripts`

### Tasks

- [ ] **10.1 — Create `demo/` directory structure**
  ```
  demo/
  ├── README.md              (demo instructions)
  ├── 01_benign_traffic.py   (phase 1: normal browsing)
  ├── 02_dga_burst.py        (phase 2: DGA domain flood)
  ├── 03_dns_tunnel.py       (phase 3: DNS tunnelling simulation)
  ├── 04_typosquat.py        (phase 4: lookalike domain queries)
  ├── 05_xai_inspect.py      (phase 5: XAI explanation viewer)
  ├── 06_quarantine_demo.py  (phase 6: quarantine and rollback)
  ├── domain_lists/
  │   ├── benign.txt         (100 Tranco top domains)
  │   ├── dga_burst.txt      (100 pre-generated DGA domains)
  │   ├── tunnelling.txt     (50 encoded subdomain queries)
  │   └── typosquats.txt     (30 homoglyph/edit-distance domains)
  └── expected_outputs/
      ├── alert_sample.json  (expected alert JSON for judges)
      └── xai_sample.json    (expected XAI breakdown JSON)
  ```

- [ ] **10.2 — Build phase 1: Benign traffic simulator**
  - Send 50 Tranco top-1000 domains as DNS queries
  - Expected: all ALLOW, P50 < 5ms (cache hit), dashboard shows green

- [ ] **10.3 — Build phase 2: DGA burst simulator**
  - Send 100 algorithmically generated domains
  - Covers: random character DGAs, high-entropy, unusual TLDs
  - Expected: ≥90% BLOCK rate, XAI shows entropy as top contributor

- [ ] **10.4 — Build phase 3: DNS tunnelling simulator**
  - Send queries with base64-encoded subdomains to a controlled test domain
  - Covers: high-entropy subdomains, encoding patterns, elevated query rate
  - Expected: behavioral engine triggers FLAG/BLOCK with behavioral window explanation

- [ ] **10.5 — Build phase 4: Typosquatting simulator**
  - Query: `rnicrosoft.com`, `g00gle.com`, `аpple.com` (Cyrillic a), `paypa1.com`
  - Expected: BLOCK with Levenshtein distance and homoglyph attribution

- [ ] **10.6 — Build phase 5: XAI inspection script**
  - For each blocked domain, print the top-3 SHAP contributors in human-readable format
  - Must show that SHAP values are computed from live model, not cached

- [ ] **10.7 — Build phase 6: Quarantine & rollback demo**
  - Trigger quarantine via API in dry-run mode (show confirmation flow)
  - Roll back quarantine and show audit log entry
  - Export incident as JSON/CSV

- [ ] **10.8 — Record demo walkthrough (optional)**
  - Use browser_subagent to record the SOC dashboard as the attack sequence runs
  - Save as `.webp` or `.mp4` for README embedding

- [ ] **10.9 — Commit demo scripts**
  - **Commit message**: `feat(demo): add 6-phase offline attack demonstration scripts with expected outputs`

---

## Phase 11: CI/CD, Testing & Monitoring

> **Goal**: Add automated testing and continuous integration so every future commit is validated against core correctness criteria.
>
> **Git Branch**: `feat/cicd-testing`

### Tasks

- [ ] **11.1 — Add unit tests for ML classifier**
  - Test that known DGA domains return BLOCK verdict
  - Test that Tranco top-100 domains return ALLOW verdict
  - Test that SHAP values are non-zero and sum correctly

- [ ] **11.2 — Add integration tests for API gateway**
  - Test `/v1/query` endpoint returns correct schema
  - Test `/v1/stats` returns non-zero metrics
  - Test `/health` returns 200 OK

- [ ] **11.3 — Add unit tests for behavioral engine**
  - Test that high-frequency queries from a single host trigger FLAG
  - Test that sliding window resets correctly after TTL

- [ ] **11.4 — Configure GitHub Actions CI pipeline**
  - Create `.github/workflows/ci.yml`:
    - Trigger on every push and pull request to `main`
    - Steps: install dependencies, run unit tests, run linting, check format

- [ ] **11.5 — Add Prometheus metrics exporters**
  - Cache hit ratio
  - ML inference latency histogram
  - Queries per second
  - Blocked/Flagged/Allowed counters
  - Behavioral alerts per window

- [ ] **11.6 — Add `/health` and `/metrics` endpoints to API gateway**

- [ ] **11.7 — Commit CI/CD and monitoring**
  - **Commit message**: `feat(cicd): add unit/integration tests, GitHub Actions CI, Prometheus metrics endpoints`

---

## Phase 12: SOC Dashboard Evidence Panels

> **Goal**: Upgrade the SOC dashboard from a visual demo to an evidence-first operational interface, where every element shows real data with verifiable context.
>
> **Git Branch**: `feat/dashboard-evidence-panels`

### Tasks

- [ ] **12.1 — Add XAI explanation panel to domain inspector**
  - Show top-3 feature contributors as a bar chart
  - Display human-readable analyst reason for each feature
  - Show raw feature values alongside the attribution score

- [ ] **12.2 — Add feature status badges to all pages**
  - Display `[IMPLEMENTED ✅]`, `[LAB SIMULATED 🔬]`, `[PLANNED 🗺️]` badges on relevant dashboard sections

- [ ] **12.3 — Add latency performance monitor widget**
  - Real-time P50/P95/P99 latency for:
    - Cache hits
    - Full pipeline
    - ML inference specifically

- [ ] **12.4 — Add benchmark scorecard page**
  - Static page showing the verified benchmark table from BENCHMARK_RESULTS.md
  - Confusion matrix visualization
  - Baseline comparison chart (DNS Shield vs blocklist-only vs entropy-only)

- [ ] **12.5 — Add forensic export functionality**
  - Export incident timeline as JSON
  - Export alert table as CSV
  - Export XAI breakdown for a specific domain as PDF-ready HTML

- [ ] **12.6 — Add quarantine management panel**
  - List current quarantined hosts
  - Show remaining TTL countdown
  - Manual rollback button per host
  - Full audit log viewer

- [ ] **12.7 — Commit dashboard evidence improvements**
  - **Commit message**: `feat(dashboard): add XAI panel, latency monitor, benchmark scorecard, forensic export, quarantine management`

---

## Git Commit Strategy

Each phase produces at minimum **one focused pull request** with a clear, descriptive commit message. This creates a clean, professional GitHub contribution history.

| Phase | Branch | PR Title |
|---|---|---|
| Phase 1 | `fix/credibility-language-cleanup` | `fix(docs): remove unverified claims, add capability status badges` |
| Phase 2 | `feat/dataset-model-card` | `docs(ml): add dataset card and model card with full methodology disclosure` |
| Phase 3 | `feat/ml-benchmarks` | `feat(ml): add reproducible benchmark script and empirical results` |
| Phase 4 | `feat/architecture-hardening` | `feat(arch): 4-layer architecture, protocol bindings, docker hardening, SECURITY.md` |
| Phase 5 | `feat/ml-engine-improvements` | `feat(ml): justify hyperparameters, expand features, add temporal + cross-family eval` |
| Phase 6 | `feat/behavioral-engine-upgrade` | `feat(behavioral): 9-dimensional sliding window tunnelling detection` |
| Phase 7 | `feat/typosquatting-engine` | `feat(typosquatting): Levenshtein, homoglyph detection, brand dictionary` |
| Phase 8 | `feat/xai-engine` | `feat(xai): live TreeSHAP, human-readable analyst reasons, top-3 API contributors` |
| Phase 9 | `feat/safe-response` | `feat(response): approval workflow, dry-run, auto-expiry rollback, audit log` |
| Phase 10 | `feat/demo-scripts` | `feat(demo): 6-phase offline attack demonstration scripts` |
| Phase 11 | `feat/cicd-testing` | `feat(cicd): GitHub Actions CI, unit tests, Prometheus metrics` |
| Phase 12 | `feat/dashboard-evidence-panels` | `feat(dashboard): XAI panel, latency monitor, benchmark scorecard, forensic export` |

---

## References

* RFC 9250 — DNS over Dedicated QUIC Connections
* MITRE ATT&CK T1071.004 — Application Layer Protocol: DNS
* Jeremiah et al. (2025) — NIOM-DGA: Nature-Inspired Optimization for DGA Detection
* La O et al. (2024) — Llama3-8B Fine-Tuned for Word-Based DGA Detection
* Sammour et al. (2025) — Hybrid RF + Grey Wolf Optimizer for Encrypted DNS Tunnelling
* Isik et al. (2025) — DNS Sentinel: Multi-Class DoH/DGA ML Classifier
* Welch (2025) — Phi-4 14B Character-Level Typosquatting Transformer
* CIRA-CIC-DoHBrw-2020 Dataset — University of New Brunswick CIC
* DGArchive — caad.fkie.fraunhofer.de/dgarchive
