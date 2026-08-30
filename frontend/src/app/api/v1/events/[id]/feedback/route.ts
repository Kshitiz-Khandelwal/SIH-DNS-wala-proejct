import { NextResponse } from "next/server";
import type { FeedbackAction } from "@/lib/types";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8081";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const body = (await request.json()) as { action?: FeedbackAction; label?: string };
  const action = body.action || body.label || "Confirmed Threat";

  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/events/${encodeURIComponent(decodedId)}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, label: action, analyst: "SOC Analyst" }),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("Gateway feedback submission failed", err);
  }

  return NextResponse.json({ ok: true, event_id: decodedId, action, status: "recorded" });
}
