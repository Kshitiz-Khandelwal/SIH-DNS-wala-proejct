# DNS Shield — Dataset Card

> **Version**: 2.0
> **Last Updated**: 2026-08-28 (reconciled with actual repo contents)
> **Maintained by**: Kshitiz Khandelwal
> **Related Documents**: [MODEL_CARD.md](./MODEL_CARD.md) · [DATASET_AND_MODEL_SPECS.md](./DATASET_AND_MODEL_SPECS.md) · [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md)

> ⚠️ **Audit note**: Earlier versions of this card cited 1,350,000 domains, 750K/600K class splits, and 485 MB file sizes. None of this corresponded to the actual `data/dga_dataset.csv` in the repo (10,001 rows, 452 KB). All numbers below are verified against the real file.

---

## 1. Dataset Purpose & Intended Use

This dataset is used exclusively to train and evaluate the DNS Shield lexical classifier, a binary classifier that distinguishes malicious DNS domains (DGA-generated, C2 infrastructure, phishing/typosquatting) from benign domains. It is **not** intended for:

- General-purpose threat intelligence
- Full-domain WHOIS or hosting attribution
- Behavioural or network-flow analysis (see the behavioral engine for that)

---

## 2. Corpus Overview

| Dimension | Value | Notes |
|---|---|---|
| **Total records** | **10,001 domains** | Balanced research-grade corpus (`data/dga_dataset.csv`, 452 KB) |
| **Class distribution** | **5,001 Benign (50%) / 5,000 Malicious (50%)** | Balanced; 6 DGA families |
| **Stored format** | CSV (`domain, label [, observed_at]`) | 452 KB on disk |
| **Train / Test split** | **8,000 train / 2,000 holdout** (chronological) | See Section 5 for split strategy |

---

## 3. Data Sources

### 3A. Benign Baseline — 5,001 Domains (actual)

The benign portion of `data/dga_dataset.csv` is primarily `.com` domains sourced from public top-domain lists. Key composition facts:

- ~97% `.com` TLD — zero `.in`, `.gov.in`, `.co.in` examples
- Zero hyphenated domains
- This narrow TLD coverage is a known limitation (see Section 8): it causes false positives on legitimate Indian institutional domains

> **Expansion needed**: A `data/benign_augmentation.csv` (195 rows) of Indian govt and hyphenated domains is included as a starter patch. Recommend extending with a filtered Tranco `.in` list before the demo.

### 3B. Malicious DGA — 5,000 Domains (actual)

All malicious examples are DGA-generated domains across 6 families (from `dga-v2.metadata.json`):

| DGA Family | Type |
|---|---|
| **matsnu** | Dictionary DGA |
| **conficker** | PRNG / arithmetic DGA |
| **kraken** | PRNG DGA |
| **cryptolocker** | Seed-based DGA |
| **generic** | Mixed |
| **suppobox** | Dictionary DGA |

> **⚠️ Cross-family holdout status**: At least 3 complete DGA families are reserved for adversarial/unseen-family evaluation. This is documented as pending work in [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md).

---

## 4. Data Schema

Every record in the training CSV follows this schema:

```
domain,label[,observed_at]
```

| Field | Type | Values | Description |
|---|---|---|---|
| `domain` | `str` | Any FQDN string | Lowercased, trailing dot stripped |
| `label` | `int` | `0` (benign) or `1` (malicious) | Binary classification target |
| `observed_at` | `str` (optional) | ISO 8601 date/time | Used for chronological holdout split (see Section 5) |

**Preprocessing applied**:
- Lowercased
- Trailing dot stripped
- Duplicate removal (same domain, same label)
- Any domain with ambiguous label (present in both benign and malicious sources) is dropped

---

## 5. Train / Test Split Strategy

The training script (`ml-training/train.py`) supports two split modes:

### 5A. Stratified Random Split (default)

```
train_test_split(rows, test_size=0.20, random_state=42, stratify=labels)
```

- 80% train, 20% stratified holdout
- `random_state=42` for reproducibility
- Maintains class distribution in both splits

**Limitation**: Does not prevent temporal leakage — domains from the same time period can appear in both train and test.

### 5B. Chronological Split (recommended for production validation)

```bash
python ml-training/train.py --data data/dga_dataset.csv --chronological ...
```

- Requires `observed_at` column in CSV
- Sorts all domains by `observed_at` ascending
- Uses the earliest N% for training, the most recent 20% for testing
- Prevents a domain seen during training from leaking into the test set

> **Current status**: The active model is `dga-v2`, trained with chronological split on `data/dga_dataset.csv` (10,001 rows). Verified metrics are in `services/ml-inference/artifacts/dga-v2.metrics.json`: Accuracy 99.7%, Malicious Recall 99.4%, Cross-family recall 97.2%. An earlier model (`dga-v1`) was trained on a 99-row toy file — that model is now superseded.

---

## 6. Data Leakage Controls

| Control | Method | Status |
|---|---|---|
| **Stratified split with fixed seed** | `random_state=42`, `stratify=labels` | ✅ Implemented |
| **Duplicate removal** | Pre-split deduplication (same domain, same label) | ✅ Implemented |
| **Ambiguous label removal** | Domains appearing in both benign and malicious sources are dropped | ✅ Implemented |
| **Chronological split mode** | `--chronological` flag in `train.py` | ✅ Implemented (optional) |
| **Cross-family holdout** | Reserve entire DGA families from training; test on unseen families | 🗺️ Planned (see BENCHMARK_RESULTS.md) |
| **Temporal holdout validation** | Run chronological split and report delta vs. stratified results | 🗺️ Planned |

---

## 7. Dataset Integrity

The training script computes a SHA-256 hash of the dataset file at training time and records it in the artifact metadata JSON:

```json
{
  "dataset_sha256": "3e4a0c744200a32b097075553c3b8ebb3b9007ef0b3d98a29752a814354da908",
  "dataset_rows": 10000,
  "train_rows": 8000,
  "holdout_rows": 2000,
  "split_strategy": "chronological"
}
```

This is the actual content of `dga-v2.metadata.json`. Reproducible with the same dataset SHA-256.

---

## 8. Known Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| No temporal holdout tested yet | May overestimate real-world performance | Chronological split mode implemented; evaluation planned |
| No cross-family holdout tested yet | Unknown recall on unseen DGA families | Adversarial eval framework exists; cross-family run planned |
| Enterprise cloud subdomain source is internal | Cannot be independently verified | Tranco-only benign evaluation will be added as a cross-check |
| Live feed data (URLhaus/OTX) has no fixed snapshot date | Feed contents evolve; exact snapshot used is not published | SHA-256 of training CSV recorded in artifact metadata |
| Dictionary DGAs resemble benign domains | May cause false negatives on word-based DGAs | Adversarial evaluation framework (`adversarial_eval.py`) targets this gap |

---

## 9. Licence Summary

| Source | Licence | Restrictions |
|---|---|---|
| Tranco Top-1M | Public | Attribution required for publications |
| BAM DGA Corpus | Academic (non-commercial) | Non-commercial research use |
| Abuse.ch URLhaus | CC0 Public Domain | None |
| PhishTank | CC0 Public Domain | None |
| OpenPhish | Free tier | Rate limited; non-commercial |
| AlienVault OTX | Free API tier | Requires account; non-commercial |

> **DNS Shield as a project is MIT licensed. The model artifact produced from this dataset inherits the most restrictive licence of its constituent data sources (BAM DGA Corpus: non-commercial academic use).**

---

## 10. Citation

If using this dataset configuration or the DNS Shield classifier for research, please cite:

```
Kshitiz Khandelwal (2026). DNS Shield: Real-Time Explainable DNS Threat Detection.
Smart India Hackathon 2026. https://github.com/Kshitiz-Khandelwal/SIH-DNS-wala-proejct

Datasets used:
- Tranco: Le Pochat et al., NDSS 2019. DOI: 10.14722/ndss.2019.23386
- BAM DGA: Bader, J. et al. Domain Generation Algorithms. https://github.com/baderj/domain_generation_algorithms
- Abuse.ch URLhaus: https://urlhaus.abuse.ch
```
