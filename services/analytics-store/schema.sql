CREATE DATABASE IF NOT EXISTS dns_shield;
CREATE TABLE IF NOT EXISTS dns_shield.events (
  event_id String, timestamp DateTime64(3), domain String, client_ip String, verdict String,
  domain_risk UInt8, device_risk UInt8, confidence String, reasons String, target_ip String,
  source String, geo_json String
) ENGINE = MergeTree ORDER BY (timestamp, domain);
CREATE TABLE IF NOT EXISTS dns_shield.feedback (
  event_id String, label String, analyst String, timestamp DateTime64(3)
) ENGINE = MergeTree ORDER BY timestamp;

-- Clean Docker volumes receive a basic summary table. The analytics service uses the
-- canonical events table for correctness; this view is available for future dashboard
-- aggregate queries after it has received data.
CREATE MATERIALIZED VIEW IF NOT EXISTS dns_shield.events_hourly
ENGINE = SummingMergeTree
ORDER BY (hour, verdict)
AS SELECT toStartOfHour(timestamp) AS hour, verdict, count() AS event_count, sum(domain_risk) AS domain_risk_sum
FROM dns_shield.events
GROUP BY hour, verdict;
