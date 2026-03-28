export default function FieldMessage({ error, hint }) {
  if (error) {
    return <p className="mt-1 text-xs text-rose-600">{error}</p>;
  }
  if (hint) {
    return <p className="mt-1 text-xs text-slate-500">{hint}</p>;
  }
  return null;
}

