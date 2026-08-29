"""ClickHouse-backed event ingestion and passive DNS forensics extraction."""
from __future__ import annotations

import csv
import io
import json
import os
import socket
import uuid
from datetime import datetime, timezone
from typing import Iterable

import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

import sqlite3

app = FastAPI(title="DNS Shield Analytics Store", version="1.1.0")
CLICKHOUSE_URL = os.getenv("CLICKHOUSE_URL", "")
DATABASE = os.getenv("CLICKHOUSE_DATABASE", "dns_shield")
DB_PATH = os.path.join(os.path.dirname(__file__), "analytics.db")

HAS_CLICKHOUSE = False
if CLICKHOUSE_URL:
    try:
        requests.get(CLICKHOUSE_URL, timeout=0.1)
        HAS_CLICKHOUSE = True
    except Exception:
        HAS_CLICKHOUSE = False

def init_sqlite():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            event_id TEXT PRIMARY KEY,
            timestamp TEXT,
            domain TEXT,
            client_ip TEXT,
            verdict TEXT,
            domain_risk INTEGER,
            device_risk INTEGER,
            confidence TEXT,
            reasons TEXT,
            target_ip TEXT,
            source TEXT,
            geo_json TEXT
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            event_id TEXT,
            label TEXT,
            analyst TEXT,
            timestamp TEXT
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS forecast_events (
            id TEXT PRIMARY KEY,
            timestamp TEXT,
            host_ip TEXT,
            current_stage TEXT,
            current_stage_confidence REAL,
            overall_threat_score INTEGER,
            time_to_compromise_min REAL,
            predicted_15m TEXT,
            predicted_30m TEXT,
            predicted_60m TEXT,
            relay_engaged INTEGER
        )
        """)
init_sqlite()



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


def clickhouse(query: str, data: str | None = None, timeout: float = 3) -> requests.Response:
    response = requests.post(CLICKHOUSE_URL, params={"query": query}, data=data, timeout=timeout)
    response.raise_for_status()
    return response


def clickhouse_rows(query: str) -> list[dict]:
    try:
        response = clickhouse(query + " FORMAT JSONEachRow")
        return [json.loads(line) for line in response.text.splitlines() if line.strip()]
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail=f"ClickHouse unavailable: {type(exc).__name__}")


def normalise_event(event: Event) -> dict:
    row = event.model_dump()
    row["event_id"] = row["event_id"] or str(uuid.uuid4())
    row["timestamp"] = row["timestamp"] or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
    row["reasons"] = "; ".join(reason.replace("\n", " ") for reason in row["reasons"])
    row["geo_json"] = row["geo_json"][:8192]
    return row


@app.post("/events", tags=["ingestion"])
def add_event(event: Event):
    row = normalise_event(event)
    columns = ", ".join(row.keys())
    if HAS_CLICKHOUSE:
        try:
            clickhouse(f"INSERT INTO {DATABASE}.events ({columns}) FORMAT JSONEachRow", json.dumps(row) + "\n", timeout=0.3)
            return row
        except Exception:
            pass
    # Local SQLite
    with sqlite3.connect(DB_PATH) as conn:
        placeholders = ", ".join("?" for _ in row)
        conn.execute(f"INSERT OR REPLACE INTO events ({columns}) VALUES ({placeholders})", list(row.values()))
    return row


@app.get("/events", tags=["analytics"])
def events(limit: int = 100, verdict: str | None = None, client_ip: str | None = None):
    limit = min(max(limit, 1), 500)
    clauses = []
    if verdict in {"ALLOW", "FLAG", "BLOCK"}: clauses.append(f"verdict = '{verdict}'")
    if client_ip and all(character.isdigit() or character in ".:abcdefABCDEF" for character in client_ip): clauses.append(f"client_ip = '{client_ip}'")
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    try:
        return clickhouse_rows(f"SELECT * FROM {DATABASE}.events{where} ORDER BY timestamp DESC LIMIT {limit}")
    except Exception:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            rows = cursor.execute(f"SELECT * FROM events{where} ORDER BY timestamp DESC LIMIT {limit}").fetchall()
            return [dict(r) for r in rows]


@app.get("/stats", tags=["analytics"])
def stats(hours: int = 24):
    hours = min(max(hours, 1), 720)
    try:
        query = f"SELECT verdict, count() AS count, round(avg(domain_risk), 2) AS avg_domain_risk FROM {DATABASE}.events WHERE timestamp >= now() - INTERVAL {hours} HOUR GROUP BY verdict ORDER BY verdict"
        return {"window_hours": hours, "by_verdict": clickhouse_rows(query)}
    except Exception:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT verdict, count(*) as count, round(avg(domain_risk), 2) as avg_domain_risk FROM events GROUP BY verdict ORDER BY verdict").fetchall()
            return {"window_hours": hours, "by_verdict": [dict(r) for r in rows]}


@app.get("/trends", tags=["analytics"])
def trends(hours: int = 24, domain: str | None = None, client_ip: str | None = None):
    hours = min(max(hours, 1), 720)
    clauses = [f"timestamp >= now() - INTERVAL {hours} HOUR"]
    if domain:
        safe_domain = domain.lower().rstrip(".")
        if all(character.isalnum() or character in ".-" for character in safe_domain):
            clauses.append(f"domain = '{safe_domain}'")
    if client_ip and all(character.isdigit() or character in ".:abcdefABCDEF" for character in client_ip):
        clauses.append(f"client_ip = '{client_ip}'")
    where = " AND ".join(clauses)
    try:
        query = f"SELECT toStartOfHour(timestamp) AS hour, count() AS query_count, round(avg(domain_risk), 2) AS avg_domain_risk, round(avg(device_risk), 2) AS avg_device_risk, countIf(verdict = 'BLOCK') AS blocked_count, countIf(verdict = 'FLAG') AS flagged_count FROM {DATABASE}.events WHERE {where} GROUP BY hour ORDER BY hour"
        return {"window_hours": hours, "domain": domain, "client_ip": client_ip, "points": clickhouse_rows(query)}
    except Exception:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT strftime('%Y-%m-%d %H:00:00', timestamp) AS hour, count(*) AS query_count, round(avg(domain_risk), 2) AS avg_domain_risk, round(avg(device_risk), 2) AS avg_device_risk, sum(case when verdict = 'BLOCK' then 1 else 0 end) AS blocked_count, sum(case when verdict = 'FLAG' then 1 else 0 end) AS flagged_count FROM events GROUP BY hour ORDER BY hour").fetchall()
            return {"window_hours": hours, "domain": domain, "client_ip": client_ip, "points": [dict(r) for r in rows]}


@app.post("/feedback", tags=["analyst-feedback"])
def add_feedback(record: FeedbackRecord):
    row = record.model_dump()
    row["timestamp"] = row["timestamp"] or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
    try:
        clickhouse(f"INSERT INTO {DATABASE}.feedback (event_id, label, analyst, timestamp) FORMAT JSONEachRow", json.dumps(row) + "\n", timeout=0.3)
    except Exception:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("INSERT INTO feedback (event_id, label, analyst, timestamp) VALUES (?, ?, ?, ?)", list(row.values()))
    return row


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
            # CSV-style fallback for simplified demo TSV exports.
            row = next(csv.DictReader([line], delimiter="\t"), {})
        domain = row.get("query") or row.get("host") or row.get("domain")
        if domain and domain != "-": yield {"domain": domain.rstrip("."), "client_ip": row.get("id.orig_h", row.get("client_ip", "offline-zeek"))}


def parse_pcap(raw: bytes) -> Iterable[dict]:
    import dpkt
    reader = None
    errors = []
    for factory in (dpkt.pcap.Reader, dpkt.pcapng.Reader):
        try:
            reader = factory(io.BytesIO(raw)); break
        except (ValueError, dpkt.UnpackError) as exc:
            errors.append(type(exc).__name__)
    if reader is None: raise ValueError(f"unsupported capture format ({', '.join(errors)})")
    for _, packet in reader:
        try:
            ethernet = dpkt.ethernet.Ethernet(packet)
            ip = ethernet.data
            if not isinstance(ip, (dpkt.ip.IP, dpkt.ip6.IP6)): continue
            udp = ip.data
            if not isinstance(udp, dpkt.udp.UDP) or udp.dport != 53: continue
            dns_message = dpkt.dns.DNS(udp.data)
            if not dns_message.qd or not dns_message.qd[0].name: continue
            domain = dns_message.qd[0].name.decode() if isinstance(dns_message.qd[0].name, bytes) else dns_message.qd[0].name
            source = socket.inet_ntoa(ip.src) if isinstance(ip, dpkt.ip.IP) else socket.inet_ntop(socket.AF_INET6, ip.src)
            yield {"domain": domain.rstrip("."), "client_ip": source}
        except (dpkt.UnpackError, ValueError, OSError):
            continue


@app.post("/passive/zeek", tags=["passive-analysis"])
async def zeek(file: UploadFile = File(...)):
    raw = await file.read()
    text = raw.decode("utf-8", errors="replace")
    queries = list(parse_zeek_dns(text))
    return {"mode": "passive", "format": "zeek-tsv", "filename": file.filename, "extracted_queries": queries, "note": "gateway replays every extracted query through the same deterministic pipeline"}


@app.post("/passive/pcap", tags=["passive-analysis"])
async def pcap(file: UploadFile = File(...)):
    raw = await file.read()
    try:
        queries = list(parse_pcap(raw))
    except ValueError as exc:
        return {"mode": "passive", "format": "pcap", "filename": file.filename, "extracted_queries": [], "error": str(exc)}
    return {"mode": "passive", "format": "pcap", "filename": file.filename, "extracted_queries": queries, "note": "only UDP/53 DNS queries are extracted; DoH/DoT are encrypted and require endpoint logs"}


class ForecastAuditRecord(BaseModel):
    id: str | None = None
    timestamp: str | None = None
    host_ip: str
    current_stage: str
    current_stage_confidence: float = 0.0
    overall_threat_score: int = 0
    time_to_compromise_min: float = 0.0
    predicted_15m: str = ""
    predicted_30m: str = ""
    predicted_60m: str = ""
    relay_engaged: bool = False


@app.post("/forecast/events", tags=["forecast-audit"])
def log_forecast_event(record: ForecastAuditRecord):
    """Store temporal forecasting verdict and TTC snapshot for forensic audit."""
    rec_id = record.id or str(uuid.uuid4())
    ts = record.timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
    row = (
        rec_id,
        ts,
        record.host_ip,
        record.current_stage,
        record.current_stage_confidence,
        record.overall_threat_score,
        record.time_to_compromise_min,
        record.predicted_15m,
        record.predicted_30m,
        record.predicted_60m,
        1 if record.relay_engaged else 0,
    )
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT OR REPLACE INTO forecast_events 
            (id, timestamp, host_ip, current_stage, current_stage_confidence, overall_threat_score, 
             time_to_compromise_min, predicted_15m, predicted_30m, predicted_60m, relay_engaged)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, row)
    return {"status": "ok", "id": rec_id, "host_ip": record.host_ip}


@app.get("/forecast/events", tags=["forecast-audit"])
def get_forecast_events(limit: int = 50, host_ip: str | None = None):
    """Query recent forecasting timeline verdicts."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        if host_ip:
            cursor = conn.execute(
                "SELECT * FROM forecast_events WHERE host_ip = ? ORDER BY timestamp DESC LIMIT ?",
                (host_ip, limit)
            )
        else:
            cursor = conn.execute(
                "SELECT * FROM forecast_events ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            )
        rows = [dict(r) for r in cursor.fetchall()]
    return {"events": rows, "count": len(rows)}


@app.get("/health", tags=["operations"])
def health():
    if HAS_CLICKHOUSE:
        try:
            clickhouse("SELECT 1", timeout=1)
            return {"status": "ok", "backend": "ClickHouse"}
        except requests.RequestException:
            return {"status": "degraded", "backend": "ClickHouse"}
    return {"status": "ok", "backend": "SQLite-Local"}

