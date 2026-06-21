import { NextResponse } from "next/server";
import { getAIStatus } from "@/lib/ai/server";

export function GET() {
  return NextResponse.json(getAIStatus());
}
