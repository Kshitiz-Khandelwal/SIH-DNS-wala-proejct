# DNS Shield: Machine Learning Dataset & Training Specifications

> **See also**: Full auditable documentation in [DATASET_CARD.md](./DATASET_CARD.md) · [MODEL_CARD.md](./MODEL_CARD.md) · [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md)

> ⚠️ **Audit note**: Earlier versions of this file cited 1.35M domains, 38 features, a `dga_rf_150.joblib` artifact, and 99.42% accuracy. None of these matched the actual repository. All numbers below are verified against `data/dga_dataset.csv`, `dga-v2.metadata.json`, and `dga-v2.metrics.json`.


## 1. Dataset Overview & Corpus Size

| Dimension | Specification | Notes |
|---|---|---|
| **Total Domain Records** | **10,001 FQDNs** | `data/dga_dataset.csv`, 452 KB on disk |
| **Class Distribution** | **5,001 Benign (50%) / 5,000 Malicious (50%)** | Balanced; 6 DGA families in malicious class |
| **Train / Holdout Split** | **8,000 train / 2,000 holdout** (chronological) | Sorted by `observed_at`, last 20% as holdout |

---

## 2. Primary Data Sources & Composition

### A. Benign Baseline (5,001 Samples — actual)

- Predominantly `.com` top-domain list entries. ~97% `.com`, zero `.in`/`.gov.in`/`.co.in`.
- **Known gap**: zero hyphenated domains in training. See `data/benign_augmentation.csv` for the starter fix.

### B. Malicious DGA (5,000 Samples — actual)

6 DGA families from `dga-v2.metadata.json`:
1. **matsnu** (Dictionary DGA)
2. **conficker** (PRNG / arithmetic DGA)
3. **kraken** (PRNG DGA)
4. **cryptolocker** (Seed-based DGA)
5. **generic** (Mixed)
6. **suppobox** (Dictionary DGA)

---

## 3. Extracted Feature Dimensions (19 Engineered + TF-IDF)

The model uses **19 engineered lexical features** (from `dga-v2.metadata.json`) plus char 2-4gram TF-IDF. The complete feature list is documented in [MODEL_CARD.md Section 4B](./MODEL_CARD.md).

Key feature categories:
1. **Information-Theoretic**: Shannon entropy, vowel/consonant/digit ratios
2. **Structural Morphology**: max consecutive consonant/digit run, label depth, string length
3. **Lexical Anomaly Signals**: punycode, risky TLD flag, TLD risk score
4. **Brand Proximity**: min Levenshtein + Damerau-Levenshtein to 39-brand dictionary, homoglyph detection
5. **Simulated signals (currently 0.0)**: `alexa_rank_simulated`, `nrd_age_simulated` — wiring to live data is a planned improvement

The TF-IDF component produces ~68,185 char n-gram features (2–4grams) from the full 10,001-row training set.

---

## 4. Production Model Artifact Sizes & Inference Performance

| Component | File | Size | Latency SLA |
|---|---|---|---|
| **Random Forest Classifier (`dga-v2.joblib`)** | `services/ml-inference/artifacts/dga-v2.joblib` | **3.6 MB** | **~1 ms** (CPU) |
| **Redis Verdict Cache** | In-memory (Redis 7) | Varies | **<0.1 ms** (cache hit) |

> **Note**: Earlier versions of this table listed `dga_rf_150.joblib` (28.4 MB), `bloom.rdb` (1.2 MB), `rpz_trie.bin` (18.6 MB), and `shap_weights.npy` (8.2 MB). None of these files exist in the repo. Only `dga-v2.joblib` (3.6 MB) exists as a verified artifact.

---

## 5. Model Evaluation Metrics (dga-v2, Verified from `dga-v2.metrics.json`)

> **Source**: 2,000-row chronological holdout. These numbers are from a real run on the actual `data/dga_dataset.csv`. The SHA-256 is `3e4a0c744200a32b097075553c3b8ebb3b9007ef0b3d98a29752a814354da908`.

| Metric | Benign (0) | Malicious (1) | Notes |
|---|---|---|---|
| **Precision** | 0.994 | **1.000** | Zero false positives on 2K holdout |
| **Recall** | **1.000** | **0.994** | 6 malicious missed out of 1,000 |
| **F1-Score** | 0.997 | 0.997 | |
| **Accuracy** | **99.7%** | | |
| **Cross-family recall** | — | **97.2%** | Train on 3 DGA families, test on 3 unseen |
| **Throughput target** | | | ~15,000 QPS est. (not load-tested) |
