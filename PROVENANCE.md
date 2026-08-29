# Evaluation Dataset Provenance & Data Integrity Audit 📜

This document details the exact provenance, sources, mathematical algorithms, and reproducibility parameters for the 100,000+ domain benchmark corpus used to evaluate the **DNS Shield** threat detection system.

---

## 1. Dataset Overview

* **File Path**: `data/eval_100k_domains.csv`
* **Total Records**: **110,150 domains**
* **File Format**: CSV (`domain,label,family,source,split_category,rank_bucket`)
* **SHA-256 Hash**: `0a665a9ff8c48f1cf8d9f15b0e337315fbef9f9c655497c817612356664d45b8`
* **Generation Timestamp**: `2026-08-29 05:57:54 UTC`
* **Generation Script**: [`generate_100k_eval_dataset.py`](generate_100k_eval_dataset.py)
* **Zero-Leakage Condition**:
  $$\text{eval\_domains} \cap \text{train\_domains} = \emptyset \quad (\text{Exact } 0 \text{ overlapping strings})$$

---

## 2. Benign Domain Corpus (55,000 Domains) — Synthetic Combinatorial Stress Test

To evaluate the exact boundary limits and lexical vulnerability of the ML model, the 55,000 benign domains were generated using a **synthetic combinatorial stress-test framework** partitioned into 4 architectural complexity tiers. This framework intentionally creates challenging legitimate-patterned domains (with subdomains, hyphens, numbers, and marketing gTLDs) to measure whether the lexical model over-indexes on string complexity:

| Tier Identifier | Sample Count | Generation Strategy & Domain Characteristics |
|---|---|---|
| **Tier 1: `synthetic_tier1_brand_prefixes`** | 5,000 | Combinations of standard infrastructure prefixes (`api`, `app`, `cdn`, `auth`, `sec`, `sync`) with top-brand and sovereign root names (`google`, `microsoft`, `apple`, `isro.gov`, `nic`, `drdo.gov`, `uidai.gov`) across `.com`, `.in`, `.gov.in`. |
| **Tier 2: `synthetic_tier2_enterprise_stems`** | 15,000 | Multi-word enterprise roots (`university`, `hospital`, `banking`, `telecom`, `logistics`) combined with geographic regions (`delhi`, `mumbai`, `london`, `tokyo`, `paris`, `singapore`) across ccTLDs (`.de`, `.fr`, `.jp`, `.edu`, `.ac.uk`). |
| **Tier 3: `synthetic_tier3_saas_stems`** | 20,000 | Modern SaaS vocabulary pairs (`vector`, `quantum`, `nexus`, `apex`, `strata`, `orbit` + `analytics`, `security`, `metrics`, `platform`) across modern tech TLDs (`.io`, `.dev`, `.app`, `.ai`, `.cloud`, `.co`). |
| **Tier 4: `synthetic_tier4_hyphenated_longtail`** | 15,000 | Multi-hyphenated long-tail and numeric-suffixed marketing domains (`fast-smart-green-1.online`, `super-tools-free-4779.shop`) across newer gTLDs (`.online`, `.xyz`, `.top`, `.site`, `.store`, `.club`, `.space`), deliberately testing the hardest lexical boundary. |

---

## 3. Malicious DGA Domain Corpus (55,150 Domains)

### Split A: In-Distribution Holdout (15,000 Domains)
Evaluates whether the model generalizes to **unseen strings** produced by the 6 families present in the original training corpus (`data/dga_dataset.csv`):
1. `conficker` (2,500 domains) — LFSR PRNG generator.
2. `cryptolocker` (2,500 domains) — MD5 hashed alphanumeric generator.
3. `generic` (2,500 domains) — Alphanumeric pseudo-random generator.
4. `kraken` (2,500 domains) — Permutated character generator.
5. `matsnu` (2,500 domains) — Greek/astronomical dictionary noun combination generator.
6. `suppobox` (2,500 domains) — Financial/enterprise dictionary stem generator.

*Note: All in-distribution holdout domains were generated with disjoint seeds and audited against `data/dga_dataset.csv` to ensure strictly zero overlap.*

---

### Split B: Cross-Family Zero-Day Holdout (40,150 Domains)
Evaluates true generalization against **14 entirely new DGA families** never present during training:

| DGA Family | Sample Count | Mathematical / Algorithmic Architecture | Threat Classification | Reference Citation |
|---|---|---|---|---|
| **Banjori** | 2,850 | Chained character arithmetic with dynamic seed shifting | Banking Trojan | *Plohmann et al., IEEE S&P* |
| **Corebot** | 2,850 | CRC32/MD5 hash hex string generation with TLD cycling | Modular Botnet | *CERT-Polska Analysis* |
| **Dyre** | 2,850 | SHA-256 derived pseudo-random alphanumeric hash string | Wire-Fraud Trojan | *US-CERT Alert TA15-286A* |
| **Gozi / Ursnif** | 2,850 | Multi-wordlist dictionary concatenation algorithm | Banking Info-stealer | *Trend Micro Gozi Research* |
| **Locky** | 2,850 | Linear congruential generator with MD5 permutation | Ransomware | *Talos Intelligence Report* |
| **Necurs** | 2,850 | Multi-prime polynomial pseudorandom generator | Spam / C2 Botnet | *Anomali Threat Research* |
| **Pykspa** | 2,850 | Bigram transition Markov sequence with vowel injection | Worm / C2 Channel | *DGArchive Profile* |
| **Qakbot** | 2,850 | Calendar date / epoch-seeded rotary hash algorithm | Advanced Botnet | *CISA Advisory AA23-242A* |
| **Ramnit** | 2,850 | Linear Feedback Shift Register (LFSR) generator | Banking Trojan / Worm | *Europol Operation Ramnit* |
| **Ranbyus** | 2,850 | Modular character permutation with prime offset | Financial Malware | *Kaspersky Threat Intelligence* |
| **Simda** | 2,850 | Vowel-consonant cluster Markov permutation | Botnet / Downloader | *INTERPOL Operation Simda* |
| **Tinba** | 2,850 | Tiny Banker 12-char base-36 polynomial sequence | Financial Trojan | *CSIS Security Analysis* |
| **Vawtrak** | 2,850 | DJB2 hash seeded pseudo-random character generator | Banking Trojan | *SophosLabs Research* |
| **Virut** | 3,100 | 6–8 character alphanumeric pseudo-random sequence | Polymorphic Botnet | *Symantec Threat Analysis* |

---

## 4. How to Reproduce

1. **Regenerate the 110k Evaluation Corpus**:
   ```powershell
   python generate_100k_eval_dataset.py
   ```
2. **Execute the 100k+ Evaluation & Leakage Audit**:
   ```powershell
   python benchmark_100k.py
   ```
3. **Inspect the Full Academic Report**:
   ```powershell
   cat docs/100K_HONEST_BENCHMARK_REPORT.md
   ```
