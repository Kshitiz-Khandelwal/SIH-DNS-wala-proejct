# Observability and evidence collection

## Correlation IDs

Every gateway response includes `X-Correlation-ID`. Clients may supply their own value in that header, allowing one dashboard/API request to be followed through reverse-proxy logs and gateway output later. The gateway also returns `X-Response-Time-Ms`.

## Gateway metrics

`GET /metrics` emits Prometheus-compatible plain text:

- completed requests by method/status;
- pipeline verdict totals;
- requests that observed degraded dependencies;
- p50/p95/p99 response-time samples from the current in-process window.

Metrics are protected by `GATEWAY_API_KEY` by default. Set `METRICS_PUBLIC=true` only if the endpoint is isolated on a private monitoring network. These metrics reset on gateway restart and are a local/demo baseline; long-term production metrics need an external collector such as Prometheus.

## Recommended evidence during testing

For every significant test, retain timestamp, scenario, correlation ID, event ID, gateway response, resolver response, and relevant Compose logs. Use actual measured metrics—not dashboard labels—as performance evidence.

