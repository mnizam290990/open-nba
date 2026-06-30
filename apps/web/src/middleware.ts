import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userRole = (session?.user as { role?: string })?.role;

  if (!session && pathname !== "/login" && pathname !== "/") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && pathname.startsWith("/admin") && userRole !== "ADMIN") {
    const feedUrl = new URL("/feed", req.url);
    feedUrl.searchParams.set("accessDenied", "true");
    return NextResponse.redirect(feedUrl);
  }

  if (session && pathname.startsWith("/rsm") && userRole === "MR") {
    const feedUrl = new URL("/feed", req.url);
    feedUrl.searchParams.set("accessDenied", "true");
    return NextResponse.redirect(feedUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon|icon|og-image|manifest).*)"],
};
