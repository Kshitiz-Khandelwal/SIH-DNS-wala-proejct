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

## Manual prerequisites

- Docker Desktop/Compose, Go 1.22+, Python 3.11+ and Node 20+.
- Optional: `OTX_API_KEY`, a MaxMind GeoLite2 database, and an explicitly chosen CERT-In indicator URL.
- Generate a development TLS certificate before enabling DoT/HTTPS locally. See `RUN_AND_TEST.md`.
- Review Docker port exposure before any hosted deployment. Do not expose UDP/53 publicly without an approved network policy.
