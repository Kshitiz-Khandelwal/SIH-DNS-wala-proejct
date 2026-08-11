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

app = FastAPI(title="DNS Shield Analytics Store", version="1.1.0")
CLICKHOUSE_URL = os.getenv("CLICKHOUSE_URL", "http://clickhouse:8123")
DATABASE = os.getenv("CLICKHOUSE_DATABASE", "dns_shield")


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
    try:
        clickhouse(f"INSERT INTO {DATABASE}.events ({columns}) FORMAT JSONEachRow", json.dumps(row) + "\n")
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail=f"ClickHouse ingest failed: {type(exc).__name__}")
    return row


@app.get("/events", tags=["analytics"])
def events(limit: int = 100, verdict: str | None = None, client_ip: str | None = None):
    limit = min(max(limit, 1), 500)
    clauses = []
    # Inputs are constrained values / quoted safely to avoid building arbitrary SQL.
    if verdict in {"ALLOW", "FLAG", "BLOCK"}: clauses.append(f"verdict = '{verdict}'")
    if client_ip and all(character.isdigit() or character in ".:abcdefABCDEF" for character in client_ip): clauses.append(f"client_ip = '{client_ip}'")
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    return clickhouse_rows(f"SELECT * FROM {DATABASE}.events{where} ORDER BY timestamp DESC LIMIT {limit}")


@app.get("/stats", tags=["analytics"])
def stats(hours: int = 24):
    hours = min(max(hours, 1), 720)
    query = f"SELECT verdict, count() AS count, round(avg(domain_risk), 2) AS avg_domain_risk FROM {DATABASE}.events WHERE timestamp >= now() - INTERVAL {hours} HOUR GROUP BY verdict ORDER BY verdict"
    return {"window_hours": hours, "by_verdict": clickhouse_rows(query)}


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


@app.get("/health", tags=["operations"])
def health():
    try:
        clickhouse("SELECT 1", timeout=1)
        return {"status": "ok", "backend": "ClickHouse"}
    except requests.RequestException:
        return {"status": "degraded", "backend": "ClickHouse"}
