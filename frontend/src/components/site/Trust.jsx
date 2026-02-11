"use client";

export default function Trust() {
  const stats = [
    { label: "Built for privacy", detail: "Encrypted intake and secure document handling." },
    { label: "Trusted by firms", detail: "Designed with legal workflows in mind." },
    { label: "Clear ownership", detail: "You control who sees your information." },
  ];

  return (
    <section className="bg-slate-950 py-14 text-white sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-8 shadow-xl shadow-emerald-500/10">
          <div className="grid gap-6 md:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="text-sm font-semibold text-emerald-200">{item.label}</div>
                <div className="text-sm text-slate-200">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
