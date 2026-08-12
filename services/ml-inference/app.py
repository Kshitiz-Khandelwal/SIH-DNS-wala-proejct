"""Local deterministic lexical inference service.

No LLM, remote inference, or live WHOIS call is used in the hot path. Models are
versioned joblib artifacts mounted read-only; transparent lexical fallback remains
available whenever artifacts are absent or invalid.
"""
from __future__ import annotations

import json
import math
import os
import time
from collections import Counter, deque
from pathlib import Path

import joblib
import redis
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="DNS Shield ML Inference", version="1.2.0")
store = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
ARTIFACT_DIR = Path(os.getenv("MODEL_ARTIFACT_DIR", "/app/artifacts"))
WHOIS_TTL_SECONDS = int(os.getenv("WHOIS_CACHE_TTL_SECONDS", str(7 * 24 * 3600)))
TOP_DOMAINS = ["google.com", "youtube.com", "facebook.com", "amazon.com", "wikipedia.org", "isro.gov.in", "microsoft.com", "github.com", "apple.com", "netflix.com", "linkedin.com", "instagram.com"]
VOWELS = set("aeiou")
models: dict[str, tuple[float, object]] = {}
recent_features: deque[dict[str, float]] = deque(maxlen=1000)


class PredictRequest(BaseModel):
    domain: str = Field(min_length=1, max_length=253)
    whois_age_days: int | None = Field(default=None, ge=0, description="Optional caller-supplied cached age; no live WHOIS request is performed.")


class WhoisCacheEntry(BaseModel):
    age_days: int = Field(ge=0, le=365000)
    source: str = Field(default="operator-import", max_length=128)


def normalise(domain: str) -> str:
    result = domain.lower().strip().rstrip(".")
    if not result or " " in result:
        raise HTTPException(status_code=422, detail="invalid domain")
    return result


def entropy(text: str) -> float:
    counts = Counter(text)
    return -sum((count / len(text)) * math.log2(count / len(text)) for count in counts.values()) if text else 0.0


def levenshtein(left: str, right: str) -> int:
    previous = list(range(len(right) + 1))
    for index, char_left in enumerate(left, 1):
        current = [index]
        for right_index, char_right in enumerate(right, 1):
            current.append(min(current[-1] + 1, previous[right_index] + 1, previous[right_index - 1] + int(char_left != char_right)))
        previous = current
    return previous[-1]


def ngram_rarity(text: str) -> float:
    """Transparent approximate n-gram novelty feature used until a trained model is mounted."""
    common = ("th", "he", "in", "er", "an", "re", "on", "at", "en", "nd", "ti", "es", "or", "te", "of")
    grams = [text[index:index + 2] for index in range(max(len(text) - 1, 0))]
    if not grams:
        return 0.0
    return round(sum(gram not in common for gram in grams) / len(grams), 4)


def cached_whois_age(domain: str, supplied: int | None) -> tuple[int | None, str]:
    if supplied is not None:
        return supplied, "caller-supplied-cached"
    row = store.hgetall(f"whois:age:{domain}")
    if row.get("age_days"):
        return int(row["age_days"]), row.get("source", "redis-cache")
    return None, "not-available-no-live-whois"


def feature_vector(domain: str, whois_age_days: int | None) -> dict:
    labels = domain.split(".")
    stem = "".join(labels[:-1]) or labels[0]
    letters = [char for char in stem if char.isalpha()]
    vowel_count = sum(char in VOWELS for char in letters)
    consonant_count = max(1, len(letters) - vowel_count)
    closest_distance, closest_domain = min((levenshtein(domain, legitimate), legitimate) for legitimate in TOP_DOMAINS)
    digit_ratio = sum(char.isdigit() for char in stem) / max(1, len(stem))
    return {"entropy": round(entropy(stem), 4), "vowel_consonant_ratio": round(vowel_count / consonant_count, 4), "length": len(domain), "label_count": len(labels), "digit_ratio": round(digit_ratio, 4), "ngram_rarity": ngram_rarity(stem), "closest_legitimate_domain": closest_domain, "levenshtein_distance": closest_distance, "whois_age_days": whois_age_days, "whois_cached": whois_age_days is not None}


def local_model_probability(name: str, domain: str) -> tuple[float | None, str | None]:
    candidates = sorted(ARTIFACT_DIR.glob(f"{name}-v*.joblib"), reverse=True) if ARTIFACT_DIR.exists() else []
    if not candidates:
        return None, None
    artifact = candidates[0]
    try:
        metadata_path = artifact.with_suffix(".metadata.json")
        if metadata_path.exists():
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            if metadata.get("artifact_schema_version") != "dns-shield-model-v1" or metadata.get("name") != name:
                return None, None
        modified = artifact.stat().st_mtime
        cached = models.get(str(artifact))
        if cached is None or cached[0] != modified:
            models[str(artifact)] = (modified, joblib.load(artifact))
        classifier = models[str(artifact)][1]
        probability = float(classifier.predict_proba([domain])[0][1])
        return max(0.0, min(1.0, probability)), artifact.stem
    except Exception:
        return None, None


def predict_one(request: PredictRequest) -> dict:
    started = time.perf_counter()
    domain = normalise(request.domain)
    age, age_source = cached_whois_age(domain, request.whois_age_days)
    features = feature_vector(domain, age)
    recent_features.append({"length": float(features["length"]), "entropy": float(features["entropy"])})
    fallback_dga = min(1.0, max(0.0, (features["entropy"] - 2.8) / 1.5 * .50 + (features["length"] - 18) / 30 * .20 + features["digit_ratio"] * .35 + features["ngram_rarity"] * .18))
    fallback_typo = 0.0 if domain in TOP_DOMAINS else (.85 if features["levenshtein_distance"] <= 2 else 0.0)
    dga, dga_version = local_model_probability("dga", domain); typo, typo_version = local_model_probability("typosquat", domain)
    dga = fallback_dga if dga is None else dga; typo = fallback_typo if typo is None else typo
    if age is not None and age < 30: dga = min(1.0, dga + .08)
    probability = round(max(dga, typo), 4)
    band = "benign" if probability < .30 else "uncertain" if probability < .70 else "suspicious"
    reasons = []
    if features["entropy"] > 3.6: reasons.append(f"high lexical entropy ({features['entropy']})")
    if features["ngram_rarity"] > .65: reasons.append(f"uncommon character n-grams ({features['ngram_rarity']})")
    if features["levenshtein_distance"] <= 2 and domain != features["closest_legitimate_domain"]: reasons.append(f"near {features['closest_legitimate_domain']} (edit distance {features['levenshtein_distance']})")
    if age is not None and age < 30: reasons.append(f"young cached registration age ({age} days)")
    if not reasons: reasons.append("low-entropy lexical profile with no close legitimate-domain match")
    versions = [version for version in (dga_version, typo_version) if version]
    return {"domain": domain, "dga_probability": round(dga, 4), "typosquat_probability": round(typo, 4), "probability": probability, "uncertainty_band": band, "features": features, "whois_age_source": age_source, "reasons": reasons, "model_version": "+".join(versions) if versions else "heuristic-baseline-1.0", "inference_mode": "trained-local-artifact" if versions else "transparent-deterministic-baseline", "inference_ms": round((time.perf_counter() - started) * 1000, 3)}


@app.post("/predict", tags=["inference"])
def predict(request: PredictRequest): return predict_one(request)


@app.post("/predict/batch", tags=["inference"])
def batch(requests: list[PredictRequest]): return [predict_one(request) for request in requests]


@app.put("/whois-cache/{domain}", tags=["whois-cache"])
def set_whois_age(domain: str, entry: WhoisCacheEntry):
    domain = normalise(domain); store.hset(f"whois:age:{domain}", mapping={"age_days": entry.age_days, "source": entry.source}); store.expire(f"whois:age:{domain}", WHOIS_TTL_SECONDS)
    return {"domain": domain, **entry.model_dump(), "ttl_seconds": WHOIS_TTL_SECONDS, "warning": "This endpoint stores a pre-fetched age only; it never performs a live WHOIS lookup."}


@app.get("/whois-cache/{domain}", tags=["whois-cache"])
def get_whois_age(domain: str):
    domain = normalise(domain); row = store.hgetall(f"whois:age:{domain}")
    return {"domain": domain, "cached": bool(row), "entry": row or None}


@app.get("/health", tags=["operations"])
def health(): return {"status": "ok", "mode": "local-deterministic", "artifact_directory": str(ARTIFACT_DIR), "artifact_directory_present": ARTIFACT_DIR.exists(), "whois_policy": "cached ages only; no live hot-path lookup"}


@app.get("/monitoring", tags=["operations"])
def monitoring():
    metric_files = sorted(ARTIFACT_DIR.glob("*.metrics.json")) if ARTIFACT_DIR.exists() else []
    baseline_files = sorted(ARTIFACT_DIR.glob("*.feature-baseline.json")) if ARTIFACT_DIR.exists() else []
    metrics = json.loads(metric_files[-1].read_text()) if metric_files else {}
    drift: dict = {"status": "not_available_until_training_and_runtime_samples_exist"}
    if baseline_files and recent_features:
        baseline = json.loads(baseline_files[-1].read_text()); observed = {key: sum(row[key] for row in recent_features) / len(recent_features) for key in ("length", "entropy")}
        change = {key: round(abs(observed[key] - baseline[f"{key}_mean"]) / max(abs(baseline[f"{key}_mean"]), .001), 4) for key in observed}
        drift = {"status": "computed", "training_baseline": baseline, "recent_sample_count": len(recent_features), "recent_means": observed, "relative_mean_change": change, "indicator": "elevated" if max(change.values()) > .30 else "stable"}
    metadata_files = sorted(ARTIFACT_DIR.glob("*.metadata.json")) if ARTIFACT_DIR.exists() else []
    metadata = json.loads(metadata_files[-1].read_text(encoding="utf-8")) if metadata_files else {}
    return {"model_version": metric_files[-1].stem.replace(".metrics", "") if metric_files else "heuristic-baseline-1.0", "evaluation_metrics": metrics, "training_metadata": metadata, "metrics_status": "loaded_from_training_artifact" if metric_files else "not_available_until_training_run", "feature_drift": drift, "latency_source": "returned by every /predict response"}
