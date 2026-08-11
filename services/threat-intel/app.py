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

import redis
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="DNS Shield Threat Intelligence", version="1.1.0")
cache = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
INDICATOR_TTL_SECONDS = int(os.getenv("INDICATOR_TTL_SECONDS", str(7 * 24 * 3600)))
SEED = [line.strip() for line in open("seed_indicators.txt", encoding="utf-8") if line.strip() and not line.startswith("#")]
DOMAIN_PATTERN = re.compile(r"^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$", re.I)


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


def save_indicator(domain: str, source: str, confidence: int, tags: list[str]) -> bool:
    domain = clean_domain(domain)
    if not domain:
        return False
    stix = stix_indicator(domain, source, confidence, tags)
    key = f"indicator:{domain}"
    cache.hset(key, mapping={"source": source, "confidence": str(confidence), "tags": json.dumps(tags), "stix": json.dumps(stix), "updated_at": datetime.now(timezone.utc).isoformat()})
    cache.expire(key, INDICATOR_TTL_SECONDS)
    cache.sadd("indicators:domains", domain)
    return True


def record_feed(name: str, status: str, *, added: int = 0, detail: str = "") -> None:
    cache.hset(f"feed:{name}", mapping={"status": status, "last_run": datetime.now(timezone.utc).isoformat(), "last_added": str(added), "detail": detail})


def extract_urlhaus_domains(lines: Iterable[str]) -> Iterable[str]:
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # URLhaus hostfile format is typically "0.0.0.0 domain # comment".
        fields = line.split()
        domain = clean_domain(fields[1] if len(fields) > 1 and re.fullmatch(r"(?:0\\.){3}0|127\\.0\\.0\\.1", fields[0]) else fields[0])
        if domain:
            yield domain


@app.on_event("startup")
def seed() -> None:
    for domain in SEED:
        save_indicator(domain, "seed-urlhaus-demo", 100, ["malware", "demo"])
    record_feed("seed", "loaded", added=len(SEED), detail="safe local demo indicators")


@app.get("/lookup/{domain}", tags=["lookup"])
def lookup(domain: str):
    domain = clean_domain(domain)
    if not domain:
        raise HTTPException(status_code=422, detail="invalid domain")
    row = cache.hgetall(f"indicator:{domain}")
    return {"domain": domain, "hit": bool(row), "indicator": row or None, "cache_only": True}


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
    return {"feeds": output, "fallback": "Redis retains last successfully parsed indicators until their configured TTL expires"}
