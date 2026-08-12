"""Public integration boundary and deterministic DNS decision orchestrator.

All hot-path decisions stay local and synchronous. Every dependency is optional at
runtime: failures are returned as degraded state and never make DNS resolution fail.
"""
from __future__ import annotations

import os
import time
import uuid
from collections import Counter, deque
from typing import Any

import redis
import requests
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

app = FastAPI(
    title="DNS Shield SIEM API",
    version="1.1.0",
    description="Deterministic, explainable DNS-security pipeline. OpenAPI at /openapi.json.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
SERVICES = {
    "ml": os.getenv("ML_URL", "http://ml-inference:8000"),
    "behavioral": os.getenv("BEHAVIOR_URL", "http://behavioral-engine:8001"),
    "geo": os.getenv("GEO_URL", "http://geo-intel:8002"),
    "threat-intel": os.getenv("THREAT_INTEL_URL", "http://threat-intel:8003"),
    "active-response": os.getenv("ACTIVE_RESPONSE_URL", "http://active-response:8004"),
}
ANALYTICS = os.getenv("ANALYTICS_STORE_URL", "http://analytics-store:8005")
CACHE_TTL_SECONDS = int(os.getenv("VERDICT_CACHE_TTL_SECONDS", "300"))
API_KEY = os.getenv("GATEWAY_API_KEY", "")
RATE_LIMIT_PER_MINUTE = int(os.getenv("GATEWAY_RATE_LIMIT_PER_MINUTE", "240"))
AUTH_EXEMPT_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}
METRICS_PUBLIC = os.getenv("METRICS_PUBLIC", "false").lower() == "true"
if METRICS_PUBLIC:
    AUTH_EXEMPT_PATHS.add("/metrics")
REQUEST_COUNTS: Counter[tuple[str, str]] = Counter()
REQUEST_LATENCIES_MS: deque[float] = deque(maxlen=5000)
PIPELINE_VERDICTS: Counter[str] = Counter()
DEGRADED_REQUESTS: Counter[str] = Counter()


def request_ip(request: Request) -> str:
    """Trust forwarded headers only behind an explicitly configured reverse proxy."""
    if os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true":
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if forwarded:
            return forwarded
    return request.client.host if request.client else "unknown"


def store_rate_limit(key: str) -> int:
    count = int(redis_client.incr(key))
    if count == 1:
        redis_client.expire(key, 61)
    return count


@app.middleware("http")
async def request_observability(request: Request, call_next):
    """Attach a correlation ID and collect compact in-process operational metrics."""
    correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    started = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - started) * 1000
    REQUEST_COUNTS[(request.method, str(response.status_code))] += 1
    REQUEST_LATENCIES_MS.append(elapsed)
    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Response-Time-Ms"] = f"{elapsed:.3f}"
    return response


@app.middleware("http")
async def protect_api(request: Request, call_next):
    """Apply optional API-key access control and Redis-backed fixed-window limits.

    Local development remains usable while GATEWAY_API_KEY is empty. A hosted API
    must set it (or place an equivalent reviewed auth layer in front of the gateway).
    If Redis is down, this fails open to preserve DNS availability and marks the
    response so monitoring can detect the degraded control.
    """
    if request.url.path in AUTH_EXEMPT_PATHS:
        return await call_next(request)
    if API_KEY and request.headers.get("X-DNS-Shield-Key") != API_KEY:
        return JSONResponse(status_code=401, content={"detail": "valid X-DNS-Shield-Key required"})
    bucket = int(time.time() // 60)
    try:
        count = store_rate_limit(f"ratelimit:{request_ip(request)}:{bucket}")
        if count > RATE_LIMIT_PER_MINUTE:
            retry_after = 60 - int(time.time()) % 60
            return JSONResponse(status_code=429, content={"detail": "rate limit exceeded", "limit_per_minute": RATE_LIMIT_PER_MINUTE}, headers={"Retry-After": str(retry_after)})
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_PER_MINUTE)
        response.headers["X-RateLimit-Remaining"] = str(max(0, RATE_LIMIT_PER_MINUTE - count))
        if not API_KEY:
            response.headers["X-DNS-Shield-Auth"] = "disabled-local-development-only"
        return response
    except redis.RedisError:
        response = await call_next(request)
        response.headers["X-DNS-Shield-RateLimit"] = "degraded-redis-unavailable"
        return response


class Query(BaseModel):
    domain: str = Field(min_length=1, max_length=253, examples=["c2.bad-demo.example"])
    client_ip: str = Field(default="127.0.0.1")
    target_ip: str = Field(default="", description="Resolved IP when known; used only for offline GeoIP enrichment.")
    source: str = Field(default="dashboard", examples=["resolver", "dashboard", "passive-zeek"])
    whois_age_days: int | None = Field(default=None, ge=0, description="Cached WHOIS age. Hot path never performs a live lookup.")


class Feedback(BaseModel):
    label: str = Field(pattern="^(False Positive|Confirmed Threat|Needs Investigation)$")
    analyst: str = Field(default="dashboard", max_length=128)


def normalize_domain(value: str) -> str:
    value = value.lower().strip().rstrip(".")
    if not value or " " in value or len(value) > 253:
        raise HTTPException(status_code=422, detail="domain must be a valid non-empty DNS name")
    return value


def service_json(service: str, method: str, path: str, *, payload: dict | None = None, timeout: float = 0.25) -> tuple[dict | None, str | None]:
    """Bounded service call returning an explicit degradation reason instead of raising."""
    try:
        response = requests.request(method, SERVICES[service] + path, json=payload, timeout=timeout)
        response.raise_for_status()
        return response.json(), None
    except (requests.RequestException, ValueError) as exc:
        return None, f"{service} unavailable: {type(exc).__name__}"


def persist_event(event: dict[str, Any]) -> str | None:
    try:
        response = requests.post(ANALYTICS + "/events", json=event, timeout=0.5)
        response.raise_for_status()
        return None
    except requests.RequestException as exc:
        return f"analytics-store unavailable: {type(exc).__name__}"


def decide_verdict(risk: int, threat_hit: bool, uncertainty_band: str | None) -> str:
    if threat_hit:
        return "BLOCK"
    # A single uncertain lexical signal is intentionally never sufficient to block.
    if risk >= 71 and uncertainty_band != "uncertain":
        return "BLOCK"
    if risk >= 41 or uncertainty_band == "uncertain":
        return "FLAG"
    return "ALLOW"


@app.post("/v1/query", tags=["detection"])
def query(request: Query) -> dict[str, Any]:
    """Run the cheap-to-expensive seven-stage filtering pipeline with XAI evidence."""
    started = time.perf_counter()
    domain = normalize_domain(request.domain)

    cached = redis_client.hgetall(f"verdict:{domain}")
    if cached:
        PIPELINE_VERDICTS[cached["verdict"]] += 1
        return {
            "domain": domain, "verdict": cached["verdict"], "domain_risk": int(cached["risk"]),
            "device_risk": int(cached.get("device_risk", 0)), "confidence": cached.get("confidence", "LOW"),
            "cache": "hit", "pipeline": [{"stage": "redis-cache", "status": "hit", "contribution": 0, "reason": "recent deterministic verdict"}],
            "reasons": ["cached deterministic verdict"], "latency_ms": round((time.perf_counter() - started) * 1000, 3),
        }

    pipeline: list[dict[str, Any]] = [{"stage": "redis-cache", "status": "miss", "contribution": 0, "reason": "no unexpired verdict"}]
    degraded: list[str] = []
    intel, error = service_json("threat-intel", "GET", f"/lookup/{domain}")
    if error:
        degraded.append(error)
        pipeline.append({"stage": "threat-intel", "status": "degraded", "contribution": 0, "reason": "last cached Redis indicators remain available to resolver"})
    else:
        pipeline.append({"stage": "threat-intel", "status": "hit" if intel.get("hit") else "clean", "contribution": 100 if intel.get("hit") else 0, "reason": (intel.get("indicator") or {}).get("source", "no matching indicator")})

    ml, error = service_json("ml", "POST", "/predict", payload={"domain": domain, "whois_age_days": request.whois_age_days})
    if error:
        degraded.append(error)
        pipeline.append({"stage": "ml-lexical", "status": "degraded", "contribution": 0, "reason": "ML-only blocks safely downgrade to FLAG"})
    else:
        pipeline.append({"stage": "ml-lexical", "status": ml["uncertainty_band"], "contribution": round(ml["probability"] * 55), "reason": "; ".join(ml["reasons"]), "features": ml["features"]})

    behavior, error = service_json("behavioral", "POST", "/observe", payload={"domain": domain, "client_ip": request.client_ip, "ml_probability": (ml or {}).get("probability", 0), "threat_hit": bool((intel or {}).get("hit"))})
    if error:
        degraded.append(error)
        pipeline.append({"stage": "behavioral", "status": "degraded", "contribution": 0, "reason": "normal DNS service continues"})
    else:
        pipeline.append({"stage": "behavioral", "status": "alert" if behavior["contribution"] else "normal", "contribution": behavior["contribution"], "reason": "; ".join(behavior["signals"])})

    geo, error = (None, None)
    if request.target_ip:
        geo, error = service_json("geo", "POST", "/lookup", payload={"ip": request.target_ip})
        if error:
            degraded.append(error)
            pipeline.append({"stage": "geo-intel", "status": "degraded", "contribution": 0, "reason": "geo never blocks alone"})
        else:
            pipeline.append({"stage": "geo-intel", "status": "available" if geo.get("available") else "neutral", "contribution": geo.get("risk_contribution", 0), "reason": geo["reason"]})

    quarantine, error = service_json("active-response", "GET", "/quarantine")
    if error:
        degraded.append(error)
        quarantined = False
    else:
        quarantined = request.client_ip in quarantine.get("rules", {})

    threat_hit = bool((intel or {}).get("hit"))
    risk = 100 if threat_hit else round((ml or {}).get("probability", 0) * 55) + (behavior or {}).get("contribution", 0) + (geo or {}).get("risk_contribution", 0)
    if quarantined:
        risk = max(risk, 45)
        pipeline.append({"stage": "device-quarantine", "status": "active", "contribution": 0, "reason": "device is isolated in the virtual lab; safe domains remain visible as FLAG"})
    risk = min(100, risk)
    verdict = decide_verdict(risk, threat_hit, (ml or {}).get("uncertainty_band"))
    if ml is None and verdict == "BLOCK" and not threat_hit:
        verdict = "FLAG"

    reasons = [item["reason"] for item in pipeline if item["reason"]]
    confidence = "HIGH" if threat_hit or risk >= 80 else "MEDIUM" if risk >= 41 else "LOW"
    event = {"event_id": str(uuid.uuid4()), "domain": domain, "client_ip": request.client_ip, "verdict": verdict, "domain_risk": risk, "device_risk": (behavior or {}).get("device_risk", 0), "confidence": confidence, "reasons": reasons, "target_ip": request.target_ip, "source": request.source, "geo_json": str(geo or {})}
    persistence_error = persist_event(event)
    if persistence_error:
        degraded.append(persistence_error)

    redis_client.hset(f"verdict:{domain}", mapping={"verdict": verdict, "risk": risk, "device_risk": event["device_risk"], "confidence": confidence})
    redis_client.expire(f"verdict:{domain}", CACHE_TTL_SECONDS)

    if event["device_risk"] >= 80:
        action, error = service_json("active-response", "POST", "/quarantine", payload={"device_ip": request.client_ip, "reason": "automated virtual-lab threshold reached"})
        if error: degraded.append(error)
        else: event["quarantine_action"] = action
    if verdict == "BLOCK":
        action, error = service_json("active-response", "POST", f"/sinkhole?domain={domain}", payload={})
        if error: degraded.append(error)
        else: event["sinkhole"] = action

    event.update({"cache": "miss", "pipeline": pipeline, "ml": ml, "behavior": behavior, "geo": geo, "degraded_dependencies": degraded, "latency_ms": round((time.perf_counter() - started) * 1000, 3)})
    PIPELINE_VERDICTS[verdict] += 1
    for dependency in degraded:
        DEGRADED_REQUESTS[dependency.split(":")[0]] += 1
    return event


@app.get("/v1/events", tags=["analytics"])
def events(limit: int = 100):
    try:
        return requests.get(ANALYTICS + f"/events?limit={min(max(limit, 1), 500)}", timeout=2).json()
    except requests.RequestException:
        return []


@app.get("/v1/stats", tags=["analytics"])
def stats(hours: int = 24):
    try:
        response = requests.get(ANALYTICS + f"/stats?hours={min(max(hours, 1), 720)}", timeout=2)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail=f"analytics-store unavailable: {type(exc).__name__}")


@app.get("/v1/devices/{ip}", tags=["analytics"])
def device(ip: str):
    data, error = service_json("behavioral", "GET", f"/devices/{ip}", timeout=2)
    if error: raise HTTPException(status_code=503, detail=error)
    return data


@app.get("/v1/domains/{domain}", tags=["analytics"])
def domain_profile(domain: str):
    data, error = service_json("behavioral", "GET", f"/domains/{normalize_domain(domain)}", timeout=2)
    if error: raise HTTPException(status_code=503, detail=error)
    return data


@app.get("/v1/incidents", tags=["analytics"])
def incidents():
    data, error = service_json("behavioral", "GET", "/incidents", timeout=2)
    return [] if error else data


@app.get("/v1/feed-health", tags=["operations"])
def feed_health():
    data, error = service_json("threat-intel", "GET", "/feeds/health", timeout=2)
    if error: raise HTTPException(status_code=503, detail=error)
    return data


@app.get("/v1/model-monitoring", tags=["operations"])
def model_monitoring():
    data, error = service_json("ml", "GET", "/monitoring", timeout=2)
    if error: raise HTTPException(status_code=503, detail=error)
    return data


@app.post("/v1/events/{event_id}/feedback", tags=["analyst-feedback"])
def feedback(event_id: str, body: Feedback):
    redis_client.hset(f"feedback:{event_id}", mapping=body.model_dump())
    return {"event_id": event_id, **body.model_dump(), "status": "persisted", "retraining_path": "ml-training/README.md"}


@app.post("/v1/passive/{format_name}", tags=["passive-analysis"])
async def passive(format_name: str, file: UploadFile = File(...)):
    if format_name not in {"zeek", "pcap"}:
        raise HTTPException(status_code=404, detail="supported formats: zeek, pcap")
    raw = await file.read()
    if len(raw) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="maximum upload size is 50 MiB")
    try:
        parsed = requests.post(ANALYTICS + f"/passive/{format_name}", files={"file": (file.filename, raw, file.content_type)}, timeout=30).json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail=f"analytics-store unavailable: {type(exc).__name__}")
    results = [query(Query(domain=row["domain"], client_ip=row.get("client_ip", "offline"), source=f"passive-{format_name}")) for row in parsed.get("extracted_queries", [])]
    return {"filename": file.filename, "format": format_name, "queries_extracted": len(results), "results": results, "parser_note": parsed.get("note"), "parser_error": parsed.get("error")}


@app.get("/v1/quarantine", tags=["response"])
def quarantine_rules():
    data, error = service_json("active-response", "GET", "/quarantine", timeout=2)
    if error: raise HTTPException(status_code=503, detail=error)
    return data


@app.delete("/v1/quarantine/{ip}", tags=["response"])
def release(ip: str):
    data, error = service_json("active-response", "DELETE", f"/quarantine/{ip}", timeout=2)
    if error: raise HTTPException(status_code=503, detail=error)
    return data


@app.get("/health", tags=["operations"])
def health():
    return {"status": "ok", "detection_plane": "local deterministic", "llm_required": False, "cache_ttl_seconds": CACHE_TTL_SECONDS}


@app.get("/metrics", tags=["operations"], response_class=PlainTextResponse)
def metrics():
    """Prometheus text exposition for local/demo monitoring; protect in hosted mode by default."""
    lines = ["# HELP dns_shield_gateway_requests_total Requests completed by method and status.", "# TYPE dns_shield_gateway_requests_total counter"]
    lines += [f'dns_shield_gateway_requests_total{{method="{method}",status="{status}"}} {count}' for (method, status), count in sorted(REQUEST_COUNTS.items())]
    lines += ["# HELP dns_shield_gateway_pipeline_verdicts_total Decisions by verdict.", "# TYPE dns_shield_gateway_pipeline_verdicts_total counter"]
    lines += [f'dns_shield_gateway_pipeline_verdicts_total{{verdict="{verdict}"}} {count}' for verdict, count in sorted(PIPELINE_VERDICTS.items())]
    lines += ["# HELP dns_shield_gateway_degraded_requests_total Requests that observed unavailable dependencies.", "# TYPE dns_shield_gateway_degraded_requests_total counter"]
    lines += [f'dns_shield_gateway_degraded_requests_total{{dependency="{dependency}"}} {count}' for dependency, count in sorted(DEGRADED_REQUESTS.items())]
    if REQUEST_LATENCIES_MS:
        ordered = sorted(REQUEST_LATENCIES_MS)
        for percentile in (50, 95, 99):
            index = min(len(ordered) - 1, round((percentile / 100) * (len(ordered) - 1)))
            lines.append(f'dns_shield_gateway_response_latency_ms{{quantile="{percentile}"}} {ordered[index]:.3f}')
    return "\n".join(lines) + "\n"
