"""DNS Shield X-Forecast — Network Flow Ingestion Service (Port 8006)

Accepts:
  - POST /flow/packet       Single JSON packet telemetry
  - POST /flow/batch        Batch packet telemetry (simulator output)
  - POST /flow/pcap         PCAP file upload (dpkt-based parser)
  - POST /flow/simulate/{host_ip}  Inject synthetic multi-stage APT flows
  - GET  /flow/hosts        Active monitored hosts
  - GET  /flow/timeline/{host_ip}  Per-host flow timeline
  - DELETE /flow/hosts/{host_ip}   Reset host session

Satisfies PS2 requirement: NetFlow/IPFIX/PCAP ingestion pipeline.
"""
from __future__ import annotations

import io
import os
import sys
import time
import math
import random
import struct
import logging
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Support both isolated Docker container build and full monorepo pathing
try:
    from network_flow_collector import NetworkFlowCollector, FlowRecord
except ImportError:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
    from services.flow_ingest.network_flow_collector import NetworkFlowCollector, FlowRecord

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("flow-ingest")

app = FastAPI(
    title="DNS Shield Flow Ingest",
    version="1.0.0",
    description="NetFlow/IPFIX/PCAP ingestion pipeline for attack forecasting.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared global collector (singleton)
collector = NetworkFlowCollector(session_window_sec=900.0)


# ─── Request Models ───────────────────────────────────────────────────────────

class PacketPayload(BaseModel):
    src_ip: str
    dst_ip: str
    src_port: int = Field(ge=0, le=65535)
    dst_port: int = Field(ge=0, le=65535)
    protocol: str = "TCP"
    length: int = Field(ge=0, default=512)
    tcp_flags: Optional[Dict[str, bool]] = None
    dns_query: Optional[str] = None
    timestamp: Optional[float] = None


class BatchPayload(BaseModel):
    packets: List[PacketPayload]


# ─── PCAP Parsing (lightweight struct-based, no external dependencies) ─────────

PCAP_GLOBAL_HEADER_FMT = "<IHHiIII"   # magic, vmaj, vmin, thiszone, sigfigs, snaplen, network
PCAP_RECORD_HEADER_FMT = "<IIII"      # ts_sec, ts_usec, incl_len, orig_len
PCAP_GLOBAL_HEADER_LEN = struct.calcsize(PCAP_GLOBAL_HEADER_FMT)
PCAP_RECORD_HEADER_LEN = struct.calcsize(PCAP_RECORD_HEADER_FMT)

ETHERNET_HEADER_LEN = 14
IP_MIN_HEADER = 20
TCP_MIN_HEADER = 20
UDP_HEADER_LEN = 8


def _parse_ip_addr(raw: bytes) -> str:
    return ".".join(str(b) for b in raw)


def parse_pcap_bytes(data: bytes) -> List[Dict[str, Any]]:
    """Parse a PCAP file into a list of packet dicts. Returns empty list on error."""
    packets = []
    if len(data) < PCAP_GLOBAL_HEADER_LEN:
        return packets

    try:
        magic = struct.unpack_from("<I", data, 0)[0]
        if magic not in (0xA1B2C3D4, 0xD4C3B2A1):
            logger.warning("PCAP magic mismatch — not a valid PCAP file")
            return packets

        gh = struct.unpack_from(PCAP_GLOBAL_HEADER_FMT, data, 0)
        network_type = gh[6]  # 1 = Ethernet, 228 = raw IPv4
        pos = PCAP_GLOBAL_HEADER_LEN
        max_packets = 10000  # cap for safety

        while pos + PCAP_RECORD_HEADER_LEN <= len(data) and len(packets) < max_packets:
            ts_sec, ts_usec, incl_len, _ = struct.unpack_from(PCAP_RECORD_HEADER_FMT, data, pos)
            pos += PCAP_RECORD_HEADER_LEN
            frame = data[pos: pos + incl_len]
            pos += incl_len
            timestamp = ts_sec + ts_usec / 1_000_000

            # Skip Ethernet header for type 1
            ip_offset = ETHERNET_HEADER_LEN if network_type == 1 else 0
            if len(frame) < ip_offset + IP_MIN_HEADER:
                continue

            ihl = (frame[ip_offset] & 0x0F) * 4
            protocol_num = frame[ip_offset + 9]
            src_ip = _parse_ip_addr(frame[ip_offset + 12: ip_offset + 16])
            dst_ip = _parse_ip_addr(frame[ip_offset + 16: ip_offset + 20])
            transport_offset = ip_offset + ihl
            total_length = struct.unpack_from("!H", frame, ip_offset + 2)[0]

            proto = "OTHER"
            src_port, dst_port = 0, 0
            tcp_flags = {}
            dns_query = None

            if protocol_num == 6 and len(frame) >= transport_offset + TCP_MIN_HEADER:  # TCP
                proto = "TCP"
                src_port = struct.unpack_from("!H", frame, transport_offset)[0]
                dst_port = struct.unpack_from("!H", frame, transport_offset + 2)[0]
                flags_byte = frame[transport_offset + 13]
                tcp_flags = {
                    "SYN": bool(flags_byte & 0x02),
                    "ACK": bool(flags_byte & 0x10),
                    "FIN": bool(flags_byte & 0x01),
                    "RST": bool(flags_byte & 0x04),
                }

            elif protocol_num == 17 and len(frame) >= transport_offset + UDP_HEADER_LEN:  # UDP
                proto = "UDP"
                src_port = struct.unpack_from("!H", frame, transport_offset)[0]
                dst_port = struct.unpack_from("!H", frame, transport_offset + 2)[0]
                # Try DNS decode if dst/src port 53
                if dst_port == 53 or src_port == 53:
                    proto = "DNS"
                    dns_offset = transport_offset + UDP_HEADER_LEN
                    dns_payload = frame[dns_offset:]
                    # Minimal DNS name extraction from query section
                    if len(dns_payload) > 12:
                        try:
                            name_parts = []
                            i = 12
                            while i < len(dns_payload) and dns_payload[i] != 0:
                                length = dns_payload[i]
                                if length >= 0xC0:  # compression pointer
                                    break
                                i += 1
                                name_parts.append(dns_payload[i:i + length].decode("ascii", errors="ignore"))
                                i += length
                            dns_query = ".".join(name_parts) if name_parts else None
                        except Exception:
                            pass

            elif protocol_num == 1:  # ICMP
                proto = "ICMP"

            packets.append({
                "src_ip": src_ip,
                "dst_ip": dst_ip,
                "src_port": src_port,
                "dst_port": dst_port,
                "protocol": proto,
                "length": total_length,
                "tcp_flags": tcp_flags,
                "dns_query": dns_query,
                "timestamp": timestamp,
            })

    except Exception as e:
        logger.warning(f"PCAP parse error: {e}")

    return packets


# ─── Simulation: Multi-Stage APT Flow Injection ──────────────────────────────

APT_STAGE_FLOWS = {
    "STAGE_1_RECONNAISSANCE": lambda ip: [
        {"src_ip": ip, "dst_ip": f"192.168.1.{i}", "src_port": 54321, "dst_port": port,
         "protocol": "TCP", "length": 60,
         "tcp_flags": {"SYN": True, "ACK": False, "FIN": False, "RST": False},
         "dns_query": None}
        for i in range(2, 7) for port in [22, 80, 443, 8080]
    ],
    "STAGE_2_INITIAL_ACCESS": lambda ip: [
        {"src_ip": ip, "dst_ip": "8.8.8.8", "src_port": 40000 + i, "dst_port": 53,
         "protocol": "DNS", "length": 200,
         "tcp_flags": {},
         "dns_query": f"xq9m{i}kz7dga.top"}
        for i in range(20)
    ],
    "STAGE_3_DISCOVERY": lambda ip: [
        {"src_ip": ip, "dst_ip": f"192.168.1.{d}", "src_port": 45000, "dst_port": port,
         "protocol": "TCP", "length": 100,
         "tcp_flags": {"SYN": True, "ACK": False, "FIN": False, "RST": False}}
        for d in range(1, 6) for port in [139, 389, 636, 88]
    ],
    "STAGE_4_C2_PERSISTENCE": lambda ip: [
        {"src_ip": ip, "dst_ip": "185.220.101.45", "src_port": 49152 + i, "dst_port": 443,
         "protocol": "TCP", "length": 256,
         "tcp_flags": {"SYN": False, "ACK": True, "FIN": False, "RST": False},
         "dns_query": f"beacon{i}.c2-domain.xyz"}
        for i in range(20)
    ],
    "STAGE_5_LATERAL_MOVEMENT": lambda ip: [
        {"src_ip": ip, "dst_ip": f"10.10.0.{d}", "src_port": 50000 + d, "dst_port": 445,
         "protocol": "TCP", "length": 1024,
         "tcp_flags": {"SYN": False, "ACK": True, "FIN": False, "RST": False}}
        for d in range(1, 21)
    ],
    "STAGE_6_EXFILTRATION": lambda ip: [
        {"src_ip": ip, "dst_ip": "103.45.67.89", "src_port": 30000 + i, "dst_port": 53,
         "protocol": "DNS", "length": 480,
         "tcp_flags": {},
         "dns_query": f"dGhpcyBpcyBleGZpbHRyYXRlZCBkYXRh{i}==.exfil.c2.net"}
        for i in range(20)
    ],
}

STAGE_SEQUENCE = [
    "STAGE_1_RECONNAISSANCE",
    "STAGE_2_INITIAL_ACCESS",
    "STAGE_3_DISCOVERY",
    "STAGE_4_C2_PERSISTENCE",
    "STAGE_5_LATERAL_MOVEMENT",
    "STAGE_6_EXFILTRATION",
]

# Track simulation progress per host
_simulation_stage: Dict[str, int] = {}


def _ingest_flow_dict(pkt: dict):
    collector.ingest_packet(
        src_ip=pkt["src_ip"],
        dst_ip=pkt["dst_ip"],
        src_port=pkt.get("src_port", 0),
        dst_port=pkt.get("dst_port", 0),
        protocol=pkt.get("protocol", "TCP"),
        length=pkt.get("length", 100),
        tcp_flags=pkt.get("tcp_flags") or {},
        dns_query=pkt.get("dns_query"),
        timestamp=pkt.get("timestamp"),
    )


# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "flow-ingest", "active_hosts": len(collector.get_all_active_hosts())}


@app.post("/flow/packet", tags=["ingest"])
def ingest_packet(payload: PacketPayload):
    _ingest_flow_dict(payload.dict())
    return {"status": "ok", "host": payload.src_ip}


@app.post("/flow/batch", tags=["ingest"])
def ingest_batch(payload: BatchPayload):
    count = 0
    for pkt in payload.packets:
        _ingest_flow_dict(pkt.dict())
        count += 1
    return {"status": "ok", "ingested": count}


MAX_PCAP_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB safety cap


@app.post("/flow/pcap", tags=["ingest-lab-only"])
async def ingest_pcap(file: UploadFile = File(...)):
    """Lab & Diagnostic Testing Endpoint: Upload a PCAP file for offline flow analysis.
    
    SECURITY NOTICE:
    - This endpoint is designed for local test bench & offline evaluation.
    - File size is capped at 20 MB.
    - Untrusted packet parsing is isolated and returns structured HTTP 422 on malformed input.
    - Not intended for unauthenticated public ingress without mTLS/VPN boundary.
    """
    if not file.filename or not file.filename.endswith((".pcap", ".pcapng", ".cap")):
        raise HTTPException(
            status_code=400,
            detail={"error": "INVALID_EXTENSION", "message": "File must be a .pcap, .pcapng, or .cap file"}
        )
    
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"error": "READ_ERROR", "message": f"Could not read uploaded stream: {e}"}
        )

    if len(content) > MAX_PCAP_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "PAYLOAD_TOO_LARGE",
                "message": f"PCAP exceeds {MAX_PCAP_SIZE_BYTES // (1024*1024)} MB lab size limit ({len(content)} bytes received)."
            }
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail={"error": "EMPTY_FILE", "message": "Uploaded PCAP file is 0 bytes."}
        )

    try:
        packets = parse_pcap_bytes(content)
    except Exception as err:
        logger.error(f"Unexpected parser failure on {file.filename}: {err}")
        raise HTTPException(
            status_code=422,
            detail={"error": "PARSER_FAILURE", "message": f"Malformed packet structures in PCAP: {err}"}
        )

    if not packets:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "UNRECOGNIZED_PCAP_FORMAT",
                "message": "Could not parse any valid IPv4 TCP/UDP/DNS frames. Ensure file uses standard libpcap format."
            }
        )

    for pkt in packets:
        _ingest_flow_dict(pkt)

    hosts = list({p["src_ip"] for p in packets})
    logger.info(f"PCAP upload: {len(packets)} packets from {len(hosts)} source IPs parsed safely")
    return {
        "status": "ok",
        "filename": file.filename,
        "bytes_received": len(content),
        "packets_parsed": len(packets),
        "source_hosts": hosts[:20],
        "lab_mode": True,
    }



@app.post("/flow/simulate/{host_ip}", tags=["simulation"])
def simulate_apt_stage(host_ip: str):
    """Advance the synthetic APT simulation by one stage for the given host IP.
    Call repeatedly to walk through all 6 kill-chain stages.
    """
    current_stage_idx = _simulation_stage.get(host_ip, 0)
    if current_stage_idx >= len(STAGE_SEQUENCE):
        _simulation_stage[host_ip] = 0
        current_stage_idx = 0

    # Cleanly wipe old flows before starting Stage 1
    if current_stage_idx == 0:
        collector.reset_host_session(host_ip)

    stage_key = STAGE_SEQUENCE[current_stage_idx]
    flows = APT_STAGE_FLOWS[stage_key](host_ip)
    base_time = time.time()
    for i, pkt in enumerate(flows):
        pkt["timestamp"] = base_time + (i * 0.02)
        _ingest_flow_dict(pkt)

    _simulation_stage[host_ip] = current_stage_idx + 1
    logger.info(f"Simulated {stage_key} for {host_ip} ({len(flows)} flows)")
    return {
        "status": "ok",
        "host_ip": host_ip,
        "simulated_stage": stage_key,
        "flows_injected": len(flows),
        "next_stage": STAGE_SEQUENCE[current_stage_idx + 1] if current_stage_idx + 1 < len(STAGE_SEQUENCE) else "COMPLETE",
    }


@app.post("/flow/simulate/{host_ip}/full", tags=["simulation"])
def simulate_full_apt(host_ip: str):
    """Inject all 6 stages at once for a dramatic demo scenario."""
    collector.reset_host_session(host_ip)
    total = 0
    base_time = time.time()
    for s_idx, stage_key in enumerate(STAGE_SEQUENCE):
        flows = APT_STAGE_FLOWS[stage_key](host_ip)
        for i, pkt in enumerate(flows):
            pkt["timestamp"] = base_time + (s_idx * 1.0) + (i * 0.02)
            _ingest_flow_dict(pkt)
        total += len(flows)
    _simulation_stage[host_ip] = len(STAGE_SEQUENCE)
    return {"status": "ok", "host_ip": host_ip, "total_flows": total, "stages": len(STAGE_SEQUENCE)}


@app.get("/flow/hosts", tags=["monitoring"])
def list_hosts():
    hosts = collector.get_all_active_hosts()
    result = []
    for h in hosts:
        session = collector.host_sessions.get(h)
        metrics = session.get_summary_metrics() if session else {}
        result.append({"host_ip": h, **metrics})
    return {"hosts": result, "count": len(result)}


@app.get("/flow/timeline/{host_ip}", tags=["monitoring"])
def get_timeline(host_ip: str):
    timeline = collector.get_host_timeline(host_ip)
    if not timeline:
        raise HTTPException(status_code=404, detail=f"No active flow data for host {host_ip}")
    return {"host_ip": host_ip, "flows": timeline, "count": len(timeline)}


@app.delete("/flow/hosts/{host_ip}", tags=["monitoring"])
def reset_host(host_ip: str):
    collector.reset_host_session(host_ip)
    _simulation_stage.pop(host_ip, None)
    return {"status": "ok", "host_ip": host_ip}
