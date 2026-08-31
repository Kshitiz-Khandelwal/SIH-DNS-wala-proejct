import { NextResponse } from "next/server";

const FORECAST_URL = process.env.FORECAST_SERVICE_URL || "http://localhost:8007";

export async function GET() {
  try {
    const res = await fetch(`${FORECAST_URL}/forecast/hosts`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Forecast hosts error: ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: true, hosts: [] }, { status: 502 });
  }
}
