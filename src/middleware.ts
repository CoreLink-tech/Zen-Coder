/**
 * Auth.js middleware — protects dashboard routes.
 *
 * Unauthenticated requests to /coding, /automation, /settings
 * are redirected to /login.
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
    pathname.startsWith("/settings");

  if (isDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/coding", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/coding/:path*",
    "/automation/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
