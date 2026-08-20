# DNS Shield — Dataset Card

> **Version**: 1.0  
> **Last Updated**: 2026-08-20  
> **Maintained by**: Kshitiz Khandelwal  
> **Related Documents**: [MODEL_CARD.md](./MODEL_CARD.md) · [DATASET_AND_MODEL_SPECS.md](./DATASET_AND_MODEL_SPECS.md) · [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md)

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
| **Total records** | **1,350,000 FQDNs** | Balanced research-grade corpus |
| **Class distribution** | **750,000 Benign (55.6%) / 600,000 Malicious (44.4%)** | Mild positive skew to minimize FPR |
| **Stored format** | CSV (`domain, label [, observed_at]`) | Parquet compressed copy: 142.8 MB |
| **Raw uncompressed size** | **485.4 MB** | Raw DNS queries, labels, WHOIS/metadata JSON |
| **Feature matrix size** | **142.8 MB** (Parquet/Compressed CSV) | 38 numerical + normalised feature dimensions |
| **Train / Test split** | **80% Train (1,080,000) / 20% Holdout (270,000)** | See Section 5 for split strategy |

---

## 3. Data Sources

### 3A. Benign Baseline — 750,000 Domains

| Source | Count | Description | Licence | URL |
|---|---|---|---|---|
| **Tranco Top-1M Research List** | 600,000 | Hardened ranking aggregated from Alexa, Cisco Umbrella, Majestic, Farsight Security. Eliminates single-provider bias. | Public | [tranco-list.eu](https://tranco-list.eu) |
| **Enterprise Cloud & CDN Subdomains** | 150,000 | High-throughput benign subdomains from Microsoft 365, Azure, Google Cloud, AWS CloudFront, Cloudflare, Akamai | Observed/Public | Internal sample |

> **Citation for Tranco**: Le Pochat, V., Van Goethem, T., Tajalizadehkhoob, S., Korczy´nski, M., & Joosen, W. (2019). *Tranco: A Research-Oriented Top Sites Ranking Hardened Against Manipulation*. NDSS 2019. DOI: 10.14722/ndss.2019.23386

### 3B. Malicious DGA & Threat Intelligence — 600,000 Domains

| Source | Count | Threat Types | Licence | URL |
|---|---|---|---|---|
| **BAM DGA Research Corpus** | 400,000 | Arithmetic DGAs, PRNG DGAs, Dictionary DGAs, Wordlist Permutation DGAs — 50+ malware families | Academic (non-commercial) | [Bader et al., 2022](https://github.com/baderj/domain_generation_algorithms) |
| **Abuse.ch URLhaus** | 100,000 | Live malware hosting URLs, active C2 domains | CC0 Public Domain | [urlhaus.abuse.ch](https://urlhaus.abuse.ch) |
| **PhishTank + OpenPhish** | 50,000 | Phishing domains, brand impersonation | CC0 / Public | [phishtank.org](https://phishtank.org) |
| **AlienVault OTX + Emerging Threats** | 50,000 | Mixed IOCs: DGA, C2, malware infrastructure | Free / OTX API | [otx.alienvault.com](https://otx.alienvault.com) |

#### DGA Family Coverage (BAM Corpus)

| Family Type | Representative Families |
|---|---|
| **Arithmetic / PRNG DGA** | Conficker, Gameover Zeus, Cryptolocker, Necurs, Locky, Torpig, DirCrypt |
| **Dictionary DGA** | Suppobox, Matsnu, Gozi/ISFB, Ranbyus, Bedep |
| **Wordlist Permutation DGA** | Banjori, Tinba, Nymaim, Ramnit, Symmi |
| **Seeded/Time-based DGA** | Murofet, Dyre, Qakbot, Vawtrak |

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

> **⚠️ Current status**: The internal 99.42% accuracy metrics in [DATASET_AND_MODEL_SPECS.md](./DATASET_AND_MODEL_SPECS.md) used **stratified random split**. A chronological split evaluation is planned and will be documented in [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md).

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
  "dataset_sha256": "<sha256-of-training-csv>",
  "dataset_rows": 1350000,
  "train_rows": 1080000,
  "holdout_rows": 270000
}
```

This ensures that any trained model artifact can be traced back to a specific, immutable dataset snapshot.

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
