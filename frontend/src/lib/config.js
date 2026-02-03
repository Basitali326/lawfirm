export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export const AUTH_MODE =
  process.env.NEXT_PUBLIC_AUTH_MODE === "token" ? "token" : "cookie";

export const USE_NEXTAUTH = process.env.NEXT_PUBLIC_USE_NEXTAUTH === "true";

export const SESSION_COOKIE_NAME =
  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || "sessionid";
