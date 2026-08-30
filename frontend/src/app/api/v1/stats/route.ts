import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8081";

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/stats`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("Gateway stats fetch failed", err);
  }

  return NextResponse.json({
    total_events: 0,
    allowed_24h: 0,
    flagged_24h: 0,
    blocked_24h: 0,
    open_incidents: 0,
    by_verdict: [],
  });
}
