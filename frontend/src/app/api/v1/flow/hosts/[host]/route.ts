import { NextRequest, NextResponse } from "next/server";

const FLOW_INGEST_URL = process.env.FLOW_INGEST_URL || "http://localhost:8006";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ host: string }> }
) {
  const { host } = await params;
  try {
    const res = await fetch(`${FLOW_INGEST_URL}/flow/hosts/${encodeURIComponent(host)}`, {
      method: "DELETE",
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: true, message: err.message }, { status: 502 });
  }
}
