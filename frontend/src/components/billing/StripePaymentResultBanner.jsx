"use client";

const STYLES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  failed: "border-rose-200 bg-rose-50 text-rose-900",
  cancelled: "border-slate-200 bg-slate-50 text-slate-800",
};

const TITLES = {
  success: "Payment successful",
  pending: "Payment processing",
  failed: "Payment failed",
  cancelled: "Checkout cancelled",
};

export default function StripePaymentResultBanner({ status, message, onDismiss }) {
  if (!status) return null;
  const tone = STYLES[status] || STYLES.cancelled;

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${tone}`}
      role="status"
    >
      <div>
        <p className="font-semibold">{TITLES[status] || "Payment update"}</p>
        {message ? <p className="mt-1 opacity-90">{message}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-semibold uppercase tracking-wide opacity-70 hover:opacity-100"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
