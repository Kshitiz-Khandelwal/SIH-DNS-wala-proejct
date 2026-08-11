# MASTER BUILD PROMPT
## AI-Powered Secure DNS Filtering & Threat Intelligence Platform
### For: Claude Code (autonomous build agent)
### Source spec: SIH260003 — ISRO — Software / Space Technology

---

## 0. HOW TO USE THIS PROMPT

This is a single master prompt to hand to Claude Code (or paste as the first message in a fresh Claude Code session) to build the entire platform end-to-end, service by service, with working demos at every checkpoint. It is written so Claude Code can:

1. Read it once, propose a build plan matching the phases below, and confirm before starting.
2. Work phase-by-phase, never skipping ahead — each phase must end in something runnable and demoable.
3. Ask for missing secrets/API keys/infra decisions rather than guessing or stubbing them silently.
4. Keep a running `PROGRESS.md` in the repo root updated after every phase, so the build can be resumed in a new session without re-reading everything.

Paste everything from "## 1. PROJECT MISSION" onward as your first message to Claude Code.

---

## 1. PROJECT MISSION

Build a **production-grade, AI-powered DNS filtering and threat-intelligence platform** — not a demo script. Every device on a network resolves a domain before it can talk to the internet; this system intercepts that resolution step to detect and stop threats (known-bad domains, DGA malware, typosquatting, DNS tunnelling, C2 beaconing) in under 100ms per query, then gives a security team a real SOC-style dashboard to see and respond to it live.

The system must support:
- **Active mode**: live DNS interception and filtering of real traffic (UDP, DoH, DoT).
- **Passive mode**: offline forensic analysis of uploaded PCAP / Zeek TSV logs.

Build this as a set of independently deployable **microservices**, matching the architecture in Section 3. Do not collapse this into a monolith — the separation is a functional requirement, not a nicety, because the grading rubric explicitly rewards clean architecture and real-world protocol/standard alignment (STIX/TAXII, MISP).

Non-negotiable constraints:
- **p99 query latency < 100ms** end-to-end from DNS request to response, under load. This must be load-tested and the results must be reproducible and shown in the dashboard.
- Every blocking decision must be **explainable** (see Section 5.I) — never a bare "blocked" with no reason.
- The system must run as a **live, hosted, demoable** deployment, reachable by URL/QR code, not just localhost.
- **The core detection pipeline must be deterministic, local, and never depend on an LLM.** All ML in the hot path is XGBoost/Scikit-learn class models running synchronously on a single machine. Do not route DNS query classification through an LLM, a distributed inference cluster, or any multi-node setup (e.g. EXO) — that is architecturally wrong for a <100ms/<20ms latency budget and is explicitly out of scope for the detection plane. If an LLM/AI-copilot layer is added at all, it lives strictly in the "Intelligence Plane" described in Section 5.8 as an optional, non-blocking add-on that explains and investigates events after the fact — it must never gate an ALLOW/FLAG/BLOCK decision, and the system must keep working correctly with it fully disabled or offline.

---

## 2. NON-GOALS / GUARDRAILS FOR THE AGENT

- Do not silently substitute a "simpler" stack for the ones specified in Section 3 (e.g. do not swap Go for Python in the resolver, do not swap Redis for an in-memory dict, do not skip MISP/STIX-TAXII for a hardcoded blacklist file) — the real stack is a deliberate requirement, ask before deviating.
- Do not fabricate ML performance metrics, entropy thresholds, or benchmark numbers in docs/slides — every number shown in the dashboard or docs must come from an actual computed result in this codebase.
- Do not build the honeypot/sinkhole or auto-quarantine features in a way that could plausibly affect a real production network — this must run entirely inside an isolated lab/sandbox/simulated network namespace (Docker network, mininet, or equivalent) that the agent provisions itself. Never target a real external host, real ISPs, or anything outside the sandbox for quarantine/sinkhole actions.
- Do not integrate any threat-intel feed that requires bypassing a paywall or ToS to scrape — use documented free/open-access tiers (AlienVault OTX free API, Abuse.ch, CERT-In public advisories) and note where an API key/registration is needed from the user.
- Do not write directly to `/etc`, host `iptables`, or host network config — all "device quarantine" firewall actions operate on a virtual lab network the platform owns, exposed via its own API, never the host machine's live networking stack.
- Stop and ask the user before: provisioning paid cloud resources, registering third-party API keys on their behalf, or making anything internet-facing that accepts real, uncontrolled inbound DNS traffic from the public internet.

---

## 3. MICROSERVICES ARCHITECTURE & TECH STACK

Build these as separate services in a monorepo, each in its own directory, each independently runnable via Docker Compose for local dev and Kubernetes manifests (or Docker Compose + a documented cloud deploy path) for the hosted demo.

```
/dns-shield
  /services
    /resolver-core        # A: Go / CoreDNS plugin
    /threat-intel          # C: Python + MISP, STIX/TAXII ingestion
    /ml-inference           # D: Python FastAPI + XGBoost/Scikit-learn
    /behavioral-engine      # E: Python, time-series anomaly detection
    /geo-intel              # F: MaxMind GeoIP2 lookups
    /active-response        # G: Python, sandboxed iptables/nftables + honeypot
    /analytics-store        # H: ClickHouse (or ELK) ingestion + query API
    /api-gateway             # unifies REST API surface for the dashboard + SIEM integration
  /dashboard                # SOC web dashboard (React/Next.js + Three.js/Mapbox)
  /infra                    # docker-compose.yml, k8s manifests, Terraform (optional), CI
  /ml-training              # notebooks/scripts to train & export DGA/typosquat models
  /docs                     # architecture diagrams, API docs (OpenAPI/Swagger), XAI writeups
  /demo-assets              # PCAP samples, seed malicious/benign domain lists, screen recordings
  PROGRESS.md
```

### A. Core DNS Resolver — `resolver-core`
- **Tech**: Go, built as a custom **CoreDNS** plugin (preferred) or a standalone Go DNS server using `miekg/dns`.
- **Protocols**: DNS-over-UDP (port 53), DNS-over-HTTPS (DoH, RFC 8484), DNS-over-TLS (DoT). Implement all three — this is explicitly required by the problem statement.
- **Responsibilities**: accept queries, call Redis cache first, call the pipeline orchestrator (Section 4) on cache miss, apply the final ALLOW/FLAG/BLOCK/SINKHOLE decision, return the correct response, emit an event to the analytics store for every query.
- **Perf target**: sustain 10k+ concurrent queries in local load test with p99 < 100ms including a cache miss round-trip.

### B. Cache Layer — Redis
- In-memory cache of `domain -> {verdict, risk_score, ttl, expiry}`.
- Recently-resolved safe domains return in <5ms without touching any other service.
- Also used as the write target for parsed threat-intel so the resolver never blocks on a live feed pull.

### C. Threat Intelligence Service — `threat-intel`
- **Tech**: Python + MISP (self-hosted MISP instance or MISP's Python API against a hosted/free instance) for STIX/TAXII feed management.
- **Feeds to integrate** (use free/public tiers, document API key setup needed from the user):
  - AlienVault OTX (Open Threat Exchange)
  - Abuse.ch URLhaus
  - CERT-In public advisories (India-specific — scrape/ingest their published indicator lists where no API exists; document the ingestion method used)
  - IBM X-Force Exchange (optional/stretch — requires registration, flag as optional if the user doesn't have a key)
- Background scheduler pulls feeds on an interval, normalizes to STIX 2.1 objects, writes parsed indicators into Redis and the analytics store.

### D. AI/ML Inference Engine — `ml-inference`
- **Tech**: Python + FastAPI, models trained with Scikit-learn / XGBoost (not deep learning — must stay inside the latency budget).
- **Endpoints**: `/predict` (single domain, synchronous, <20ms SLA) and `/predict/batch` (for passive analysis of PCAP-derived domain lists).
- **Features** (compute all of these per domain, per Section 5's XAI requirement they must all be returned alongside the verdict):
  - Shannon entropy of the domain string
  - Vowel-to-consonant ratio
  - Domain length & token/label count
  - N-gram frequency vs. a known DGA corpus
  - Levenshtein distance to a top-1000 legitimate domains list (typosquatting)
  - Domain registration age via WHOIS lookup (cache WHOIS results — don't call live WHOIS on every request)
- **Training data**: use open-source academic DGA datasets (e.g. Bambenek Consulting DGA feed, UMUDGA, DGArchive references) — document exact sources used in `/ml-training/README.md`. Train two models minimum: DGA classifier, typosquatting scorer. Export as versioned model artifacts.

### E. Behavioral Analytics Engine — `behavioral-engine`
- **Tech**: Python, time-series anomaly detection (e.g. rolling z-score / EWMA on request volume, or an isolation forest over per-device feature windows).
- **Detects**: request-volume spikes per device (C2 beaconing), abnormally long subdomains (tunnelling), rapid unique-TLD fanout (DGA scanning).
- Maintains a persistent **Device Risk Score** per IP/MAC, independent of domain risk score.

### F. Geo Intelligence — `geo-intel`
- **Tech**: MaxMind GeoIP2 (offline `.mmdb` database — no live API cost/dependency).
- Resolves target IP of queried domain, flags high-risk ASN/country, contributes to (does not solely decide) the aggregate risk score.

### G. Active Response Engine — `active-response`
- **Tech**: Python, sandboxed `iptables`/`nftables` calls scoped to a lab network namespace the platform provisions (see Guardrails, Section 2) — never the host's live network.
- **Honeypot sinkhole**: a controlled decoy server that malicious C2 requests get redirected to instead of `0.0.0.0`/NXDOMAIN; logs attacker behavior.
- **Device quarantine**: when a device's risk score crosses threshold, auto-issue an isolation rule against the lab network via this service's own API. Must be reversible and logged.

### H. Analytics / Passive Analysis Store — `analytics-store`
- **Tech**: ClickHouse (preferred for time-series query speed) or ELK stack if the team already knows it better.
- Every DNS event (allow/flag/block) is persisted here.
- Accepts uploaded **PCAP** and **Zeek TSV** files, parses them (use `scapy`/`dpkt` for PCAP, direct TSV parsing for Zeek `conn.log`/`dns.log`), replays the extracted domains through the same pipeline in offline mode, and stores results for forensic query ("were we compromised last month?").

### I. API Gateway — `api-gateway`
- Unified REST API (documented via OpenAPI/Swagger) exposing: live query stats, verdicts, device risk scores, threat-intel feed status, PCAP upload endpoint, quarantine controls, XAI explanation lookups.
- This is the integration point for SIEM tools (Splunk/Wazuh/Sentinel) per Section 5.VI — must be usable standalone, without the dashboard.

### Dashboard — `dashboard`
- **Tech**: React (Next.js), dark theme, Tailwind for styling, Three.js or Mapbox GL for the 3D threat globe (Section 5.V), charting library (Recharts/D3) for time-series panels.
- **Screens required**: live query stream, blocked-domain feed with XAI panel, device risk-score table, 3D threat map, PCAP upload + passive-analysis results view, threat-intel feed health panel, quarantine control panel.

---

## 4. THE FILTERING PIPELINE (BUILD IN THIS EXACT ORDER, CHEAPEST FIRST)

Implement as an orchestrated sequence — each stage can short-circuit the rest:

1. **Redis cache** — known-safe domain → resolve in <5ms, skip everything else.
2. **Blacklist / threat-intel check** — known-bad → BLOCK immediately, skip ML/behavioral/geo.
3. **ML lexical analysis** (DGA detection, typosquatting, WHOIS age) — zero-day detection for domains not on any list.
4. **Behavioral / anomaly layer** — DNS tunnelling, request-volume anomaly, device risk check.
5. **Geo intelligence** — high-risk country/ASN check, contributes to score, does not solely block.
6. **Risk score aggregator** — combine all signals into a single 0–100 score:
   - 0–40 → ALLOW
   - 41–70 → FLAG SUSPICIOUS (allow but log + surface in dashboard)
   - 71+ → BLOCK
7. **Active response** — if device or domain crosses critical threshold: sinkhole and/or auto-quarantine.

Every stage must emit its intermediate result (score contribution + reason) so the final XAI explanation can cite exactly which stages fired and why.

---

## 5. REQUIRED DIFFERENTIATING FEATURES ("X-FACTORS") — BUILD ALL SEVEN

These are graded features, not optional polish:

1. **Explainable AI (XAI)** — every block/flag decision returns a human-readable explanation citing the specific signals that fired (entropy value, N-gram match, WHOIS age, etc.), not just a confidence score.
2. **Dual risk scoring** — independent domain-risk and device-risk scores; a moderately-risky domain from a high-risk device escalates; a known-safe domain from a quarantined device still flags.
3. **Honeypot sinkholing** — redirect malicious C2 requests to a controlled decoy instead of NXDOMAIN/0.0.0.0; log attacker behavior; use logged behavior to auto-generate new signatures.
4. **Automatic device quarantine** — zero-human-intervention network isolation when a device risk threshold is crossed, via the lab-network API in Section 3.G.
5. **Live 3D threat map** — dark-themed interactive globe, real-time arcs from network location to malicious server geo-origin, per blocked query.
6. **SIEM-ready REST API** — full OpenAPI-documented API surface so Splunk/Wazuh/Sentinel-style tools could integrate without the dashboard.
7. **Parent domain poisoning analysis** — when a subdomain is flagged, automatically analyze whether the parent domain is being abused as a broader launchpad, not just the exact queried name.

---

## 5.6 SECOND-TIER FEATURES — BUILD THESE TOO (HIGHER SECURITY VALUE THAN THE 3D GLOBE)

These matter more to a judge/security-reviewer than visual polish, and are cheap to add on top of the architecture already specified. Build all of them; they sit on top of the same `analytics-store` and `api-gateway` you're already building, no new infra required.

1. **Domain & device reputation profiles** — persist rolling history per domain (first seen, query count, device count, past verdicts, threat-intel hits) and per device (query volume, blocked/flagged counts, DGA hits, risk trend over time), not just an instantaneous score. Surface "risk went from 21 → 68 over 6 hours" style trend views.
2. **Temporal correlation / incident engine** — a background job that groups related low/medium-signal events (e.g. a DGA hit + a request-volume spike + a suspicious-ASN resolution from the same device within a short window) into a single higher-confidence **Incident**, distinct from a single flagged query. This is what turns isolated weak signals into strong ones — build it as its own lightweight service or module inside `behavioral-engine`.
3. **Incident reconstruction / timeline view** — for each Incident, a chronological event-by-event timeline (first contact → detector trigger → escalation → response action) rendered in the dashboard, plus a short auto-generated plain-language summary of what happened and the evidence for it. This can be built with a simple template/rules-based summarizer first; only reach for an LLM (Section 5.8) if time allows.
4. **Uncertainty bands, not just a score** — classify ML output into `benign (0.00–0.30)` / `uncertain (0.30–0.70)` / `suspicious (0.70–1.00)` in addition to the raw probability, and track a separate `decision confidence: HIGH/MEDIUM/LOW` alongside the risk score. Uncertain + no corroborating signal from other layers → FLAG, not BLOCK. This directly reduces false positives, which judges will ask about.
5. **"Why was this allowed?" explanations** — the XAI panel (Section 5.1) must also work for ALLOW verdicts, not just blocks: show the same per-layer signal breakdown (threat-intel clean, low DGA score, old domain age, normal behavior, low-risk ASN) that produced a low aggregate score.
6. **Human-in-the-loop feedback** — dashboard buttons on any event/incident: `False Positive` / `Confirmed Threat` / `Needs Investigation`. Persist these as labels in the analytics store. Wire up a documented (not necessarily automated) path for these labels to feed back into model retraining in `/ml-training`.
7. **Model monitoring panel** — a dashboard view showing current model version, precision/recall/F1 from the last real evaluation run (never fabricated — compute these from an actual held-out test set in `/ml-training`), inference p50/p95/p99, and a basic feature-drift indicator (e.g. compare recent feature distributions to the training distribution).
8. **Graceful degradation** — every downstream service (threat-intel, ML inference, behavioral engine, geo-intel, and any optional LLM layer) must have a defined fallback if it's unavailable, and the resolver must never hard-fail a query because of it. Minimum required behavior: threat-intel down → serve last-cached indicators; ML service down → fall back to threat-intel + behavioral rules only, and downgrade BLOCK-eligible ML verdicts to FLAG; optional LLM/copilot down → normal deterministic XAI explanations still work unaffected. Add a resilience test scenario for each of these dependencies as part of the Phase 6 evaluation (Section 5.9).
9. **DNS relationship graph (stretch)** — model device↔domain↔IP↔ASN relationships and surface clusters of correlated suspicious infrastructure in the dashboard, rather than only per-query verdicts. Build this after items 1–8 are solid; treat it as a stretch goal, not a blocker.
10. **Attack simulation scenarios** — inside the sandboxed lab network already required by Section 2/Section 3.G, build 4–5 repeatable, named traffic-generation scenarios (DGA malware simulation, DNS tunnelling simulation, C2 beaconing simulation, typosquatting simulation, plus a benign-traffic baseline) that can be triggered on demand from the dashboard or a CLI script. This makes every demo reproducible instead of relying on live internet traffic behaving as expected.

## 5.7 EVALUATION FRAMEWORK (REQUIRED, NOT OPTIONAL)

Don't just demonstrate the system works — measure it, and put the real numbers in the dashboard and docs:

- **Detection quality**: precision, recall, F1, false-positive rate, false-negative rate, computed against a labeled held-out test set (from the DGA/typosquatting training data sources documented in `/ml-training`).
- **Performance**: p50/p95/p99 latency and sustained queries/sec under load, plus CPU/memory usage during the load test.
- **Resilience**: a documented run-through of each graceful-degradation scenario from Section 5.6.8, showing the system continues serving DNS correctly with each dependency killed one at a time.

All of these numbers must come from an actual run in this codebase — never fabricate a metric for the slides or dashboard.

## 5.8 OPTIONAL INTELLIGENCE PLANE — LOCAL LLM / AI SOC COPILOT (STRETCH, BUILD LAST, NEVER BLOCKING)

If time allows after everything in Sections 4, 5, 5.6, and 5.7 is solid, add an optional AI SOC Copilot as a strictly separate, non-blocking "Intelligence Plane" alongside the deterministic "Detection Plane":

- **Purpose**: natural-language investigation and explanation over structured evidence already produced by the pipeline (e.g. "Why was device 192.168.1.24 quarantined?" → the copilot pulls that device's risk profile, recent incidents, and detector signals and produces a plain-language summary). It never makes or influences an ALLOW/FLAG/BLOCK decision itself.
- **Tech**: start with a single locally-hosted small/medium open-weight model via **Ollama or llama.cpp on one machine** — this is sufficient for a copilot use case and keeps the whole system runnable on one box. Do **not** default to a multi-node distributed-inference setup (e.g. EXO) for this project; that class of tool is built for sharding very large models across machines and adds real operational complexity (networking, node orchestration, occasionally unstable multi-node configurations) that this project does not need. Only consider a multi-node cluster later, as an explicit optional upgrade, if the user already has multiple spare machines and specifically wants to demonstrate a distributed-AI angle — and even then it powers only this copilot layer, never the detection pipeline.
- **Give it tools, not just chat**: expose a small, explicit set of read-only functions the copilot can call — `search_events()`, `get_device_profile()`, `get_domain_history()`, `get_threat_intel()`, `get_incident_timeline()`, `generate_report()` — all backed by the `api-gateway`/`analytics-store` already built. This makes it an agent that retrieves real evidence rather than a chatbot guessing from a prompt.
- **Failure isolation**: if this service is down, disabled, or was never built, the rest of the platform (Sections 4 and 5) must be completely unaffected — verify this explicitly as one of the Section 5.7 resilience scenarios.

---

## 5.5 EXECUTION POLICY — DO NOT RUN, START, OR TEST ANYTHING YOURSELF

This is a strict rule for the whole build, not a suggestion:

- **Do not execute code, do not run `docker compose up`, do not start servers, do not run test suites, do not curl endpoints, do not attempt to "verify it works" yourself.** Writing and running things to self-check burns huge amounts of budget on a project this size and is not what you're here for.
- Your job in every phase is to **write the code and configuration files only**. Assume they are correct by careful construction (correct syntax, correct imports, correct config wiring) rather than by running them.
- At the end of **every phase**, instead of testing anything, produce a clearly-labeled **"How to run & test Phase N"** section containing exact, copy-pasteable commands the user will run themselves: environment setup, `docker compose up` commands, which ports to hit, example `curl`/dashboard actions to trigger each feature built in that phase, and what output/behavior to expect if it worked correctly.
- If you are genuinely unsure whether a piece of code is correct (e.g. an unfamiliar library API), say so explicitly in that phase's notes rather than running it to check — flag it as "please verify this works, I'm not fully certain of X" so the user knows where to look first if something breaks.
- The **only** exception: trivial, non-execution file operations needed to write the code itself (creating files/folders, installing packages into `requirements.txt`/`go.mod`/`package.json` as text, not running installs). Never run `pip install`, `npm install`, `go build`, `go run`, etc.
- At the very end of the whole build (after Phase 6), produce one consolidated **`RUN_AND_TEST.md`** file in the repo covering: full local setup from a clean machine, how to bring up every service, how to run the load test, how to walk through all 5 demo beats from Section 7 end-to-end, and how to deploy to the hosted demo environment. This is the master reference the user will actually use — keep it precise and runnable, not narrative.

---

## 6. BUILD PHASES (CLAUDE CODE: FOLLOW IN ORDER, DEMO-CHECKPOINT EACH ONE)

Update `PROGRESS.md` after every phase with what was built, what's running, and any manual step the user must do (API keys, DNS port permissions, etc.).

**Phase 1 — Foundation**
- Monorepo scaffold, Docker Compose skeleton, CoreDNS server with plugin structure, Redis caching layer, first static blacklist ingestion (Abuse.ch). Checkpoint: a query to a known-bad Abuse.ch domain gets blocked locally.

**Phase 2 — Intelligence & AI**
- STIX/TAXII ingestion via MISP, XGBoost DGA model trained and exported, `ml-inference` FastAPI service deployed with <20ms SLA, full lexical feature pipeline wired into the orchestrator. Checkpoint: a DGA-style random domain gets flagged with a real confidence score and feature breakdown.

**Phase 3 — Behavioral & Geo Layers**
- Per-device risk scoring with persistence, DNS tunnelling detection, MaxMind GeoIP2 integration. Add domain/device reputation profiles (5.6.1) and uncertainty bands + decision confidence (5.6.4) here too, since they build directly on this layer. Checkpoint: simulated traffic spike from one lab device raises its device risk score visibly, and a reputation trend view shows the change over time.

**Phase 4 — Response & Automation**
- Honeypot sinkhole module, automatic device quarantine via the lab-network API, attack simulation scenarios (5.6.10) for repeatable demos. Checkpoint: a simulated C2 domain gets sinkholed and logged; a high-risk simulated device gets auto-quarantined and can be manually released from the dashboard; each named attack scenario can be triggered on demand and produces the expected detection.

**Phase 5 — Dashboard & Presentation**
- Full SOC dashboard: live feed, "why blocked" and "why allowed" XAI panels (5.6.5), temporal correlation/incident engine + incident timeline view (5.6.2–5.6.3), human-in-the-loop feedback buttons (5.6.6), model monitoring panel (5.6.7), PCAP/Zeek upload + passive analysis UI, and the 3D threat map. Treat the 3D map as the lowest-priority item in this phase — build the SOC-workflow views first; add the globe once everything else here works. Checkpoint: all 5 demo beats in Section 8 work live end-to-end, plus at least one full incident (multiple correlated signals → single Incident → timeline → summary) is demoable.

**Phase 6 — Polish & Performance**
- DoH/DoT support finished, the full evaluation framework (5.7: detection quality, load test proving p99 < 100ms, resilience/graceful-degradation scenarios), OpenAPI/Swagger docs published, deploy to a hosted environment reachable by URL/QR code, record a backup demo video. If time remains, add the optional AI SOC Copilot (5.8) as a final stretch layer, verified not to affect the rest of the system when disabled.

---

## 7. DEMO SCRIPT (WHAT THE FINAL SYSTEM MUST BE ABLE TO DO LIVE)

1. Type a domain in the dashboard → watch it move through each pipeline stage in real time.
2. Query a known-malicious domain → pipeline blocks it, XAI explanation appears, event is logged.
3. Query a machine-generated (DGA-style) domain → ML confidence score + feature breakdown shown.
4. Upload a sample PCAP → historical threats surfaced from the log.
5. Watch the 3D threat map fire real-time arcs as blocked queries roll in.

Deployment target for the demo: dashboard hosted on Render/Railway (or equivalent), resolver reachable via a small always-on VM (e.g. a $6/mo DigitalOcean droplet) or tunneled from local for the live session, with a QR code and a backup screen recording as fallback if venue internet fails.

---

## 8. DELIVERABLES CHECKLIST

- [ ] All 8 backend microservices running independently via Docker Compose
- [ ] CoreDNS resolver supporting UDP + DoH + DoT
- [ ] Real STIX/TAXII feed ingestion (not a hardcoded list)
- [ ] Trained, exported DGA + typosquatting models with documented training data sources
- [ ] All 7 X-Factor features (Section 5) implemented and demoable
- [ ] Domain/device reputation profiles with historical trend view
- [ ] Temporal correlation engine producing multi-signal Incidents, with timeline + summary view
- [ ] Uncertainty bands + decision confidence, and a working "why was this allowed" panel
- [ ] Human-in-the-loop feedback (False Positive / Confirmed / Needs Investigation) persisted
- [ ] Model monitoring panel with real precision/recall/F1/drift/latency numbers
- [ ] Graceful degradation verified for every dependency (threat-intel, ML, behavioral, geo, optional LLM)
- [ ] Attack simulation scenarios (DGA, tunnelling, C2 beaconing, typosquatting, benign baseline) triggerable on demand
- [ ] SOC dashboard with all required screens
- [ ] PCAP + Zeek TSV passive analysis working on real sample files
- [ ] Documented, reproducible load test showing p99 < 100ms
- [ ] OpenAPI/Swagger docs for the full API surface
- [ ] Hosted, publicly reachable demo + QR code + backup video
- [ ] `PROGRESS.md` reflecting true current build state at all times
- [ ] A "How to run & test" section written at the end of every phase (no self-execution/testing by the agent)
- [ ] One consolidated `RUN_AND_TEST.md` at the end of the full build

---

## 9. INSTRUCTIONS TO CLAUDE CODE — FIRST RESPONSE EXPECTED

Before writing any code, respond with:
1. Confirmation of the phase plan above (or proposed adjustments, with reasoning).
2. A list of accounts/API keys/local tools you need from the user before Phase 1 can start (e.g. MaxMind license key, OTX API key, Docker/Go/Python versions to install locally, whether they want MISP self-hosted or against a hosted demo instance).
3. The exact monorepo scaffold you're about to create.

Then proceed phase by phase, checkpointing with a working demo at the end of each phase before moving to the next.
