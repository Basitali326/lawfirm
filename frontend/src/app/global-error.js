"use client";

import { useEffect } from "react";

import AppButton from "@/components/AppButton";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          Error
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-400">
          Please try again or return later.
        </p>
        <div className="mt-6 flex gap-3">
          <AppButton onClick={() => reset()} title="Try again" />
        </div>
      </div>
    </main>
  );
}