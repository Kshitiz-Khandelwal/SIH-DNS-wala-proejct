# DNS Shield Component and Design Guide

This guide explains what every major part of DNS Shield does, why it exists, why the selected technology is appropriate, and what alternatives were deliberately not used. It is written for team members, reviewers, and test owners.

## 1. Problem solved by the platform

DNS is normally the first network step a device makes before contacting an internet service: it asks for the IP address associated with a domain. DNS Shield evaluates that name and the requesting device before permitting the resolution. This lets the platform stop known command-and-control (C2) domains and identify suspicious new domains before an application connects to them.

The platform supports two modes:

- **Active mode** receives live DNS requests through UDP/TCP DNS, DNS-over-HTTPS (DoH), or DNS-over-TLS (DoT).
- **Passive mode** extracts DNS queries from PCAP/PCAPNG and Zeek DNS logs, then replays them through the exact same policy pipeline for retrospective investigation.

The detection plane remains deterministic and local. No LLM participates in an ALLOW, FLAG, BLOCK, sinkhole, or quarantine decision.

## 2. Why the filtering pipeline has seven layers

The seven layers are decision stages, not arbitrary services. They are ordered from cheapest and most certain to more contextual analysis:

| # | Layer | Main question | Why it is in this position |
|---:|---|---|---|
| 1 | Redis verdict cache | Have we already made a recent deterministic decision? | Memory lookup is fastest; it avoids duplicate work. |
| 2 | Threat intelligence | Is this a known malicious indicator? | A verified feed hit is high-confidence and should short-circuit expensive analysis. |
| 3 | ML lexical analysis | Does the name itself look generated, young, or like a typo? | Detects zero-day-like names that feeds do not yet contain. |
| 4 | Behavioral analysis | Is this device’s DNS behavior abnormal? | A domain alone is weak evidence; a spike, tunnel, or fan-out adds context. |
| 5 | Geo intelligence | Does target infrastructure have review-list context? | Supporting context only; geography must never independently block a name. |
| 6 | Risk aggregation | What single explainable risk score/verdict follows from the signals? | Centralizes consistent ALLOW/FLAG/BLOCK thresholds. |
| 7 | Active response | Does an already severe event require lab sinkhole/quarantine action? | Response is last because it acts on a completed decision, not raw suspicion. |

### Why not eight or more layers?

More layers are not inherently safer. A new layer is justified only when it produces an independent, measurable signal and has an explicit fallback. Splitting cache or score aggregation into separate “layers” would be cosmetic rather than analytical. Adding an LLM as an eighth decision layer would violate the latency, determinism, and graceful-degradation requirements.

The optional SOC copilot described in the master prompt could be an eighth **intelligence-plane** component later. It would explain already-stored events after the verdict; it must not become an eighth filter or gate.

### Verdict policy

- **0–40: ALLOW** — Resolution continues and an explanation records the clean/low-risk signals.
- **41–70: FLAG** — Resolution continues but the event is visible to the SOC; this is the safe outcome for uncertain ML evidence.
- **71–100: BLOCK** — The resolver returns NXDOMAIN or a virtual-lab sinkhole address.
- **Known threat-intel hit: BLOCK** — Feed attribution is high-confidence and short-circuits the normal score calculation.

The gateway prevents an uncertain lexical result alone from blocking. If ML is unavailable, a would-be ML-only block is downgraded to FLAG.

## 3. Repository map

| Path | What it contains | Why it matters |
|---|---|---|
| `services/resolver-core` | Go DNS/DoH/DoT enforcement point | Handles network DNS protocols efficiently. |
| `services/api-gateway` | REST API and seven-stage policy orchestrator | One consistent decision point for resolver, dashboard, passive analysis, and SIEM. |
| `services/threat-intel` | Feed ingestion, STIX, MISP integration | Separates slow/external intelligence handling from the resolver hot path. |
| `services/ml-inference` | Local FastAPI lexical classifier | Makes zero-day-like domain scoring available behind a bounded local API. |
| `services/behavioral-engine` | Device risk, anomalies, incidents | Adds time-series and per-device context. |
| `services/geo-intel` | Offline GeoLite2 City/ASN enrichment | Adds geographic infrastructure context with no paid/live lookup dependency. |
| `services/active-response` | Lab-only sinkhole/quarantine controller | Demonstrates response safely without host firewall access. |
| `services/lab-honeypot` | Controlled HTTP sinkhole listener | Captures harmless lab-only decoy metadata without proxying traffic. |
| `services/analytics-store` | ClickHouse event persistence and forensic parsing | Provides evidence, dashboard queries, and offline analysis. |
| `dashboard` | Next.js SOC interface | Lets a reviewer operate and observe the system. |
| `ml-training` | Offline training/export scripts | Keeps training separate from low-latency inference. |
| `infra` | Compose, mock DNS, TLS instructions, migrations, simulations | Reproducible development/demo environment. |
| `docs` | Architecture, API, and team-facing guides | Onboarding, review, and handoff material. |

## 4. Services in detail

### 4.1 `services/resolver-core`

**Main files:** `main.go`, `go.mod`, `Dockerfile`.

The resolver accepts traditional DNS over UDP and TCP on port 53 in the container, DoH over HTTPS on port 443, and DoT over TLS on port 853. It normalizes the DNS question, calls `POST /v1/query` at the API gateway, then either forwards the request to the configured upstream or returns the policy result.

If the decision is BLOCK and a sinkhole action exists, A-record queries receive the configured virtual-lab sinkhole IP. Other blocked requests receive NXDOMAIN. If the gateway is unavailable, it forwards upstream so DNS availability is not destroyed by a dashboard or ML outage.

**Why Go and `miekg/dns`:** Go offers efficient concurrency and `miekg/dns` is a widely used DNS library. The master prompt allows a standalone Go resolver as an alternative to a custom CoreDNS plugin.

**Why not Python:** Python is appropriate for the analysis services but is a weaker default for the network-facing low-latency resolver.

**Why not make the resolver a CoreDNS plugin immediately:** A CoreDNS plugin adds plugin lifecycle/build complexity. The standalone resolver preserves the required Go protocol implementation and can later be migrated into CoreDNS if deployment needs it.

### 4.2 `services/api-gateway`

**Main file:** `app.py`.

This is the policy brain and SIEM-compatible REST boundary. It owns domain normalization, bounded calls to downstream services, risk aggregation, verdict policy, XAI stage records, caching, event persistence, and safe degradation.

The gateway is intentionally not a simple proxy. It constructs a `pipeline` array: each element records stage name, status, risk contribution, and reason. The dashboard uses this to show why a name was allowed, flagged, or blocked.

**Why a gateway:** Without it, each consumer could call services in a different order and produce inconsistent verdicts. The gateway makes active DNS, dashboard investigation, and passive replay use the same rules.

**Why REST/FastAPI:** FastAPI provides validation, OpenAPI documentation, and clear internal HTTP boundaries for a hackathon-scale microservice implementation.

### 4.3 `services/threat-intel`

**Main file:** `app.py`; **seed data:** `seed_indicators.txt`.

This service turns raw external or manual intelligence into normalized indicator records. It validates domains, stores indicators in Redis with a TTL, returns cache lookups to the gateway, exports STIX 2.1 bundles, and records feed-run health.

It has explicit, operator-triggered ingestion endpoints for URLhaus, AlienVault OTX, and CERT-In. MISP publishing is also explicit: it requires `MISP_URL` and `MISP_API_KEY`, and is never triggered merely by startup or feed ingestion.

**Why Redis storage:** The resolver path needs an in-memory lookup, not a remote feed pull. Cached indicators continue to work through an upstream feed outage until their configured TTL expires.

**Why STIX and MISP:** STIX 2.1 gives portable threat-intelligence structure. MISP is a common threat-sharing platform and gives a credible integration story for enterprise/SOC use.

**Why not call feeds per query:** External APIs are slow, rate-limited, unreliable, and unsuitable for <100 ms DNS policy.

### 4.4 `services/ml-inference`

**Main file:** `app.py`; **dependencies:** `requirements.txt`.

The ML service performs lexical analysis locally. For each domain it calculates entropy, vowel/consonant ratio, overall length, label count, digit ratio, n-gram rarity, closest legitimate domain, Levenshtein distance, and cached WHOIS-age state.

It can load local `dga-v*.joblib` and `typosquat-v*.joblib` artifacts. If artifacts are absent or invalid, it explicitly reports a transparent heuristic baseline—not a fake trained model.

WHOIS age is cache-only. An operator or background process may store pre-fetched age data using the cache endpoint. The inference path never calls WHOIS/RDAP directly, because live registration lookups would violate latency and reliability constraints.

**Why Scikit-learn/joblib rather than deep learning:** Character-level lexical models can be fast and explainable. Deep models add latency, artifact size, and operational complexity without being required for this detection stage.

**Why two model concepts:** DGA detection and typosquatting are different problems. Random-looking domains and names close to trusted brands have different signals and should not be forced into one opaque score.

### 4.5 `ml-training`

**Files:** `train.py`, `README.md`, `artifacts/`.

Training runs offline, not inside the DNS resolver. The script takes a labeled CSV (`domain,label`), trains a character n-gram model, holds out data for evaluation, and writes a versioned model artifact, classification report, and feature baseline.

**Why offline:** Training is CPU-intensive, changes model state, and needs data governance. Inference must be predictable and fast.

**Important current limitation:** The trainer is a solid starter pipeline, not the final research-grade model process. It still needs documented real datasets, time-based splits, separate DGA/typosquat datasets, artifact metadata, and true corpus-derived n-gram features.

### 4.6 `services/behavioral-engine`

**Main file:** `app.py`.

This service maintains behavior state per device. It evaluates a rolling time window for request volume, long leftmost labels, entropy of potential encoded payload, TLD fan-out, parent-domain fan-out, DGA evidence, and threat-intel hits.

The result is a persistent device risk with decay. Decay matters: a device should not remain permanently critical after suspicious activity ends. It also stores device/domain profiles, event timelines, and correlated incidents.

**Why a separate device score:** Domain risk answers “is this name risky?” Device risk answers “is this requester behaving like a compromised device?” Combining them makes one medium-risk query more meaningful when it comes from a device that is already behaving suspiciously.

**Why rules/rolling windows instead of a large anomaly platform:** The rules are explainable and immediately testable. An Isolation Forest or more advanced time-series model can be added after baseline traffic is available.

### 4.7 `services/geo-intel`

**Main file:** `app.py`.

Geo intelligence performs offline lookups using MaxMind GeoLite2 City and optional ASN `.mmdb` files. It ignores private, loopback, reserved, and documentation addresses. Results are cached in Redis and may add a small contribution when a locally configured review-list country or ASN appears.

**Why offline GeoLite2:** It has no per-query network cost or live third-party availability dependency. The dashboard also uses returned coordinates for the threat globe.

**Why geo never blocks alone:** Geography is weak and may introduce unfair/incorrect decisions. It is context, not proof of maliciousness.

### 4.8 `services/active-response`

**Main file:** `app.py`.

This service models response in a safe virtual lab. It creates sinkhole state, accepts honeypot telemetry only from configured lab prefixes, records audit logs, creates review-only signature suggestions, and manages idempotent virtual quarantines/release actions.

**Why virtual state instead of `iptables`/`nftables`:** The master prompt forbids host network changes. The application demonstrates correct response lifecycle and auditability without risking a real device or the host network.

**Why signature suggestions are review-only:** Automatically promoting decoy behavior into blocks can create false positives. A human or explicit threat-intel process must review the suggestion.

### 4.9 `services/lab-honeypot`

The lab honeypot is a minimal HTTP listener bound to `SINKHOLE_IP` inside the Docker-only lab subnet. It returns a harmless fixed response and forwards a bounded amount of request metadata to active response: source address, method, path, user agent, body size, and at most 1 KiB of preview.

It never proxies a request to a destination, executes content, or opens an outbound connection for the client. This is important: the purpose is safe observation of the simulated C2 request, not an internet-facing trap.

**Why a separate service:** Active response owns policy state and audits. The honeypot owns only observation. Keeping them separate makes the safety boundary clear and allows the decoy to be replaced later without changing response decisions.

### 4.10 `services/analytics-store`

**Main files:** `app.py`, `schema.sql`, `migrations/`.

The analytics service writes every event to ClickHouse, reads filtered history, calculates verdict/risk summary statistics, parses Zeek DNS logs, and extracts UDP/53 questions from PCAP or PCAPNG data.

Passive parsing only extracts observable DNS. Encrypted DoH/DoT cannot be decoded from a network capture without endpoint instrumentation or decrypted logs.

**Why ClickHouse:** It is optimized for append-heavy, time-series analytical data and is a natural fit for event timelines and dashboard aggregates.

**Why PCAP parsing is separate from the gateway:** Capture files are bulky and parsing can be slow. The analytics service extracts domains, while the gateway ensures the same detection rules are used for replay.

### 4.11 `dashboard`

**Main files:** `app/page.js`, `app/ThreatGlobe.jsx`, `app/style.css`.

The Next.js dashboard is a dark SOC interface. It calls only the gateway, displays event counts, allows ad-hoc investigation, provides stage-by-stage XAI, shows device/domain context, lists correlated incidents, uploads forensic logs, shows feed/model health, manages virtual quarantine release, and renders blocked events as Three.js globe arcs.

**Why Next.js/React:** It provides a structured component model and easy container deployment. **Why Three.js:** It supplies a high-impact but still data-driven globe without requiring a paid mapping service.

**Important current limitation:** The dashboard is a functional baseline. It needs browser testing, incident-detail pages, trend charts, refined error/loading states, and accessibility improvements.

## 5. Data stores and their responsibilities

| Store | Data held | Why this store |
|---|---|---|
| Redis | verdict cache, indicators, profiles, behavior timelines, incidents, quarantine state, pre-fetched WHOIS age | Fast key/value state and TTL expiration. |
| ClickHouse | immutable DNS security events, analyst feedback, hourly aggregate view | Long-lived forensic/history queries and dashboard analytics. |
| Local files | model artifacts, GeoLite2 databases, TLS certificates | Controlled local dependencies that do not need a remote runtime call. |

No PCAP source file is persisted by the current application; it is parsed in memory. See `infra/DATA_RETENTION.md` for default retention policy and limits.

## 6. Infrastructure files

### `infra/docker-compose.yml`

Defines the local microservice topology. Every service joins `dns-shield-lab`. Redis, ClickHouse, and mock DNS have health checks. The resolver depends on a started gateway and healthy mock upstream; this supports reproducible local demos.

### `infra/mock-dns/Corefile`

Provides deterministic documentation-range responses for demo domains. It avoids dependence on public DNS for normal traffic and resolver-degradation testing.

### `infra/certs/README.md`

Explains how to create a local-only development certificate for DoH/DoT. Private key files are ignored by Git.

### `infra/simulate.py`

Provides safe API-only traffic scenarios: `benign`, `dga`, `tunnelling`, `c2`, and `typosquat`. It does not generate external traffic or change networking.

### `infra/lab-simulator`

Packages the same five safe scenarios as named, one-shot Docker containers under the Compose `simulation` profile. This makes the live demo repeatable: each scenario has a stable source address and event source string. The profile is opt-in, so simulations cannot start accidentally with the normal platform stack.

### `infra/DATA_RETENTION.md`

Defines evidence retention intentions and explicitly states which retention behavior is operational policy versus enforced migration.

## 7. Configuration reference

Copy `.env.example` to `.env` for local configuration. Important groups:

- **Service URLs:** `REDIS_URL`, `CLICKHOUSE_URL`, `GATEWAY_URL`, and one URL per service.
- **Resolver:** `UPSTREAM_DNS`, `RESOLVER_TLS_CERT`, `RESOLVER_TLS_KEY`.
- **Lab response:** `SINKHOLE_IP`, `LAB_NETWORK_PREFIXES`.
- **Threat feeds:** `OTX_API_KEY`, `CERTIN_FEED_URL`, `MISP_URL`, `MISP_API_KEY`.
- **Geo:** `MAXMIND_MMDB_PATH`, `MAXMIND_ASN_MMDB_PATH`, review-list variables.
- **Dashboard security:** `CORS_ORIGINS`.

Keep secrets only in `.env` or a secret manager. Never add API keys, certificates, model training data, or MaxMind databases to version control.

## 8. Known limitations and next engineering work

The code is intentionally untested so far because the user deferred execution. The following are not complete claims:

- No p50/p95/p99 or QPS result exists yet.
- No real model quality metric exists until documented data is trained.
- No public deployment, QR code, or backup demo recording exists.
- MISP/OTX/CERT-In paths require user-owned credentials/approved sources and have not been called.
- Current authentication/rate limiting/CI/tracing are incomplete.
- Current virtual quarantine is a lab state model, not network enforcement.

Use `HANDOFF.md` for prioritized work and `TEST_PLAN.md` for all validation.
