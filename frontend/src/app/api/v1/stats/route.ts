import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getStore().getStats());
}
