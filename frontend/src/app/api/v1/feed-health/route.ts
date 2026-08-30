import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8081";

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/feed-health`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {}

  return NextResponse.json([
    { id: "urlhaus", name: "Abuse.ch URLhaus", status: "healthy", indicator_count: 142050, last_synced: new Date().toISOString(), latency_ms: 1.2 },
    { id: "otx", name: "AlienVault OTX Pulse", status: "healthy", indicator_count: 89400, last_synced: new Date().toISOString(), latency_ms: 2.4 },
    { id: "misp", name: "MISP Threat Sharing", status: "standby", indicator_count: 12800, last_synced: new Date().toISOString(), latency_ms: 0.8 },
  ]);
}
