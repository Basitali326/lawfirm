"use client";

import { getSession } from "next-auth/react";
import { tokenStore } from "@/lib/api";

/**
 * Returns the access token from the active NextAuth session.
 * No refresh logic here; NextAuth handles token rotation.
 */
export async function getAccessToken() {
  try {
    const session = await getSession();
    const token =
      session?.access ||
      session?.token?.access ||
      session?.user?.access ||
      null;
    if (token) return token;
    try {
      return tokenStore.getAccess();
    } catch (e) {
      return null;
    }
  } catch (err) {
    try {
      return tokenStore.getAccess();
    } catch (e) {
      return null;
    }
  }
}
