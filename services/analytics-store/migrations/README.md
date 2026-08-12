# ClickHouse migrations

`schema.sql` bootstraps a clean local database. SQL in this directory changes an existing database and is intentionally **not** run automatically at container start.

## Apply after approval

After the user approves execution and the 90/180-day policy in `infra/DATA_RETENTION.md`, run the migration from a reviewed operator terminal:

```powershell
Get-Content -Raw services/analytics-store/migrations/001_retention_and_indexes.sql | docker compose -f infra/docker-compose.yml exec -T clickhouse clickhouse-client --multiquery
```

## Validate after applying

```powershell
docker compose -f infra/docker-compose.yml exec clickhouse clickhouse-client --query "SHOW CREATE TABLE dns_shield.events"
docker compose -f infra/docker-compose.yml exec clickhouse clickhouse-client --query "SHOW CREATE TABLE dns_shield.feedback"
```

Confirm the expected TTL expression and data-skipping indexes appear. Test on non-production data first; ClickHouse TTL cleanup happens asynchronously, so it is not an immediate deletion mechanism.

