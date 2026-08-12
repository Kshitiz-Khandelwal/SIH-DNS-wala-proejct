# Kubernetes deployment baseline

`base.yaml` provides a private-by-default starting point for core data services and the Python/dashboard application services. It deliberately does **not** include a public Ingress, LoadBalancer, DNS Service, real images, persistent-volume class, valid TLS certificate, or production secret values.

## Before applying anything

1. Obtain explicit user approval for the target cluster, cost, public exposure, and network design.
2. Replace every `ghcr.io/example/dns-shield/*:REPLACE_ME` value with an immutable image produced by CI.
3. Replace `dns-shield-secrets-template` with managed-secret integration; do not apply its placeholder value.
4. Replace `emptyDir` persistence for Redis/ClickHouse with approved encrypted PVCs and backup policy.
5. Add narrow NetworkPolicy allow rules. `network-policy.yaml` is intentionally default-deny and will block all traffic if applied alone.
6. Design resolver UDP/TCP/DoH/DoT exposure separately. Do not expose a public resolver by default.

## Validation after approval

```powershell
kubectl apply --dry-run=client -f infra/k8s/base.yaml
kubectl apply --dry-run=client -f infra/k8s/network-policy.yaml
```

Only after deployment approval should an operator apply manifests, configure private service-to-service routing, then run `TEST_PLAN.md` in the cluster. Kubernetes is an optional deployment path; Docker Compose remains the local demo baseline.
