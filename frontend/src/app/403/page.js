"use client";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">403</h1>
        <p className="mt-2 text-sm text-slate-600">Not allowed</p>
        <a
          href="/login"
          className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Login
        </a>
      </div>
    </div>
  );
}
