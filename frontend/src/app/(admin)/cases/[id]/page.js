"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { useCaseQuery, useDeleteCaseMutation } from "@/features/cases/cases.hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useRBAC } from "@/lib/rbac";
import CaseHearingsSection from "@/features/hearings/CaseHearingsSection";
import {
  downloadDocument,
  validateDocumentFile,
} from "@/features/documents/api";
import {
  useCaseDocumentsQuery,
  useDeleteDocumentMutation,
  useUploadCaseDocumentMutation,
} from "@/features/documents/hooks";

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "PP p");
  } catch (e) {
    return value;
  }
};

const formatCaseTypeLabel = (caseItem) => {
  const detail =
    caseItem?.case_type_detail ||
    (caseItem?.case_type && typeof caseItem.case_type === "object" ? caseItem.case_type : null);
  const name = detail?.name || (typeof caseItem?.case_type === "string" ? caseItem.case_type : "");
  const code = detail?.code || "";
  if (name && code) return `${name} (${code})`;
  return name || code || "—";
};

const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = Number(bytes);
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { can, meLoading, roles } = useRBAC();
  const { data, isLoading } = useCaseQuery(id);
  const [tab, setTab] = useState("overview");
  const [docsPage, setDocsPage] = useState(1);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState(null);
  const deleteMutation = useDeleteCaseMutation({
    onSuccess: () => router.push("/cases"),
  });
  const caseItem = data?.data || data || null;
  const docsQuery = useCaseDocumentsQuery(
    caseItem?.id,
    { page: docsPage, page_size: 20 },
    { enabled: !!caseItem?.id && tab === "documents" }
  );
  const uploadDocMutation = useUploadCaseDocumentMutation(caseItem?.id);
  const deleteDocMutation = useDeleteDocumentMutation();
  const docs = docsQuery?.data?.data || [];
  const docsMeta = docsQuery?.data?.meta || null;
  const invoiceStatus = caseItem?.latest_invoice_status || caseItem?.pending_invoice_status || null;
  const canUploadDocs = caseItem?.status === "OPEN" && ["PAID", "PARTIAL"].includes(invoiceStatus);

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete this case? This is a soft delete and can be restored server-side.`
    );
    if (!confirmed) return;
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return <div className="text-slate-600">Loading...</div>;
  }

  if (!data) {
    return <div className="text-slate-600">Case not found.</div>;
  }

  if (!caseItem?.id) {
    return <div className="text-slate-600">Case not found.</div>;
  }
  const canEdit = !meLoading && can("cases.update");
  const canDelete = !meLoading && can("cases.delete");
  const canManageHearings =
    !meLoading &&
    (can("case.hearings.manage") ||
      (roles || [])
        .map((r) => (r || "").toString().toUpperCase().replace(/\s|-/g, "_"))
        .some((r) => ["FIRM_OWNER", "FIRM_ADMIN", "OWNER", "SUPER_ADMIN"].includes(r)));

  const handleDocUpload = () => {
    const fileError = validateDocumentFile(docFile);
    if (fileError) {
      toast.error(fileError);
      return;
    }
    uploadDocMutation.mutate(
      { file: docFile, title: docTitle },
      {
        onSuccess: () => {
          toast.success("Document uploaded");
          setDocTitle("");
          setDocFile(null);
          const input = document.getElementById("case-doc-upload");
          if (input) input.value = "";
        },
        onError: (err) => toast.error(err?.message || "Upload failed"),
      }
    );
  };

  const handleDeleteDoc = (docId) => {
    if (!window.confirm("Delete this document?")) return;
    deleteDocMutation.mutate(docId, {
      onSuccess: () => toast.success("Document deleted"),
      onError: (err) => toast.error(err?.message || "Delete failed"),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-slate-300">|</span>
          <span>Case ID: {caseItem.id}</span>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              href={`/cases/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-3 border-b border-slate-100 pb-2">
          {["overview", "hearings", "documents"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold",
                tab === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {key === "overview" ? "Overview" : key === "hearings" ? "Hearings" : "Documents"}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="p-2 pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Case</p>
                <h1 className="text-2xl font-semibold text-slate-900">{caseItem.title || "Untitled"}</h1>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                <Badge tone="indigo" label="Status" value={caseItem.status} />
                <Badge tone="amber" label="Priority" value={caseItem.priority} />
                <Badge tone="slate" label="Type" value={formatCaseTypeLabel(caseItem)} />
              </div>
            </div>

            <dl className="mt-3 grid gap-4 md:grid-cols-2">
              <Item label="Status" value={caseItem.status} />
              <Item label="Priority" value={caseItem.priority} />
              <Item
                label="Case type"
                value={formatCaseTypeLabel(caseItem)}
              />
              <Item label="Court" value={caseItem.court_name || "—"} />
              <Item label="Judge" value={caseItem.judge_name || "—"} />
              <Item label="Open date" value={formatDateTime(caseItem.open_date)} />
              <Item label="Tasks generated at" value={formatDateTime(caseItem.tasks_generated_at)} />
              <Item label="Created" value={formatDateTime(caseItem.created_at)} />
              <Item label="Assigned to" value={caseItem.assigned_lead_detail?.email || "—"} />
            </dl>

            {caseItem.description ? (
              <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-600">Description</p>
                <p className="mt-2 text-sm text-slate-800 whitespace-pre-line">{caseItem.description}</p>
              </div>
            ) : null}

            <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-600">Billing</p>
              {caseItem?.has_invoice ? (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-800">
                  <span>
                    Invoice:{" "}
                    {caseItem.pending_invoice_number ||
                      caseItem.latest_invoice_number ||
                      "Available"}
                    {(caseItem.pending_invoice_amount || caseItem.latest_invoice_amount)
                      ? ` • ${caseItem.pending_invoice_amount || caseItem.latest_invoice_amount} AED`
                      : ""}
                    {(caseItem.pending_invoice_status || caseItem.latest_invoice_status)
                      ? ` • ${caseItem.pending_invoice_status || caseItem.latest_invoice_status}`
                      : ""}
                  </span>
                  {caseItem.pending_invoice_id || caseItem.latest_invoice_id ? (
                    <Link
                      href={`/invoices/${caseItem.pending_invoice_id || caseItem.latest_invoice_id}`}
                      className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      View Invoice
                    </Link>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No invoice linked yet.</p>
              )}
            </div>
          </div>
        ) : tab === "hearings" ? (
          <div className="pt-4">
            <CaseHearingsSection caseId={caseItem.id} canManage={canManageHearings} />
          </div>
        ) : (
          <div className="pt-4">
            <div className="mb-3 flex flex-wrap items-end gap-2 border-b border-slate-200 pb-3">
              <div className="min-w-[220px] flex-1">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Title (optional)</label>
                <input
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Passport copy"
                  disabled={!canUploadDocs}
                />
              </div>
              <div className="min-w-[220px] flex-1">
                <label className="mb-1 block text-xs font-semibold text-slate-600">File</label>
                <input
                  id="case-doc-upload"
                  type="file"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  disabled={!canUploadDocs}
                />
              </div>
              <button
                type="button"
                className="inline-flex h-10 cursor-pointer items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!docFile || uploadDocMutation.isPending || !canUploadDocs}
                onClick={handleDocUpload}
              >
                {uploadDocMutation.isPending ? "Uploading..." : "Add Document"}
              </button>
            </div>

            {!canUploadDocs ? (
              <div className="mb-3 rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                Upload is available only when case is OPEN and invoice is PAID/PARTIAL.
              </div>
            ) : null}

            {docsQuery.isLoading ? (
              <div className="space-y-2">
                <div className="h-12 animate-pulse rounded bg-slate-100" />
                <div className="h-12 animate-pulse rounded bg-slate-100" />
                <div className="h-12 animate-pulse rounded bg-slate-100" />
              </div>
            ) : !docs.length ? (
              <div className="rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                No documents yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Size</th>
                      <th className="px-3 py-2 text-left">Uploaded by</th>
                      <th className="px-3 py-2 text-left">Created</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-800">{d.title || d.original_name}</div>
                          {d.title ? <div className="text-xs text-slate-500">{d.original_name}</div> : null}
                        </td>
                        <td className="px-3 py-2 uppercase">{d.extension}</td>
                        <td className="px-3 py-2">{formatSize(d.size_bytes)}</td>
                        <td className="px-3 py-2">{d.uploaded_by_detail?.email || "—"}</td>
                        <td className="px-3 py-2">{(d.created_at || "").slice(0, 10)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="cursor-pointer rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                              onClick={() => downloadDocument(d.id).catch((e) => toast.error(e?.message || "Download failed"))}
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              className="cursor-pointer rounded border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDeleteDoc(d.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {docsMeta ? (
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Page {docsMeta.page} / {docsMeta.total_pages} • {docsMeta.total} documents
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="cursor-pointer rounded border border-slate-200 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!docsMeta.has_prev}
                    onClick={() => setDocsPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer rounded border border-slate-200 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!docsMeta.has_next}
                    onClick={() => setDocsPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

function Badge({ label, value, tone }) {
  const palette = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold text-xs",
        palette[tone] || palette.slate
      )}
    >
      {label}: {value || "—"}
    </span>
  );
}
