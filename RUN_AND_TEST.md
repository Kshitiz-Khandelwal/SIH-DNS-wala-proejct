# Run and test DNS Shield

This repository was written without executing services or tests. Run the following from a clean development machine after reviewing exposed ports and `infra/docker-compose.yml`.

## Prerequisites

Install Docker Desktop with Compose, Go 1.22+, Python 3.11+, and Node 20+. Copy `.env.example` to `.env`. Leave optional feed keys blank for the safe baseline, or add your own OTX key and an approved CERT-In source. Obtain GeoLite2 manually from MaxMind and place it at the configured `MAXMIND_MMDB_PATH` if geo enrichment is required.

For local TLS development, create and mount a certificate/key at paths set by `RESOLVER_TLS_CERT` and `RESOLVER_TLS_KEY`. Do not use a publicly trusted certificate for a demo unless you control the DNS name.

## Start

```powershell
Copy-Item .env.example .env
docker compose -f infra/docker-compose.yml up --build
```

Open `http://localhost:3000` for the SOC dashboard and `http://localhost:8080/docs` for the SIEM API.

After training, model artifacts in `ml-training/artifacts` are mounted read-only into `ml-inference`; restart that service to expose new monitoring artifacts.

## How to run & test Phase 1

```powershell
Resolve-DnsName c2.bad-demo.example -Server 127.0.0.1 -Port 5353
```

Expected: an NXDOMAIN response or the configured lab sinkhole address. Querying a normal domain should resolve through the configured upstream. Inspect Redis with `docker compose -f infra/docker-compose.yml exec redis redis-cli HGETALL indicator:c2.bad-demo.example`.

## How to run & test Phase 2

```powershell
Invoke-RestMethod http://localhost:8000/predict -Method Post -ContentType application/json -Body '{"domain":"xq9m2kz7v4na.com"}'
python ml-training/train.py --data .\ml-training\data\your-labelled-domains.csv --name dga
```

Expected: lexical features, uncertainty band and reasons. The training command writes actual held-out metrics under `ml-training/artifacts`; do not claim metrics before that run.

## How to run & test Phase 3

```powershell
python infra/simulate.py tunnelling --repeat 2
Invoke-RestMethod http://localhost:8080/v1/devices/172.28.0.99
```

Expected: long-subdomain/volume signals, increasing device risk and an incident when multiple signals correlate. Test GeoLite2 only after supplying the database.

## How to run & test Phase 4

```powershell
python infra/simulate.py c2
python infra/simulate.py dga --repeat 20
Invoke-RestMethod http://localhost:8080/v1/quarantine
Invoke-RestMethod http://localhost:8080/v1/quarantine/172.28.0.99 -Method Delete
```

Run all named scenarios: `benign`, `dga`, `tunnelling`, `c2`, and `typosquat`. Expected: traffic is sent only to the local gateway; quarantine state is virtual-lab state and is reversible.

## How to run & test Phase 5

In the dashboard, run a known-bad query and a normal domain, review XAI explanations, event stream and incident timeline. Upload a Zeek DNS TSV through `POST /v1/passive/zeek` and a PCAP through `POST /v1/passive/pcap`; submit returned domains to `POST /v1/query` to replay them through the identical pipeline. Add an analyst label using the feedback endpoint and include exported labels in the next training CSV.

## How to run & test Phase 6

Measure latency/load from a trusted lab host only, e.g. use `dnsperf` against UDP port 5353 and record p50/p95/p99 plus host CPU/RAM. Do not fabricate values; add measured JSON to the model-monitoring UI only after a run.

Resilience drill: stop one service at a time with `docker compose -f infra/docker-compose.yml stop ml-inference` (then behavioral, geo-intel, threat-intel). Query a domain after each stop. Expected: resolver continues serving; ML outage degrades ML-only blocks to `FLAG`; Geo outage contributes zero; threat Intel uses cached indicator state. Restart each with `docker compose -f infra/docker-compose.yml start SERVICE`.

## Hosted demo

Host the dashboard/API behind HTTPS on Render or Railway and keep resolver UDP/DoH/DoT on a VM only after configuring firewall rules, authentication/rate limits, monitoring, and an approved public-DNS exposure plan. The master prompt requires the user to approve any paid resource and public inbound DNS exposure; this repository deliberately does not provision either. Generate the QR only after the final approved dashboard URL exists.

Review `infra/SECURITY_CHECKLIST.md` before any hosted deployment.
