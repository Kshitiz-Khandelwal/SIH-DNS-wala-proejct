import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8081";

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/settings/thresholds`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("Gateway get thresholds failed", err);
  }

  return NextResponse.json({
    block_threshold: 71,
    flag_threshold: 41,
    quarantine_device_risk: 80,
    cache_ttl_seconds: 300,
  });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${GATEWAY_URL}/api/v1/settings/thresholds`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("Gateway update thresholds failed", err);
  }

  return NextResponse.json({ error: "Failed to update thresholds on gateway" }, { status: 500 });
}
