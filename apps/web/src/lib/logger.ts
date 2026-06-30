/**
 * Structured JSON logger for the Next.js BFF (server-side only).
 *
 * - Emits JSON in production / CI.
 * - Emits pretty-printed output in development.
 * - All log lines include: timestamp, level, trace_id, event_type, message.
 * - NEVER log HCP names, NPI numbers, or any directly identifying fields.
 *   Pass only hcp_id (UUID), mr_id (UUID) and event metadata.
 */

import pino from "pino";

const isDev = process.env.NODE_ENV === "development";
const logLevel = process.env.LOG_LEVEL ?? (isDev ? "debug" : "info");

export const logger = pino({
  level: logLevel,
  base: { service: "opennba-web" },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
        },
      }
    : {}),
  redact: {
    paths: ["*.name", "*.npi", "*.email", "*.passwordHash"],
    censor: "[REDACTED]",
  },
});

/**
 * Create a child logger scoped to a specific request.
 * Attach trace_id and mr_id so every log line is traceable.
 */
export function requestLogger(traceId: string, mrId?: string) {
  return logger.child({
    trace_id: traceId,
    ...(mrId ? { mr_id: mrId } : {}),
  });
}

export type Logger = typeof logger;
