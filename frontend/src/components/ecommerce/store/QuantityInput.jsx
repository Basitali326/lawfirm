"use client";

export default function QuantityInput({ value, onChange, min = 1, disabled = false }) {
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white">
      <button
        type="button"
        disabled={disabled || value <= min}
        className="px-3 py-2 text-slate-600 disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        -
      </button>
      <span className="min-w-10 text-center text-sm font-semibold text-slate-900">{value}</span>
      <button
        type="button"
        disabled={disabled}
        className="px-3 py-2 text-slate-600 disabled:opacity-40"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

