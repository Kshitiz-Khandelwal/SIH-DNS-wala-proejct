# Continuous integration quality gate

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on pushes and pull requests to `main` or `master`. It does not deploy, contact threat feeds, publish to MISP, expose DNS publicly, or start the complete runtime stack.

| CI job | What it validates | What it does not prove |
|---|---|---|
| Compose configuration | Compose syntax, environment interpolation, service topology | Containers actually start or pass integration tests |
| Python syntax | Python source compiles | Imports, database access, API behavior |
| Go resolver build | Resolver dependencies compile and Go tests execute | UDP/DoH/DoT works against a real client |
| Dashboard build | Next.js dependency/build compatibility | Browser interactions and API CORS behavior |
| Container builds | Dockerfiles can build images | End-to-end service health or performance |

Runtime, security, load, and resilience evidence remains governed by `TEST_PLAN.md` and must be obtained in an approved lab environment.

## Before enabling CI

- Ensure this folder is pushed to a GitHub repository with Actions enabled.
- Never add real `.env`, TLS keys, MaxMind databases, feed keys, or MISP credentials to the repository.
- Review third-party dependency/license policy before using CI output as release approval.
- Treat CI failure as a reason to inspect/fix the relevant code; treat CI success as a basic build gate, not proof of DNS-security effectiveness.

