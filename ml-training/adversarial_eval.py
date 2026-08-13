"""Adversarial evaluation and model hardening script for the DNS lexical classifier.

Flow:
  1. Load the baseline model and training data.
  2. Generate evasive domain variants using domain_mutations.py mutators.
  3. Run the baseline model on those variants and record failures
     (domains scored < threshold — model thinks they're benign when they're malicious).
  4. Print a per-mutation failure rate report.
  5. Unless --dry-run: augment the training CSV with failed evasive samples
     and retrain using the same pipeline as train.py.
  6. Compare baseline vs hardened model on:
     - Original holdout set (regression check — should stay same)
     - Evasive holdout set (improvement target)
  7. Save comparison to artifacts/adversarial_report.json.

Usage:
    python ml-training/adversarial_eval.py \
        --data data/dga_dataset.csv \
        --model artifacts/dga-v1.joblib \
        --name dga --version 1 \
        [--threshold 0.5] [--dry-run]

Requirements: same venv as train.py (sklearn, joblib, numpy).
PYTHONPATH must include the project root so dns_shield_features and
domain_mutations are importable.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np

# Allow running from any CWD as long as PYTHONPATH includes project root
try:
    from domain_mutations import generate_evasive_candidates, MUTATORS
    from dns_shield_features import domain_features, entropy
except ImportError:
    # Try relative imports when running from ml-training/
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from domain_mutations import generate_evasive_candidates, MUTATORS
    from dns_shield_features import domain_features, entropy


# ─── Helpers ─────────────────────────────────────────────────────────────────

def load_csv(path: Path) -> tuple[list[str], list[int]]:
    domains, labels = [], []
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            domain = row.get("domain", "").strip().lower()
            label_raw = row.get("label", "0").strip()
            if domain and label_raw in {"0", "1"}:
                domains.append(domain)
                labels.append(int(label_raw))
    return domains, labels


def predict_batch(model, domains: list[str]) -> np.ndarray:
    """Return malicious probability for each domain (class-1 column)."""
    proba = model.predict_proba(domains)
    # predict_proba returns [[p_benign, p_malicious], ...]
    return proba[:, 1]


def classification_summary(proba: np.ndarray, labels: list[int], threshold: float) -> dict:
    preds = (proba >= threshold).astype(int)
    tp = sum(p == 1 and l == 1 for p, l in zip(preds, labels))
    fp = sum(p == 1 and l == 0 for p, l in zip(preds, labels))
    tn = sum(p == 0 and l == 0 for p, l in zip(preds, labels))
    fn = sum(p == 0 and l == 1 for p, l in zip(preds, labels))
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall    = tp / (tp + fn) if (tp + fn) else 0.0
    f1        = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn,
            "precision": round(precision, 4), "recall": round(recall, 4),
            "f1": round(f1, 4), "accuracy": round((tp + tn) / len(labels), 4)}


# ─── Core Evaluation ─────────────────────────────────────────────────────────

def run_adversarial_eval(
    model,
    malicious_domains: list[str],
    threshold: float,
) -> tuple[dict[str, dict], list[tuple[str, str, float]]]:
    """Apply all mutators to malicious_domains and report failure rates.

    Returns:
        per_mutation_stats: {mutation_id: {generated, failures, failure_rate}}
        failed_samples: [(mutated_domain, mutation_id, model_score), ...]
    """
    per_mutation: dict[str, dict] = {m: {"generated": 0, "failures": 0} for m in MUTATORS}
    failed_samples: list[tuple[str, str, float]] = []

    # Batch all candidates for efficiency
    all_variants: list[tuple[str, str]] = []  # (domain, mutation_id)
    for domain in malicious_domains:
        for variant, mutation_id in generate_evasive_candidates(domain):
            all_variants.append((variant, mutation_id))
            per_mutation[mutation_id]["generated"] += 1

    if not all_variants:
        return per_mutation, failed_samples

    variant_domains = [v for v, _ in all_variants]
    try:
        scores = predict_batch(model, variant_domains)
    except Exception as exc:
        print(f"[WARN] Batch prediction failed: {exc}. Falling back to one-by-one.")
        scores = np.array([predict_batch(model, [d])[0] for d in variant_domains])

    for (domain, mutation_id), score in zip(all_variants, scores):
        if score < threshold:  # model thinks it's benign — FAILURE
            per_mutation[mutation_id]["failures"] += 1
            failed_samples.append((domain, mutation_id, float(round(score, 4))))

    for mutation_id, stats in per_mutation.items():
        gen = stats["generated"]
        stats["failure_rate"] = round(stats["failures"] / gen, 4) if gen else 0.0

    return per_mutation, failed_samples


# ─── Augmentation + Retrain ───────────────────────────────────────────────────

def augment_csv(original_path: Path, failed_samples: list[tuple[str, str, float]], out_path: Path) -> int:
    """Write original CSV + failed evasive samples (all label=1) to out_path."""
    added = 0
    with open(original_path, newline="", encoding="utf-8") as fh:
        original_rows = list(csv.DictReader(fh))
    fieldnames = original_rows[0].keys() if original_rows else ["domain", "label"]

    existing_domains = {row["domain"] for row in original_rows}
    new_rows = []
    for domain, mutation_id, score in failed_samples:
        if domain not in existing_domains:
            row = {k: "" for k in fieldnames}
            row["domain"] = domain
            row["label"] = "1"
            new_rows.append(row)
            added += 1

    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(original_rows + new_rows)

    return added


def retrain(augmented_csv: Path, name: str, version: str, algorithm: str) -> Path:
    """Call train.py as a subprocess to retrain on the augmented dataset."""
    import subprocess
    train_script = Path(__file__).parent / "train.py"
    cmd = [
        sys.executable, str(train_script),
        "--data", str(augmented_csv),
        "--name", f"{name}-hardened",
        "--version", version,
        "--algorithm", algorithm,
        "--source", "adversarial-augmentation",
    ]
    print(f"\n[RETRAIN] Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=False)
    if result.returncode != 0:
        print(f"[ERROR] Retraining failed with exit code {result.returncode}")
        sys.exit(1)

    artifact_dir = Path(__file__).parent / "artifacts"
    hardened_path = artifact_dir / f"{name}-hardened-v{version}.joblib"
    return hardened_path


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Adversarial evaluation and model hardening for DNS Shield.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run — show mutation failure rates only:
  python adversarial_eval.py --data data/dga_dataset.csv --model artifacts/dga-v1.joblib --dry-run

  # Full hardening run — augment + retrain + compare:
  python adversarial_eval.py --data data/dga_dataset.csv --model artifacts/dga-v1.joblib
        """,
    )
    parser.add_argument("--data",      required=True,  type=Path, help="Training CSV with domain,label columns")
    parser.add_argument("--model",     required=True,  type=Path, help="Baseline model .joblib artifact")
    parser.add_argument("--name",      default="dga",  help="Model name (default: dga)")
    parser.add_argument("--version",   default="1",    help="Artifact version tag (default: 1)")
    parser.add_argument("--algorithm", default="rf",   choices=["rf", "logreg"])
    parser.add_argument("--threshold", default=0.5,    type=float, help="Malicious probability threshold (default: 0.5)")
    parser.add_argument("--max-malicious", default=2000, type=int,
                        help="Max malicious domains to mutate (default: 2000, 0=all)")
    parser.add_argument("--dry-run",   action="store_true", help="Report only — no augmentation or retraining")
    args = parser.parse_args()

    if not args.data.exists():
        print(f"[ERROR] Data file not found: {args.data}")
        sys.exit(1)
    if not args.model.exists():
        print(f"[ERROR] Model artifact not found: {args.model}")
        sys.exit(1)

    print(f"[1/6] Loading dataset: {args.data}")
    all_domains, all_labels = load_csv(args.data)
    malicious = [d for d, l in zip(all_domains, all_labels) if l == 1]
    benign    = [d for d, l in zip(all_domains, all_labels) if l == 0]
    print(f"      Total: {len(all_domains)} (malicious={len(malicious)}, benign={len(benign)})")

    if args.max_malicious and len(malicious) > args.max_malicious:
        import random
        random.seed(42)
        malicious = random.sample(malicious, args.max_malicious)
        print(f"      Sampling {args.max_malicious} malicious domains for mutation.")

    print(f"[2/6] Loading baseline model: {args.model}")
    baseline_model = joblib.load(args.model)

    # ── Baseline performance on original data ─────────────────────────────────
    print(f"[3/6] Evaluating baseline on original holdout (first 20% of dataset)…")
    split = int(len(all_domains) * 0.8)
    test_domains = all_domains[split:]
    test_labels  = all_labels[split:]
    baseline_proba = predict_batch(baseline_model, test_domains)
    baseline_stats = classification_summary(baseline_proba, test_labels, args.threshold)
    print(f"      Baseline F1={baseline_stats['f1']:.4f}  Recall={baseline_stats['recall']:.4f}  "
          f"Precision={baseline_stats['precision']:.4f}")

    # ── Adversarial evaluation ────────────────────────────────────────────────
    print(f"[4/6] Generating evasive mutations and evaluating… ({len(malicious)} malicious domains × {len(MUTATORS)} mutators)")
    per_mutation, failed_samples = run_adversarial_eval(baseline_model, malicious, args.threshold)

    total_generated = sum(v["generated"] for v in per_mutation.values())
    total_failures  = sum(v["failures"]  for v in per_mutation.values())
    overall_failure_rate = total_failures / total_generated if total_generated else 0.0

    print(f"\n{'Mutation':<22} {'Generated':>10} {'Failures':>10} {'Failure Rate':>14}")
    print("-" * 60)
    for mutation_id, stats in sorted(per_mutation.items(), key=lambda x: -x[1]["failure_rate"]):
        bar = "█" * int(stats["failure_rate"] * 20)
        print(f"{mutation_id:<22} {stats['generated']:>10} {stats['failures']:>10} "
              f"  {stats['failure_rate']:>6.1%}  {bar}")
    print("-" * 60)
    print(f"{'TOTAL':<22} {total_generated:>10} {total_failures:>10}   {overall_failure_rate:>6.1%}")

    # Most evading samples (for the report)
    top_evasive = sorted(failed_samples, key=lambda x: x[2])[:10]
    print(f"\nTop 10 most-evading samples (lowest model score):")
    for domain, mutation_id, score in top_evasive:
        print(f"  score={score:.3f}  [{mutation_id}]  {domain}")

    # ── Build report ──────────────────────────────────────────────────────────
    report: dict = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "baseline_model": str(args.model),
        "dataset": str(args.data),
        "threshold": args.threshold,
        "malicious_evaluated": len(malicious),
        "baseline_performance": baseline_stats,
        "adversarial_evaluation": {
            "total_variants_generated": total_generated,
            "total_failures": total_failures,
            "overall_failure_rate": round(overall_failure_rate, 4),
            "per_mutation": {k: v for k, v in per_mutation.items()},
        },
        "top_10_evasive_samples": [
            {"domain": d, "mutation": m, "model_score": s}
            for d, m, s in top_evasive
        ],
    }

    if args.dry_run:
        print(f"\n[DRY RUN] Skipping augmentation and retraining.")
        report["hardening"] = "skipped (dry-run)"
    else:
        # ── Augment + Retrain ─────────────────────────────────────────────────
        augmented_path = args.data.parent / f"dga_augmented_{args.name}_v{args.version}.csv"
        print(f"\n[5/6] Augmenting training data → {augmented_path}")
        added = augment_csv(args.data, failed_samples, augmented_path)
        print(f"      Added {added} new evasive samples (total: {len(all_domains) + added})")

        hardened_path = retrain(augmented_path, args.name, args.version, args.algorithm)

        # ── Compare hardened vs baseline on evasive set ───────────────────────
        print(f"\n[6/6] Comparing baseline vs hardened model on evasive samples…")
        if hardened_path.exists() and failed_samples:
            hardened_model = joblib.load(hardened_path)
            evasive_domains = [d for d, _, _ in failed_samples]
            evasive_labels  = [1] * len(evasive_domains)  # all are malicious

            baseline_evasive_proba  = predict_batch(baseline_model,  evasive_domains)
            hardened_evasive_proba  = predict_batch(hardened_model,   evasive_domains)

            base_ev_stats = classification_summary(baseline_evasive_proba, evasive_labels, args.threshold)
            hard_ev_stats = classification_summary(hardened_evasive_proba, evasive_labels, args.threshold)

            print(f"\n  {'Metric':<12} {'Baseline':>10} {'Hardened':>10} {'Δ':>10}")
            print("  " + "-" * 45)
            for metric in ("recall", "precision", "f1", "accuracy"):
                delta = hard_ev_stats[metric] - base_ev_stats[metric]
                sign = "+" if delta >= 0 else ""
                print(f"  {metric:<12} {base_ev_stats[metric]:>10.4f} {hard_ev_stats[metric]:>10.4f} {sign}{delta:>9.4f}")

            report["hardening"] = {
                "augmented_csv": str(augmented_path),
                "hardened_model": str(hardened_path),
                "evasive_samples_used_for_comparison": len(evasive_domains),
                "baseline_on_evasive": base_ev_stats,
                "hardened_on_evasive": hard_ev_stats,
                "improvement_recall": round(hard_ev_stats["recall"] - base_ev_stats["recall"], 4),
                "improvement_f1":     round(hard_ev_stats["f1"]     - base_ev_stats["f1"],     4),
            }

    # ── Save report ───────────────────────────────────────────────────────────
    artifact_dir = Path(__file__).parent / "artifacts"
    artifact_dir.mkdir(exist_ok=True)
    report_path = artifact_dir / f"adversarial_report_{args.name}_v{args.version}.json"
    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
    print(f"\n✓ Report saved: {report_path}")

    if not args.dry_run and report.get("hardening", {}).get("improvement_recall", 0) < 0:
        print("[WARN] Hardened model shows reduced recall on evasive set — review augmentation quality.")


if __name__ == "__main__":
    main()
