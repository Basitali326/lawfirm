import { NextResponse } from "next/server";

const AUTH_MODE =
  process.env.NEXT_PUBLIC_AUTH_MODE === "token" ? "token" : "cookie";
const USE_NEXTAUTH = process.env.NEXT_PUBLIC_USE_NEXTAUTH === "true";
const SESSION_COOKIE_NAME =
  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || "sessionid";


export function middleware(request) {
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

export const config = {
  matcher: ["/admin/:path*"],
};
