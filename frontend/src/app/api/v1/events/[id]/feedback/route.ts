import { NextResponse } from "next/server";
import type { FeedbackAction } from "@/lib/types";
import { getStore } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { action?: FeedbackAction };
  if (!body.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }
  const ok = getStore().submitFeedback(id, body.action);
  if (!ok) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
