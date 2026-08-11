# Deployment security checklist

Complete this before enabling a hosted demo:

- [ ] Set restrictive `CORS_ORIGINS` to the final dashboard URL; never use `*` for an operator API.
- [ ] Put the gateway/dashboard behind HTTPS and add authentication before allowing external access.
- [ ] Restrict resolver UDP 53, DoH 443, and DoT 853 to approved source networks. Do not operate an open public resolver.
- [ ] Keep ClickHouse, Redis, behavioral, geo, response, and analytics services private to the container network.
- [ ] Obtain and mount only a licensed MaxMind database. Keep OTX and MISP keys in secret storage, never source control.
- [ ] Review feed terms and test malformed PCAP/Zeek upload limits before a public demo.
- [ ] Confirm active response remains lab-only; do not attach it to host firewall permissions or a production subnet.
- [ ] Record actual load, quality, and resilience evidence before stating performance results.

