import { NextResponse } from "next/server";

export const runtime = "edge";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      mode: process.env.DATA_MODE ?? "MOCK",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
