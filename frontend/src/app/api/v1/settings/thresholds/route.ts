import { NextResponse } from "next/server";
import type { ThresholdConfig } from "@/lib/types";
import { getStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getStore().getThresholds());
}

export async function PUT(request: Request) {
  const body = (await request.json()) as ThresholdConfig;
  getStore().setThresholds(body);
  return NextResponse.json(getStore().getThresholds());
}
