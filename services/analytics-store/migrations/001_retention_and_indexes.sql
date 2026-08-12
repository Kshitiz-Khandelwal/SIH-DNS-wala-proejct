-- DNS Shield ClickHouse migration 001
-- Apply only after reviewing your data-retention requirements. This is not mounted
-- automatically by Compose because ALTER TABLE changes existing data semantics.

ALTER TABLE dns_shield.events
    ADD INDEX IF NOT EXISTS idx_verdict verdict TYPE set(3) GRANULARITY 4;

ALTER TABLE dns_shield.events
    ADD INDEX IF NOT EXISTS idx_client_ip client_ip TYPE bloom_filter(0.01) GRANULARITY 4;

-- Retain security-event evidence for 90 days in the demo baseline.
-- Replace the interval only after an approved retention-policy decision.
ALTER TABLE dns_shield.events
    MODIFY TTL timestamp + INTERVAL 90 DAY;

ALTER TABLE dns_shield.feedback
    MODIFY TTL timestamp + INTERVAL 180 DAY;

