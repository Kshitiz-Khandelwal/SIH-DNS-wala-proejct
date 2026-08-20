# DNS Shield — Security & Privacy Policy

> **Status**: Policies defined `[IMPLEMENTED ✅]`. Enforced by default configurations.

## 1. TLS Certificate Management

DNS Shield intercepts secure DNS requests (DoH, DoT) acting as a recursive proxy. To perform Deep Packet Inspection (DPI) and Machine Learning (ML) inference, the traffic must be decrypted.

### Enterprise Strategy
In an enterprise environment, DNS Shield must be issued a certificate by the organization's internal Certificate Authority (CA). Endpoints trust the internal root CA, allowing seamless interception of DoH and DoT traffic without breaking the end-to-end trust chain.

### Standalone / Lab Strategy
In a lab or unmanaged environment, DNS Shield uses self-signed certificates. Devices must manually install the DNS Shield Root CA into their trust stores.

## 2. Secrets & Key Management

DNS Shield services require access to API keys (e.g., GeoLite2, third-party threat intel APIs, SOC dashboard auth).

- **Hardcoded Secrets**: No secrets are ever hardcoded in the repository or Dockerfiles.
- **Environment Variables**: All secrets are injected at runtime via an `.env` file or orchestrator secrets management (e.g., Kubernetes Secrets, HashiCorp Vault).
- **.env Policy**: The `.env` file is explicitly ignored in `.gitignore`. A `.env.example` file is provided to document required variables.

## 3. Data Retention & Privacy

DNS data is highly sensitive and contains a comprehensive map of a user's browsing habits.

- **Data Minimization**: The ML inference engine operates synchronously in-memory. Feature extraction happens in memory, and the raw domain string is passed out of scope as soon as a prediction is returned.
- **Anonymization**: IP addresses are enriched with GeoIP data, and the raw client IP is masked in long-term telemetry storage unless a `BLOCK` or `QUARANTINE` event occurs.
- **Retention Period**: Telemetry is maintained in the Analytics Store (ClickHouse) for a rolling 30-day window. Older data is aggregated into hourly threat metrics and the raw DNS query strings are dropped.

## 4. Fail-Open Architecture

The system prioritizes availability over security. 

If any subsystem (Redis, Threat Intel, ML Inference) fails, the API Gateway immediately falls back to local degraded evaluation. If the entire API Gateway becomes unresponsive for >100ms, the Protocol Gateway (CoreDNS) fails open, forwarding traffic to the upstream resolver without inspection. 

This guarantees that a failure in the security stack does not result in an organization-wide network outage. (A strict fail-closed configuration is supported via environment variable toggles for high-security enclaves).

## 5. Vulnerability Disclosure

If you discover a vulnerability in DNS Shield, please report it via the issue tracker using the `security` label, or contact the maintainers directly. DO NOT open a public issue for zero-day vulnerabilities affecting the parsing engines.
