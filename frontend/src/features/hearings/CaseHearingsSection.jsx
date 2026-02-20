"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  useCaseHearings,
  useCreateHearing,
  useUpdateHearing,
  useDeleteHearing,
} from "@/features/hearings/hearings.hooks";
import AppButton from "@/components/AppButton";
import EmptyState from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPES = ["MENTION", "MOTION", "TRIAL", "JUDGMENT", "OTHER"];
const STATUSES = ["SCHEDULED", "ADJOURNED", "COMPLETED", "CANCELLED"];

const fmt = (value) => {
  if (!value) return "—";
  try {
    return format(typeof value === "string" ? parseISO(value) : value, "PP p");
  } catch {
    return value;
  }
};

function HearingForm({ initial, onSubmit, onClose, isSaving }) {
  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    hearing_type: initial?.hearing_type || "OTHER",
    start_at: initial?.start_at ? initial.start_at.slice(0, 16) : "",
    end_at: initial?.end_at ? initial.end_at.slice(0, 16) : "",
    status: initial?.status || "SCHEDULED",
    court_name: initial?.court_name || "",
    court_room: initial?.court_room || "",
    location: initial?.location || "",
    notes: initial?.notes || "",
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.start_at) {
      toast.error("Start time is required");
      return;
    }
    const payload = {
      ...form,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
    };
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {initial ? "Edit Hearing" : "Add Hearing"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submit}>
          <div className="md:col-span-2">
            <Label>Title *</Label>
            <Input name="title" value={form.title} onChange={handleChange} />
          </div>
          <div>
            <Label>Type</Label>
            <select
              name="hearing_type"
              value={form.hearing_type}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Start at *</Label>
            <Input type="datetime-local" name="start_at" value={form.start_at} onChange={handleChange} />
          </div>
          <div>
            <Label>End at</Label>
            <Input type="datetime-local" name="end_at" value={form.end_at} onChange={handleChange} />
          </div>
          <div>
            <Label>Court name</Label>
            <Input name="court_name" value={form.court_name} onChange={handleChange} />
          </div>
          <div>
            <Label>Court room</Label>
            <Input name="court_room" value={form.court_room} onChange={handleChange} />
          </div>
          <div className="md:col-span-2">
            <Label>Location</Label>
            <Input name="location" value={form.location} onChange={handleChange} />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
              rows={3}
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <AppButton
              type="submit"
              title={isSaving ? "Saving..." : initial ? "Save changes" : "Create hearing"}
              disabled={isSaving}
              className="px-4"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CaseHearingsSection({ caseId, canManage }) {
  const [filters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const hearingsQuery = useCaseHearings(caseId, filters);
  const createMutation = useCreateHearing(caseId, { onSuccess: () => setShowForm(false) });
  const updateMutation = useUpdateHearing(caseId, { onSuccess: () => setEditing(null) });
  const deleteMutation = useDeleteHearing(caseId);

  const onDelete = (id) => {
    if (!window.confirm("Delete this hearing?")) return;
    deleteMutation.mutate(id);
  };

  const rows = useMemo(() => {
    const payload = hearingsQuery.data;
    if (Array.isArray(payload)) return payload;
    if (payload?.data) return payload.data;
    return [];
  }, [hearingsQuery.data]);

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Hearings</p>
          <h3 className="text-lg font-semibold text-slate-900">Scheduled hearings</h3>
        </div>
        {canManage && (
          <AppButton
            title="Add hearing"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            icon={<Plus className="h-4 w-4" />}
          />
        )}
      </div>

      {hearingsQuery.isLoading ? (
        <div className="py-8 text-sm text-slate-600">Loading hearings...</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No hearings yet"
          description="Track upcoming hearings for this case."
          actionLabel={canManage ? "Add hearing" : undefined}
          onAction={canManage ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Title</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Date/Time</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Court/Location</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                {canManage && <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-900">{h.title}</td>
                  <td className="px-3 py-2 text-slate-600">{h.hearing_type}</td>
                  <td className="px-3 py-2 text-slate-600">{fmt(h.start_at)}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {h.court_name || h.location || "—"}
                    {h.court_room ? ` / ${h.court_room}` : ""}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {h.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(h);
                          setShowForm(true);
                        }}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="mr-1 inline h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(h.id)}
                        className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="mr-1 inline h-4 w-4" />
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <HearingForm
          initial={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSubmit={(payload) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, payload });
            } else {
              createMutation.mutate(payload);
            }
          }}
        />
      )}
    </div>
  );
}
