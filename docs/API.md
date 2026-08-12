# SIEM API

The gateway serves interactive OpenAPI documentation at `/docs` and its machine-readable document at `/openapi.json`.

- `POST /v1/query` — shared active/passive deterministic pipeline.
- `GET /v1/events`, `GET /v1/devices/{ip}`, `GET /v1/domains/{domain}`, `GET /v1/incidents` — SOC/SIEM data.
- `POST /v1/events/{event_id}/feedback` — analyst labels.
- `POST /v1/passive/zeek`, `POST /v1/passive/pcap` — offline extraction.
- `GET /v1/feed-health`, `GET/DELETE /v1/quarantine` — operational health and lab response.

Threat intelligence also provides `GET /misp/health` and operator-triggered `POST /misp/publish`. Set `MISP_URL` and `MISP_API_KEY` in your environment only for a MISP instance your team owns or is authorized to use. Publishing changes state in that external MISP instance; it is intentionally never automatic.
