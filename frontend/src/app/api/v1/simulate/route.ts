import { NextResponse } from "next/server";
import type { SimulatorType } from "@/lib/types";
import { getStore } from "@/lib/store";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8081";

const SIMULATOR_DOMAINS: Record<SimulatorType, { domain: string; client_ip: string }> = {
  benign: { domain: "isro.gov.in", client_ip: "10.0.4.12" },
  dga: { domain: "xq9m2kz7v4naplq.top", client_ip: "172.28.0.99" },
  typosquat: { domain: "rnicrosoft.com", client_ip: "192.168.1.50" },
  dns_tunnelling: { domain: "YWJjZDEyMzQ1Ng.attacker-c2.net", client_ip: "172.16.4.18" },
  c2_beaconing: { domain: "xkq982-c2-beacon.ru", client_ip: "10.200.1.77" },
};

export async function POST(request: Request) {
  const body = (await request.json()) as { type?: SimulatorType };
  if (!body.type || !SIMULATOR_DOMAINS[body.type]) {
    return NextResponse.json({ error: "valid simulator type is required" }, { status: 400 });
  }

  const simConfig = SIMULATOR_DOMAINS[body.type];

  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: simConfig.domain, client_ip: simConfig.client_ip }),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        id: data.event_id || `sim-${Date.now()}`,
        domain: data.domain,
        client_ip: data.client_ip || simConfig.client_ip,
        risk_score: data.domain_risk ?? (body.type === "benign" ? 0 : body.type === "dga" ? 95 : 75),
        verdict: data.verdict || (body.type === "benign" ? "ALLOW" : "BLOCK"),
        pipeline: data.pipeline || [],
        ml: data.ml,
        behavior: data.behavior,
        reasons: data.reasons || [],
        timestamp: new Date().toISOString(),
        source: "simulator",
        raw: data,
      });
    }
  } catch {
    // Fallback to local store if gateway is offline
  }

  const result = getStore().runSimulator(body.type);
  return NextResponse.json(result);
}
