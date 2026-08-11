# Kubernetes deployment path

Use this only after security review. Deploy Redis/ClickHouse with managed or reviewed persistent storage, inject `.env` values as Kubernetes Secrets, and expose the dashboard/API through an HTTPS Ingress. Keep UDP/53, DoH, and DoT on a dedicated resolver Service with a NetworkPolicy; do not make it public until the owner explicitly approves inbound DNS exposure. The local Compose stack is the supported demo baseline.

