"""Threat-intelligence ingestion service.

All feed fetches are operator-triggered APIs. Parsed indicators are normalised to
STIX 2.1-shaped records and cached in Redis so the resolver never waits for a feed.
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Iterable
from urllib.parse import urlparse
from pathlib import Path

import redis
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="DNS Shield Threat Intelligence", version="1.2.0")
cache = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True, socket_connect_timeout=0.1, socket_timeout=0.1)
INDICATOR_TTL_SECONDS = int(os.getenv("INDICATOR_TTL_SECONDS", str(7 * 24 * 3600)))
MISP_URL = os.getenv("MISP_URL", "").rstrip("/")
MISP_API_KEY = os.getenv("MISP_API_KEY", "")
SEED_FILE = Path(__file__).parent / "seed_indicators.txt"
SEED = [line.strip() for line in open(SEED_FILE, encoding="utf-8") if line.strip() and not line.startswith("#")] if SEED_FILE.exists() else ["c2.bad-demo.example"]
DOMAIN_PATTERN = re.compile(r"^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$", re.I)

# ─── Disk-Backed IOC Persistence ─────────────────────────────────────────────
# Indicators are written to a JSON Lines file so they survive Redis restarts.
# This file is the source of truth for LOCAL_SEED_CACHE, which is consulted
# whenever Redis is unreachable.
DISK_CACHE_DIR = Path(__file__).parent / "data"
DISK_CACHE_FILE = DISK_CACHE_DIR / "ioc_cache.jsonl"


def _load_disk_cache() -> dict:
    """Load all indicators from the JSONL disk cache into a dict keyed by domain."""
    loaded: dict = {}
    if not DISK_CACHE_FILE.exists():
        return loaded
    try:
        with open(DISK_CACHE_FILE, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                entry = json.loads(line)
                domain = entry.pop("_domain", None)
                if domain:
                    loaded[domain] = entry
    except Exception:
        pass
    return loaded


def _append_disk_cache(domain: str, data: dict) -> None:
    """Append a single indicator to the JSONL disk cache (idempotent on re-write)."""
    try:
        DISK_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with open(DISK_CACHE_FILE, "a", encoding="utf-8") as fh:
            fh.write(json.dumps({"_domain": domain, **data}) + "\n")
    except Exception:
        pass


class Indicator(BaseModel):
    domain: str = Field(min_length=1, max_length=253)
    source: str = Field(default="manual")
    confidence: int = Field(default=90, ge=0, le=100)
    tags: list[str] = Field(default_factory=list)


def clean_domain(candidate: str) -> str | None:
    candidate = candidate.lower().strip().rstrip(".")
    if candidate.startswith(("http://", "https://")):
        candidate = urlparse(candidate).hostname or ""
    return candidate if DOMAIN_PATTERN.fullmatch(candidate) else None


def stix_indicator(domain: str, source: str, confidence: int, tags: list[str]) -> dict:
    stable_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"dns-shield:{domain}")
    return {
        "type": "indicator", "spec_version": "2.1", "id": f"indicator--{stable_id}",
        "created": datetime.now(timezone.utc).isoformat(), "modified": datetime.now(timezone.utc).isoformat(),
        "pattern_type": "stix", "pattern": f"[domain-name:value = '{domain}']", "valid_from": datetime.now(timezone.utc).isoformat(),
        "labels": sorted(set(tags)), "confidence": confidence,
        "external_references": [{"source_name": source}],
    }


# Populated at startup from disk cache, then kept in sync with every save_indicator() call.
LOCAL_SEED_CACHE: dict = {}


def save_indicator(domain: str, source: str, confidence: int, tags: list[str]) -> bool:
    domain = clean_domain(domain)
    if not domain:
        return False
    stix = stix_indicator(domain, source, confidence, tags)
    data = {
        "source": source, "confidence": str(confidence),
        "tags": json.dumps(tags), "stix": json.dumps(stix),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # 1. In-memory cache (always succeeds)
    LOCAL_SEED_CACHE[domain] = data
    # 2. Disk persistence (survives Redis restart + process restart)
    if domain not in LOCAL_SEED_CACHE or LOCAL_SEED_CACHE.get(domain) != data:
        _append_disk_cache(domain, data)
    else:
        _append_disk_cache(domain, data)  # always append so new seeds are persisted
    # 3. Redis (best-effort, fails gracefully)
    try:
        key = f"indicator:{domain}"
        cache.hset(key, mapping=data)
        cache.expire(key, INDICATOR_TTL_SECONDS)
        cache.sadd("indicators:domains", domain)
    except Exception:
        pass
    return True


def record_feed(name: str, status: str, *, added: int = 0, detail: str = "") -> None:
    try:
        cache.hset(f"feed:{name}", mapping={"status": status, "last_run": datetime.now(timezone.utc).isoformat(), "last_added": str(added), "detail": detail})
    except Exception:
        pass


def extract_urlhaus_domains(lines: Iterable[str]) -> Iterable[str]:
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        fields = line.split()
        domain = clean_domain(fields[1] if len(fields) > 1 and re.fullmatch(r"(?:0\\.){3}0|127\\.0\\.0\\.1", fields[0]) else fields[0])
        if domain:
            yield domain


def misp_event_payload(domain: str, indicator: dict) -> dict:
    source = indicator.get("external_references", [{}])[0].get("source_name", "DNS Shield")
    return {"Event": {"info": f"DNS Shield indicator: {domain}", "distribution": 0, "threat_level_id": 2, "analysis": 0, "Tag": [{"name": tag} for tag in indicator.get("labels", [])], "Attribute": [{"type": "domain", "category": "Network activity", "value": domain, "to_ids": True, "comment": f"Imported by DNS Shield from {source}; STIX ID {indicator['id']}", "distribution": 0}]}}


@app.on_event("startup")
def seed() -> None:
    # 1. Load disk cache first — restores all previously saved indicators
    #    even if Redis is empty after a restart.
    disk = _load_disk_cache()
    LOCAL_SEED_CACHE.update(disk)
    for domain, data in disk.items():
        try:
            key = f"indicator:{domain}"
            cache.hset(key, mapping=data)
            cache.expire(key, INDICATOR_TTL_SECONDS)
            cache.sadd("indicators:domains", domain)
        except Exception:
            pass  # Redis unreachable — disk cache is the fallback

    # 2. Seed built-in demo indicators
    for domain in SEED:
        save_indicator(domain, "seed-urlhaus-demo", 100, ["malware", "demo"])
    record_feed(
        "seed", "loaded", added=len(SEED),
        detail=f"safe local demo indicators; disk_cache_restored={len(disk)}"
    )


@app.get("/lookup/{domain}", tags=["lookup"])
def lookup(domain: str):
    domain = clean_domain(domain)
    if not domain:
        raise HTTPException(status_code=422, detail="invalid domain")

    row = None
    source_used = "redis"
    try:
        row = cache.hgetall(f"indicator:{domain}")
    except Exception:
        # Redis unreachable — fall through to local caches
        source_used = "local-memory"

    # Fallback 1: in-memory cache (seeded from disk on startup)
    if not row:
        row = LOCAL_SEED_CACHE.get(domain)
        if row:
            source_used = "local-memory"

    return {
        "domain": domain,
        "hit": bool(row),
        "indicator": row or None,
        "cache_only": True,
        "lookup_source": source_used,  # transparency for XAI pipeline
    }


@app.post("/indicators", tags=["manual"])
def add(indicator: Indicator):
    if not save_indicator(indicator.domain, indicator.source, indicator.confidence, indicator.tags):
        raise HTTPException(status_code=422, detail="invalid domain")
    return stix_indicator(clean_domain(indicator.domain), indicator.source, indicator.confidence, indicator.tags)


@app.get("/stix/bundle", tags=["standards"])
def stix_bundle(limit: int = 500):
    domains = list(cache.sscan_iter("indicators:domains", count=min(limit, 1000)))[:min(limit, 1000)]
    objects = [json.loads(row["stix"]) for domain in domains if (row := cache.hgetall(f"indicator:{domain}")) and row.get("stix")]
    return {"type": "bundle", "id": f"bundle--{uuid.uuid4()}", "objects": objects}


@app.get("/misp/health", tags=["misp"])
def misp_health():
    """Return configuration state without ever exposing MISP credentials."""
    if not MISP_URL or not MISP_API_KEY:
        return {"configured": False, "status": "not_configured", "required": ["MISP_URL", "MISP_API_KEY"]}
    try:
        response = requests.get(MISP_URL + "/servers/getVersion", headers={"Authorization": MISP_API_KEY, "Accept": "application/json"}, timeout=10)
        response.raise_for_status()
        return {"configured": True, "status": "reachable", "endpoint": MISP_URL}
    except requests.RequestException as exc:
        return {"configured": True, "status": "unreachable", "endpoint": MISP_URL, "error": type(exc).__name__}


@app.post("/misp/publish", tags=["misp"])
def publish_to_misp(limit: int = 100):
    """Publish cached indicators to a user-controlled MISP instance on operator request.

    This is intentionally not a startup action: MISP publishing changes external state
    and must remain an explicit operator/deployment decision.
    """
    if not MISP_URL or not MISP_API_KEY:
        raise HTTPException(status_code=409, detail="MISP_URL and MISP_API_KEY are required before publishing")
    domains = list(cache.sscan_iter("indicators:domains", count=min(limit, 1000)))[:min(max(limit, 1), 1000)]
    headers = {"Authorization": MISP_API_KEY, "Accept": "application/json", "Content-Type": "application/json"}
    published, failed = [], []
    for domain in domains:
        row = cache.hgetall(f"indicator:{domain}")
        if not row.get("stix"):
            continue
        try:
            stix = json.loads(row["stix"])
            response = requests.post(MISP_URL + "/events/add", headers=headers, json=misp_event_payload(domain, stix), timeout=15)
            response.raise_for_status()
            published.append(domain)
        except (requests.RequestException, ValueError) as exc:
            failed.append({"domain": domain, "error": type(exc).__name__})
    record_feed("misp-publish", "success" if not failed else "partial", added=len(published), detail=f"failed={len(failed)}")
    return {"endpoint": MISP_URL, "published": len(published), "failed": failed, "warning": "MISP deduplication policy should be configured by the MISP administrator before repeated publishes."}


@app.post("/feeds/urlhaus", tags=["feeds"])
def ingest_urlhaus():
    """Ingest Abuse.ch's documented online text feed; no scraping or credential bypass."""
    try:
        response = requests.get("https://urlhaus.abuse.ch/downloads/hostfile/", timeout=30)
        response.raise_for_status()
        added = sum(save_indicator(domain, "abuse.ch-urlhaus", 95, ["malware", "urlhaus"]) for domain in extract_urlhaus_domains(response.text.splitlines()))
        record_feed("urlhaus", "success", added=added)
        return {"feed": "Abuse.ch URLhaus", "indicators_added": added, "normalization": "STIX 2.1 + Redis cache"}
    except requests.RequestException as exc:
        record_feed("urlhaus", "failed", detail=type(exc).__name__)
        raise HTTPException(status_code=502, detail=f"URLhaus request failed: {type(exc).__name__}")


@app.post("/feeds/otx", tags=["feeds"])
def ingest_otx():
    key = os.getenv("OTX_API_KEY")
    if not key:
        raise HTTPException(status_code=409, detail="OTX_API_KEY is required; create it in your own AlienVault OTX account")
    try:
        response = requests.get("https://otx.alienvault.com/api/v1/pulses/subscribed", headers={"X-OTX-API-KEY": key}, timeout=30)
        response.raise_for_status(); payload = response.json(); added = 0
        for pulse in payload.get("results", []):
            for item in pulse.get("indicators", []):
                if item.get("type") in {"domain", "hostname"}:
                    added += save_indicator(item.get("indicator", ""), "AlienVault OTX", int(pulse.get("adversary", "") != "") * 10 + 80, ["otx", *pulse.get("tags", [])])
        record_feed("otx", "success", added=added)
        return {"feed": "AlienVault OTX", "indicators_added": added, "normalization": "STIX 2.1 + Redis cache"}
    except requests.RequestException as exc:
        record_feed("otx", "failed", detail=type(exc).__name__)
        raise HTTPException(status_code=502, detail=f"OTX request failed: {type(exc).__name__}")


@app.post("/feeds/certin", tags=["feeds"])
def ingest_certin():
    url = os.getenv("CERTIN_FEED_URL")
    if not url:
        raise HTTPException(status_code=409, detail="set CERTIN_FEED_URL to an approved published indicator list")
    try:
        response = requests.get(url, timeout=30); response.raise_for_status()
        candidates = re.findall(r"(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}", response.text)
        added = sum(save_indicator(domain, "CERT-In", 85, ["cert-in"]) for domain in candidates)
        record_feed("certin", "success", added=added)
        return {"feed": "CERT-In", "indicators_added": added, "normalization": "STIX 2.1 + Redis cache"}
    except requests.RequestException as exc:
        record_feed("certin", "failed", detail=type(exc).__name__)
        raise HTTPException(status_code=502, detail=f"CERT-In request failed: {type(exc).__name__}")


@app.get("/feeds/health", tags=["feeds"])
def feeds():
    configured = {"urlhaus": True, "otx": bool(os.getenv("OTX_API_KEY")), "certin": bool(os.getenv("CERTIN_FEED_URL"))}
    output = []
    for name, enabled in configured.items():
        state = cache.hgetall(f"feed:{name}")
        output.append({"name": name, "configured": enabled, "status": state.get("status", "not_run" if enabled else "not_configured"), "last_run": state.get("last_run"), "indicators_added": int(state.get("last_added", 0)), "detail": state.get("detail", "")})
    return {"feeds": output, "misp": {"configured": bool(MISP_URL and MISP_API_KEY), "mode": "operator-triggered publishing"}, "fallback": "Redis retains last successfully parsed indicators until their configured TTL expires"}
