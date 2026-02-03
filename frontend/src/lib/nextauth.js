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

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        const user = data?.user || {};

        return {
          id: user.id || user.email || credentials?.email,
          email: user.email || credentials?.email,
          name: user.full_name || user.name || "User",
          access: data?.access,
          refresh: data?.refresh,
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
        token.access = user.access;
        token.refresh = user.refresh;
        token.role = user.role;
        token.firm = user.firm;
        token.is_superadmin = user.is_superadmin;
      }
      return token;
    },
    async session({ session, token }) {
      session.access = token.access;
      session.refresh = token.refresh;
      session.role = token.role;
      session.firm = token.firm;
      session.is_superadmin = token.is_superadmin;
      return session;
    },
  },
};
