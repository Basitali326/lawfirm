export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="flex-1">{children}</main>
    </div>
  );
}
