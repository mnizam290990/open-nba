import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, details?: unknown): NextResponse {
  const body: ApiErrorBody = { error: message, code: "BAD_REQUEST", details };
  return NextResponse.json(body, { status: 400 });
}

export function unauthorized(message = "Authentication required"): NextResponse {
  const body: ApiErrorBody = { error: message, code: "UNAUTHORIZED" };
  return NextResponse.json(body, { status: 401 });
}

export function forbidden(message = "Insufficient permissions"): NextResponse {
  const body: ApiErrorBody = { error: message, code: "FORBIDDEN" };
  return NextResponse.json(body, { status: 403 });
}

export function notFound(message = "Resource not found"): NextResponse {
  const body: ApiErrorBody = { error: message, code: "NOT_FOUND" };
  return NextResponse.json(body, { status: 404 });
}

export function tooManyRequests(message = "Rate limit exceeded"): NextResponse {
  const body: ApiErrorBody = { error: message, code: "RATE_LIMIT_EXCEEDED" };
  return NextResponse.json(body, { status: 429 });
}

export function internalError(message = "Internal server error"): NextResponse {
  const body: ApiErrorBody = { error: message, code: "INTERNAL_ERROR" };
  return NextResponse.json(body, { status: 500 });
}

export function handleZodError(error: ZodError): NextResponse {
  return badRequest("Validation failed", error.flatten().fieldErrors);
}
