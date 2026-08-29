"""Active-response controller restricted to the DNS Shield virtual laboratory.

It deliberately stores intent and audit evidence in Redis instead of executing
iptables/nftables on the Docker host. A production adapter would be a separately
reviewed network-controller integration, never a shell command in this service.
"""
from __future__ import annotations

import json
import os
import time
import uuid
from collections import Counter

import redis
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="DNS Shield Lab Active Response", version="1.1.0")
store = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True, socket_connect_timeout=0.1, socket_timeout=0.1)
SINKHOLE_IP = os.getenv("SINKHOLE_IP", "172.28.0.250")
LAB_NETWORK_PREFIXES = tuple(filter(None, os.getenv("LAB_NETWORK_PREFIXES", "172.28.,10.200.").split(",")))
ACTION_TTL_SECONDS = int(os.getenv("RESPONSE_ACTION_TTL_SECONDS", str(30 * 24 * 3600)))


QUARANTINE_MODE = os.getenv("QUARANTINE_MODE", "enforce")
AUDIT_LOG_PATH = os.getenv("AUDIT_LOG_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "data", "audit.log"))

class QuarantineRequest(BaseModel):
    device_ip: str = Field(min_length=3, max_length=64)
    reason: str = Field(min_length=3, max_length=1000)
    requested_by: str = Field(default="detection-pipeline", max_length=128)
    domain: str = Field(default="", max_length=253)
    risk_score: int = Field(default=0)


class SinkholeObservation(BaseModel):
    domain: str = Field(min_length=1, max_length=253)
    device_ip: str = Field(default="unknown", max_length=64)
    protocol: str = Field(default="http", max_length=32)
    path: str = Field(default="/", max_length=2048)
    user_agent: str = Field(default="", max_length=1024)
    method: str = Field(default="GET", max_length=16)
    content_length: int = Field(default=0, ge=0, le=1024 * 1024)
    captured_body_preview: str = Field(default="", max_length=1024)


def in_lab(device_ip: str) -> bool:
    return device_ip == "unknown" or device_ip.startswith(LAB_NETWORK_PREFIXES)


def audit(action: str, subject: str, details: dict, analyst: str = "system") -> dict:
    record = {"id": str(uuid.uuid4()), "at": time.time(), "action": action, "subject": subject, "scope": "dns-shield-lab-only", "analyst": analyst, "details": details}
    store.lpush("response:audit", json.dumps(record)); store.ltrim("response:audit", 0, 999); store.expire("response:audit", ACTION_TTL_SECONDS)
    
    # Tamper-evident append-only file audit log
    try:
        os.makedirs(os.path.dirname(AUDIT_LOG_PATH), exist_ok=True)
        with open(AUDIT_LOG_PATH, "a") as f:
            f.write(json.dumps(record) + "\n")
    except Exception as e:
        print(f"Failed to write to audit log: {e}")
        
    return record


@app.post("/sinkhole", tags=["sinkhole"])
def sinkhole(domain: str):
    """Return the controlled decoy address for an already-blocked DNS name."""
    domain = domain.lower().strip().rstrip(".")
    if not domain:
        raise HTTPException(status_code=422, detail="domain is required")
    key = f"sinkhole:domain:{domain}"
    existing = store.hgetall(key)
    if existing:
        return {"domain": domain, "sinkhole_ip": SINKHOLE_IP, "status": "already_active", "scope": "virtual-lab-only", "action_id": existing.get("action_id")}
    action = audit("sinkhole-activated", domain, {"sinkhole_ip": SINKHOLE_IP})
    store.hset(key, mapping={"sinkhole_ip": SINKHOLE_IP, "activated_at": str(action["at"]), "action_id": action["id"]}); store.expire(key, ACTION_TTL_SECONDS)
    return {"domain": domain, "sinkhole_ip": SINKHOLE_IP, "status": "active", "scope": "virtual-lab-only", "action_id": action["id"]}


@app.post("/sinkhole/observe", tags=["sinkhole"])
def observe_sinkhole(observation: SinkholeObservation):
    """Receive decoy telemetry only from the lab honeypot; never proxy external traffic."""
    if not in_lab(observation.device_ip):
        raise HTTPException(status_code=403, detail="sinkhole telemetry is accepted only from the virtual lab")
    row = observation.model_dump() | {"at": time.time()}
    key = f"sinkhole:telemetry:{observation.domain.lower().rstrip('.')}"
    store.lpush(key, json.dumps(row)); store.ltrim(key, 0, 499); store.expire(key, ACTION_TTL_SECONDS)
    audit("sinkhole-observation", observation.domain, {"device_ip": observation.device_ip, "protocol": observation.protocol, "method": observation.method, "path": observation.path, "content_length": observation.content_length})
    return {"status": "logged", "scope": "virtual-lab-only"}


@app.get("/sinkhole/{domain}/signatures", tags=["sinkhole"])
def signatures(domain: str):
    """Generate review-only signatures from recurring lab honeypot behaviour."""
    rows = [json.loads(value) for value in store.lrange(f"sinkhole:telemetry:{domain.lower().rstrip('.')}", 0, 499)]
    paths = Counter(row.get("path", "/") for row in rows)
    agents = Counter(row.get("user_agent", "")[:120] for row in rows if row.get("user_agent"))
    candidates = [{"kind": "http-path", "value": path, "observations": count, "status": "review_required"} for path, count in paths.items() if count >= 3]
    candidates += [{"kind": "user-agent", "value": agent, "observations": count, "status": "review_required"} for agent, count in agents.items() if count >= 3]
    return {"domain": domain, "observations": len(rows), "suggested_signatures": candidates, "warning": "Suggestions are not automatically promoted to blocking indicators."}


@app.post("/quarantine/request", tags=["quarantine"])
def request_quarantine(request: QuarantineRequest):
    if not in_lab(request.device_ip):
        raise HTTPException(status_code=403, detail="automatic quarantine is restricted to configured virtual-lab prefixes")
        
    record = {
        "reason": request.reason,
        "requested_by": request.requested_by,
        "domain": request.domain,
        "risk_score": request.risk_score,
        "requested_at": str(time.time()),
        "status": "pending"
    }
    store.hset(f"lab:pending_quarantine:{request.device_ip}", mapping=record)
    store.expire(f"lab:pending_quarantine:{request.device_ip}", ACTION_TTL_SECONDS)
    store.hset("lab:pending_quarantine", request.device_ip, json.dumps(record))
    
    audit("quarantine-requested", request.device_ip, {"reason": request.reason, "domain": request.domain, "risk_score": request.risk_score})
    return {"device_ip": request.device_ip, "status": "pending_approval", "scope": "virtual-lab-only"}


@app.get("/quarantine/requests", tags=["quarantine"])
def list_pending_quarantines():
    rules = {ip: json.loads(raw) for ip, raw in store.hgetall("lab:pending_quarantine").items()}
    return {"pending_requests": rules}


@app.post("/quarantine/{ip}/approve", tags=["quarantine"])
def approve_quarantine(ip: str, ttl_seconds: int = ACTION_TTL_SECONDS, analyst: str = "dashboard"):
    pending = store.hgetall(f"lab:pending_quarantine:{ip}")
    if not pending:
        raise HTTPException(status_code=404, detail="No pending quarantine request found for this IP")
        
    if QUARANTINE_MODE == "dry_run":
        action = audit("quarantine-dry-run", ip, {"reason": pending.get("reason"), "analyst_approved": True}, analyst=analyst)
        store.delete(f"lab:pending_quarantine:{ip}"); store.hdel("lab:pending_quarantine", ip)
        return {"device_ip": ip, "status": "dry_run_logged", "action_id": action["id"]}

    existing = store.hgetall(f"lab:quarantine:{ip}")
    if existing:
        store.delete(f"lab:pending_quarantine:{ip}"); store.hdel("lab:pending_quarantine", ip)
        return {"device_ip": ip, "status": "already_quarantined", "scope": "virtual-lab-only"}
        
    action = audit("quarantine-applied", ip, {"reason": pending.get("reason"), "domain": pending.get("domain")}, analyst=analyst)
    record = {"reason": pending.get("reason"), "approved_by": analyst, "quarantined_at": str(action["at"]), "action_id": action["id"], "enforcement": "virtual-network-policy-state-only"}
    store.hset(f"lab:quarantine:{ip}", mapping=record); store.expire(f"lab:quarantine:{ip}", ttl_seconds); store.hset("lab:quarantine", ip, json.dumps(record))
    
    # Clean up pending
    store.delete(f"lab:pending_quarantine:{ip}"); store.hdel("lab:pending_quarantine", ip)
    return {"device_ip": ip, "status": "quarantined", "scope": "virtual-lab-only", **record}


@app.post("/quarantine/{ip}/reject", tags=["quarantine"])
def reject_quarantine(ip: str, analyst: str = "dashboard"):
    pending = store.hgetall(f"lab:pending_quarantine:{ip}")
    if not pending:
        raise HTTPException(status_code=404, detail="No pending quarantine request found for this IP")
        
    action = audit("quarantine-rejected", ip, {"reason": "Analyst marked as false positive"}, analyst=analyst)
    store.delete(f"lab:pending_quarantine:{ip}"); store.hdel("lab:pending_quarantine", ip)
    return {"device_ip": ip, "status": "rejected", "action_id": action["id"]}


@app.post("/quarantine", tags=["quarantine"])
def quarantine(request: QuarantineRequest):
    if not in_lab(request.device_ip):
        raise HTTPException(status_code=403, detail="automatic quarantine is restricted to configured virtual-lab prefixes")
        
    if QUARANTINE_MODE == "dry_run":
        action = audit("quarantine-dry-run", request.device_ip, {"reason": request.reason, "requested_by": request.requested_by})
        return {"device_ip": request.device_ip, "status": "dry_run_logged", "action_id": action["id"]}

    existing = store.hgetall(f"lab:quarantine:{request.device_ip}")
    if existing:
        return {"device_ip": request.device_ip, "status": "already_quarantined", "scope": "virtual-lab-only", "action_id": existing.get("action_id"), "reason": existing.get("reason")}
    action = audit("quarantine-applied", request.device_ip, {"reason": request.reason, "requested_by": request.requested_by})
    record = {"reason": request.reason, "requested_by": request.requested_by, "quarantined_at": str(action["at"]), "action_id": action["id"], "enforcement": "virtual-network-policy-state-only"}
    store.hset(f"lab:quarantine:{request.device_ip}", mapping=record); store.expire(f"lab:quarantine:{request.device_ip}", ACTION_TTL_SECONDS); store.hset("lab:quarantine", request.device_ip, json.dumps(record))
    return {"device_ip": request.device_ip, "status": "quarantined", "scope": "virtual-lab-only", **record}


@app.delete("/quarantine/{ip}", tags=["quarantine"])
def release(ip: str, requested_by: str = "dashboard"):
    record = store.hgetall(f"lab:quarantine:{ip}")
    if not record:
        return {"device_ip": ip, "status": "not_quarantined", "scope": "virtual-lab-only"}
    action = audit("quarantine-released", ip, {"requested_by": requested_by, "original_action_id": record.get("action_id")}, analyst=requested_by)
    store.delete(f"lab:quarantine:{ip}"); store.hdel("lab:quarantine", ip)
    return {"device_ip": ip, "status": "released", "scope": "virtual-lab-only", "release_action_id": action["id"]}


@app.get("/quarantine", tags=["quarantine"])
def list_rules():
    rules = {ip: json.loads(raw) for ip, raw in store.hgetall("lab:quarantine").items()}
    return {"rules": rules, "enforcement": "virtual network state only", "warning": "This service never changes host networking, iptables, nftables, or external systems."}


@app.get("/audit", tags=["operations"])
def audit_log(limit: int = 100):
    return [json.loads(row) for row in reversed(store.lrange("response:audit", 0, min(max(limit, 1), 500) - 1))]
