# Build Progress

## Current state

The complete code-and-configuration baseline for Phases 1–6 is present. It has **not been executed or self-tested**, as required by the master build prompt.

## Completed implementation scope

- Phase 1: Go DNS resolver (UDP, DoH, DoT), Redis verdict cache, seed URLhaus-style threat feed.
- Phase 2: STIX 2.1 normalization, optional OTX/CERT-In feed ingestion, lexical ML service and reproducible training script.
- Phase 3: behavioral/device scoring, tunnelling and fan-out heuristics, GeoIP adapter, reputation and incident correlation.
- Phase 4: lab-only sinkhole/quarantine state machine and five repeatable simulation scenarios.
- Phase 5: Next.js SOC dashboard and API endpoints for events, profiles, incidents, feedback, passive analysis, feed health, and model telemetry.
- Phase 6: OpenAPI via FastAPI, load/resilience scripts, deployment documentation and full runbook.
- Continuation: CORS, dashboard passive upload/feed-health/analyst-label controls, domain reputation profiles, quarantined-device escalation, and model-monitoring endpoint that only returns metrics from a real training artifact.
- Continuation: mounted `ml-training/artifacts` read-only into inference so real evaluation results can be surfaced, plus a pre-hosting security checklist.
- Continuation: replaced the dashboard threat-globe placeholder with a Three.js visualization of blocked-event arcs.
- Continuation: inference now loads versioned local `dga` and `typosquat` joblib artifacts when available, safely falling back to the transparent deterministic baseline otherwise.
- Continuation: training saves lexical feature baselines and inference calculates a live relative-mean feature-drift indicator from actual recent predictions.
- Deepening pass: rewrote the API gateway into a documented seven-stage pipeline with bounded dependency calls, full per-stage XAI evidence, explicit graceful-degradation reasons, upload-size limits, and automatic passive replay through the same pipeline.
- Deepening pass: rewrote threat intelligence with indicator validation, TTL-backed Redis caching, STIX 2.1 bundle export, feed run state, and documented URLhaus/OTX/CERT-In ingestion endpoints.
- Deepening pass: rewrote behavioural analytics with risk decay, volume/tunnelling/fan-out signals, persistent device/domain profiles, event timelines, parent-domain context, and incident correlation/extension.
- Deepening pass: rewrote active response as an explicitly lab-only controller with sinkhole lifecycle/telemetry/signature suggestions, idempotent quarantine/release flows, configured-lab validation, and audit trails.
- Deepening pass: expanded the Go resolver with UDP/TCP DNS, RFC 8484 DoH validation, DoT TLS configuration, upstream TCP fallback, bounded gateway policy calls, and explicit resolver-level graceful degradation.
- Deepening pass: rewrote analytics/passive forensics with structured ClickHouse JSON ingestion, filtered event/statistics queries, Zeek header parsing, PCAP/PCAPNG UDP-DNS extraction, and safe malformed-capture handling.
- Deepening pass: rewrote Geo intelligence with offline City/ASN enrichment, private/reserved-IP avoidance, Redis result caching, configurable review-list contributions, coordinates for the threat globe, and neutral degradation.
- Verification planning: added `TEST_PLAN.md`, a complete preflight-to-demo checklist covering each service, every protocol, detection path, passive analysis, lab response, dashboard, resilience, and evidence collection.
- Deepening pass: expanded the dashboard SOC workflow with live summary stats, selectable event/pipeline evidence, reputation context, passive replay feedback, feed state, and lab-quarantine release controls; extended dashboard acceptance tests.
- Deepening pass: added optional, operator-triggered MISP integration with connectivity status, STIX-to-MISP DNS indicator mapping, explicit publish endpoint, credential-safe configuration, API documentation, and verification checks.
- Deepening pass: rewrote ML inference with detailed lexical features, versioned artifact reloads, explicit uncertainty bands/XAI reasons, Redis-backed pre-fetched WHOIS-age cache, local-only batch prediction, and monitoring/drift support; updated ML verification steps.
- Handoff planning: added `HANDOFF.md` with a quantified status estimate, implemented-service inventory, prioritized remaining work, deferred execution tasks, required user inputs, and next-agent sequence.
- P0 infrastructure: added deterministic internal mock DNS upstream, local-only TLS certificate mount/documentation, explicit resolver port exposure, and matching test-plan checks. Default demos no longer require public upstream DNS.
- P0 infrastructure: added Compose health-gated startup for Redis, ClickHouse, and mock DNS, documented data-retention boundaries/policy, and expanded startup/storage verification checks.
- P0 analytics foundation: added an operator-applied ClickHouse retention/index migration, clean-bootstrap hourly aggregate materialized view, migration instructions, and validation checks.
- Documentation deepening: added detailed component/design rationale and system-flow/operations guides covering all services, seven-layer justification, runtime topology, active/passive flows, safety boundaries, and test usage.
- P0 gateway hardening: added optional API-key boundary protection, Redis-backed per-IP rate limiting with availability-preserving degradation, secure proxy-header guidance, access-control operating notes, and test-plan coverage.
- P1 observability: added gateway correlation IDs, response-time headers, Prometheus-format request/verdict/degradation/latency metrics, secure metrics exposure configuration, evidence-collection guidance, and verification checks.
- P1 response realism: added a dedicated lab-only HTTP honeypot container at the sinkhole IP, bounded telemetry forwarding, richer sinkhole audit metadata, explicit static lab subnet wiring, and sinkhole acceptance/security tests.
- P1 demo reproducibility: added five named opt-in Docker lab-simulation containers (benign, DGA, tunnelling, C2, typosquat), scenario-specific source/event labels, CLI/container URL configuration, and verification/documentation updates.
- P1 SOC evidence: added ClickHouse-backed analyst-feedback persistence with degradation status, hourly domain/device/global trend API, incident-detail endpoint with ordered evidence timeline, and related test/API updates.
- P1 SOC visualization: wired the dashboard to live hourly security trends, showing average domain-risk bars and blocked/flagged event counts from the new trends API.
- P1 ML reproducibility: expanded training with required source attribution, dataset checksums, versioned artifact metadata, chronological holdout mode, feature-schema metadata, and inference-side artifact compatibility fallback.
- P1 delivery automation: added a non-deploying GitHub Actions quality gate for Compose validation, Python syntax, Go resolver build, dashboard build, and Docker image builds, with CI documentation and acceptance checks.
- P2 deployment baseline: replaced Kubernetes guidance-only content with private-by-default manifests for core platform services, secret/config templates, a default-deny policy, deployment safeguards, and cluster validation checks. No cluster action was taken.
- Hackathon visualization: added an unexecuted Jupyter SOC demo/evidence notebook with real gateway-driven pipeline, event, trend, incident, reputation, feed, and model visualizations, plus notebook setup and verification guidance.
- SIH 2026 Alignment: Transformed DNS Shield into **DNS Shield X-Forecast** (*AI based Network Attack Forecasting from Network Traffic Data*).
- Phase 1 Flow Ingestion: Added 5-tuple NetFlow/IPFIX collector (`services/flow_ingest/network_flow_collector.py`) with 15-minute sliding session window, TCP flag state tracking, and statistical flow feature extraction.
- Phase 2 AI Forecasting: Added 7-stage MITRE ATT&CK kill-chain sequence model (`services/forecasting_engine/attack_forecaster.py`) with confidence horizons ($t+15\text{m}, t+30\text{m}, t+60\text{m}$), blast-radius calculation, and exact Additive TreeSHAP feature explanations.
- Phase 3 HTML Dashboard: Built standalone HTML/JS forecasting dashboard (`public/forecast.html`) with dynamic kill-chain progress bar, TreeSHAP table, canvas topology map, and live Zephyr RTOS status widget; updated `public/index.html` navigation.
- Phase 4 API Gateway Sync: Added `/v1/forecast/timeline`, `/v1/forecast/blast-radius`, `/v1/hardware/trip-relay`, and `/v1/hardware/status` endpoints in `services/api-gateway/app.py`.
- Phase 5 Zephyr RTOS Sentinel: Built C firmware (`hardware/zephyr-sentinel/src/main.c`) with I2C OLED driver, WS2812B NeoPixel RGB threat beacon, physical 5V electromechanical relay air-gap switch, and Python serial bridge daemon (`hardware/pi-bridge/pi_hardware_bridge.py`).
- Phase 6 Red-Team Simulation: Added Multi-Stage APT Attack Forecasting simulation scenario to `run_attack_simulation.py` and created automated unit tests (`tests/test_attack_forecasting.py`).

## Manual prerequisites

- Docker Desktop/Compose, Go 1.22+, Python 3.11+ and Node 20+.
- Optional: `OTX_API_KEY`, a MaxMind GeoLite2 database, and an explicitly chosen CERT-In indicator URL.
- Optional Hardware: Raspberry Pi 4/5 + ESP32/STM32/RP2040 running Zephyr RTOS (with SSD1306 OLED, WS2812B RGB ring, and 5V relay module).
- Review Docker port exposure before any hosted deployment. Do not expose UDP/53 publicly without an approved network policy.

