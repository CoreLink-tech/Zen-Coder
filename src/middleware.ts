/**
 * Auth.js middleware — protects dashboard routes including /admin.
 * Adds baseline security headers on matched routes.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboard =
    pathname.startsWith("/coding") ||
    pathname.startsWith("/automation") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin");

  let res: NextResponse;

  if (isDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    res = NextResponse.redirect(loginUrl);
  } else if (isAuthPage && isLoggedIn) {
    res = NextResponse.redirect(new URL("/coding", req.nextUrl.origin));
  } else {
    res = NextResponse.next();
  }

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return res;
});

export const config = {
  matcher: [
    "/coding/:path*",
    "/automation/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
