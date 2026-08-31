import { NextRequest, NextResponse } from "next/server";

const FORECAST_URL = process.env.FORECAST_SERVICE_URL || "http://localhost:8007";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "ENGAGE";
    const body = { action: action === "ENGAGE" ? "TRIP" : "RELEASE", reason: "Manual SOC operator toggle" };

    const res = await fetch(`${FORECAST_URL}/hardware/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ engaged: false, error: err.message }, { status: 502 });
  }
}

export async function GET() {
  try {
    const res = await fetch(`${FORECAST_URL}/hardware/relay`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ engaged: false, error: err.message }, { status: 502 });
  }
}
