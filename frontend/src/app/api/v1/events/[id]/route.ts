import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8081";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/events/${encodeURIComponent(decodedId)}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        id: data.event_id || data.id || decodedId,
        domain: data.domain || decodedId,
        client_ip: data.client_ip || "192.168.1.50",
        risk_score: data.domain_risk ?? data.risk_score ?? 0,
        verdict: data.verdict || "ALLOW",
        pipeline: data.pipeline || [],
        ml: data.ml,
        behavior: data.behavior,
        reasons: data.reasons || [],
        timestamp: data.timestamp || new Date().toISOString(),
        raw: data,
      });
    }
  } catch (err) {
    console.error("Gateway single event lookup failed", err);
  }

  // Fallback to evaluating domain on live gateway
  try {
    const queryRes = await fetch(`${GATEWAY_URL}/api/v1/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: decodedId, client_ip: "192.168.1.50" }),
      cache: "no-store",
    });
    if (queryRes.ok) {
      const data = await queryRes.json();
      return NextResponse.json({
        id: data.event_id || decodedId,
        domain: data.domain || decodedId,
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
  } catch {}

  return NextResponse.json({ error: "Event not found" }, { status: 404 });
}
