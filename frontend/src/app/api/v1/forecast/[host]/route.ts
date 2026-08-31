import { NextRequest, NextResponse } from "next/server";

const FORECAST_URL = process.env.FORECAST_SERVICE_URL || "http://localhost:8007";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ host: string }> }
) {
  const { host } = await params;
  try {
    const res = await fetch(`${FORECAST_URL}/forecast/${encodeURIComponent(host)}`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Forecast host error: ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: true, message: err.message }, { status: 502 });
  }
}
