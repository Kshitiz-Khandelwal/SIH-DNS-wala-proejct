# SIEM API

The gateway serves interactive OpenAPI documentation at `/docs` and its machine-readable document at `/openapi.json`.

- `POST /v1/query` — shared active/passive deterministic pipeline.
- `GET /v1/events`, `GET /v1/devices/{ip}`, `GET /v1/domains/{domain}`, `GET /v1/incidents` — SOC/SIEM data.
- `POST /v1/events/{event_id}/feedback` — analyst labels.
- `POST /v1/passive/zeek`, `POST /v1/passive/pcap` — offline extraction.
- `GET /v1/feed-health`, `GET/DELETE /v1/quarantine` — operational health and lab response.
