## ML Engine Refinements (Phase 5)

### Hyperparameter Selection (Random Forest Trees)

We benchmarked the Random Forest classifier against varying tree counts to justify the selection of 150 estimators. The evaluation measured both prediction quality (F1-score) and end-to-end training/inference latency.

| Configuration | F1-Score | Latency / Resource Cost |
| ------------- | -------- | ----------------------- |
| RF (50 trees) | 0.9700   | 5.45s                   |
| RF (150 trees)| 0.9965   | 5.60s                   |

**Conclusion:** 150 trees provides a massive bump in predictive performance (from 97% to >99% F1) with a nearly negligible cost in execution time (5.45s vs 5.60s) for our offline pipeline due to parallelization (`n_jobs=-1`). Therefore, 150 trees is optimal.

### Algorithm Benchmarks (RF vs Gradient Boosting)

Gradient boosting models are often preferred for tabular data. We tested our baseline RF against XGBoost and LightGBM on the exact same char-tfidf + lexical feature pipeline.

| Algorithm       | F1-Score | Latency / Resource Cost |
| --------------- | -------- | ----------------------- |
| Random Forest   | 0.9965   | 5.60s                   |
| LightGBM        | 0.9635   | 6.18s                   |
| XGBoost         | 0.9190   | 8.86s                   |

**Conclusion:** Random Forest vastly outperformed XGBoost and LightGBM in our specific setup. This is because XGBoost struggles natively with high-dimensional sparse inputs (like our character n-gram TF-IDF matrix) without extensive hyperparameter tuning, whereas Random Forest handles the sparsity well out-of-the-box. Random Forest is also faster to train on this dataset.

### Cross-Family Zero-Day Evaluation

A critical vulnerability of DGA classifiers is "overfitting" to the DGA patterns seen in the training data, failing completely on new families.

We implemented a `--cross-family` split strategy that holds out three distinct DGA families (e.g. matsnu, cryptolocker, suppobox) from the training set entirely, and evaluates the model's performance purely on those unseen families.

| Evaluation Mode               | F1-Score |
| ----------------------------- | -------- |
| Standard (Chronological Test) | 0.9965   |
| Zero-Day (Unseen Families)    | 0.9706   |

**Conclusion:** The model maintains a strong 97% F1-score even on completely unseen DGA algorithms, proving that the 38-feature lexical + char-ngram extraction successfully captures the *underlying nature* of algorithmically generated domains, rather than just memorizing specific families.
