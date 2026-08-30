import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8081";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  // 1. Try local memory store
  const event = getStore().getEvent(decodedId);
  if (event) {
    return NextResponse.json(event);
  }

  // 2. Try to query backend by domain or ID
  const domainToQuery = decodedId.startsWith("sim-") || decodedId.startsWith("eval-") 
    ? decodedId.split("-").slice(2).join("-") || decodedId
    : decodedId;

  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: domainToQuery, client_ip: "192.168.1.50" }),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        id: data.event_id || decodedId,
        domain: data.domain || domainToQuery,
        client_ip: data.client_ip || "192.168.1.50",
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
    // If gateway unavailable, generate on-the-fly evaluation
  }

  const generated = getStore().query(domainToQuery);
  return NextResponse.json({ ...generated, id: decodedId });
}
