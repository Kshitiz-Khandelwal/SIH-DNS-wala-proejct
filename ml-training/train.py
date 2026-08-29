"""Reproducible local training/export utility for DNS lexical classifiers.

Input CSV needs `domain,label` and may include `observed_at` for a chronological
holdout split. This script is deliberately offline: it never downloads data, calls
external APIs, or pushes model artifacts to a running inference service.

IMPORTANT RUNTIME CONTRACT: services/ml-inference calls the exported model as
    model.predict_proba([domain_string])
i.e. a plain Python list of raw domain strings, not a DataFrame. Every feature
branch in this pipeline must therefore accept a flat list/iterable of strings
directly. That's why feature combination below uses sklearn's FeatureUnion
(each sub-transformer gets the same raw input) rather than a ColumnTransformer
keyed on a named DataFrame column, which would silently break that call.

Second, easy-to-miss contract: the engineered-feature function is imported
from the standalone dns_shield_features module rather than defined here.
joblib/pickle stores a *reference* to a FunctionTransformer's function (module
path + name), not its source. A function defined in this script would pickle
as a reference into train.py's __main__ module, which unpickles fine in this
same process but fails in any other process (e.g. the inference service) that
doesn't have an identically-named __main__ function in scope. Keeping the
function in its own module -- shipped alongside the artifact / importable on
the inference service's PYTHONPATH -- avoids that trap. This is verified for
real (not just in-process) by the subprocess reload check before artifacts
are written; see `_verify_artifact_reloads_standalone` below.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import subprocess
import sys
import textwrap
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import joblib
import numpy as np

from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split, GroupShuffleSplit
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

from dns_shield_features import ENGINEERED_FEATURE_NAMES, domain_features, entropy


def build_model(algorithm: str, tree_count: int = None) -> Pipeline:
    features = FeatureUnion([
        ("tfidf", TfidfVectorizer(analyzer="char", ngram_range=(2, 4), lowercase=True, sublinear_tf=True)),
        ("engineered", Pipeline([
            ("extract", FunctionTransformer(domain_features, validate=False)),
            ("scale", StandardScaler()),
        ])),
    ])
    if algorithm == "logreg":
        classifier = LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)
    elif algorithm == "xgboost":
        classifier = XGBClassifier(n_estimators=tree_count or 100, random_state=42, n_jobs=-1, eval_metric="logloss")
    elif algorithm == "lgbm":
        classifier = LGBMClassifier(n_estimators=tree_count or 100, class_weight="balanced", random_state=42, n_jobs=-1)
    else: # rf
        classifier = RandomForestClassifier(n_estimators=tree_count or 150, class_weight="balanced", random_state=42, n_jobs=-1)
    return Pipeline([("features", features), ("classifier", classifier)])


def tuning_grid(algorithm: str) -> dict:
    if algorithm == "logreg":
        return {"classifier__C": [0.1, 0.3, 1.0, 3.0, 10.0]}
    elif algorithm in ("xgboost", "lgbm"):
        return {
            "classifier__max_depth": [3, 5, 8],
            "classifier__learning_rate": [0.01, 0.1, 0.2]
        }
    return {
        "classifier__max_depth": [None, 8, 16, 32],
        "classifier__min_samples_leaf": [1, 2, 4],
        "classifier__max_features": ["sqrt", "log2", None],
    }


def dataset_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows or not {"domain", "label"}.issubset(rows[0]):
        raise ValueError("CSV must contain domain,label columns")
    cleaned = []
    for number, row in enumerate(rows, start=2):
        domain = row["domain"].lower().strip().rstrip(".")
        if not domain or int(row["label"]) not in (0, 1):
            raise ValueError(f"invalid domain/label at CSV row {number}")
        cleaned.append({"domain": domain, "label": int(row["label"]), "observed_at": row.get("observed_at", ""), "family": row.get("family", "unknown")})
    if len({row["label"] for row in cleaned}) != 2:
        raise ValueError("training data requires both benign (0) and positive (1) labels")
    return cleaned


def split_rows(rows: list[dict], test_size: float, chronological: bool, cross_family: bool):
    if cross_family:
        families = list(set(r["family"] for r in rows if r["family"] != "benign"))
        import random
        random.seed(42)
        holdout_families = set(random.sample(families, min(3, len(families))))
        train = [r for r in rows if r["family"] not in holdout_families]
        test = [r for r in rows if r["family"] in holdout_families or (r["family"] == "benign" and random.random() < test_size)]
        return train, test, f"cross-family-holdout:{','.join(holdout_families)}"
        
    if chronological:
        if not all(row["observed_at"] for row in rows):
            raise ValueError("--chronological requires an observed_at value for every row")
        ordered = sorted(rows, key=lambda row: row["observed_at"])
        boundary = max(1, round(len(ordered) * (1 - test_size)))
        train, test = ordered[:boundary], ordered[boundary:]
        if len({row["label"] for row in train}) != 2 or len({row["label"] for row in test}) != 2:
            raise ValueError("chronological split must retain both labels in train and holdout")
        return train, test, "chronological"
        
    train, test = train_test_split(rows, test_size=test_size, random_state=42, stratify=[row["label"] for row in rows])
    return train, test, "stratified-random-random_state_42"


def resolve_cv_folds(labels: list[int], requested: int) -> int:
    """Cap CV folds at the smallest class count in the training split so
    RandomizedSearchCV doesn't crash on small/imbalanced datasets."""
    smallest_class = min(Counter(labels).values())
    return max(2, min(requested, smallest_class))


parser = argparse.ArgumentParser(description="Train a versioned DNS lexical model")
parser.add_argument("--data", required=True, help="labelled CSV with domain,label[,observed_at]")
parser.add_argument("--name", required=True, choices=["dga", "typosquat"], help="classifier family")
parser.add_argument("--version", default="1", help="artifact version such as 1 or 2026-08")
parser.add_argument("--source", required=True, help="human-readable dataset source/license reference")
parser.add_argument("--test-size", type=float, default=.20)
parser.add_argument("--chronological", action="store_true", help="use observed_at order for the holdout split")
parser.add_argument("--cross-family", action="store_true", help="hold out specific families for evaluation")
parser.add_argument("--algorithm", choices=["rf", "logreg", "xgboost", "lgbm"], default="rf", help="rf (default, recommended), xgboost, lgbm, or logreg")
parser.add_argument("--tree-count", type=int, default=None, help="override tree count for ensemble models")
parser.add_argument("--tune", dest="tune", action="store_true", default=True, help="run RandomizedSearchCV (default: on)")
parser.add_argument("--no-tune", dest="tune", action="store_false", help="skip hyperparameter search, use library defaults")
parser.add_argument("--tune-iterations", type=int, default=25, help="RandomizedSearchCV candidate count")
parser.add_argument("--cv-folds", type=int, default=5, help="requested CV folds; auto-capped to the smallest class size")
args = parser.parse_args()

if not 0.05 <= args.test_size < .50 and not args.cross_family:
    raise ValueError("--test-size must be between 0.05 and 0.49")

data_path = Path(args.data)
rows = load_rows(data_path)
train_rows, test_rows, split_strategy = split_rows(rows, args.test_size, args.chronological, args.cross_family)
train_domains, train_labels = [row["domain"] for row in train_rows], [row["label"] for row in train_rows]
test_domains, test_labels = [row["domain"] for row in test_rows], [row["label"] for row in test_rows]

print(f"[*] Dataset: {data_path} ({len(rows):,} rows)")
print(f"[*] Split strategy: {split_strategy} ({len(train_rows):,} train, {len(test_rows):,} test)")

base_model = build_model(args.algorithm, args.tree_count)

tuning_used = False
cv_folds_used = None
if args.tune:
    cv_folds_used = resolve_cv_folds(train_labels, args.cv_folds)
    if cv_folds_used < 2:
        print("warning: not enough samples per class to cross-validate; skipping tuning", file=sys.stderr)
    else:
        grid = tuning_grid(args.algorithm)
        n_candidates = min(args.tune_iterations, int(np.prod([len(v) for v in grid.values()])))
        print(f"[*] Running hyperparameter search ({n_candidates} iterations, {cv_folds_used} CV folds)...")
        print("    (Tip: use --no-tune for fast single-pass ~4s training)")
        search = RandomizedSearchCV(
            base_model,
            param_distributions=grid,
            n_iter=n_candidates,
            scoring="f1_weighted",
            cv=StratifiedKFold(n_splits=cv_folds_used, shuffle=True, random_state=42),
            random_state=42,
            n_jobs=-1,
        )
        search.fit(train_domains, train_labels)
        model = search.best_estimator_
        tuning_used = True
        best_params = search.best_params_
        best_cv_score = search.best_score_
        print(f"[+] Tuning complete! Best CV F1-Score: {best_cv_score * 100:.2f}%")

if not tuning_used:
    print(f"[*] Fitting {args.algorithm.upper()} model directly on {len(train_domains):,} domains...")
    model = base_model
    model.fit(train_domains, train_labels)
    best_params = None
    best_cv_score = None
    print("[+] Model fitting complete.")

print(f"[*] Evaluating on {len(test_domains):,} holdout domains...")
predictions = model.predict(test_domains)
report = classification_report(test_labels, predictions, output_dict=True, zero_division=0)
acc = float(report.get("accuracy", 0.0))
print(f"[+] Holdout Accuracy: {acc * 100:.2f}%")


def _verify_artifact_reloads_standalone(artifact_path: Path, sample_domain: str) -> None:
    """Reload the just-written .joblib in a brand-new subprocess (no shared
    __main__, no leftover imports) and call predict_proba([domain]) exactly
    as services/ml-inference does. An in-process check would pass even if the
    pickle only works because this script's own globals happen to be loaded
    -- that's precisely the bug this catches."""
    probe = textwrap.dedent(f"""
        import joblib
        model = joblib.load({str(artifact_path)!r})
        proba = model.predict_proba([{sample_domain!r}])
        assert proba.shape == (1, 2), f"unexpected predict_proba shape: {{proba.shape}}"
        print("ok")
    """)
    result = subprocess.run([sys.executable, "-c", probe], capture_output=True, text=True, cwd=str(Path.cwd()))
    if result.returncode != 0 or result.stdout.strip() != "ok":
        raise RuntimeError(
            "Exported model failed the standalone predict_proba([domain]) reload check "
            "required by services/ml-inference. Refusing to keep artifacts.\\n"
            f"--- subprocess stdout ---\\n{result.stdout}\\n--- subprocess stderr ---\\n{result.stderr}"
        )

engineered_matrix = domain_features(train_domains)
feature_baseline = {
    "schema_version": "dns-shield-lexical-v2",
    "sample_count": len(train_domains),
    "length_mean": sum(map(len, train_domains)) / len(train_domains),
    "entropy_mean": sum(entropy(domain) for domain in train_domains) / len(train_domains),
    "engineered_feature_means": {
        name: float(engineered_matrix[:, idx].mean())
        for idx, name in enumerate(ENGINEERED_FEATURE_NAMES)
    },
}
metadata = {
    "artifact_schema_version": "dns-shield-model-v2",
    "name": args.name,
    "version": str(args.version),
    "created_at": datetime.now(timezone.utc).isoformat(),
    "dataset_source": args.source,
    "dataset_sha256": dataset_sha256(data_path),
    "dataset_rows": len(rows),
    "train_rows": len(train_rows),
    "holdout_rows": len(test_rows),
    "split_strategy": split_strategy,
    "algorithm": args.algorithm,
    "feature_schema": "char-tfidf-2-4grams+engineered-lexical-v2",
    "engineered_feature_names": ENGINEERED_FEATURE_NAMES,
    "hyperparameter_tuning": {
        "enabled": tuning_used,
        "cv_folds": cv_folds_used,
        "best_params": best_params,
        "best_cv_f1_weighted": best_cv_score,
    },
    "runtime_compatibility": "services/ml-inference local_model_probability uses predict_proba([domain]); verified by standalone subprocess reload at export time",
    "feature_module": "dns_shield_features.py must ship alongside this artifact / be importable on the inference service's PYTHONPATH",
}

output = Path("artifacts")
output.mkdir(exist_ok=True)
prefix = f"{args.name}-v{args.version}"
model_path = output / f"{prefix}.joblib"
joblib.dump(model, model_path)
_verify_artifact_reloads_standalone(model_path, train_domains[0])
(output / f"{prefix}.metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
(output / f"{prefix}.feature-baseline.json").write_text(json.dumps(feature_baseline, indent=2), encoding="utf-8")
(output / f"{prefix}.metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
print(json.dumps({"artifact": prefix, "metadata": metadata, "weighted_f1": report["weighted avg"]["f1-score"]}, indent=2))
