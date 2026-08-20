"""Stateful behavioural analytics and correlation service.

This service owns device risk, domain reputation, DNS-tunnelling heuristics and
incident construction. It emits reasons and score contributions rather than opaque
anomaly labels so the gateway can explain every decision.
"""
from __future__ import annotations

import json
import math
import os
import re
import time
import uuid
from collections import Counter, defaultdict, deque
from typing import Any

import redis
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="DNS Shield Behavioral Engine", version="1.1.0")
store = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True, socket_connect_timeout=0.1, socket_timeout=0.1)

WINDOW_SECONDS = int(os.getenv("BEHAVIOR_WINDOW_SECONDS", "60"))
VOLUME_THRESHOLD = int(os.getenv("BEHAVIOR_VOLUME_THRESHOLD", "50"))
DEVICE_TTL = int(os.getenv("DEVICE_PROFILE_TTL_SECONDS", str(90 * 24 * 3600)))
recent_queries: dict[str, deque[tuple[float, str, bool]]] = defaultdict(deque)


class Observation(BaseModel):
    domain: str = Field(min_length=1, max_length=253)
    client_ip: str = Field(min_length=1, max_length=64)
    ml_probability: float = Field(default=0, ge=0, le=1)
    threat_hit: bool = False
    nxdomain: bool = False


def parent_domain(domain: str) -> str:
    labels = domain.rstrip(".").lower().split(".")
    return ".".join(labels[-2:]) if len(labels) >= 2 else domain


LOCAL_PROFILES: dict[str, dict] = {}
LOCAL_TIMELINES: dict[str, list] = {}
LOCAL_INCIDENTS: dict[str, dict] = {}

def shannon_entropy(text: str) -> float:
    counts = Counter(text)
    return -sum((count / len(text)) * math.log2(count / len(text)) for count in counts.values()) if text else 0.0


def prune_window(client_ip: str, now: float) -> deque[tuple[float, str, bool]]:
    window = recent_queries[client_ip]
    while window and window[0][0] < now - WINDOW_SECONDS:
        window.popleft()
    return window


def profile_key(client_ip: str) -> str:
    return f"device:profile:{client_ip}"


def save_timeline_event(client_ip: str, event: dict[str, Any]) -> None:
    if client_ip not in LOCAL_TIMELINES:
        LOCAL_TIMELINES[client_ip] = []
    LOCAL_TIMELINES[client_ip].insert(0, event)
    LOCAL_TIMELINES[client_ip] = LOCAL_TIMELINES[client_ip][:500]
    try:
        key = f"device:timeline:{client_ip}"
        store.lpush(key, json.dumps(event))
        store.ltrim(key, 0, 499)
        store.expire(key, DEVICE_TTL)
    except Exception:
        pass


def create_or_extend_incident(client_ip: str, signals: list[str], risk: int, domain: str) -> dict | None:
    if len(signals) < 2 and risk < 70:
        return None
    active_key = f"incident:active:{client_ip}"
    current_id = None
    try:
        current_id = store.get(active_key)
    except Exception:
        current_id = LOCAL_INCIDENTS.get(f"active:{client_ip}")

    now = time.time()
    evidence = {"at": now, "event": "detector trigger", "domain": domain, "signals": signals, "device_risk": risk}
    if current_id:
        raw = None
        try:
            raw = store.get(f"incident:{current_id}")
        except Exception:
            raw = json.dumps(LOCAL_INCIDENTS.get(current_id, {})) if current_id in LOCAL_INCIDENTS else None
        if raw:
            incident = json.loads(raw)
            incident.setdefault("timeline", []).append(evidence)
            incident["summary"] = f"{len(incident['timeline'])} correlated DNS events from {client_ip}; latest: {'; '.join(signals)}"
            incident["severity"] = "critical" if risk >= 80 else incident.get("severity", "high")
            LOCAL_INCIDENTS[current_id] = incident
            try:
                store.setex(f"incident:{current_id}", DEVICE_TTL, json.dumps(incident))
            except Exception:
                pass
            return incident

    inc_id = str(uuid.uuid4())
    incident = {"id": inc_id, "device": client_ip, "parent_domains": [parent_domain(domain)], "severity": "critical" if risk >= 80 else "high", "opened_at": now, "summary": f"Correlated DNS incident: {'; '.join(signals)}", "timeline": [{"at": now, "event": "first contact", "domain": domain}, evidence]}
    LOCAL_INCIDENTS[inc_id] = incident
    LOCAL_INCIDENTS[f"active:{client_ip}"] = inc_id
    try:
        store.setex(f"incident:{inc_id}", DEVICE_TTL, json.dumps(incident))
        store.lpush("incidents:index", inc_id); store.ltrim("incidents:index", 0, 199)
        store.setex(active_key, WINDOW_SECONDS * 5, inc_id)
    except Exception:
        pass
    return incident


@app.post("/observe", tags=["detection"])
def observe(observation: Observation):
    now = time.time()
    domain = observation.domain.lower().rstrip(".")
    window = prune_window(observation.client_ip, now)
    window.append((now, domain, observation.nxdomain))

    labels = domain.split(".")
    leftmost = labels[0]
    unique_tlds = {entry.split(".")[-1] for _, entry, _ in window if "." in entry}
    unique_parents = {parent_domain(entry) for _, entry, _ in window}
    
    # Calculate window metrics
    nxdomain_count = sum(1 for _, _, nx in window if nx)
    nxdomain_ratio = nxdomain_count / len(window) if window else 0
    lengths = [len(entry.split(".")[0]) for _, entry, _ in window]
    avg_len = sum(lengths) / len(lengths) if lengths else 0
    max_len = max(lengths) if lengths else 0

    signals: list[str] = []
    contribution = 0

    if len(window) >= VOLUME_THRESHOLD:
        contribution += 25
        signals.append(f"request-volume anomaly: {len(window)} queries in {WINDOW_SECONDS}s")
    if len(leftmost) >= 45:
        contribution += 30
        signals.append(f"long leftmost label ({len(leftmost)} characters), possible DNS tunnelling")
    if shannon_entropy(leftmost) > 4.1:
        contribution += 10
        signals.append(f"high subdomain entropy ({shannon_entropy(leftmost):.2f}), possible encoded payload")
    
    # New heuristics
    if re.search(r'[A-Za-z0-9+/=]{30,}', leftmost):
        contribution += 40
        signals.append("base64-like encoding signature detected")
    if re.search(r'(?i)[0-9a-f]{30,}', leftmost):
        contribution += 40
        signals.append("hex-like encoding signature detected")
    if nxdomain_ratio >= 0.5 and len(window) > 10:
        contribution += 45
        signals.append(f"high NXDOMAIN ratio ({nxdomain_ratio*100:.1f}%), strong DGA/tunnelling indicator")
    if avg_len >= 25 and len(window) > 10:
        contribution += 30
        signals.append(f"high average label length ({avg_len:.1f}), strong tunnelling indicator")

    if len(unique_tlds) >= 10:
        contribution += 20
        signals.append(f"rapid TLD fan-out ({len(unique_tlds)} TLDs), possible DGA scanning")
    if len(unique_parents) >= 30:
        contribution += 10
        signals.append(f"rapid parent-domain fan-out ({len(unique_parents)} parents)")
    if observation.ml_probability >= 0.70:
        contribution += 15
        signals.append("suspicious lexical prediction raises device risk")
    if observation.threat_hit:
        contribution += 35
        signals.append("threat-intelligence match raises device risk")

    old_risk = 0
    query_count = 0
    blocked_count = 0
    dga_count = 0
    try:
        old_risk = int(store.hget(profile_key(observation.client_ip), "risk") or 0)
        query_count = int(store.hget(profile_key(observation.client_ip), "query_count") or 0)
        blocked_count = int(store.hget(profile_key(observation.client_ip), "blocked_or_known_bad") or 0)
        dga_count = int(store.hget(profile_key(observation.client_ip), "dga_hits") or 0)
    except Exception:
        local_p = LOCAL_PROFILES.get(observation.client_ip, {})
        old_risk = local_p.get("risk", 0)
        query_count = local_p.get("query_count", 0)
        blocked_count = local_p.get("blocked_or_known_bad", 0)
        dga_count = local_p.get("dga_hits", 0)

    risk = min(100, round(old_risk * 0.92 + contribution))
    profile = {
        "ip": observation.client_ip, "risk": risk, "previous_risk": old_risk, "last_seen": now,
        "query_count": query_count + 1, "blocked_or_known_bad": blocked_count + int(observation.threat_hit),
        "dga_hits": dga_count + int(observation.ml_probability >= .70)
    }
    LOCAL_PROFILES[observation.client_ip] = profile
    try:
        store.hset(profile_key(observation.client_ip), mapping={key: str(value) for key, value in profile.items()})
        store.expire(profile_key(observation.client_ip), DEVICE_TTL)
    except Exception:
        pass

    try:
        domain_key = f"domain:profile:{domain}"
        first_seen = store.hget(domain_key, "first_seen") or str(now)
        store.hset(domain_key, mapping={"first_seen": first_seen, "last_seen": str(now), "query_count": str(int(store.hget(domain_key, "query_count") or 0) + 1), "last_device": observation.client_ip, "threat_intel_hits": str(int(store.hget(domain_key, "threat_intel_hits") or 0) + int(observation.threat_hit)), "last_ml_probability": str(observation.ml_probability), "parent_domain": parent_domain(domain)})
        store.expire(domain_key, DEVICE_TTL); store.sadd(f"domain:devices:{domain}", observation.client_ip); store.expire(f"domain:devices:{domain}", DEVICE_TTL)
    except Exception:
        pass

    event = {"at": now, "domain": domain, "device_risk": risk, "contribution": contribution, "signals": signals or ["normal behavioural baseline"], "window_query_count": len(window)}
    save_timeline_event(observation.client_ip, event)
    incident = create_or_extend_incident(observation.client_ip, signals, risk, domain)
    return {"device_risk": risk, "risk_trend": {"from": old_risk, "to": risk}, "contribution": contribution, "signals": signals or ["normal behavioural baseline"], "window": {"seconds": WINDOW_SECONDS, "query_count": len(window), "unique_tlds": len(unique_tlds)}, "parent_domain": parent_domain(domain), "incident": incident}


@app.get("/devices/{ip}", tags=["profiles"])
def device(ip: str):
    profile = {}
    timeline = []
    try:
        profile = store.hgetall(profile_key(ip))
        timeline = [json.loads(row) for row in reversed(store.lrange(f"device:timeline:{ip}", 0, 199))]
    except Exception:
        profile = LOCAL_PROFILES.get(ip, {})
        timeline = LOCAL_TIMELINES.get(ip, [])
    return {"ip": ip, "profile": profile, "risk": int(profile.get("risk", 0)), "timeline": timeline}


@app.get("/domains/{domain}", tags=["profiles"])
def domain_profile(domain: str):
    domain = domain.lower().rstrip(".")
    profile = {}
    device_count = 0
    try:
        profile = store.hgetall(f"domain:profile:{domain}")
        device_count = store.scard(f"domain:devices:{domain}") if profile else 0
    except Exception:
        pass
    return {"domain": domain, "profile": profile, "device_count": device_count, "parent_domain": parent_domain(domain), "parent_poisoning_analysis": {"status": "review" if int(profile.get("threat_intel_hits", 0)) else "clean", "reason": "parent domain is surfaced for related-subdomain investigation"}}


@app.get("/incidents", tags=["incidents"])
def incidents():
    ids = store.lrange("incidents:index", 0, 199)
    return [json.loads(raw) for incident_id in ids if (raw := store.get(f"incident:{incident_id}"))]


@app.get("/incidents/{incident_id}", tags=["incidents"])
def incident_detail(incident_id: str):
    raw = store.get(f"incident:{incident_id}")
    if not raw:
        return {"found": False, "id": incident_id, "timeline": []}
    incident = json.loads(raw)
    incident["timeline"] = sorted(incident.get("timeline", []), key=lambda item: item.get("at", 0))
    incident["found"] = True
    return incident
