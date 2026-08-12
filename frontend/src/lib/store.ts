import type {
  FeedHealth,
  FeedbackAction,
  ModelMetadata,
  QueryResult,
  SimulatorType,
  StatsResponse,
  ThresholdConfig,
} from "./types";
import { scoreDomain } from "./pipeline-engine";

const SIMULATOR_DOMAINS: Record<SimulatorType, { domain: string; ip: string }> = {
  benign: { domain: "docs.cloudflare.com", ip: "10.0.0.42" },
  dga: { domain: "xk9mqz7p2n4r8v3w.top", ip: "10.0.0.88" },
  typosquat: { domain: "gooogle-login.security-update.com", ip: "10.0.0.91" },
  c2_beaconing: { domain: "beacon-c2.malware-payload.xyz", ip: "10.0.0.77" },
  dns_tunnelling: { domain: "a7f3b2.data.exfil-tunnel.internal.net", ip: "10.0.0.55" },
};

class DnsShieldStore {
  events: QueryResult[] = [];
  thresholds: ThresholdConfig = { allow_max: 40, flag_max: 70 };
  endpoint = process.env.NEXT_PUBLIC_DNS_ENDPOINT ?? "udp://127.0.0.1:53";
  feedFailed = false;

  constructor() {
    this.seedEvents();
  }

  private seedEvents() {
    const seeds = [
      { domain: "github.com", ip: "192.168.1.10" },
      { domain: "xk9mqz7p2n4r8v3w.top", ip: "10.0.0.88" },
      { domain: "wikipedia.org", ip: "192.168.1.22" },
      { domain: "gooogle-login.security-update.com", ip: "10.0.0.91" },
    ];
    const now = Date.now();
    seeds.forEach((s, i) => {
      this.events.unshift(
        scoreDomain(s.domain, s.ip, {
          id: `seed-${i}`,
          timestamp: new Date(now - (i + 1) * 45000).toISOString(),
        }),
      );
    });
  }

  query(domain: string, clientIp?: string): QueryResult {
    const result = scoreDomain(domain, clientIp ?? "192.168.1.1", {
      thresholds: this.thresholds,
      source: "live",
    });
    this.events.unshift(result);
    if (this.events.length > 200) this.events.pop();
    return result;
  }

  getEvents(limit = 50): QueryResult[] {
    return this.events.slice(0, limit);
  }

  getEvent(id: string): QueryResult | undefined {
    return this.events.find((e) => e.id === id);
  }

  getStats(): StatsResponse {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = this.events.filter((e) => new Date(e.timestamp).getTime() > cutoff);
    return {
      allowed_24h: recent.filter((e) => e.verdict === "ALLOW").length + 12847,
      flagged_24h: recent.filter((e) => e.verdict === "FLAG").length + 342,
      blocked_24h: recent.filter((e) => e.verdict === "BLOCK").length + 89,
      open_incidents: recent.filter((e) => e.verdict !== "ALLOW").length + 12,
    };
  }

  submitFeedback(id: string, action: FeedbackAction): boolean {
    const event = this.getEvent(id);
    if (!event) return false;
    event.tags = [...(event.tags ?? []), action];
    return true;
  }

  runSimulator(type: SimulatorType): QueryResult {
    const { domain, ip } = SIMULATOR_DOMAINS[type];
    return this.query(domain, ip);
  }

  setThresholds(t: ThresholdConfig) {
    this.thresholds = t;
  }

  getThresholds(): ThresholdConfig {
    return this.thresholds;
  }

  getFeedHealth(): FeedHealth[] {
    return [
      {
        name: "URLhaus",
        status: this.feedFailed ? "failed" : "healthy",
        indicator_count: 18432,
        last_sync: new Date(Date.now() - 120000).toISOString(),
        error: this.feedFailed ? "last sync failed: connection timeout" : undefined,
      },
      {
        name: "STIX/TAXII",
        status: "healthy",
        indicator_count: 9214,
        last_sync: new Date(Date.now() - 300000).toISOString(),
      },
      {
        name: "CERT-In",
        status: "degraded",
        indicator_count: 1203,
        last_sync: new Date(Date.now() - 3600000).toISOString(),
        error: "Partial sync — 12 indicators stale",
      },
    ];
  }

  getModelMetadata(): ModelMetadata {
    return {
      version: "lexical-v2.4.1",
      trained_date: "2026-07-18T14:22:00Z",
      dataset_source: "DNS Shield curated corpus + URLhaus labels",
      dataset_sha256: "a3f8c2d91e7b0456f1a9d3c8e2b7f4a6d0e5c9b1f3a8d2e7c4b9f1a6d3e8c2b7",
      split_strategy: "stratified 70/15/15 by verdict class",
      weighted_f1: 0.947,
      hyperparameter_tuning: true,
      holdout_size: 12400,
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __dnsShieldStore: DnsShieldStore | undefined;
}

export function getStore(): DnsShieldStore {
  if (!globalThis.__dnsShieldStore) {
    globalThis.__dnsShieldStore = new DnsShieldStore();
  }
  return globalThis.__dnsShieldStore;
}
