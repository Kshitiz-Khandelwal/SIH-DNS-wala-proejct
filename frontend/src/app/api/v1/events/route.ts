import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8081";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "50";

  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/events?limit=${limit}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("Gateway events fetch failed", err);
  }

  return NextResponse.json([]);
}
