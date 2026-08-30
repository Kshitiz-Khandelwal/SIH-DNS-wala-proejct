import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8081";

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/config`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {}

  return NextResponse.json({ endpoint: "udp://127.0.0.1:53", gateway_url: GATEWAY_URL, version: "1.2.0" });
}
