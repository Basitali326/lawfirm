import CredentialsProvider from "next-auth/providers/credentials";

import { API_BASE_URL } from "@/lib/config";
import { endpoints } from "@/lib/endpoints";

export const authOptions = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const response = await fetch(`${API_BASE_URL}${endpoints.login}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
          credentials: "include",
        });

        const raw = await response.json();
        const payload = raw?.data ?? raw;

        if (!response.ok) {
          let field = null;
          let message = "Invalid email or password.";
          const err = raw?.error?.details || raw?.error || payload || {};
          if (err?.email) {
            field = "email";
            message = Array.isArray(err.email) ? err.email.join(" ") : err.email;
          } else if (err?.password) {
            field = "password";
            message = Array.isArray(err.password) ? err.password.join(" ") : err.password;
          } else if (err?.detail) {
            message = err.detail;
          } else if (err?.message) {
            message = err.message;
          }
          throw new Error(JSON.stringify({ field, message }));
        }

        const data = payload;
        const user = data?.user || {};
        const tokens = data?.tokens || {};

        return {
          id: user.id || user.email || credentials?.email,
          email: user.email || credentials?.email,
          name: user.full_name || user.name || "User",
          access: tokens.access || data?.access,
          refresh: tokens.refresh || data?.refresh,
          role: data?.role,
          firm: data?.firm,
          is_superadmin: user.is_superadmin || false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const accessExpires = decodeAccessExp(user.access);
        token.access = user.access;
        token.refresh = user.refresh;
        token.accessExpires = accessExpires;
        token.role = user.role;
        token.firm = user.firm;
        token.is_superadmin = user.is_superadmin;
        token.error = null;
        return token;
      }

      const now = Date.now();
      if (token.access && token.accessExpires && now < token.accessExpires - 60_000) {
        return token; // still valid (1 min buffer)
      }

      if (!token.refresh) {
        return { ...token, error: "NoRefreshToken" };
      }

      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.access = token.access;
      session.refresh = token.refresh;
      session.error = token.error || null;
      session.role = token.role;
      session.firm = token.firm;
      session.is_superadmin = token.is_superadmin;
      return session;
    },
  },
};

function decodeAccessExp(access) {
  if (!access) return null;
  try {
    const [, payload] = access.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    if (decoded?.exp) return decoded.exp * 1000;
    return null;
  } catch (err) {
    return null;
  }
}

async function refreshAccessToken(token) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoints.refresh}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(token.refresh ? { refresh: token.refresh } : {}),
    });
    const json = await res.json();
    const payload = json?.data || json;
    if (!res.ok || !payload?.access) {
      throw new Error(payload?.message || "Failed to refresh access token");
    }
    return {
      ...token,
      access: payload.access,
      refresh: payload.refresh || token.refresh,
      accessExpires: decodeAccessExp(payload.access),
      error: null,
    };
  } catch (err) {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}
