import { NextResponse } from "next/server";

const AUTH_MODE =
  process.env.NEXT_PUBLIC_AUTH_MODE === "token" ? "token" : "cookie";
const USE_NEXTAUTH = process.env.NEXT_PUBLIC_USE_NEXTAUTH === "true";
const SESSION_COOKIE_NAME =
  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || "sessionid";
const REFRESH_COOKIE_NAME = "refresh_token";

export function middleware(request) {
  const requiresAuth = matchesProtectedPath(request.nextUrl.pathname);

  if (!requiresAuth) return NextResponse.next();

  if (USE_NEXTAUTH) {
    const hasSession =
      request.cookies.get("__Secure-next-auth.session-token") ||
      request.cookies.get("next-auth.session-token");
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (AUTH_MODE === "token") {
    // Token mode: rely on client-side guard (/me) since access token lives in memory.
    return NextResponse.next();
  }

  const hasSession = request.cookies.get(SESSION_COOKIE_NAME);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function matchesProtectedPath(pathname) {
  const protectedPrefixes = [
    "/dashboard",
    "/clients",
    "/cases",
    "/tasks",
    "/documents",
    "/calendar",
    "/billing",
    "/reports",
    "/settings",
    "/profile",
  ];
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/cases/:path*",
    "/tasks/:path*",
    "/documents/:path*",
    "/calendar/:path*",
    "/billing/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
