import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = {
    status: "ok",
    mode: process.env.DATA_MODE ?? "MOCK",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    timestamp: new Date().toISOString(),
  };

  logger.info({ event_type: "health_check", mode: body.mode, version: body.version });

  return NextResponse.json(body);
}
