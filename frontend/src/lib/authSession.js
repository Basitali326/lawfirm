"use client";

import { getSession } from "next-auth/react";

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
    return token || null;
  } catch (err) {
    return null;
  }
}
