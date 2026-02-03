import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/20 bg-slate-950 text-slate-200">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm">Copyright {new Date().getFullYear()} Lawfirm</p>
          <p className="text-xs text-slate-400">
            Secure case intake and firm operations.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link className="hover:text-white" href="/register">
            Register as a firm
          </Link>
          <Link className="hover:text-white" href="/login">
            Firm login
          </Link>
        </div>
      </div>
    </footer>
  );
}