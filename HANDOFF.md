# DNS Shield — Implementation Handoff

Last updated: 2026-08-11

## Honest completion estimate

| Area | Status | Estimate |
|---|---|---:|
| Repository structure and local Compose wiring | Implemented as code/config | 85% |
| Detection-plane service implementation | Detailed baseline written | 70% |
| SOC dashboard implementation | Detailed baseline written | 65% |
| Threat-intel integrations | Local/optional code written; external feeds not executed | 60% |
| Evaluation, tests, benchmarks, resilience evidence | Planned only | 5% |
| Hosted deployment, QR, backup video | Not started | 0% |
| Overall project code implementation | Not runtime verified | **65–70%** |
| Overall project delivery readiness | No execution evidence/deployment | **30–35%** |

Do **not** present the platform as tested, <100ms compliant, hosted, or production-ready yet. Those claims require actual evidence from the test plan.

## Rules inherited from the master prompt

1. The current user explicitly deferred execution/testing. Do not run Docker, install dependencies, execute code, call external feeds, or deploy unless the user later clearly authorizes it.
2. Keep all active-response actions lab-only. Never modify host firewall/network state or operate quarantine against a real network.
3. Never expose a public resolver or create paid cloud resources without explicit user approval.
4. Update `PROGRESS.md` and `TEST_PLAN.md` after substantive work.
5. Prefer detailed, maintainable implementation over minimal placeholder code.

## What has been implemented

### Repository, configuration, and documentation

- `infra/docker-compose.yml`: Redis, ClickHouse, all backend services, Go resolver, and Next.js dashboard wired to one Docker lab network.
- `.env.example`: service URLs, feed/MaxMind/MISP variables, TLS paths, CORS, lab prefixes, and review-list settings.
- `RUN_AND_TEST.md`: local setup, phase-oriented commands, hosted-demo guardrails.
- `TEST_PLAN.md`: full preflight-to-demo verification matrix with evidence requirements.
- `infra/SECURITY_CHECKLIST.md`: deployment/security checks.
- `docs/ARCHITECTURE.md` and `docs/API.md`: architecture and API context.
- `notebooks/01_soc_demo_analysis.ipynb`: unexecuted Jupyter visual-analysis companion for real gateway evidence after test execution is approved.
- `PROGRESS.md`: chronological status log.

### Resolver core — `services/resolver-core`

- Standalone Go `miekg/dns` resolver; this is allowed by the prompt as an alternative to a CoreDNS plugin.
- DNS-over-UDP and TCP, with Compose exposure at port 5353.
- DoH handler with RFC 8484 content/wire validation.
- DoT server setup when a development TLS certificate/key is supplied.
- Bounded policy-gateway call and upstream UDP→TCP fallback.
- NXDOMAIN blocking or lab sinkhole A record, based on gateway decision.
- Resolver graceful fallback to upstream when gateway is unavailable.

### API gateway — `services/api-gateway`

- Seven-stage cheap-to-expensive policy orchestration.
- Redis verdict cache with TTL.
- Pipeline evidence including stage status, contribution, and explanation.
- Explicit degraded-dependency reporting.
- Safe downgrade from ML-only BLOCK to FLAG when ML is unavailable.
- Event persistence, response/quarantine trigger, events/stats/profiles/incidents/feed/model APIs.
- Feedback persistence and passive PCAP/Zeek replay through the same query pipeline.
- OpenAPI is automatically served by FastAPI.

### Threat intelligence — `services/threat-intel`

- Seed demo indicators and Redis indicator cache with TTL.
- STIX 2.1-shaped normalized indicators and STIX bundle export.
- Manual indicator endpoint.
- Operator-triggered URLhaus, OTX, and CERT-In ingestion code.
- Feed run state and health endpoint.
- Optional operator-triggered MISP publishing mapping indicator data to MISP event API payloads.
- No credential is stored in the repo.

### ML inference/training — `services/ml-inference`, `ml-training`

- Deterministic local lexical feature extraction: entropy, vowel/consonant ratio, length, labels, digit ratio, n-gram novelty, nearest legitimate domain, edit distance, WHOIS-age state.
- Transparent heuristic baseline if artifacts are missing.
- Local `dga-v*.joblib` / `typosquat-v*.joblib` artifact loading and version reporting.
- Batch endpoint and bounded request sizes.
- Redis-backed pre-fetched WHOIS-age cache. The hot path never does live WHOIS lookup.
- Training script produces model artifact, held-out classification report, and feature baseline JSON.
- Model monitoring endpoint and a simple real-time feature-drift calculation after training + requests.

### Behavioral engine — `services/behavioral-engine`

- Device risk scoring with decay.
- Request-volume, long-label/tunnelling, entropy, TLD fan-out, parent-domain fan-out, DGA, and threat-intel contribution signals.
- Persistent device/domain reputation profiles in Redis.
- Timeline events, correlated incidents, incident extension and summaries.
- Parent-domain investigation context.

### Geo intelligence — `services/geo-intel`

- Offline GeoLite2 City and optional ASN database path.
- Ignores private/reserved addresses.
- Redis lookup cache.
- Configurable country/ASN review-list contributions; geo can never block alone.
- Coordinates available for the dashboard threat globe.
- Neutral fallback when database is absent or lookup fails.

### Active response — `services/active-response`

- Explicit virtual-lab scope and configurable accepted lab prefixes.
- Idempotent sinkhole lifecycle and virtual quarantine/release state.
- Lab-only sinkhole telemetry collection.
- Review-only suggestions from recurring decoy behavior.
- Audit events for response lifecycle.
- Explicitly no host `iptables`, `nftables`, or external-network control.

### Analytics/passive forensics — `services/analytics-store`

- Structured ClickHouse JSON event ingestion.
- Filtered event query and verdict/risk stats endpoint.
- Zeek TSV parsing with `#fields` support.
- PCAP and PCAPNG UDP/53 extraction.
- Controlled malformed capture response.
- Gateway replays extracted domains into shared active pipeline.

### Dashboard — `dashboard`

- Next.js dark SOC UI with summary metrics.
- Live event table, selected-event pipeline/XAI panel, feedback buttons.
- Device/domain reputation context.
- Incident summary panel.
- Passive upload control.
- Feed-health, model-monitoring, virtual-quarantine release, and Three.js blocked-event globe.
- This is a functional UI baseline; it needs browser testing and polish.

## Remaining implementation work (before tests)

### P0 — required correctness/completeness

- [ ] Perform a static review of every Dockerfile, Compose path, imports, API contract, and dependency version; fix any detected defects without executing code if the no-execution rule remains active.
- [ ] Add full human authentication/authorization for the dashboard before a hosted demo. Optional gateway API-key access control and detailed reverse-proxy guidance are now implemented/documented.
- [ ] Add reverse-proxy-level request limits/body-size hardening for hosted traffic. Gateway has a Redis-backed fixed-window rate limit and passive upload cap.
- [x] Add a concrete, documented resolver certificate mount/setup in Compose; local certificate generation remains an explicit operator step.
- [x] Add a controlled mock/upstream DNS fixture so demo behavior does not depend entirely on public upstream availability.
- [ ] Add ClickHouse migration/version handling beyond initial schema mount.
- [ ] Apply and validate the supplied ClickHouse TTL/index migration after the owner approves retention. A clean bootstrap now has an hourly aggregate materialized view.
- [ ] Decide whether MISP is self-hosted or hosted. Current code supports a user-controlled hosted MISP but does not deploy a MISP container.
- [ ] Add a real domain-registration-age ingestion job if this feature is required in the demo; do it asynchronously/off-hot-path and only with an approved WHOIS/RDAP data source.

### P1 — feature depth and product polish

- [ ] Replace heuristic n-gram rarity with a corpus-derived n-gram frequency table produced by the training pipeline.
- [ ] Obtain and train separate real DGA/typosquat datasets. Artifact metadata/version manifests, basic compatibility checks, and optional chronological evaluation split are now implemented.
- [ ] Add actual feature-distribution histogram/PSI drift calculation rather than only relative means.
- [ ] Add dedicated incident-detail route/UI showing every timeline item and response action.
- [ ] Add domain/device trend charts from ClickHouse history.
- [ ] Add full PCAP/Zeek result table with filter/export and evidence links in dashboard.
- [ ] Make 3D globe map true source/target coordinates from stored geo JSON, tooltips, and selectable arcs; current fallback uses deterministic display positions when GeoIP is missing.
- [ ] Add dashboard loading/empty/error states and accessibility pass.
- [x] Add named Docker-network attack-simulation containers. Five opt-in one-shot containers now exist under the Compose `simulation` profile.
- [ ] Add parent-domain aggregation/reputation across all subdomains rather than only emitting context per queried domain.

### P2 — infrastructure/deployment deliverables

- [ ] Complete Kubernetes production overlays: immutable real image tags, managed secrets, encrypted PVCs/backups, narrow allow policies, resolver exposure, and approved ingress. A private-by-default Deployment/Service/ConfigMap/Secret-template/NetworkPolicy baseline now exists.
- [ ] Extend CI with linting, unit/integration tests, dependency scanning, and image vulnerability scanning. A baseline workflow now validates Compose, Python syntax, Go resolver build, Next.js build, and Docker image builds.
- [ ] Add structured service logs, distributed tracing, and application-level readiness probes. Gateway correlation IDs and Prometheus-format in-process metrics are now implemented; Compose dependency health checks are present for Redis, ClickHouse, and mock DNS.
- [ ] Add backup/restore procedure for ClickHouse and Redis data.
- [ ] Add QR-code generation after an approved hosted dashboard URL exists.
- [ ] Record backup demo video only after the test plan passes.

## Required execution/testing work (deferred until explicit user approval)

Use `TEST_PLAN.md` as the authoritative checklist. Nothing in this section has been run.

1. Build/start Compose stack and fix all real startup issues.
2. Test service health, browser CORS, OpenAPI, Redis, ClickHouse schema.
3. Test known-bad, benign, DGA, typosquat, cache and quarantined-device pipeline cases.
4. Test UDP, TCP DNS, DoH and DoT with a generated development certificate.
5. Train both models using documented, legally usable datasets; record actual metrics.
6. Test feed ingestions only with user-owned API keys/approved public source URLs.
7. Test all five lab scenarios, sinkhole telemetry, virtual quarantine and release.
8. Test Zeek, PCAP, PCAPNG, malformed upload, and passive replay.
9. Test dashboard event selection, feedback persistence, profile lookup, globe, and response controls.
10. Run controlled latency/QPS test and capture p50/p95/p99, CPU, memory, errors.
11. Perform one-by-one dependency outage drills and document degradation behavior.
12. Only then choose/approve hosted deployment and perform security review, public URL, QR, and backup recording.

## External decisions/inputs required from the user

- OTX key (optional)
- MISP URL/key or a decision to use no MISP for the demo
- Approved CERT-In indicator source URL
- MaxMind GeoLite2 City and optionally ASN database files
- Approved source/path for pre-fetched WHOIS/RDAP ages
- TLS certificate/key path for local DoH/DoT
- Decision on Docker Compose-only demo vs hosted deployment/Kubernetes
- Explicit approval before any paid service, public DNS exposure, or external feed/MISP publishing

## Suggested next-agent order

1. Read `MASTER_BUILD_PROMPT.md`, `HANDOFF.md`, `PROGRESS.md`, and `TEST_PLAN.md` fully.
   Also read `docs/COMPONENT_AND_DESIGN_GUIDE.md` and `docs/SYSTEM_FLOW_AND_OPERATIONS_GUIDE.md` for component rationale and runtime flow.
2. Complete P0 static code/config review and missing Compose/TLS/mock-upstream wiring.
3. Complete P1 product/deployment code gaps, updating test plan per feature.
4. Ask user for the needed secrets/deployment decision.
5. Only after explicit approval, execute `TEST_PLAN.md` sequentially and fix real defects.
6. Update `PROGRESS.md` with actual, measured results rather than projections.
