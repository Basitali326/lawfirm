"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PriorityBadge, StatusBadge, DueBadge } from "./TaskBadges";
import { downloadDocument, validateDocumentFile } from "@/features/documents/api";
import {
  useDeleteDocumentMutation,
  useTaskAttachmentsQuery,
  useUploadTaskAttachmentMutation,
} from "@/features/documents/hooks";

export default function TaskDetailDrawer({
  open,
  taskId,
  cases,
  onClose,
  onAddNote,
  onStatusChange,
  onSave,
  saving,
}) {
  const task = useMemo(() => {
    for (const c of cases) {
      const found = c.tasks.find((t) => t.id === taskId);
      if (found) return found;
    }
    return null;
  }, [cases, taskId]);
  const parentCase = useMemo(() => {
    for (const c of cases) {
      if (c.tasks.find((t) => t.id === taskId)) return c;
    }
    return null;
  }, [cases, taskId]);
  const canUpload =
    parentCase?.status === "OPEN" &&
    ["PAID", "PARTIAL"].includes((parentCase?.pending_invoice_status || "").toUpperCase());

  const attachmentsQuery = useTaskAttachmentsQuery(taskId, { enabled: !!taskId && open });
  const uploadMutation = useUploadTaskAttachmentMutation(taskId);
  const deleteMutation = useDeleteDocumentMutation();
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState(null);

  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "MEDIUM",
    due_date: task?.due_date || "",
  });

  // sync when task changes
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "MEDIUM",
        due_date: task.due_date || "",
      });
    }
  }, [task]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !task) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 flex justify-end pointer-events-none"
    >
      <div aria-hidden className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] pointer-events-none" />
      <div className="relative h-full w-full max-w-md bg-white shadow-xl pointer-events-auto">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">{task.title}</div>
            <div className="text-xs text-slate-500">Task detail</div>
          </div>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-3 p-4 text-sm text-slate-800">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
            <StatusBadge value={task.status} />
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Priority</div>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {[
                { value: "URGENT", label: "Urgent" },
                { value: "HIGH", label: "High" },
                { value: "MEDIUM", label: "Medium" },
                { value: "LOW", label: "Low" },
              ].map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Due</div>
            <input
              type="date"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.due_date || ""}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Assigned</div>
            <div>{task.assigned_to?.name || "Unassigned"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Attachments</div>
            {canUpload ? (
              <div className="rounded-md border border-slate-200 p-2">
                <div className="mb-2 grid gap-2">
                  <input
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Title (optional)"
                  />
                  <input
                    id="task-attachment-upload"
                    type="file"
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <button
                  type="button"
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={uploadMutation.isPending || !uploadFile}
                  onClick={() => {
                    const err = validateDocumentFile(uploadFile);
                    if (err) return toast.error(err);
                    uploadMutation.mutate(
                      { file: uploadFile, title: uploadTitle },
                      {
                        onSuccess: () => {
                          toast.success("Attachment uploaded");
                          setUploadFile(null);
                          setUploadTitle("");
                          const input = document.getElementById("task-attachment-upload");
                          if (input) input.value = "";
                        },
                        onError: (error) => toast.error(error?.message || "Upload failed"),
                      }
                    );
                  }}
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload attachment"}
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 p-2 text-xs text-slate-500">
                Upload available only after payment is confirmed and case is OPEN.
              </div>
            )}
            <div className="max-h-40 overflow-auto rounded-md border border-slate-200">
              {attachmentsQuery.isLoading ? (
                <div className="p-2 text-xs text-slate-500">Loading attachments...</div>
              ) : !(attachmentsQuery.data || []).length ? (
                <div className="p-2 text-xs text-slate-500">No attachments.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {(attachmentsQuery.data || []).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2 p-2 text-xs">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-800">{doc.title || doc.original_name}</div>
                        <div className="truncate text-slate-500">{doc.original_name}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="rounded border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
                          onClick={() =>
                            downloadDocument(doc.id).catch((e) => toast.error(e?.message || "Download failed"))
                          }
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          className="rounded border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50"
                          onClick={() =>
                            deleteMutation.mutate(doc.id, {
                              onSuccess: () => toast.success("Attachment deleted"),
                              onError: (e) => toast.error(e?.message || "Delete failed"),
                            })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Title</div>
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Description</div>
            <textarea
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
              disabled={saving}
              onClick={() => onSave(task.id, form)}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
