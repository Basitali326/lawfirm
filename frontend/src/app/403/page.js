"use client";

export default function ForbiddenPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-3">
      <h1 className="text-3xl font-semibold text-slate-900">403</h1>
      <p className="text-sm text-slate-600">You don&apos;t have access to this page.</p>
      <a
        href="/dashboard"
        className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Go to dashboard
      </a>
    </div>
  );
}
