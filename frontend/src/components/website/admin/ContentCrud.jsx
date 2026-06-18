"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import localFetch from "@/lib/api";

function emptyForm(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? (field.type === "checkbox" ? false : "")]));
}

function formatCellValue(value, column) {
  if (value === null || value === undefined || value === "") return "—";

  if (column.format === "currency-aed") {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
    }).format(Number(value));
  }

  if (typeof value === "object") {
    return value.title || value.name || "Linked";
  }

  if (column.name.endsWith("_at")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dubai",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    }
  }

  return String(value);
}

export default function ContentCrud({ title, endpoint, fields, columns = fields.slice(0, 4), readOnly = false }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(() => emptyForm(fields));
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await localFetch(endpoint);
      setItems(Array.isArray(payload) ? payload : payload?.results || payload?.data || []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);
  const visibleColumns = useMemo(() => columns.map((item) => typeof item === "string" ? { name: item, label: item.replaceAll("_", " ") } : item), [columns]);

  async function submit(event) {
    event.preventDefault();
    const payload = {};
    fields.forEach((field) => {
      const value = form[field.name];
      if (field.type === "number") payload[field.name] = value === "" ? null : Number(value);
      else payload[field.name] = value === "" && field.nullable ? null : value;
    });
    try {
      await localFetch(editing ? `${endpoint}${editing}/` : endpoint, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setEditing(null);
      setForm(emptyForm(fields));
      await load();
    } catch (err) {
      setError(err.message || "Unable to save record.");
    }
  }

  function edit(item) {
    setEditing(item.id);
    setForm(Object.fromEntries(fields.map((field) => [field.name, item[field.name] ?? (field.type === "checkbox" ? false : "")])));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id) {
    if (!window.confirm("Delete this record?")) return;
    await localFetch(`${endpoint}${id}/`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-7">
      <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Website management</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">{title}</h1></div>
      {!readOnly ? <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-2">
        {fields.map((field) => <label key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}><span className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}</span>
          {field.type === "textarea" ? <textarea rows={5} required={field.required} value={form[field.name]} onChange={(e) => setForm({...form,[field.name]:e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          : field.type === "select" ? <select required={field.required} value={form[field.name]} onChange={(e) => setForm({...form,[field.name]:e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2">{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          : field.type === "checkbox" ? <input type="checkbox" checked={!!form[field.name]} onChange={(e) => setForm({...form,[field.name]:e.target.checked})} className="h-5 w-5" />
          : <input type={field.type || "text"} required={field.required} value={form[field.name]} onChange={(e) => setForm({...form,[field.name]:e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2" />}</label>)}
        <div className="flex gap-3 md:col-span-2"><button className="rounded-xl bg-slate-950 px-5 py-2.5 font-semibold text-white">{editing ? "Update" : "Create"}</button>{editing ? <button type="button" onClick={() => {setEditing(null);setForm(emptyForm(fields));}} className="rounded-xl border border-slate-300 px-5 py-2.5">Cancel</button> : null}</div>
      </form> : null}
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{visibleColumns.map((column) => <th key={column.name} className="px-4 py-3 font-medium capitalize">{column.label}</th>)}{!readOnly ? <th className="px-4 py-3">Actions</th> : null}</tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={visibleColumns.length + 1} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr> : items.map((item) => <tr key={item.id}>{visibleColumns.map((column) => <td key={column.name} className="max-w-xs truncate whitespace-nowrap px-4 py-3">{formatCellValue(item[column.name], column)}</td>)}{!readOnly ? <td className="whitespace-nowrap px-4 py-3"><button onClick={() => edit(item)} className="mr-3 font-semibold text-blue-700">Edit</button><button onClick={() => remove(item.id)} className="font-semibold text-red-700">Delete</button></td> : null}</tr>)}</tbody></table>
      </div>
      <p className="text-xs text-slate-500">Images and downloadable files can also be managed through Django Admin; all text, publishing, pricing, seller, and sales data is available through these APIs.</p>
    </div>
  );
}
