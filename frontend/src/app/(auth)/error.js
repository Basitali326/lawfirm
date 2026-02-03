"use client";

import { useEffect } from "react";

import AppButton from "@/components/AppButton";

export default function AuthError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
        Error
      </p>
      <h2 className="mt-4 text-2xl font-semibold text-white">
        We hit a problem loading this page
      </h2>
      <p className="mt-3 text-sm text-slate-400">
        Please refresh or try again.
      </p>
      <div className="mt-6">
        <AppButton onClick={() => reset()} title="Try again" />
      </div>
    </div>
  );
}