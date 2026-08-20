# Behavioral & Tunnelling Engine

The **Behavioral Engine** is a stateful microservice (FastAPI + Redis) that aggregates DNS requests over sliding temporal windows to detect complex evasion techniques, primarily DNS tunnelling and slow-drip DGA.

While the Machine Learning Engine evaluates domains *independently* (lexical analysis), the Behavioral Engine looks at the *host's context*.

## Sliding Window Analytics

We maintain a rolling window of recent queries per IP address (`BEHAVIOR_WINDOW_SECONDS`, default: 60s). Every incoming query is appended, and expired queries are pruned.

The engine computes the following metrics over the window:
1. **Query Volume**: Total requests inside the window.
2. **Average Label Length**: Mean length of the leftmost subdomain label.
3. **NXDOMAIN Ratio**: Fraction of queries that resulted in a `NXDOMAIN` (Non-Existent Domain) response.
4. **Unique TLDs & Parent Domains**: Fan-out metrics to detect scanning.

## Encoding Signatures

DNS tunnelling often encodes data (like IP headers or file contents) in the subdomain. We run regex heuristics on the leftmost label to catch:
- **Base64 Signatures**: `[A-Za-z0-9+/=]{40,}` (Contribution: +40 Risk)
- **Hex Signatures**: `[A-Fa-f0-9]{30,}` (Contribution: +40 Risk)
- **High Entropy**: Shannon Entropy > 4.1 (Contribution: +10 Risk)

## Risk Thresholds & Actions

Risk scores are capped at `100` and decay automatically as clean queries push anomalies out of the sliding window. A device's baseline risk decays by 8% per query (`old_risk * 0.92`) before adding new contributions.

| Device Risk Score | Status Label | Action Triggered by API Gateway |
| ----------------- | ------------ | ------------------------------- |
| **0 - 49**        | `CLEAN`      | `ALLOW`                         |
| **50 - 69**       | `ELEVATED`   | `ALLOW` (Monitored)             |
| **70 - 79**       | `HIGH`       | `FLAG` (Alert generated)        |
| **80 - 100**      | `CRITICAL`   | `BLOCK` (Sinkholed immediately) |

### Common Trigger Paths
- **High Volume (50+ qps)** + **Long Average Label (> 25)** = `25 + 30 = 55` (Elevated)
- **Hex Encoding** + **High NXDOMAIN Ratio (> 50%)** = `40 + 45 = 85` (**BLOCK**)
- **Threat Intel Hit** + **Base64 Signature** = `35 + 40 = 75` (**FLAG**)

## State Management

Incidents are constructed by correlating these signals. The engine stores active incidents in Redis for a configurable TTL (default 90 days), linking parent domains, IP addresses, and exact temporal timestamps. If Redis goes down, it falls back to an in-memory `LOCAL_INCIDENTS` dictionary.
