# DNS Shield Pre-Test Readiness Assessment

Last updated: 2026-08-12

## Executive status

The hackathon-focused implementation is now sufficiently complete to transition to **static review and then controlled local testing**. Kubernetes, public hosting, and production hardening are optional follow-on work; they are not blockers for the local hackathon demo.

| Work category | Current state | Remaining before controlled local testing |
|---|---|---:|
| Core service code | Written in detailed baseline form | 5–10% feature polish/static fixes |
| Dashboard/demo code | Written with live/XAI/trend/globe/passive views | 10–15% UI polish; not a test blocker |
| Documentation/runbooks | Detailed and cross-linked | 5% — update only if static review finds a mismatch |
| Local demo infrastructure | Compose, mock DNS, TLS instructions, lab honeypot, simulators written | 5% — static Compose/path review |
| Model/training data | Training code written | Real approved datasets must be supplied before ML-quality testing |
| Automated/runtime testing | Not started by instruction | 100% pending |
| Performance/resilience evidence | Not started | 100% pending |
| Hosted deployment/QR/video | Not started; optional for later | 100% pending |

## What is complete enough for local testing

- [x] Eight core backend services plus a dedicated lab honeypot are represented in Compose.
- [x] Resolver code supports UDP/TCP DNS and conditionally enabled DoH/DoT.
- [x] Deterministic seven-stage gateway orchestration, cache, verdict policy, XAI stage output, passive replay, and degradation behavior are coded.
- [x] Threat-intel cache/STIX/feed/MISP integration paths are coded and remain optional until keys are supplied.
- [x] ML baseline, local artifact loading, WHOIS-age cache, training metadata, and monitoring/drift plumbing are coded.
- [x] Device/domain reputation, behavioural signals, incident correlation, lab sinkhole/quarantine, audit, and honeypot telemetry are coded.
- [x] ClickHouse event/feedback/trend APIs and PCAP/PCAPNG/Zeek parsers are coded.
- [x] Dashboard, Three.js globe, notebook visualization, test plan, system/design guides, mock DNS, TLS instructions, and safe simulation scenarios are present.

## Remaining code/documentation work before testing

These are not reasons to delay basic Compose startup and end-to-end testing, but should be addressed during a final static review if possible.

### Recommended before first `docker compose up`

- [ ] **Static contract audit:** read each API caller and receiver together to confirm request/response field names, path names, timeout behavior, and error handling match. This is code review only; do not execute yet.
- [ ] **Compose/Dockerfile audit:** inspect relative build/volume paths, container command paths, health-check commands, and fixed lab subnet/IP assumptions. Correct only confirmed static mistakes.
- [ ] **Dashboard visual audit:** inspect code for loading/error/empty states and ensure every fetch has a safe fallback. Browser behavior will be confirmed only during testing.
- [ ] **Git hygiene:** inspect `git diff`, verify `.env`, TLS keys, MaxMind files, model artifacts, notebooks outputs, and credentials are ignored before any push.
- [ ] **Demo fixtures:** add an authorized sample Zeek DNS log and PCAP/PCAPNG only if the team has legitimate lab samples. Do not fabricate a PCAP or use sensitive capture data.

### Can be completed after basic testing begins

- [ ] Dedicated incident-detail dashboard page/modal with complete chronological evidence and response actions. The API already supplies the data.
- [ ] Rich passive-analysis results table/filter/export UI. The upload/replay API already supplies results.
- [ ] More polished trend charts, globe tooltips, loading states, responsive styling, and accessibility pass.
- [ ] Corpus-derived n-gram feature table and improved ML drift metrics (PSI/histograms). The transparent baseline is sufficient for initial plumbing tests.
- [ ] Service-wide structured JSON logs, distributed tracing, and app-level readiness endpoints.
- [ ] CI expansion with unit/integration/security scans. The existing CI is a build/syntax gate only.

## Required local inputs before testing particular features

| Feature | Required input | Can basic platform testing proceed without it? |
|---|---|---|
| UDP/TCP resolver | Docker Desktop | No — required for full-stack test |
| DoH/DoT | Local `infra/certs/tls.crt` and `tls.key` | Yes — test UDP/TCP first |
| Geo enrichment/globe coordinates | MaxMind GeoLite2 City, optional ASN `.mmdb` | Yes — geo safely degrades to neutral |
| Real feed ingestion | Approved OTX key/CERT-In URL/MISP details | Yes — seed indicators demonstrate path |
| Trained model quality | Approved labelled DGA/typosquat data | Yes — baseline behavior can be tested, but no quality claim |
| Passive PCAP demo | Authorized lab PCAP/PCAPNG | Yes — Zeek/log and API paths can be tested first |
| Hosted/public demo | Explicit approval, deployment account, domain/TLS plan | Yes — local demo is the first target |

## Exact next sequence

1. Perform the static contract/Compose/Git review above; update `PROGRESS.md` with only confirmed changes.
2. Ask the user to authorize execution. The existing master-prompt no-execution constraint must be explicitly overridden before starting containers, installing packages, or invoking tests.
3. Follow `TEST_PLAN.md` from Section 0 through Section 11 in order. Do not skip startup health, degradation, or evidence capture.
4. Fix actual defects found by test output, rerun only the affected tests, and record real results in `PROGRESS.md`.
5. Train real models and measure performance only after the base stack works.
6. Consider a hosted URL/QR/backup recording only after the local demo passes.

## What must not be claimed yet

- “p99 under 100ms” — no load run has occurred.
- “10k concurrent queries” — no load run has occurred.
- Any precision, recall, F1, false-positive rate, or drift result — no approved dataset has been trained/tested.
- “Live hosted demo” — no deployment has occurred.
- “Real OTX/CERT-In/MISP ingestion” — external integrations have not been configured/run.
- “DoH/DoT verified” — TLS files and protocol tests have not been run.
- “Automatic quarantine works on a network” — current implementation is deliberately virtual-lab response state only.

## Documentation to use during testing

| Need | Document |
|---|---|
| Component rationale/why each layer exists | `docs/COMPONENT_AND_DESIGN_GUIDE.md` |
| Runtime topology and system flow | `docs/SYSTEM_FLOW_AND_OPERATIONS_GUIDE.md` |
| Exact pass/fail test checklist | `TEST_PLAN.md` |
| Commands and local setup | `RUN_AND_TEST.md` |
| Security/deployment boundaries | `infra/SECURITY_CHECKLIST.md`, `infra/ACCESS_CONTROL.md` |
| Storage/retention policy | `infra/DATA_RETENTION.md` |
| Notebook visual evidence | `notebooks/README.md` |
| Remaining/backlog and handoff | `HANDOFF.md` |

