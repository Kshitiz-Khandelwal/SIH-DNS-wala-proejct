# Gateway access control and rate limits

The API gateway supports two controls at its public boundary:

1. `GATEWAY_API_KEY` — when set, every endpoint except `/health` and documentation requires the matching `X-DNS-Shield-Key` request header.
2. `GATEWAY_RATE_LIMIT_PER_MINUTE` — Redis-backed fixed-window request limit applied per client IP.

## Local development

Leave `GATEWAY_API_KEY` empty only in the isolated Docker demo. Responses intentionally carry `X-DNS-Shield-Auth: disabled-local-development-only` to make that state obvious.

## Hosted deployment

Set a random secret through managed secret storage, set restrictive `CORS_ORIGINS`, and configure the dashboard/server-side integration to use the API key. Prefer a reviewed identity-aware reverse proxy for human dashboard access; an API key is a minimum service-to-service control, not full multi-user authentication.

Never enable `TRUST_PROXY_HEADERS=true` unless the gateway is reachable only from a reverse proxy that overwrites inbound forwarding headers. Otherwise clients can forge their apparent IP and bypass per-IP limits.

## Availability behavior

If Redis is unavailable, rate limiting is marked degraded and requests still proceed so the resolver’s availability policy is preserved. This should trigger monitoring/incident review in a real deployment.

