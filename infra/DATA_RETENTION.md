# Data retention and forensic-storage policy

This is a demo-safe baseline. It prevents unbounded storage growth and makes clear what data is retained before a production deployment is considered.

| Data | Store | Default retention | Reason |
|---|---|---:|---|
| DNS security events | ClickHouse `events` | 90 days | Forensic investigation and demo trend views |
| Analyst feedback | ClickHouse `feedback` / Redis feedback state | 180 days | Retraining-label review |
| Device/domain profiles, incidents, response audits | Redis | 90 days / configured TTL | Operational correlation state |
| Sinkhole telemetry | Redis | 30 days / configured TTL | Lab-only signature review |
| Uploaded PCAP/Zeek source file | None | 0 days | Files are parsed in memory and are not persisted by this code |
| Extracted passive-analysis events | ClickHouse | 90 days | Same forensic policy as live events |

## Operator responsibilities

- Confirm the retention periods with the event owner before a real deployment.
- Do not upload PCAPs containing data outside the lab without authorization.
- Configure a ClickHouse backup before depending on retained evidence.
- If retention is changed, add an actual ClickHouse TTL migration and test it against non-production data.

## Current implementation note

Redis expiry is configured in the relevant services. For an existing ClickHouse database, `services/analytics-store/migrations/001_retention_and_indexes.sql` adds the approved baseline TTLs and data-skipping indexes. It is intentionally operator-applied rather than automatic. Clean local database bootstraps also create an hourly aggregate materialized view for future dashboard performance work.
