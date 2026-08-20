# DNS Shield — Benchmark Results

> **Status**: 🗺️ IN PROGRESS — This file is the authoritative target for Phase 3 of the [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md).
>
> **Why this file exists**: The metrics quoted in `DATASET_AND_MODEL_SPECS.md` are from an internal 80/20 stratified train-test split. They do **not** represent independent evaluation against unseen DGA families, adversarial inputs, or temporal holdouts. This file will document all of those results once run.

---

## Evaluation Hardware (to be filled)

| Component | Specification |
|---|---|
| CPU | _TBD_ |
| RAM | _TBD_ |
| OS | _TBD_ |
| Python | 3.11.x |
| scikit-learn | _TBD_ |
| Dataset SHA-256 | _TBD_ |

---

## 1. Classification Benchmark — Stratified Split (Baseline)

> Training-split results. Already documented in [DATASET_AND_MODEL_SPECS.md](./DATASET_AND_MODEL_SPECS.md).

| Class | Precision | Recall | F1 | FPR |
|---|---|---|---|---|
| Benign (Tranco + CDN) | 0.9931 | 0.9905 | 0.9918 | — |
| Malicious (all families) | 0.9931 | 0.9905 | 0.9918 | <0.01% |
| **Weighted Avg** | **0.9931** | **0.9905** | **0.9918** | — |

> ⚠️ These numbers are **training-split only** and must not be presented without the caveats in [MODEL_CARD.md](./MODEL_CARD.md) Section 6.

---

## 2. Classification Benchmark — Chronological Split 🗺️ PENDING

> Will be populated when `python ml-training/train.py --chronological` is run on the full labelled dataset.

| Class | Precision | Recall | F1 | FPR |
|---|---|---|---|---|
| Benign | _TBD_ | _TBD_ | _TBD_ | — |
| Malicious (known families) | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| **Weighted Avg** | _TBD_ | _TBD_ | _TBD_ | — |

---

## 3. Cross-Family Holdout Evaluation 🗺️ PENDING

> At least 3 complete DGA families held out from training, evaluated separately.

| Held-Out Family | Family Type | Recall | Notes |
|---|---|---|---|
| _TBD_ | _TBD_ | _TBD_ | |
| _TBD_ | _TBD_ | _TBD_ | |
| _TBD_ | _TBD_ | _TBD_ | |

---

## 4. Adversarial Evasion Evaluation 🗺️ PENDING

> Results from `python ml-training/adversarial_eval.py`. Failure rate = % of mutated malicious domains the model incorrectly classifies as benign.

| Mutation Strategy | Failure Rate (Pre-Hardening) | Failure Rate (Post-Hardening) | Notes |
|---|---|---|---|
| Vowel injection | _TBD_ | _TBD_ | |
| TLD swapping | _TBD_ | _TBD_ | |
| Digit removal | _TBD_ | _TBD_ | |
| Hyphen insertion | _TBD_ | _TBD_ | |
| Subdomain wrapping | _TBD_ | _TBD_ | |
| Length padding | _TBD_ | _TBD_ | |
| Unicode lookalikes | _TBD_ | _TBD_ | |
| **Combined (all 7)** | _TBD_ | _TBD_ | |

---

## 5. Baseline Comparison 🗺️ PENDING

| Approach | Precision | Recall | F1 | FPR | Notes |
|---|---|---|---|---|---|
| **Blocklist-only** (URLhaus exact match) | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Only catches known-bad IOCs |
| **Entropy-only** (Shannon > 3.5 = malicious) | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Single-feature threshold |
| **DNS Shield (ML + Threat Intel)** | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Full pipeline |

---

## 6. Latency Benchmark 🗺️ PENDING

> To be run via `infra/latency_benchmark.py` (Phase 3 of implementation roadmap).

| Stage | P50 | P95 | P99 | Max |
|---|---|---|---|---|
| Redis Cache Hit | _TBD_ ms | _TBD_ ms | _TBD_ ms | _TBD_ ms |
| Threat Intel Lookup (IOC miss) | _TBD_ ms | _TBD_ ms | _TBD_ ms | _TBD_ ms |
| ML Inference (single domain) | ~1.1 ms | _TBD_ ms | _TBD_ ms | _TBD_ ms |
| Full Pipeline (cache miss, IOC miss) | _TBD_ ms | _TBD_ ms | _TBD_ ms | _TBD_ ms |
| **End-to-end (local dev)** | ~3 sec | _TBD_ | _TBD_ | _TBD_ |

**Target SLA**: P99 < 100ms under sustained load.

---

## 7. Throughput Benchmark 🗺️ PENDING

| Metric | Value |
|---|---|
| Sustained QPS at P99 < 100ms | _TBD_ |
| Concurrent client connections tested | _TBD_ |
| Hardware | _TBD_ |

---

## 8. Confusion Matrix 🗺️ PENDING

```
                 Predicted Benign    Predicted Malicious
Actual Benign    TN=_TBD_           FP=_TBD_
Actual Malicious FN=_TBD_           TP=_TBD_
```

---

## How to Run Benchmarks

```bash
# 1. Classification benchmark (stratified)
python ml-training/train.py \
  --data data/dga_dataset.csv --name dga --version 1 \
  --source "see DATASET_CARD.md" --algorithm rf
# → outputs ml-training/artifacts/dga-v1.metrics.json

# 2. Classification benchmark (chronological)
python ml-training/train.py \
  --data data/dga_dataset.csv --name dga --version 2 \
  --source "see DATASET_CARD.md" --algorithm rf --chronological
# → outputs ml-training/artifacts/dga-v2.metrics.json

# 3. Adversarial evaluation
python ml-training/adversarial_eval.py \
  --data data/dga_dataset.csv \
  --model ml-training/artifacts/dga-v1.joblib \
  --name dga --version 1
# → outputs ml-training/artifacts/adversarial_report.json

# 4. Latency benchmark (Phase 3 — script to be written)
# python infra/latency_benchmark.py --queries 10000 --concurrency 10
```

Results from each run should be pasted into this file and committed with the message:
```
feat(ml): add benchmark results — [stratified|chronological|adversarial|latency]
```
