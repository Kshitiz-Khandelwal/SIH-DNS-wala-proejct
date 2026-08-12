import { NextResponse } from "next/server";
import type { SimulatorType } from "@/lib/types";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { type?: SimulatorType };
  if (!body.type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }
  const result = getStore().runSimulator(body.type);
  return NextResponse.json(result);
}
