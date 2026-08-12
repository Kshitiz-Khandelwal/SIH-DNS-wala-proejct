"""Reproducible local training/export utility for DNS lexical classifiers.

Input CSV needs `domain,label` and may include `observed_at` for a chronological
holdout split. This script is deliberately offline: it never downloads data, calls
external APIs, or pushes model artifacts to a running inference service.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


def entropy(value: str) -> float:
    counts = Counter(value)
    return -sum((count / len(value)) * math.log2(count / len(value)) for count in counts.values()) if value else 0.0


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
        cleaned.append({"domain": domain, "label": int(row["label"]), "observed_at": row.get("observed_at", "")})
    if len({row["label"] for row in cleaned}) != 2:
        raise ValueError("training data requires both benign (0) and positive (1) labels")
    return cleaned


def split_rows(rows: list[dict], test_size: float, chronological: bool):
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


parser = argparse.ArgumentParser(description="Train a versioned DNS lexical model")
parser.add_argument("--data", required=True, help="labelled CSV with domain,label[,observed_at]")
parser.add_argument("--name", required=True, choices=["dga", "typosquat"], help="classifier family")
parser.add_argument("--version", default="1", help="artifact version such as 1 or 2026-08")
parser.add_argument("--source", required=True, help="human-readable dataset source/license reference")
parser.add_argument("--test-size", type=float, default=.20)
parser.add_argument("--chronological", action="store_true", help="use observed_at order for the holdout split")
args = parser.parse_args()

if not 0.05 <= args.test_size < .50:
    raise ValueError("--test-size must be between 0.05 and 0.49")

data_path = Path(args.data)
rows = load_rows(data_path)
train_rows, test_rows, split_strategy = split_rows(rows, args.test_size, args.chronological)
train_domains, train_labels = [row["domain"] for row in train_rows], [row["label"] for row in train_rows]
test_domains, test_labels = [row["domain"] for row in test_rows], [row["label"] for row in test_rows]

model = Pipeline([
    ("chars", TfidfVectorizer(analyzer="char", ngram_range=(2, 4), lowercase=True, sublinear_tf=True)),
    ("classifier", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
])
model.fit(train_domains, train_labels)
predictions = model.predict(test_domains)
report = classification_report(test_labels, predictions, output_dict=True, zero_division=0)

feature_baseline = {
    "schema_version": "dns-shield-lexical-v1",
    "sample_count": len(train_domains),
    "length_mean": sum(map(len, train_domains)) / len(train_domains),
    "entropy_mean": sum(entropy(domain) for domain in train_domains) / len(train_domains),
}
metadata = {
    "artifact_schema_version": "dns-shield-model-v1",
    "name": args.name,
    "version": str(args.version),
    "created_at": datetime.now(timezone.utc).isoformat(),
    "dataset_source": args.source,
    "dataset_sha256": dataset_sha256(data_path),
    "dataset_rows": len(rows),
    "train_rows": len(train_rows),
    "holdout_rows": len(test_rows),
    "split_strategy": split_strategy,
    "feature_schema": "character-tfidf-2-4grams",
    "runtime_compatibility": "services/ml-inference local_model_probability uses predict_proba([domain])",
}

output = Path("artifacts")
output.mkdir(exist_ok=True)
prefix = f"{args.name}-v{args.version}"
joblib.dump(model, output / f"{prefix}.joblib")
(output / f"{prefix}.metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
(output / f"{prefix}.feature-baseline.json").write_text(json.dumps(feature_baseline, indent=2), encoding="utf-8")
(output / f"{prefix}.metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
print(json.dumps({"artifact": prefix, "metadata": metadata, "weighted_f1": report["weighted avg"]["f1-score"]}, indent=2))
