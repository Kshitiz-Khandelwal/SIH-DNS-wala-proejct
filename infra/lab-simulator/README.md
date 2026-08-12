# Docker lab simulations

These are one-shot, named traffic-generation containers. They only send HTTPS/HTTP API requests to the `api-gateway` service on the Docker lab network; they do not query external domains, send DNS traffic to the internet, or alter any networking state.

They are assigned the Compose `simulation` profile, so normal `docker compose up` does not launch them. After test execution is approved and the base stack is healthy, trigger one scenario at a time:

```powershell
docker compose -f infra/docker-compose.yml --profile simulation run --rm simulation-benign
docker compose -f infra/docker-compose.yml --profile simulation run --rm simulation-dga
docker compose -f infra/docker-compose.yml --profile simulation run --rm simulation-tunnelling
docker compose -f infra/docker-compose.yml --profile simulation run --rm simulation-c2
docker compose -f infra/docker-compose.yml --profile simulation run --rm simulation-typosquat
```

The C2 scenario causes the gateway to create virtual sinkhole state. For actual HTTP telemetry, issue a harmless request from an attached lab test client to the lab honeypot after observing the sinkhole decision; it is never automatically sent to an external endpoint.

