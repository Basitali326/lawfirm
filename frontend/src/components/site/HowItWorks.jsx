"use client";

const STEPS = [
  { title: "Select case type", body: "Choose the legal area that fits your situation." },
  { title: "Share details securely", body: "Answer guided questions; your data is encrypted in transit." },
  { title: "A firm contacts you", body: "A matched firm reviews and responds with next steps." },
];

export default function HowItWorks() {
  return (
    <section className="bg-slate-950 py-14 text-white sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">How it works</h2>
        <p className="mt-2 text-sm text-slate-300">Three simple steps from intake to a response.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, idx) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-emerald-500/10"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200 font-semibold">
                  {idx + 1}
                </span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
              </div>
              <p className="mt-3 text-sm text-slate-300">{step.body}</p>
              {idx < STEPS.length - 1 && (
                <div className="absolute inset-y-0 right-0 hidden w-px bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
