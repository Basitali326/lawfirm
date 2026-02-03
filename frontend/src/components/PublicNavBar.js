import Link from "next/link";

import AppButton from "@/components/AppButton";

export default function PublicNavBar() {
  return (
    <header className="border-b border-slate-200/20 bg-slate-950/90 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-wide">
          Lawfirm
        </Link>
        <div className="flex items-center gap-3">
          <AppButton asChild variant="ghost">
            <Link href="/login">Login</Link>
          </AppButton>
          <AppButton asChild>
            <Link href="/register">Register as a firm</Link>
          </AppButton>
        </div>
      </div>
    </header>
  );
}