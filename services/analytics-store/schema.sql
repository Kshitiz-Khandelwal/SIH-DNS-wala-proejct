CREATE DATABASE IF NOT EXISTS dns_shield;
CREATE TABLE IF NOT EXISTS dns_shield.events (
  event_id String, timestamp DateTime64(3), domain String, client_ip String, verdict String,
  domain_risk UInt8, device_risk UInt8, confidence String, reasons String, target_ip String,
  source String, geo_json String
) ENGINE = MergeTree ORDER BY (timestamp, domain);
CREATE TABLE IF NOT EXISTS dns_shield.feedback (
  event_id String, label String, analyst String, timestamp DateTime64(3)
) ENGINE = MergeTree ORDER BY timestamp;

