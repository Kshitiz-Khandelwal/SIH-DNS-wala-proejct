import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { domain?: string; client_ip?: string };
  if (!body.domain?.trim()) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }
  const result = getStore().query(body.domain.trim(), body.client_ip);
  return NextResponse.json(result);
}
