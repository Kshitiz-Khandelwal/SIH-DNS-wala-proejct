import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8081";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const clientIp = searchParams.get("client_ip") ?? "192.168.1.50";
  if (!domain?.trim()) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: domain.trim(), client_ip: clientIp }),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        id: data.event_id || `ev-${Date.now()}`,
        domain: data.domain,
        client_ip: data.client_ip || clientIp,
        risk_score: data.domain_risk ?? 0,
        verdict: data.verdict || "ALLOW",
        pipeline: data.pipeline || [],
        ml: data.ml,
        behavior: data.behavior,
        reasons: data.reasons || [],
        timestamp: new Date().toISOString(),
        raw: data,
      });
    }
  } catch {
    // Fallback to local store if gateway is offline
  }

  const result = getStore().query(domain.trim(), clientIp);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { domain?: string; client_ip?: string };
  if (!body.domain?.trim()) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  const clientIp = body.client_ip || "192.168.1.50";

  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: body.domain.trim(), client_ip: clientIp }),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        id: data.event_id || `ev-${Date.now()}`,
        domain: data.domain,
        client_ip: data.client_ip || clientIp,
        risk_score: data.domain_risk ?? 0,
        verdict: data.verdict || "ALLOW",
        pipeline: data.pipeline || [],
        ml: data.ml,
        behavior: data.behavior,
        reasons: data.reasons || [],
        timestamp: new Date().toISOString(),
        raw: data,
      });
    }
  } catch {
    // Fallback to local store if gateway is offline
  }

  const result = getStore().query(body.domain.trim(), clientIp);
  return NextResponse.json(result);
}
