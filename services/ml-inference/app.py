"""Deterministic local lexical classifier; never calls an LLM or external WHOIS in hot path."""
import math, os, re, time
from collections import Counter
from pathlib import Path
from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="DNS Shield ML Inference", version="1.0.0")
TOP_DOMAINS = ["google.com", "youtube.com", "facebook.com", "amazon.com", "wikipedia.org", "isro.gov.in", "microsoft.com", "github.com"]
VOWELS = set("aeiou")

class PredictRequest(BaseModel):
    domain: str = Field(min_length=1, max_length=253)
    whois_age_days: int | None = None

def entropy(text: str) -> float:
    counts = Counter(text)
    return -sum((n/len(text))*math.log2(n/len(text)) for n in counts.values()) if text else 0.0

def lev(a: str, b: str) -> int:
    prev = list(range(len(b)+1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1): cur.append(min(cur[-1]+1, prev[j]+1, prev[j-1]+(x != y)))
        prev = cur
    return prev[-1]

def features(domain: str, whois_age_days: int | None):
    name = domain.lower().rstrip(".")
    labels = name.split(".")
    stem = "".join(labels[:-1]) or labels[0]
    letters = [c for c in stem if c.isalpha()]
    vowels = sum(c in VOWELS for c in letters)
    consonants = max(1, len(letters)-vowels)
    e = entropy(stem)
    min_brand, brand = min((lev(name, x), x) for x in TOP_DOMAINS)
    digits = sum(c.isdigit() for c in stem) / max(1, len(stem))
    return {"entropy": round(e, 3), "vowel_consonant_ratio": round(vowels/consonants, 3), "length": len(name), "label_count": len(labels), "digit_ratio": round(digits, 3), "ngram_rarity": round(min(1.0, max(0.0, (e-2.7)/2.0 + digits/2)), 3), "closest_legitimate_domain": brand, "levenshtein_distance": min_brand, "whois_age_days": whois_age_days, "whois_cached": whois_age_days is not None}

def classify(request: PredictRequest):
    f = features(request.domain, request.whois_age_days)
    # Calibrated transparent fallback used until versioned artifacts are trained.
    dga = min(1.0, max(0.0, (f["entropy"]-2.8)/1.5*0.55 + (f["length"]-18)/30*0.20 + f["digit_ratio"]*0.35 + f["ngram_rarity"]*0.25))
    typo = 0.0 if request.domain.lower().rstrip(".") in TOP_DOMAINS else (0.85 if f["levenshtein_distance"] <= 2 else 0.0)
    if request.whois_age_days is not None and request.whois_age_days < 30: dga = min(1.0, dga + .08)
    probability = round(max(dga, typo), 4)
    band: Literal["benign", "uncertain", "suspicious"] = "benign" if probability < .30 else "uncertain" if probability < .70 else "suspicious"
    reasons = []
    if f["entropy"] > 3.6: reasons.append(f"high lexical entropy ({f['entropy']})")
    if f["ngram_rarity"] > .55: reasons.append(f"rare n-gram profile ({f['ngram_rarity']})")
    if typo: reasons.append(f"close to {f['closest_legitimate_domain']} (edit distance {f['levenshtein_distance']})")
    if request.whois_age_days is not None and request.whois_age_days < 30: reasons.append(f"young cached registration age ({request.whois_age_days} days)")
    if not reasons: reasons.append("lexical profile is consistent with known benign domains")
    return {"domain": request.domain, "dga_probability": round(dga,4), "typosquat_probability": round(typo,4), "probability": probability, "uncertainty_band": band, "features": f, "reasons": reasons, "model_version": "heuristic-baseline-1.0", "inference_ms": 0}

@app.post("/predict")
def predict(request: PredictRequest):
    started=time.perf_counter(); result=classify(request); result["inference_ms"]=round((time.perf_counter()-started)*1000,3); return result
@app.post("/predict/batch")
def batch(requests: list[PredictRequest]): return [predict(x) for x in requests]
@app.get("/health")
def health(): return {"status":"ok", "mode":"local-deterministic", "model_version":"heuristic-baseline-1.0"}
@app.get("/monitoring")
def monitoring():
    """Never invent quality values: return only persisted results from actual training."""
    artifact_dir=Path(os.getenv("MODEL_ARTIFACT_DIR","/app/artifacts")); metric_files=sorted(artifact_dir.glob("*.metrics.json")) if artifact_dir.exists() else []
    metrics={}
    if metric_files:
        import json
        metrics=json.loads(metric_files[-1].read_text())
    return {"model_version":"heuristic-baseline-1.0" if not metric_files else metric_files[-1].stem.replace(".metrics",""),"evaluation_metrics":metrics,"metrics_status":"not_available_until_training_run" if not metric_files else "loaded_from_training_artifact","feature_drift":"not_computed_until_training_baseline_is_saved","latency_source":"returned per /predict response"}
