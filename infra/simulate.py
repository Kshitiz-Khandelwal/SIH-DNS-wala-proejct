"""DNS Shield — Demo Traffic Generator & NetFlow Emitter

Usage:
  python infra/simulate.py dga --repeat 3
  python infra/simulate.py c2 --repeat 5
  python infra/simulate.py tunnelling --repeat 2
  python infra/simulate.py typosquat --repeat 2
  python infra/simulate.py benign --repeat 5

Sends DNS queries to the API gateway for verdict scoring, AND emits
corresponding NetFlow telemetry to the Flow Ingest service so attacks
show up live on the /app/forecast kill-chain timeline.
"""
from __future__ import annotations

import argparse
import os
import time
import random
import requests

GATEWAY  = os.getenv("GATEWAY_URL",   "http://localhost:8081")
FLOW_URL = os.getenv("FLOW_INGEST_URL", "http://localhost:8006")

QUERY_ENDPOINT = GATEWAY  + "/v1/query"
FLOW_ENDPOINT  = FLOW_URL + "/flow/batch"

# ─── Scenario Domains ─────────────────────────────────────────────────────────
SCENARIOS = {
    "benign":    ["isro.gov.in", "google.com", "github.com", "mail.gov.in", "cdn.microsoft.com"],
    "dga":       ["xq9m2kz7v4na.com", "lq3zp89vbcx.net", "ad7qxm91bz.io", "pz4k9mnvxqa.ru"],
    "tunnelling": [
        "".join("abcdef0123456789"[i % 16] for i in range(60)) + ".exfil-demo.example",
        "dGhpcyBpcyBleGZpbHRyYXRlZA==.tunnel.c2.io",
    ],
    "c2":        ["c2.bad-demo.example", "beacon.cobalt-strike.xyz", "heartbeat.apt-group.net"],
    "typosquat": ["gooogle.com", "isro-gov.in", "microsooft.com", "paypa1.com"],
}

# ─── NetFlow Templates per Scenario ─────────────────────────────────────────
def _build_flows(scenario: str, client_ip: str, domains: list[str]) -> list[dict]:
    """Build synthetic NetFlow records matching the threat scenario."""
    flows = []
    now = time.time()
    
    if scenario == "benign":
        for domain in domains:
            flows.append({
                "src_ip": client_ip, "dst_ip": "8.8.8.8",
                "src_port": random.randint(40000, 60000), "dst_port": 53,
                "protocol": "DNS", "length": random.randint(60, 150),
                "tcp_flags": {}, "dns_query": domain, "timestamp": now
            })

    elif scenario == "dga":
        # DGA: Initial Access phase — high-entropy domains to external DNS
        for domain in domains:
            flows.append({
                "src_ip": client_ip, "dst_ip": "8.8.8.8",
                "src_port": random.randint(40000, 60000), "dst_port": 53,
                "protocol": "DNS", "length": random.randint(150, 280),
                "tcp_flags": {}, "dns_query": domain, "timestamp": now
            })
        # Add reconnaissance precursor (port sweep)
        for port in [22, 80, 443, 8080, 3389, 445]:
            flows.append({
                "src_ip": client_ip, "dst_ip": "192.168.1.1",
                "src_port": random.randint(50000, 65000), "dst_port": port,
                "protocol": "TCP", "length": 60,
                "tcp_flags": {"SYN": True, "ACK": False, "FIN": False, "RST": False},
                "timestamp": now
            })

    elif scenario == "c2":
        # C2: Heartbeat beaconing with regular IAT
        for i, domain in enumerate(domains * 4):
            flows.append({
                "src_ip": client_ip, "dst_ip": "185.220.101.45",
                "src_port": 49152 + i, "dst_port": 443,
                "protocol": "TCP", "length": 256,
                "tcp_flags": {"SYN": False, "ACK": True, "FIN": False, "RST": False},
                "dns_query": domain, "timestamp": now + i * 30.0  # 30s regular heartbeat
            })

    elif scenario == "tunnelling":
        # DNS Tunnelling: large payloads, base64 in query, high burst QPS
        for i, domain in enumerate(domains * 10):
            flows.append({
                "src_ip": client_ip, "dst_ip": "8.8.8.8",
                "src_port": random.randint(40000, 60000), "dst_port": 53,
                "protocol": "DNS", "length": random.randint(400, 512),
                "tcp_flags": {}, "dns_query": domain, "timestamp": now + i * 0.5
            })

    elif scenario == "typosquat":
        flows.append({
            "src_ip": client_ip, "dst_ip": "8.8.8.8",
            "src_port": random.randint(40000, 60000), "dst_port": 53,
            "protocol": "DNS", "length": 100, "tcp_flags": {},
            "dns_query": domains[0], "timestamp": now
        })

    return flows


def main():
    parser = argparse.ArgumentParser(
        description="DNS Shield demo traffic generator + NetFlow emitter"
    )
    parser.add_argument("scenario", choices=list(SCENARIOS))
    parser.add_argument("--device", default="172.28.0.99", help="Simulated client IP")
    parser.add_argument("--repeat", type=int, default=1, help="Number of repetitions")
    parser.add_argument("--no-flow", action="store_true", help="Skip NetFlow telemetry emission")
    args = parser.parse_args()

    domains = SCENARIOS[args.scenario]

    for rep in range(args.repeat):
        print(f"\n[Repeat {rep + 1}/{args.repeat}] Scenario: {args.scenario}")
        
        # 1) Send DNS query to gateway for verdict
        for domain in domains:
            try:
                resp = requests.post(
                    QUERY_ENDPOINT,
                    json={"domain": domain, "client_ip": args.device, "source": f"lab-simulation:{args.scenario}"},
                    timeout=10,
                )
                result = resp.json()
                verdict = result.get("verdict", "?")
                print(f"  DNS: {domain:<50} → {verdict}")
            except Exception as e:
                print(f"  [!] Gateway error: {e}")

        # 2) Emit NetFlow telemetry to flow ingest service
        if not args.no_flow:
            flows = _build_flows(args.scenario, args.device, domains)
            if flows:
                try:
                    r = requests.post(
                        FLOW_ENDPOINT,
                        json={"packets": flows},
                        timeout=3,
                    )
                    if r.status_code == 200:
                        print(f"  FLOW: {r.json()['ingested']} flow records → forecasting pipeline")
                    else:
                        print(f"  [!] Flow ingest returned {r.status_code}")
                except Exception as e:
                    print(f"  [!] Flow ingest offline ({e}) — run python run_backend.py first")


if __name__ == "__main__":
    main()
