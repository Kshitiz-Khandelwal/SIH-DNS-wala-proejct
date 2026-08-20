import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const clientIp = searchParams.get("client_ip") ?? undefined;
  if (!domain?.trim()) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }
  const result = getStore().query(domain.trim(), clientIp);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { domain?: string; client_ip?: string };
  if (!body.domain?.trim()) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }
  const result = getStore().query(body.domain.trim(), body.client_ip);
  return NextResponse.json(result);
}
