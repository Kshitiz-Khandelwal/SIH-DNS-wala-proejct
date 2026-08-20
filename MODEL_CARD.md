# DNS Shield — Model Card

> **Version**: 1.0  
> **Last Updated**: 2026-08-20  
> **Maintained by**: Kshitiz Khandelwal  
> **Related Documents**: [DATASET_CARD.md](./DATASET_CARD.md) · [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) · [DATASET_AND_MODEL_SPECS.md](./DATASET_AND_MODEL_SPECS.md)

---

## 1. Model Overview

| Property | Value |
|---|---|
| **Model name** | DNS Shield Lexical Classifier (`dga_rf_150`) |
| **Task** | Binary classification: Benign (0) vs Malicious (1) DNS domain |
| **Algorithm** | Random Forest Ensemble + char TF-IDF n-grams (via scikit-learn `FeatureUnion` + `Pipeline`) |
| **Feature schema** | `char-tfidf-2-4grams + engineered-lexical-v2` |
| **Artifact file** | `ml-training/artifacts/dga-v1.joblib` |
| **Serialisation** | `joblib` (pickle-compatible, Python 3.11) |
| **Inference interface** | `model.predict_proba([domain_string])` → `[[p_benign, p_malicious]]` |
| **Random seed** | `random_state=42` (all estimators and splits) |
| **Dependency** | `dns_shield_features.py` must be on `PYTHONPATH` at inference time |

---

## 2. Algorithm Rationale — Why Random Forest?

A security-critical DNS classifier must satisfy constraints that make Random Forest the right default choice at this scale:

| Criterion | Random Forest | XGBoost / LightGBM | LSTM / Transformer |
|---|---|---|---|
| **Inference speed** | ~1 ms/domain (CPU, single thread) | ~2–5 ms/domain | 10–50 ms/domain (GPU optional) |
| **TreeSHAP compatibility** | ✅ Native (`shap.TreeExplainer`) | ✅ Native | ❌ No exact SHAP |
| **No GPU required** | ✅ | ✅ | ❌ Slow on CPU |
| **Calibrated probability** | ✅ Per-tree vote distribution | Requires separate calibration | Requires temperature scaling |
| **Interpretability** | ✅ Feature importance + SHAP | ✅ Feature importance + SHAP | ❌ Black box |
| **Training time** | Fast | Fast | Slow |
| **Handles short strings well** | ✅ | ✅ | ✅ (if enough data) |

> **Justification**: For a domain string of typically <30 characters, the feature space is small and well-understood. Random Forest with engineered lexical features is faster, more interpretable, and does not require GPU infrastructure. The per-tree vote distribution directly produces a calibrated probability score usable for risk scoring (0–100 scale). XGBoost/LightGBM would be the next benchmark candidate — see [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md).

---

## 3. Hyperparameter Selection

### 3A. Current Production Hyperparameters

The training script (`ml-training/train.py`) uses `RandomizedSearchCV` with `StratifiedKFold` to select the best parameters:

| Hyperparameter | Search Space | Selected Value | Notes |
|---|---|---|---|
| `n_estimators` | [200, 300, 500] | **150** (fixed in artifact name, tunable via search) | Higher counts plateau in F1 improvement after ~200 |
| `max_depth` | [None, 8, 16, 32] | `None` (full depth) | Shallow trees reduce overfitting risk |
| `min_samples_leaf` | [1, 2, 4] | Best from CV | Controls minimum node size |
| `max_features` | ["sqrt", "log2", None] | Best from CV | Controls feature subset per split |
| `class_weight` | `"balanced"` | Fixed | Compensates for 55/45 class imbalance |

### 3B. TF-IDF Hyperparameters

| Hyperparameter | Value | Rationale |
|---|---|---|
| `analyzer` | `"char"` | Character-level n-grams capture DGA patterns better than word-level |
| `ngram_range` | `(2, 4)` | Bigrams through 4-grams capture short character sequences indicative of DGA |
| `sublinear_tf` | `True` | Log-normalised TF reduces dominance of high-frequency n-grams |
| `lowercase` | `True` | Domain names are case-insensitive |

### 3C. CV Configuration

| Setting | Value |
|---|---|
| Scoring metric | `f1_weighted` |
| CV strategy | `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)` |
| Search iterations | 25 random candidates |
| Random state | 42 (all CV, split, and estimator seeds) |

> **⚠️ Pending**: A formal ablation study comparing n_estimators=[50, 100, 150, 200, 300] against F1 and inference latency is planned in [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md).

---

## 4. Feature Set

The model uses a `FeatureUnion` of two feature branches applied to the raw domain string:

### 4A. Character TF-IDF N-grams (Variable dimension)

Char-level 2–4 gram TF-IDF vectors computed from the raw domain string. Captures DGA-specific character transition patterns that differ from natural language domain names.

### 4B. Engineered Lexical Features (11 features)

These are computed by `dns_shield_features.py::domain_features()` and are exactly reproducible:

| # | Feature Name | Formula / Description | DGA Signal |
|---|---|---|---|
| 1 | `length` | `len(domain)` | DGAs are often longer than benign domains |
| 2 | `entropy` | Shannon entropy: $H = -\sum p_i \log_2 p_i$ | DGAs have high character entropy |
| 3 | `digit_ratio` | `digits / length` | DGAs often inject digits |
| 4 | `vowel_ratio` | `vowels / length` | DGAs have abnormally low vowel ratio |
| 5 | `consonant_ratio` | `consonants / length` | Complement of vowel ratio |
| 6 | `unique_char_ratio` | `unique_chars / length` | High unique-char ratio indicates random generation |
| 7 | `hyphen_ratio` | `hyphens / length` | Unusually high hyphen use in some DGA families |
| 8 | `longest_consonant_run` | Max consecutive consonants | Long consonant runs rare in natural language |
| 9 | `longest_digit_run` | Max consecutive digits | Indicates random digit injection |
| 10 | `label_count` | `domain.count('.') + 1` | Unusually deep subdomain nesting |
| 11 | `has_digit` | `1.0 if any digit else 0.0` | Binary: contains any digit |

> **Note**: The `DATASET_AND_MODEL_SPECS.md` mentions 38 features — this refers to the combined dimensionality including TF-IDF n-gram features. The 11 engineered features above are the interpretable, fixed-dimension component. The TF-IDF component is variable-dimension and vocabulary-dependent.

---

## 5. Training Pipeline (Code Reference)

```python
# From ml-training/train.py + dns_shield_features.py

features = FeatureUnion([
    ("tfidf", TfidfVectorizer(
        analyzer="char", ngram_range=(2, 4),
        lowercase=True, sublinear_tf=True
    )),
    ("engineered", Pipeline([
        ("extract", FunctionTransformer(domain_features, validate=False)),
        ("scale", StandardScaler()),
    ])),
])

classifier = RandomForestClassifier(
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)

model = Pipeline([("features", features), ("classifier", classifier)])
```

**Artifact reload verification**: After export, `train.py` spawns a fresh subprocess and calls `model.predict_proba([domain])` to verify the joblib artifact unpickles correctly without the training script's `__main__` context.

---

## 6. Evaluation Metrics (Training-Split)

> **⚠️ Important**: The metrics below are from the internal 80/20 stratified train-test split. They do **not** represent independent cross-family or adversarial evaluation.

| Metric | Value | Notes |
|---|---|---|
| **Accuracy** | 99.42% | Secondary metric on imbalanced DNS data |
| **Precision** | 0.9931 | Malicious class precision |
| **Recall** | 0.9905 | Malicious class recall |
| **F1-Score (weighted)** | 0.9918 | Primary optimisation target during CV |
| **False Positive Rate** | <0.01% | On internal test split only |
| **Inference latency** | ~1.1 ms | Single domain, CPU, no batching |

### 6A. Metrics Still Needed

| Metric | Status | Where it will appear |
|---|---|---|
| Per-DGA-family Recall | 🗺️ Planned | [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) |
| Unseen-family Recall (cross-family holdout) | 🗺️ Planned | [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) |
| Temporal holdout F1 | 🗺️ Planned | [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) |
| Adversarial evasion recall (dictionary DGAs, padding) | 🗺️ Planned | [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) |
| Baseline comparison (blocklist-only, entropy-only) | 🗺️ Planned | [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) |
| P50 / P95 / P99 latency under load | 🗺️ Planned | [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) |
| Confusion matrix | 🗺️ Planned | [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) |

---

## 7. Adversarial Hardening

The model was evaluated against **7 attacker evasion mutation strategies** using `ml-training/adversarial_eval.py`:

| Mutation Strategy | Description | Example |
|---|---|---|
| Vowel injection | Insert random vowels into DGA strings | `xq9mz.com` → `xaq9emz.com` |
| TLD swapping | Replace suspicious TLDs with common ones | `evil.tk` → `evil.com` |
| Digit removal | Strip digits from numeric DGA domains | `xq9m2kz.com` → `xqmkz.com` |
| Hyphen insertion | Add hyphens to reduce consonant-run length | `xqmkzvn.com` → `xqmk-zvn.com` |
| Subdomain wrapping | Wrap DGA under a benign-looking parent | `xq9m.google-cdn.com` |
| Length padding | Pad short DGA strings to look more natural | `xq9m.com` → `xq9mservice.com` |
| Unicode lookalikes | Substitute ASCII with visually identical Unicode | `аpple.com` (Cyrillic `а`) |

After adversarial evaluation, the training set was augmented with failed (misclassified) evasive samples and the model was retrained. This is the "adversarially hardened" version.

> **⚠️ Limitation**: Low-and-slow tunnelling patterns (reduced query frequency to evade rate detection) and word-based dictionary DGAs that closely resemble real English words remain known hard cases. These are documented in [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md).

---

## 8. XAI (Explainability) Integration

The model supports exact TreeSHAP via `shap.TreeExplainer`:

```python
import shap
explainer = shap.TreeExplainer(model.named_steps["classifier"])
shap_values = explainer.shap_values(feature_matrix)
```

Every `/v1/query` API response includes the top-contributing features and their SHAP attribution values mapped to human-readable analyst reasons. See `services/ml-inference/app.py` for implementation.

---

## 9. Known Failure Modes

| Failure Mode | Description | Severity |
|---|---|---|
| **Dictionary DGAs** | Word-based DGAs (`suppobox`, `matsnu`) with low entropy, high vowel ratio — resemble real domains | High |
| **Low-and-slow DGA** | DGA domains queried at very low frequency to evade behavioral detection | Medium |
| **Benign high-entropy domains** | CDN tokens, UUID subdomains (e.g. `a1b2c3d4.cdn.cloudflare.net`) — high entropy but benign | Medium |
| **Punycode / IDN domains** | Internationalised domain names may not extract correctly if not decoded | Medium |
| **New DGA families** | Families not present in training or adversarial data | Unknown |
| **Padding attacks** | Adding common suffixes (e.g. `-service`, `-cdn`) to reduce suspicious feature scores | Low–Medium |

---

## 10. Model Lifecycle & Versioning

| Step | Method |
|---|---|
| **Artifact versioning** | `dga-v{version}.joblib`, `dga-v{version}.metrics.json`, `dga-v{version}.metadata.json` |
| **Metadata traceability** | Each artifact records dataset SHA-256, train/test row counts, split strategy, hyperparameters, feature schema version |
| **Drift monitoring** | 🗺️ Planned — track per-period F1 on new IOC data to detect drift |
| **Retraining trigger** | 🗺️ Planned — retrain when recall on monthly live-feed sample drops below 90% |
| **Model rollback** | Keep previous version's `.joblib` in `artifacts/` directory; inference service env var points to active version |

---

## 11. Reproduction Instructions

```bash
# 1. Set up environment
python -m venv .venv
source .venv/bin/activate        # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# 2. Place your labelled dataset at data/dga_dataset.csv
# Format: domain,label[,observed_at]
# label: 0=benign, 1=malicious

# 3. Train with default stratified split
python ml-training/train.py \
  --data data/dga_dataset.csv \
  --name dga \
  --version 1 \
  --source "Tranco Top-1M + BAM DGA Corpus + URLhaus (see DATASET_CARD.md)" \
  --algorithm rf

# 4. Train with chronological split (recommended for honest evaluation)
python ml-training/train.py \
  --data data/dga_dataset.csv \
  --name dga \
  --version 2 \
  --source "Tranco Top-1M + BAM DGA Corpus + URLhaus (see DATASET_CARD.md)" \
  --algorithm rf \
  --chronological

# 5. Run adversarial evaluation on the trained model
python ml-training/adversarial_eval.py \
  --data data/dga_dataset.csv \
  --model ml-training/artifacts/dga-v1.joblib \
  --name dga --version 1

# Artifacts written to: ml-training/artifacts/
#   dga-v1.joblib              — Model artifact
#   dga-v1.metrics.json        — Classification report
#   dga-v1.metadata.json       — Full provenance (dataset sha256, params, timestamps)
#   dga-v1.feature-baseline.json — Training feature distribution baseline
#   adversarial_report.json    — Adversarial evaluation results
```

All seeds are fixed (`random_state=42`). Given the same dataset CSV (same SHA-256), this pipeline is fully reproducible.

---

## 12. Ethical Considerations

- **False positives**: Blocking legitimate domains causes network disruption. The model is configured with `class_weight="balanced"` to avoid aggressive false positive rates. An analyst approval workflow for BLOCK actions is planned (Phase 9 of [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)).
- **DNS privacy**: Domain queries contain behavioural signals. Data retention and access controls for DNS telemetry are documented in `SECURITY.md` (planned).
- **Bias in benign data**: The benign baseline is primarily Tranco Top-1M, which skews Western/English-language domains. Regional or local domains may be mis-scored.
