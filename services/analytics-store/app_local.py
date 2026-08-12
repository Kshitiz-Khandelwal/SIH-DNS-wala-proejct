"""Local in-memory analytics store — hackathon demo replacement for ClickHouse backend.

Stores events and feedback in Redis lists (with in-process fallback deque) so the
gateway, dashboard, and notebook all see live data without Docker or ClickHouse.

API is 100% compatible with the original analytics-store app.py.
"""
from __future__ import annotations

import csv
import io
import json
import os
import socket
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Iterable

import redis
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="DNS Shield Analytics Store (Local)", version="1.1.0-local")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis for persistence; in-process deque as graceful fallback
_redis = redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    decode_responses=True,
    socket_connect_timeout=0.3,
    socket_timeout=0.3,
)
EVENTS_KEY = "analytics:events"
FEEDBACK_KEY = "analytics:feedback"
MAX_EVENTS = 2000

# Pure in-memory fallback (used when Redis unavailable)
_events_mem: deque[dict] = deque(maxlen=MAX_EVENTS)
_feedback_mem: deque[dict] = deque(maxlen=500)


class Event(BaseModel):
    event_id: str | None = None
    timestamp: str | None = None
    domain: str = Field(min_length=1, max_length=253)
    client_ip: str = Field(min_length=1, max_length=64)
    verdict: str = Field(pattern="^(ALLOW|FLAG|BLOCK)$")
    domain_risk: int = Field(ge=0, le=100)
    device_risk: int = Field(ge=0, le=100)
    confidence: str = Field(pattern="^(HIGH|MEDIUM|LOW)$")
    reasons: list[str] = Field(default_factory=list)
    target_ip: str = ""
    source: str = "active"
    geo_json: str = "{}"


class FeedbackRecord(BaseModel):
    event_id: str = Field(min_length=1, max_length=64)
    label: str = Field(pattern="^(False Positive|Confirmed Threat|Needs Investigation)$")
    analyst: str = Field(default="dashboard", max_length=128)
    timestamp: str | None = None


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")


def _push_event(row: dict) -> None:
    _events_mem.appendleft(row)
    try:
        _redis.lpush(EVENTS_KEY, json.dumps(row))
        _redis.ltrim(EVENTS_KEY, 0, MAX_EVENTS - 1)
    except Exception:
        pass


def _all_events() -> list[dict]:
    try:
        raw = _redis.lrange(EVENTS_KEY, 0, MAX_EVENTS - 1)
        if raw:
            return [json.loads(r) for r in raw]
    except Exception:
        pass
    return list(_events_mem)


def _push_feedback(row: dict) -> None:
    _feedback_mem.appendleft(row)
    try:
        _redis.lpush(FEEDBACK_KEY, json.dumps(row))
        _redis.ltrim(FEEDBACK_KEY, 0, 499)
    except Exception:
        pass


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/events", tags=["ingestion"])
def add_event(event: Event):
    row = event.model_dump()
    row["event_id"] = row["event_id"] or str(uuid.uuid4())
    row["timestamp"] = row["timestamp"] or _now_str()
    row["reasons"] = "; ".join(str(r).replace("\n", " ") for r in row["reasons"])
    row["geo_json"] = str(row["geo_json"])[:8192]
    _push_event(row)
    return row


@app.get("/events", tags=["analytics"])
def events(limit: int = 100, verdict: str | None = None, client_ip: str | None = None):
    limit = min(max(limit, 1), 500)
    rows = _all_events()
    if verdict in {"ALLOW", "FLAG", "BLOCK"}:
        rows = [r for r in rows if r.get("verdict") == verdict]
    if client_ip:
        rows = [r for r in rows if r.get("client_ip") == client_ip]
    return rows[:limit]


@app.get("/stats", tags=["analytics"])
def stats(hours: int = 24):
    from datetime import timedelta
    hours = min(max(hours, 1), 720)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    totals: dict[str, dict] = {}
    for row in _all_events():
        try:
            ts = datetime.fromisoformat(row["timestamp"].replace(" ", "T"))
            if ts.tzinfo is None:
                from datetime import timezone as tz
                ts = ts.replace(tzinfo=tz.utc)
        except Exception:
            continue
        if ts < cutoff:
            continue
        v = row.get("verdict", "ALLOW")
        entry = totals.setdefault(v, {"verdict": v, "count": 0, "total_risk": 0})
        entry["count"] += 1
        entry["total_risk"] += int(row.get("domain_risk", 0))

    by_verdict = [
        {"verdict": v, "count": d["count"], "avg_domain_risk": round(d["total_risk"] / d["count"], 2)}
        for v, d in sorted(totals.items())
    ]
    return {"window_hours": hours, "by_verdict": by_verdict}


@app.get("/trends", tags=["analytics"])
def trends(hours: int = 24, domain: str | None = None, client_ip: str | None = None):
    from datetime import timedelta
    hours = min(max(hours, 1), 720)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    buckets: dict[str, dict] = {}
    for row in _all_events():
        try:
            ts = datetime.fromisoformat(row["timestamp"].replace(" ", "T"))
            if ts.tzinfo is None:
                from datetime import timezone as tz
                ts = ts.replace(tzinfo=tz.utc)
        except Exception:
            continue
        if ts < cutoff:
            continue
        if domain and row.get("domain") != domain.lower().rstrip("."):
            continue
        if client_ip and row.get("client_ip") != client_ip:
            continue
        # bucket by hour
        hour_key = ts.strftime("%Y-%m-%dT%H:00:00")
        b = buckets.setdefault(hour_key, {
            "hour": hour_key, "query_count": 0, "avg_domain_risk": 0,
            "avg_device_risk": 0, "blocked_count": 0, "flagged_count": 0,
            "_risk_sum": 0, "_dev_risk_sum": 0,
        })
        b["query_count"] += 1
        b["_risk_sum"] += int(row.get("domain_risk", 0))
        b["_dev_risk_sum"] += int(row.get("device_risk", 0))
        if row.get("verdict") == "BLOCK":
            b["blocked_count"] += 1
        elif row.get("verdict") == "FLAG":
            b["flagged_count"] += 1

    points = []
    for b in sorted(buckets.values(), key=lambda x: x["hour"]):
        n = b["query_count"]
        points.append({
            "hour": b["hour"],
            "query_count": n,
            "avg_domain_risk": round(b["_risk_sum"] / n, 2),
            "avg_device_risk": round(b["_dev_risk_sum"] / n, 2),
            "blocked_count": b["blocked_count"],
            "flagged_count": b["flagged_count"],
        })

    return {"window_hours": hours, "domain": domain, "client_ip": client_ip, "points": points}


@app.post("/feedback", tags=["analyst-feedback"])
def add_feedback(record: FeedbackRecord):
    row = record.model_dump()
    row["timestamp"] = row["timestamp"] or _now_str()
    _push_feedback(row)
    return row


# ── Passive forensics (same as original) ────────────────────────────────────

def parse_zeek_dns(text: str) -> Iterable[dict]:
    fields: list[str] | None = None
    for line in text.splitlines():
        if line.startswith("#fields"):
            fields = line.split("\t")[1:]
            continue
        if line.startswith("#") or not line.strip():
            continue
        if fields:
            values = line.split("\t")
            row = dict(zip(fields, values))
        else:
            row = next(csv.DictReader([line], delimiter="\t"), {})
        domain = row.get("query") or row.get("host") or row.get("domain")
        if domain and domain != "-":
            yield {"domain": domain.rstrip("."), "client_ip": row.get("id.orig_h", row.get("client_ip", "offline-zeek"))}


def parse_pcap(raw: bytes) -> Iterable[dict]:
    try:
        import dpkt
    except ImportError:
        return []
    reader = None
    errors = []
    for factory in (dpkt.pcap.Reader, dpkt.pcapng.Reader):
        try:
            reader = factory(io.BytesIO(raw))
            break
        except (ValueError, dpkt.UnpackError) as exc:
            errors.append(type(exc).__name__)
    if reader is None:
        raise ValueError(f"unsupported capture format ({', '.join(errors)})")
    for _, packet in reader:
        try:
            ethernet = dpkt.ethernet.Ethernet(packet)
            ip = ethernet.data
            if not isinstance(ip, (dpkt.ip.IP, dpkt.ip6.IP6)):
                continue
            udp = ip.data
            if not isinstance(udp, dpkt.udp.UDP) or udp.dport != 53:
                continue
            dns_msg = dpkt.dns.DNS(udp.data)
            if not dns_msg.qd or not dns_msg.qd[0].name:
                continue
            domain = dns_msg.qd[0].name.decode() if isinstance(dns_msg.qd[0].name, bytes) else dns_msg.qd[0].name
            source = socket.inet_ntoa(ip.src) if isinstance(ip, dpkt.ip.IP) else socket.inet_ntop(socket.AF_INET6, ip.src)
            yield {"domain": domain.rstrip("."), "client_ip": source}
        except (Exception,):
            continue


@app.post("/passive/zeek", tags=["passive-analysis"])
async def zeek_upload(file: UploadFile = File(...)):
    raw = await file.read()
    text = raw.decode("utf-8", errors="replace")
    queries = list(parse_zeek_dns(text))
    return {"mode": "passive", "format": "zeek-tsv", "filename": file.filename, "extracted_queries": queries}


@app.post("/passive/pcap", tags=["passive-analysis"])
async def pcap_upload(file: UploadFile = File(...)):
    raw = await file.read()
    try:
        queries = list(parse_pcap(raw))
    except ValueError as exc:
        return {"mode": "passive", "format": "pcap", "filename": file.filename, "extracted_queries": [], "error": str(exc)}
    return {"mode": "passive", "format": "pcap", "filename": file.filename, "extracted_queries": queries}


@app.get("/health", tags=["operations"])
def health():
    try:
        _redis.ping()
        return {"status": "ok", "backend": "redis-local (no ClickHouse needed)"}
    except Exception:
        return {"status": "ok", "backend": "in-memory (Redis unavailable, using process memory)"}
