# DNS Shield — Agent & Contributor Handoff Document

> **Created**: 2026-08-20 | **Project**: DNS Shield — SIH 2026  
> **Author**: Kshitiz Khandelwal  
> **Purpose**: This document preserves all quality standards, editorial philosophy, architectural decisions, and work-in-progress state so that any future agent, contributor, or session can continue without degrading what has already been established.

---

## ⚡ Quick State Summary — Read This First

```
PHASE 1  ✅ COMPLETE  — Credibility & Documentation Cleanup       (commit: 9d39e11)
PHASE 2  ✅ COMPLETE  — Dataset Card & Model Card                 (commit: 8e428ce)
PHASE 3  🗺️ NEXT      — ML Benchmarking & Metrics Hardening
PHASE 4  🗺️ PENDING   — Architecture & Deployment Hardening
PHASE 5  🗺️ PENDING   — ML Engine Improvements
PHASE 6  🗺️ PENDING   — Behavioral & Tunnelling Engine Upgrade
PHASE 7  🗺️ PENDING   — Typosquatting Similarity Engine
PHASE 8  🗺️ PENDING   — XAI Engine Hardening
PHASE 9  🗺️ PENDING   — Safe Active Response Controls
PHASE 10 🗺️ PENDING   — Live Attack Demonstration Scripts
PHASE 11 🗺️ PENDING   — CI/CD, Testing & Monitoring
PHASE 12 🗺️ PENDING   — SOC Dashboard Evidence Panels
```

**Full phase definitions**: [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md)  
**Full audit/improvement list**: [`IMPROVEMENTS.md`](./IMPROVEMENTS.md)

---

## 1. The Non-Negotiable Quality Rules

These rules were established through deep technical audit. Violating them will undo all progress made. Any agent or contributor MUST follow these:

### 1.1 The Golden Rule — Claims Must Be Provable

> **Never write a performance claim, accuracy number, or feature capability without either (a) a live implementation reference, or (b) an explicit status badge.**

| What to write | When |
|---|---|
| `[IMPLEMENTED ✅]` | Feature exists in code, has a test or verifiable demo |
| `[LAB SIMULATED 🔬]` | Feature works in a controlled lab environment, not production-enforced |
| `[PLANNED 🗺️]` | Architecturally designed but not yet coded |

**Never write a plain unqualified claim** like "supports CERT-In feeds" or ">99% accuracy" without a badge and a caveat.

### 1.2 The Accuracy Rule

- **Never cite `99.42%` accuracy alone.** It must always be accompanied by: Precision, Recall, F1, FPR, and the disclaimer that it is a training-split result, not an independent cross-family or adversarial evaluation.
- The correct framing is: *"Reported Training-Split Metrics: Accuracy 99.42% · Precision 0.9931 · Recall 0.9905 · F1 0.9918 · FPR <0.01% · ⚠️ training/test split only"*
- See [`BENCHMARK_RESULTS.md`](./BENCHMARK_RESULTS.md) for the pending independent benchmarks.

### 1.3 The CERT-In Rule

**CERT-In does not have a publicly accessible STIX/TAXII endpoint.** Any time CERT-In is mentioned, use this exact disclosure:

> *"CERT-In format-compatible STIX 2.1 IOC ingestion `[LAB SIMULATED 🔬]`. Note: CERT-In does not maintain a publicly accessible STIX/TAXII endpoint. DNS Shield accepts STIX 2.1 bundles in the format of CERT-In advisories. A live CERT-In TAXII connection requires a formal bilateral agreement."*

### 1.4 The Latency Rule

**Never write "sub-100ms latency" as a proven fact.** The only acceptable framing is:
- *"Target latency: P99 < 100ms — empirical benchmark pending, see [`BENCHMARK_RESULTS.md`](./BENCHMARK_RESULTS.md)"*
- OR if benchmarks are run: *"Measured P50 X ms · P95 Y ms · P99 Z ms on [hardware spec], [N] queries"*

### 1.5 The No-Empty-State Rule

No phase, feature, or section should be left as "Coming Soon" or empty. If work is pending, it must be:
1. Documented in `BENCHMARK_RESULTS.md` or `IMPLEMENTATION_ROADMAP.md` with a `🗺️ PENDING` label
2. Have a `_TBD_` placeholder with instructions on how to fill it
3. Never presented as if it is complete

### 1.6 The Commit Hygiene Rule

Every phase produces one clean, descriptive commit:
- Format: `<type>(scope): Phase N – <short description>`
- Example: `docs(ml): Phase 2 – add DATASET_CARD.md, MODEL_CARD.md, BENCHMARK_RESULTS.md scaffold`
- After every commit: `git push origin main` immediately.

---

## 2. Files Created / Modified — Authoritative Index

### 2A. New Files Added in This Improvement Session

| File | Purpose | Phase |
|---|---|---|
| [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md) | Master 12-phase improvement tracker with tasks, branch names, commit messages | — |
| [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) | Full consolidated audit: all critiques, research citations, raw improvement points (read-only reference) | — |
| [`DATASET_CARD.md`](./DATASET_CARD.md) | Auditable dataset documentation: sources, schema, split strategy, leakage controls, licences | Phase 2 |
| [`MODEL_CARD.md`](./MODEL_CARD.md) | Auditable model documentation: algorithm rationale, all features, hyperparameters, failure modes, reproduction steps | Phase 2 |
| [`BENCHMARK_RESULTS.md`](./BENCHMARK_RESULTS.md) | Pre-structured results scaffold; target for Phase 3; existing training-split numbers with honest caveats | Phase 2 |

### 2B. Files Modified in This Session

| File | What Changed | Phase |
|---|---|---|
| [`README.md`](./README.md) | Added Capability Status table; Protocol Architecture Note; replaced bare `99.42%` with honest framing; fixed CERT-In tech stack line | Phase 1 |
| [`DATASET_AND_MODEL_SPECS.md`](./DATASET_AND_MODEL_SPECS.md) | Section 5 retitled "Training-Split Results" with methodological disclosure block; added cross-links to new cards | Phase 1 + 2 |
| [`IDEATION_AND_STRATEGY.md`](./IDEATION_AND_STRATEGY.md) | Softened "fills every single gap" overclaim; qualified CERT-In as format-compatible only | Phase 1 |
| [`docs/DNS_Shield_Technical_Resource.md`](./docs/DNS_Shield_Technical_Resource.md) | Added `[LAB SIMULATED 🔬]` badge to CERT-In entry in overview table | Phase 1 |
| [`docs/DNS_Shield_Interview_Report.md`](./docs/DNS_Shield_Interview_Report.md) | Feed table badges; CERT-In disclosure block; STIX 2.1 Q&A rewritten to be accurate about no public TAXII endpoint | Phase 1 |

### 2C. Files That Must NOT Be Modified Without Reason

| File | Why Hands-Off |
|---|---|
| [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) | Master audit reference. Read-only. Changes should only add, never delete. |
| [`DATASET_AND_MODEL_SPECS.md`](./DATASET_AND_MODEL_SPECS.md) | Keep in sync with `DATASET_CARD.md`. If you edit one, check the other. |
| [`HANDOFF.md`](./HANDOFF.md) (the original) | Pre-session handoff. Keep for historical context. |

---

## 3. Architecture Decisions — Don't Reverse These

These are settled decisions from the audit session. Re-opening them wastes time.

| Decision | What Was Decided | Why |
|---|---|---|
| **ML in synchronous path** | Random Forest only. No LLMs in the hot path. | LLMs are too slow (<100ms budget). LLMs belong in the out-of-band SOC assistant only. |
| **DoH/DoT model** | Inline recursive resolver / forwarder (not proxy). Terminates TLS at the resolver. | Only model where "multi-protocol interception" is technically defensible. |
| **Active response safety** | Analyst approval required before quarantine. Dry-run mode must exist. | Automated quarantine without approval can cause outages. |
| **XAI must be live** | TreeSHAP must be computed from the actual live model artifact, not pre-cached. | Pre-cached SHAP values are not genuine explainability. |
| **CERT-In is lab-simulated** | Never claim live CERT-In integration. | No public CERT-In TAXII endpoint exists. |
| **Capability badge system** | IMPLEMENTED / LAB SIMULATED / PLANNED badges on every feature claim. | Prevents overclaiming to judges. |
| **Latency requires percentiles** | P50/P95/P99 format only, not "under 100ms". | "Under 100ms" is meaningless without percentile context. |
| **No LLM integration in detection** | Removed from synchronous detection pipeline. | Wrong architecture for DNS latency budget. |

---

## 4. The Feature Map — Current Implementation Status

Use this to answer "is X implemented?" questions instantly:

| Feature | Code Location | Status |
|---|---|---|
| 7-stage detection pipeline | `services/api-gateway/app.py` | `[IMPLEMENTED ✅]` |
| Lexical ML classifier | `services/ml-inference/app.py` | `[IMPLEMENTED ✅]` |
| Feature extraction (11 engineered) | `dns_shield_features.py` | `[IMPLEMENTED ✅]` |
| Char TF-IDF n-grams | `ml-training/train.py` → `TfidfVectorizer` | `[IMPLEMENTED ✅]` |
| TreeSHAP XAI | `services/ml-inference/app.py` | `[IMPLEMENTED ✅]` — verify live model path |
| Redis Bloom Filter + LRU Cache | `services/api-gateway/` + Redis config | `[IMPLEMENTED ✅]` |
| URLhaus threat feed | `services/threat-intel/app.py` | `[IMPLEMENTED ✅]` |
| STIX 2.1 IOC export | `services/threat-intel/app.py` `/stix/bundle` | `[IMPLEMENTED ✅]` |
| Behavioral sliding window | `services/behavioral-engine/app.py` | `[IMPLEMENTED ✅]` |
| Geo/ASN enrichment (GeoLite2) | `services/geo-intel/app.py` | `[IMPLEMENTED ✅]` |
| DNS-over-UDP (Port 53) | `services/resolver-core/` (Go) | `[IMPLEMENTED ✅]` |
| Adversarial hardening (7 mutations) | `ml-training/adversarial_eval.py` | `[IMPLEMENTED ✅]` |
| SOC Dashboard | `frontend/` (Next.js) | `[IMPLEMENTED ✅]` |
| Active Response: Sinkholing | `services/active-response/app.py` | `[LAB SIMULATED 🔬]` |
| Active Response: Quarantine | `services/active-response/app.py` | `[LAB SIMULATED 🔬]` |
| CERT-In STIX ingestion | `services/threat-intel/app.py` | `[LAB SIMULATED 🔬]` |
| DNS-over-TLS (Port 853) | `services/resolver-core/` | `[LAB SIMULATED 🔬]` |
| DNS-over-HTTPS (Port 443) | `services/resolver-core/` | `[LAB SIMULATED 🔬]` |
| Analyst approval workflow | Not yet coded | `[PLANNED 🗺️]` |
| Auto-expiry quarantine rollback | Not yet coded | `[PLANNED 🗺️]` |
| DNS-over-QUIC (RFC 9250) | Not yet coded | `[PLANNED 🗺️]` |
| Cross-family holdout eval | Not yet run | `[PLANNED 🗺️]` |
| Temporal holdout eval | Not yet run | `[PLANNED 🗺️]` |
| P50/P95/P99 latency benchmark | Not yet run | `[PLANNED 🗺️]` |
| Prometheus metrics | Not yet coded | `[PLANNED 🗺️]` |
| GitHub Actions CI | Not yet configured | `[PLANNED 🗺️]` |

---

## 5. What Phase 3 Must Do — Exactly

Phase 3 is **ML Benchmarking & Metrics Hardening**. The target document is [`BENCHMARK_RESULTS.md`](./BENCHMARK_RESULTS.md). Here is exactly what must happen:

### Step 3.1 — Run the stratified benchmark (already done, needs verification)
```bash
# Verify existing metrics from the joblib artifact
python ml-training/train.py \
  --data data/dga_dataset.csv \
  --name dga --version 1 \
  --source "see DATASET_CARD.md" --algorithm rf
# → ml-training/artifacts/dga-v1.metrics.json
```

### Step 3.2 — Run the chronological split benchmark
```bash
python ml-training/train.py \
  --data data/dga_dataset.csv \
  --name dga --version 2 \
  --source "see DATASET_CARD.md" --algorithm rf \
  --chronological
# → ml-training/artifacts/dga-v2.metrics.json
```

### Step 3.3 — Run adversarial evaluation
```bash
python ml-training/adversarial_eval.py \
  --data data/dga_dataset.csv \
  --model ml-training/artifacts/dga-v1.joblib \
  --name dga --version 1
# → ml-training/artifacts/adversarial_report.json
```

### Step 3.4 — Write latency benchmark script
Create `infra/latency_benchmark.py` that:
- Sends 10,000 queries to `http://localhost:8080/v1/query`
- Records P50, P95, P99, max latency for each pipeline stage
- Outputs results as JSON and fills `BENCHMARK_RESULTS.md` Section 6

### Step 3.5 — Fill in `BENCHMARK_RESULTS.md` Sections 2–8 with real numbers

### Step 3.6 — Commit
```
feat(ml): Phase 3 – add empirical benchmark results (chronological split, adversarial eval, latency)
```

---

## 6. Key Technical Context — Don't Lose This

### 6A. Why the `dns_shield_features.py` file is at root level
`joblib` serialises a `FunctionTransformer` by storing a reference to the function's module path — not its source code. If `domain_features` were defined in `train.py`, it would pickle as `__main__.domain_features`, which fails to unpickle in the inference service (different `__main__`). Keeping it in `dns_shield_features.py` at root ensures it resolves identically in both training and inference contexts.

**Rule**: Never move `dns_shield_features.py` or rename the `domain_features` function without updating both `ml-training/train.py` and `services/ml-inference/app.py` simultaneously, then re-running the artifact reload verification check.

### 6B. The 11 Engineered Features (exact, canonical list)
Source of truth: `dns_shield_features.py::ENGINEERED_FEATURE_NAMES`
```python
["length", "entropy", "digit_ratio", "vowel_ratio", "consonant_ratio",
 "unique_char_ratio", "hyphen_ratio", "longest_consonant_run",
 "longest_digit_run", "label_count", "has_digit"]
```
These 11 + char TF-IDF n-grams = what DATASET_AND_MODEL_SPECS.md calls "38 features" (the TF-IDF component is variable-dimension).

### 6C. The Risk Score System
```
threat_hit = True          → BLOCK  (immediate, skip ML)
total_risk_score >= 71     → BLOCK
total_risk_score 41–70     → FLAG   (analyst review)
total_risk_score < 41      → ALLOW
ML uncertainty + no hit    → FLAG   (never BLOCK on uncertainty alone)
```

### 6D. Service Ports
```
API Gateway:        8080
ML Inference:       8000
Behavioral Engine:  8001
Geo Intel:          8002
Threat Intel:       8003
Active Response:    8004
Analytics Store:    8005
Redis:              6379
Frontend (dev):     3000
DNS Resolver:       5353 (lab), 53 (production)
```

### 6E. The Vercel Live Demo URL
`https://sih-dns-wala-proejct-mchj-opnxlvdsq.vercel.app/console/index.html`  
> Note: URL contains a typo in the repo name (`proejct` not `project`) — this is the real URL, do not correct it.

---

## 7. Files a Judge Will Ask For — Where They Are

| Judge Question | Document to Show |
|---|---|
| "Show me your dataset sources and licences" | [`DATASET_CARD.md`](./DATASET_CARD.md) |
| "What features does your model use?" | [`MODEL_CARD.md`](./MODEL_CARD.md) Section 4 |
| "Why Random Forest? Why not XGBoost?" | [`MODEL_CARD.md`](./MODEL_CARD.md) Section 2 |
| "What is your actual false positive rate?" | [`BENCHMARK_RESULTS.md`](./BENCHMARK_RESULTS.md) + [`MODEL_CARD.md`](./MODEL_CARD.md) Section 6 |
| "Can you reproduce these results?" | [`MODEL_CARD.md`](./MODEL_CARD.md) Section 11 |
| "Show me your architecture" | [`ARCHITECTURE.md`](./ARCHITECTURE.md) + [`README.md`](./README.md) Architecture section |
| "How does DoH/DoT interception work?" | [`README.md`](./README.md) Protocol Architecture Note |
| "Is CERT-In really integrated?" | [`docs/DNS_Shield_Interview_Report.md`](./docs/DNS_Shield_Interview_Report.md) STIX 2.1 Q&A |
| "What happens if the ML service goes down?" | [`docs/DNS_Shield_Interview_Report.md`](./docs/DNS_Shield_Interview_Report.md) Resilience Q&A |
| "Can I see the XAI output?" | Live demo at `/console/index.html` → query any domain |
| "What's left to implement?" | [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md) Phases 3–12 |

---

## 8. What Must Never Be Done

| Action | Why It's Forbidden |
|---|---|
| Writing ">99% accuracy" without the training-split caveat | Judges with ML background will immediately challenge it |
| Writing "CERT-In integration" without the `[LAB SIMULATED]` disclosure | CERT-In has no public TAXII endpoint — this is a verifiable lie |
| Writing "sub-100ms latency" as a fact | No load test has been run; P95/P99 are unknown |
| Claiming "traditional defenses fail completely" | Blocklists still work for known IOCs — technically indefensible |
| Claiming "91% of malware relies on DNS" without a citation | The original source, methodology, and date are unknown |
| Removing the `⚠️` disclaimer block from `DATASET_AND_MODEL_SPECS.md` Section 5 | That block is what makes the metrics credible, not damaging |
| Moving `dns_shield_features.py` without updating both train.py and ml-inference | Will break model artifact reload at inference time |
| Adding LLM to synchronous detection pipeline | Wrong architecture for DNS latency budget |
| Implementing quarantine without analyst approval | Can cause legitimate host outages |

---

## 9. Editorial Voice & Tone Standard

The audit established a specific voice for all documentation:

- **Precise over impressive**: Write what the system actually does, not what sounds good.
- **Evidence over assertion**: Every performance claim needs a measurement methodology reference.
- **Honest limitations**: Every feature document must include a "Known Limitations" section.
- **Calibrated confidence**: Use "target", "planned", "aim" for unverified claims. Use "measured", "observed", "empirical" only for verified results.
- **Avoid cybersecurity buzzwords without substance**: "AI-powered", "next-gen", "military-grade" — these words add zero credibility with technical judges.

**Example of wrong tone** (do not write this):
> "DNS Shield is a cutting-edge AI-powered threat detection system delivering >99% accuracy with near-zero false positives."

**Example of correct tone** (write this instead):
> "DNS Shield is a lexical + behavioral DNS classifier targeting ≥95% recall on DGA domains with an explicitly measured false-positive budget. Training-split metrics and the ongoing independent benchmark plan are documented in `BENCHMARK_RESULTS.md`."

---

## 10. Git Branch & Commit Convention

| Phase | Branch Name | Commit Prefix |
|---|---|---|
| Phase 1 | `fix/credibility-language-cleanup` | `fix(docs):` |
| Phase 2 | `feat/dataset-model-card` | `docs(ml):` |
| Phase 3 | `feat/ml-benchmarks` | `feat(ml):` |
| Phase 4 | `feat/architecture-hardening` | `feat(arch):` |
| Phase 5 | `feat/ml-engine-improvements` | `feat(ml):` |
| Phase 6 | `feat/behavioral-engine-upgrade` | `feat(behavioral):` |
| Phase 7 | `feat/typosquatting-engine` | `feat(typosquatting):` |
| Phase 8 | `feat/xai-engine` | `feat(xai):` |
| Phase 9 | `feat/safe-response` | `feat(response):` |
| Phase 10 | `feat/demo-scripts` | `feat(demo):` |
| Phase 11 | `feat/cicd-testing` | `feat(cicd):` |
| Phase 12 | `feat/dashboard-evidence-panels` | `feat(dashboard):` |

---

## 11. On Resuming Work in a New Session

If a new agent or a truncated conversation needs to resume:

1. **Read this file first** — it is the single source of truth for quality standards.
2. **Check `IMPLEMENTATION_ROADMAP.md`** — look at the progress table to find the next `⏳ Not Started` phase.
3. **Read the phase's task list** in `IMPLEMENTATION_ROADMAP.md` — each task has exact file targets, current text, and replacement text.
4. **Check `IMPROVEMENTS.md`** for any raw audit point not yet addressed.
5. **Always commit at the end of each phase** — even partial progress is better committed than lost.
6. **Update the progress table** in `IMPLEMENTATION_ROADMAP.md` when a phase is complete.
7. **Never degrade quality** — if unsure whether a claim is verifiable, add a `[LAB SIMULATED 🔬]` badge rather than leaving it bare.

---

## 12. Overall Project Context

**Event**: Smart India Hackathon (SIH) 2026  
**Problem Statement**: SIH260003 — AI-Powered Secure DNS Filtering Service  
**Organisation**: Indian Space Research Organisation (ISRO)  
**Category**: Software | Space Technology  
**Live Demo**: https://sih-dns-wala-proejct-mchj-opnxlvdsq.vercel.app/console/index.html  
**GitHub**: https://github.com/Kshitiz-Khandelwal/SIH-DNS-wala-proejct  

**The core ask from the problem statement**: Build a DNS filtering service that detects malware C2 communication, DGA domains, DNS tunnelling, and phishing, with explainability for SOC analysts, and sub-100ms query evaluation.

**What the audit found**: The system has strong architecture and a working ML pipeline. The critical gap is **lack of empirical evidence** — no independently measured metrics, no benchmark against baselines, no cross-family evaluation, no load test. Phases 3–12 close that gap systematically.

---

*This handoff was generated on 2026-08-20 after completing Phases 1 and 2 of the improvement roadmap. All future work should begin by reading Section 1 (Quick State Summary) and Section 1 (Quality Rules).*
