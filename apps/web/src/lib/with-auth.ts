import { auth } from "./auth";
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, forbidden, tooManyRequests } from "./api-response";
import { checkRateLimit } from "./rate-limit";

export type UserRole = "MR" | "RSM" | "ADMIN";

export interface AuthedRequest extends NextRequest {
  user: {
    id: string;
    role: UserRole;
    tenantId: string;
    email: string;
  };
}

type RouteHandler<T extends Record<string, string> = Record<string, string>> = (
  req: AuthedRequest,
  ctx: { params: T }
) => Promise<NextResponse> | NextResponse;

export interface WithAuthOptions {
  requiredRoles?: UserRole[];
  /** Rate limit: max requests per minute. Set to 0 to disable. Default: 60 */
  rateLimit?: number;
}

/**
 * Higher-order function that wraps an API route handler with authentication,
 * optional role-based access control, and optional per-user rate limiting.
 *
 * Usage:
 *   export const GET = withAuth(handler);
 *   export const POST = withAuth(handler, { requiredRoles: ["ADMIN"], rateLimit: 5 });
 */
export function withAuth<T extends Record<string, string> = Record<string, string>>(
  handler: RouteHandler<T>,
  optionsOrRoles?: WithAuthOptions | UserRole[]
) {
  const options: WithAuthOptions = Array.isArray(optionsOrRoles)
    ? { requiredRoles: optionsOrRoles }
    : (optionsOrRoles ?? {});
  const { requiredRoles, rateLimit = 60 } = options;

  return async (
    req: NextRequest,
    ctx?: { params?: T | Promise<T> }
  ): Promise<NextResponse> => {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized() as NextResponse;
    }

    const userRole = (session.user as { role: UserRole }).role;
    const tenantId = (session.user as { tenantId: string }).tenantId;

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(userRole)) {
        return forbidden() as NextResponse;
      }
    }

    if (rateLimit > 0) {
      const routeKey = `${session.user.id}:${new URL(req.url).pathname}`;
      const rl = checkRateLimit({ key: routeKey, maxRequests: rateLimit, windowSeconds: 60 });
      if (!rl.allowed) {
        const res = tooManyRequests("Rate limit exceeded. Please wait before retrying.");
        res.headers.set("Retry-After", String(Math.ceil((rl.resetAt - Date.now()) / 1000)));
        res.headers.set("X-RateLimit-Remaining", "0");
        return res as NextResponse;
      }
    }

    const authedReq = req as AuthedRequest;
    authedReq.user = {
      id: session.user.id,
      role: userRole,
      tenantId,
      email: session.user.email as string,
    };

    const params = (await Promise.resolve(ctx?.params ?? ({} as T))) as T;
    return handler(authedReq, { params });
  };
}
