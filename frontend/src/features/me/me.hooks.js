"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { fetchMe } from "@/features/me/me.api";

export function useMeQuery(options = {}) {
  const { status } = useSession();
  const enabled = options.enabled ?? status === "authenticated";

  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled,
    ...options,
  });
}
