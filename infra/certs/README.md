# Local resolver TLS certificates

DoH and DoT intentionally remain disabled unless these two local-only files exist:

- `infra/certs/tls.crt`
- `infra/certs/tls.key`

For a development-only certificate, run this from the repository root after Docker setup is ready:

```powershell
openssl req -x509 -newkey rsa:2048 -nodes -keyout infra/certs/tls.key -out infra/certs/tls.crt -days 30 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

Never commit these files. They are ignored by `.gitignore`. For hosted deployment, terminate TLS through a reviewed ingress or use a certificate for a domain you control.

