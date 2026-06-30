import { auth } from "./auth";
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, forbidden } from "./api-response";

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

/**
 * Higher-order function that wraps an API route handler with authentication
 * and optional role-based access control.
 *
 * Usage:
 *   export const GET = withAuth(handler);
 *   export const POST = withAuth(handler, ["ADMIN"]);
 */
export function withAuth<T extends Record<string, string> = Record<string, string>>(
  handler: RouteHandler<T>,
  requiredRoles?: UserRole[]
) {
  return async (req: NextRequest, ctx: { params: T }): Promise<NextResponse> => {
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

    const authedReq = req as AuthedRequest;
    authedReq.user = {
      id: session.user.id,
      role: userRole,
      tenantId,
      email: session.user.email as string,
    };

    return handler(authedReq, ctx);
  };
}
