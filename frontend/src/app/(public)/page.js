import Link from "next/link";

import AppButton from "@/components/AppButton";
import { buildMetadata } from "@/lib/metadata";

export const revalidate = 60;

export const metadata = buildMetadata({
  title: "Home",
  description: "Find the right legal support and start your case intake.",
});

const cases = [
  {
    title: "Family Law",
    description: "Divorce, custody, and mediation guidance.",
  },
  {
    title: "Business Contracts",
    description: "Review and draft agreements with confidence.",
  },
  {
    title: "Real Estate",
    description: "Property disputes, leases, and closings.",
  },
];

export default function LandingPage() {
  return (
    <main>
      <section className="border-b border-slate-200/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Client portal
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
            Find the right legal support in minutes.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Browse case types, share your details, and get matched with the
            right firm.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <AppButton asChild title="Select a case">
              <Link href="#cases">Select a case</Link>
            </AppButton>
            <AppButton asChild variant="secondary" title="Firm login">
              <Link href="/login">Firm login</Link>
            </AppButton>
          </div>
        </div>
      </section>

      <section id="cases" className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-2xl font-semibold">Popular case types</h2>
        <p className="mt-2 text-sm text-slate-400">
          Select a case to start intake and share details securely.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {cases.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{item.description}</p>
              <div className="mt-6">
                <AppButton asChild variant="outline" title="Start intake">
                  <Link href="/register">Start intake</Link>
                </AppButton>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
