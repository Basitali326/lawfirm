export default function GlobalNotFound() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-slate-400">
          The page you are looking for does not exist.
        </p>
      </div>
    </main>
  );
}