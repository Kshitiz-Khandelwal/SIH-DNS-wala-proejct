# DNS Shield Verification Plan

This is the single checklist for validating the whole path after implementation is complete. It is intentionally written before execution, so no result is implied by a checked-looking feature. Record actual command output, timestamp, environment, and pass/fail result in a copy of this file or a separate evidence log.

## 0. Test environment gate

- [ ] Docker Desktop/Compose, Go 1.22+, Python 3.11+, and Node 20+ are installed.
- [ ] `.env` is created from `.env.example`; no secret is committed.
- [ ] Docker Desktop has enough memory for ClickHouse, Redis, seven Python services, the resolver, and dashboard.
- [ ] Test traffic is confined to the `dns-shield-lab` Docker network.
- [ ] The resolver is not exposed publicly and no host firewall permissions are granted.
- [ ] Development TLS certificate/key exist before testing DoH/DoT.
- [ ] Confirm `infra/certs/tls.crt` and `infra/certs/tls.key` are local-only and ignored by Git.
- [ ] Confirm the default upstream is the internal `mock-dns` service, not a public resolver.

## 1. Startup and health path

Start the stack with `docker compose -f infra/docker-compose.yml up --build`.

- [ ] Redis accepts connections.
- [ ] ClickHouse is reachable and `dns_shield.events` table exists.
- [ ] Every service responds to its `/health` endpoint where supplied.
- [ ] Compose waits for Redis, ClickHouse, and mock DNS health checks before starting dependent services.
- [ ] Confirm a failed dependency health check is visible in Compose status and does not silently look ready.
- [ ] Gateway OpenAPI is available at `http://localhost:8080/docs`.
- [ ] Dashboard loads at `http://localhost:3000` and browser developer tools show no CORS error.
- [ ] Resolver starts on UDP/TCP 5353; DoH 8443 and DoT 8853 start only after TLS is configured.
- [ ] `mock-dns` resolves `isro.gov.in`, `google.com`, and `github.com` to the documented fixed demo addresses.

Evidence: capture the Compose service list and one health response per service.

## 1.1 Storage and retention checks

- [ ] Review `infra/DATA_RETENTION.md` with the project owner before uploading any non-lab forensic data.
- [ ] Confirm source PCAP/Zeek files are not persisted by the application after parsing.
- [ ] Inspect Redis TTLs for a device profile, incident, sinkhole telemetry record, and cached verdict.
- [ ] Before claiming retention enforcement, verify whether a ClickHouse table TTL migration has actually been implemented; the initial schema has no automatic TTL.

## 1.2 Gateway access-control and rate-limit checks

- [ ] In local isolated mode with no `GATEWAY_API_KEY`, verify normal dashboard/API paths work and response headers explicitly report local-development auth disabled.
- [ ] Set a temporary non-production `GATEWAY_API_KEY`, restart gateway, and confirm a protected endpoint returns 401 with no header and succeeds with the correct `X-DNS-Shield-Key` header.
- [ ] Confirm `/health`, `/docs`, and `/openapi.json` remain reachable as configured public operational/documentation endpoints.
- [ ] Set a low non-production rate limit, send more requests than allowed inside one minute, and verify 429 plus `Retry-After`.
- [ ] Confirm normal responses include remaining/limit headers.
- [ ] Stop Redis and verify requests remain available but return `X-DNS-Shield-RateLimit: degraded-redis-unavailable`.
- [ ] Verify `TRUST_PROXY_HEADERS` is false by default; test trusted-header behavior only behind a controlled proxy.

## 1.3 Observability checks

- [ ] Send a request with a chosen `X-Correlation-ID`; confirm the exact value returns in the response with `X-Response-Time-Ms`.
- [ ] Request `/metrics` with the required API key (or only in an isolated private-monitoring configuration) and verify request, verdict, degradation, and latency metric families are present.
- [ ] Generate ALLOW, FLAG, BLOCK, and degraded-dependency cases; confirm their counters change in gateway metrics.
- [ ] Restart the gateway and confirm in-process metrics reset; do not treat them as persistent historical evidence.
- [ ] After owner approval, apply `services/analytics-store/migrations/001_retention_and_indexes.sql` to a non-production ClickHouse instance.
- [ ] Verify the events table has 90-day TTL, feedback has 180-day TTL, and verdict/client-IP skipping indexes exist.
- [ ] Insert representative events and verify the `events_hourly` materialized view returns grouped verdict totals.

## 2. Active detection pipeline — complete path

Use `POST /v1/query` or the dashboard’s **Run pipeline** action. For every case, verify the result contains `pipeline`, `reasons`, `confidence`, `latency_ms`, and `degraded_dependencies`.

| Case | Input | Expected path | Expected decision |
|---|---|---|---|
| Known bad | `c2.bad-demo.example` | cache miss → threat-intel hit → short circuit | `BLOCK`; sinkhole action when lab response is available |
| Benign | `isro.gov.in` | clean intel → low lexical score → normal behavior | `ALLOW` with “why allowed” evidence |
| DGA-style | `xq9m2kz7v4na.com` | lexical feature signals → aggregator | `FLAG` or `BLOCK` only when corroborated |
| Typosquat | `gooogle.com` | Levenshtein brand proximity | `FLAG` unless corroborated to a block threshold |
| Cache | repeat any prior query | Redis cache hit | same verdict; no downstream pipeline calls |
| Quarantined device | query benign name from a quarantined lab address | quarantine stage fires | at least `FLAG`; explanation cites lab isolation |

- [ ] Confirm each event is visible in dashboard live stream.
- [ ] Confirm each event is persisted through `GET /v1/events`.
- [ ] Confirm threat-intel block gives a specific source, not a generic “blocked”.
- [ ] Confirm an ALLOW explains clean intel, benign lexical result, and normal behavior.

## 3. DNS protocol path

- [ ] UDP: issue `Resolve-DnsName` against `127.0.0.1` port `5353` for benign and known-bad domains.
- [ ] TCP DNS: use a DNS client capable of TCP against port `5353`.
- [ ] DoH: send RFC 8484 `application/dns-message` POST and DNS GET request to `https://localhost:8443/dns-query` using the development certificate override.
- [ ] DoT: use `kdig`, `drill`, or another TLS DNS client against `localhost:8853` with the development CA.
- [ ] Invalid/malformed DoH wire request returns HTTP 400, not a crash.
- [ ] Resolver forwards to upstream if the gateway is intentionally unavailable.
- [ ] With the default configuration, verify gateway fallback reaches `mock-dns`, making this degradation drill independent of external internet DNS.

Evidence: save DNS response code/answer and gateway event ID for each protocol.

## 4. Threat-intelligence path

- [ ] Seed indicator is loaded at service startup and lookup returns a hit.
- [ ] Manual indicator insertion produces a valid STIX 2.1-shaped record.
- [ ] `GET /stix/bundle` returns a STIX bundle with indicators.
- [ ] Run URLhaus ingestion only from an approved network and record indicator count/result.
- [ ] Configure and run OTX only with a user-owned API key; record result.
- [ ] Configure CERT-In only with an approved published indicator source; record result.
- [ ] Configure a team-owned/authorized MISP instance and verify `GET /misp/health` reports reachable without exposing credentials.
- [ ] Review MISP deduplication policy, then explicitly invoke `POST /misp/publish`; record published and failed counts in the evidence log.
- [ ] Confirm no MISP event is created merely by starting the local stack or ingesting a feed.
- [ ] Disconnect threat-intel service after cache warm-up; confirm the resolver keeps serving and report actual behavior.

## 5. ML and XAI path

- [ ] `POST /predict` returns every documented lexical feature.
- [ ] Confirm the feature payload includes entropy, vowel/consonant ratio, length, label count, digit ratio, n-gram rarity, nearest legitimate domain, Levenshtein distance, and WHOIS-cache state.
- [ ] Add an age through `PUT /whois-cache/{domain}`, run `/predict`, and confirm that cache source and young-domain reason are shown without a live WHOIS network call.
- [ ] Verify a missing WHOIS entry produces a neutral “not available” source rather than a failed query.
- [ ] Baseline mode clearly reports `transparent-deterministic-baseline` before artifacts exist.
- [ ] Train DGA and typosquat models from documented labelled datasets.
- [ ] Confirm versioned joblib artifacts and metrics JSON appear in `ml-training/artifacts`.
- [ ] Restart inference and confirm `trained-local-artifact` with the expected model version.
- [ ] Confirm held-out precision/recall/F1 are real training values, never manually entered.
- [ ] Send enough representative queries to compute drift; validate the monitoring endpoint’s feature baseline, recent sample count, and drift indicator.
- [ ] Stop ML service: an ML-only would-be block must become `FLAG`; known threat-intel blocks may remain `BLOCK`.

## 6. Behavioral, reputation, and incident path

Run safe local traffic scenarios with `python infra/simulate.py`.

- [ ] `benign` leaves device risk low and records normal baseline.
- [ ] `dga` increases lexical/device risk.
- [ ] `tunnelling --repeat 2` produces long-label or entropy evidence.
- [ ] Rapid repeated queries produce a volume anomaly after configured threshold.
- [ ] Multi-TLD simulation produces fan-out evidence.
- [ ] `GET /v1/devices/{ip}` shows risk history/timeline.
- [ ] `GET /v1/domains/{domain}` shows first/last seen, query count, device count, and parent-domain context.
- [ ] Multiple signals become one Incident with an ordered timeline and plain-language summary.
- [ ] Device risk decays after normal traffic; record observed before/after values.

## 7. Response and honeypot path — lab only

- [ ] Known malicious domain invokes sinkhole lifecycle and returns only configured lab sinkhole IP.
- [ ] Sinkhole telemetry from a lab prefix is accepted and audited.
- [ ] Telemetry from outside configured lab prefix returns HTTP 403.
- [ ] Repeated sinkhole telemetry produces review-only signature suggestions.
- [ ] Critical simulated lab device is quarantined; `GET /v1/quarantine` shows policy state.
- [ ] Repeating quarantine request is idempotent.
- [ ] Dashboard/API release removes virtual policy state.
- [ ] Audit log includes activate, observe, quarantine, and release actions.
- [ ] Confirm no host iptables/nftables/network setting changed.

## 8. Passive forensics path

- [ ] Upload a valid Zeek DNS TSV with `#fields`; extracted queries retain the origin IP.
- [ ] Upload a simplified Zeek TSV fallback file.
- [ ] Upload valid PCAP and PCAPNG with UDP/53 DNS queries.
- [ ] Upload malformed capture: returns controlled parser error, not service failure.
- [ ] Each extracted domain is replayed through `/v1/query` and returned with a verdict/XAI result.
- [ ] Confirm passive events are marked `passive-zeek` or `passive-pcap` in analytics.
- [ ] Explicitly note that encrypted DoH/DoT cannot be decoded from network capture without endpoint logs.

## 9. Dashboard and analyst workflow

- [ ] Live stream updates after new query.
- [ ] Verify 24-hour ALLOW/FLAG/BLOCK/incident summary cards agree with `GET /v1/stats`.
- [ ] Click an event and confirm the XAI panel lists its ordered pipeline stages, status, score contribution, and reason.
- [ ] Click an event and confirm the reputation card loads both its device profile and parent-domain context.
- [ ] XAI panel displays pipeline stages and feature evidence for ALLOW, FLAG, and BLOCK.
- [ ] Passive upload UI displays extraction count/result.
- [ ] Feed-health panel reflects configured/not-configured state.
- [ ] Three.js globe renders and arcs appear for blocked events.
- [ ] Incident timeline renders correlated event sequence.
- [ ] `False Positive`, `Confirmed Threat`, and `Needs Investigation` feedback persists via API.
- [ ] Confirm each virtual-lab quarantine is displayed with its reason and the dashboard **Release** action removes it.
- [ ] Model monitoring values clearly state unavailable until trained; no fabricated metrics.

## 10. Performance and resilience evidence

- [ ] Warm-cache latency: measure p50/p95/p99 with a documented tool/configuration.
- [ ] Cold-cache latency: measure p50/p95/p99 separately.
- [ ] Sustained query rate: run controlled lab load test and record QPS, CPU, memory, errors.
- [ ] Compare measured p99 with the `<100ms` target; do not claim pass without evidence.
- [ ] Stop threat-intel, ML, behavioral, geo, analytics, and active-response one at a time.
- [ ] For each outage, record DNS result, verdict behavior, `degraded_dependencies`, and recovery action.
- [ ] Confirm optional intelligence plane is absent/disabled and cannot affect detection.

## 11. Final demo acceptance path

- [ ] Start with the dashboard URL and API docs visible.
- [ ] Demonstrate a known-bad block plus XAI explanation.
- [ ] Demonstrate a DGA-style lexical decision.
- [ ] Demonstrate passive PCAP/Zeek replay.
- [ ] Demonstrate correlated incident and lab-only response/release.
- [ ] Demonstrate blocked-event globe arc.
- [ ] Display actual model/latency/resilience evidence, or honestly state it remains pending.
- [ ] Verify QR URL only after approved HTTPS hosting is live.
