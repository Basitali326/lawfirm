"use client";

import { useEffect } from "react";

import AppButton from "@/components/AppButton";

export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Try again or contact support if the issue persists.
      </p>
      <div className="mt-6">
        <AppButton onClick={() => reset()} title="Try again" />
      </div>
    </div>
  );
}