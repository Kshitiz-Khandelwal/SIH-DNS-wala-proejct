import { NextRequest, NextResponse } from "next/server";

const FLOW_INGEST_URL = process.env.FLOW_INGEST_URL || process.env.FLOW_SERVICE_URL || "http://localhost:8006";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ detail: "No file provided" }, { status: 400 });
    }

    const forwardData = new FormData();
    forwardData.append("file", file);

    const res = await fetch(`${FLOW_INGEST_URL}/flow/pcap`, {
      method: "POST",
      body: forwardData,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "PCAP ingest failed" }, { status: 502 });
  }
}
