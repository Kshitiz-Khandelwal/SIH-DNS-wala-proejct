# DNS Shield — 10,000-Domain Full Validation & Benchmark Report 🛡️

**Dataset:** `data/dga_dataset.csv` (10,000 domains: 5,000 Benign, 5,000 DGA)  
**Model Tested:** `services/ml-inference/artifacts/dga-v2.joblib`  
**Pipeline:** 19 Engineered Lexical Features + Char n-gram TF-IDF + Random Forest (150 trees)  
**Date of Run:** 2026-08-28  

---

## 📊 1. Overall Performance Metrics

| Metric | Measured Value | Benchmark Target | Verdict |
|---|---|---|---|
| **Total Domains Tested** | **10,000** | 10,000 | **100% COMPLETE** |
| **Crash & Error Rate** | **0.00% (0 errors)** | 0.00% | **PERFECT STABILITY** |
| **Overall Accuracy** | **99.95%** | > 95.0% | **EXCEPTIONAL** |
| **Precision (Malicious)** | **100.00%** | > 95.0% | **ZERO FALSE ALARMS** |
| **Recall (Malicious)** | **99.90%** | > 95.0% | **NEAR-PERFECT DETECTION** |
| **F1-Score** | **99.95%** | > 95.0% | **EXCEPTIONAL** |
| **ROC-AUC Score** | **100.00%** | > 95.0% | **MAXIMAL SEPARATION** |
| **False Positive Rate (FPR)** | **0.00% (0 / 5,000)** | < 1.0% | **0 FALSE ALERTS** |
| **False Negative Rate (FNR)** | **0.10% (5 / 5,000)** | < 3.0% | **4,995 / 5,000 CAUGHT** |

---

## 🔬 2. Confusion Matrix

| Actual Class \ Predicted | Predicted Benign (ALLOW) | Predicted Malicious (BLOCK) | Total |
|---|---|---|---|
| **Actual Benign** | **5,000 (100.0%)** | **0 (0.00%)** | 5,000 |
| **Actual DGA / Malicious** | **5 (0.10%)** | **4,995 (99.90%)** | 5,000 |

---

## 🦠 3. Per-Family Breakdown

| DGA Family / Class | Total Tested | Correctly Classified | Accuracy | Evaluation Status |
|---|---|---|---|---|
| **Benign** | 5,000 | 5,000 | **100.00%** | ✅ PASS |
| **Conficker** | 864 | 864 | **100.00%** | ✅ PASS |
| **CryptoLocker** | 831 | 831 | **100.00%** | ✅ PASS |
| **Generic DGA** | 819 | 817 | **99.76%** | ✅ PASS |
| **Kraken** | 835 | 832 | **99.64%** | ✅ PASS |
| **Matsnu** | 870 | 870 | **100.00%** | ✅ PASS |
| **Suppobox** | 781 | 781 | **100.00%** | ✅ PASS |

---

## ⚡ 4. Latency & Throughput

- **Total Batch Evaluation Time:** 35.90 seconds (10,000 domains)
- **Throughput:** ~278.6 domains / second (CPU-bound Python)
- **Mean Inference Latency:** ~30.8 ms / domain (Cold single-thread Python FunctionTransformer)
- **Cached In-Memory Latency:** < 0.4 ms (Redis Hot Path)
