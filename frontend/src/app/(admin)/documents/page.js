"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  downloadDocument,
  validateDocumentFile,
} from "@/features/documents/api";
import {
  useCaseDocumentsQuery,
  useDeleteDocumentMutation,
  useOpenPaidCasesQuery,
  useUploadCaseDocumentMutation,
} from "@/features/documents/hooks";

function formatSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = Number(bytes);
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function DocumentsPage() {
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);

  const casesQuery = useOpenPaidCasesQuery();
  const cases = casesQuery.data || [];
  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || cases[0] || null,
    [cases, selectedCaseId]
  );

  useEffect(() => {
    if (!selectedCaseId && cases.length) setSelectedCaseId(cases[0].id);
  }, [cases, selectedCaseId]);

  useEffect(() => {
    setPage(1);
  }, [selectedCase?.id]);

  const docsQuery = useCaseDocumentsQuery(selectedCase?.id, { page, page_size: 20 }, { enabled: !!selectedCase?.id });
  const docs = docsQuery.data?.data || [];
  const meta = docsQuery.data?.meta || null;

  const uploadMutation = useUploadCaseDocumentMutation(selectedCase?.id);
  const deleteMutation = useDeleteDocumentMutation();

  const onUpload = () => {
    if (!selectedCase?.id) return;
    const fileError = validateDocumentFile(file);
    if (fileError) {
      toast.error(fileError);
      return;
    }
    uploadMutation.mutate(
      { file, title },
      {
        onSuccess: () => {
          toast.success("Document uploaded");
          setTitle("");
          setFile(null);
          const input = document.getElementById("case-doc-upload");
          if (input) input.value = "";
        },
        onError: (err) => toast.error(err?.message || "Upload failed"),
      }
    );
  };

  const onDelete = (id) => {
    if (!window.confirm("Delete this document?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Document deleted"),
      onError: (err) => toast.error(err?.message || "Delete failed"),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
        <p className="text-sm text-slate-500">Upload and manage documents for OPEN + paid cases.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-slate-800">Cases</div>
          {casesQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-12 animate-pulse rounded bg-slate-100" />
              <div className="h-12 animate-pulse rounded bg-slate-100" />
              <div className="h-12 animate-pulse rounded bg-slate-100" />
            </div>
          ) : !cases.length ? (
            <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No OPEN + paid cases found.
            </div>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition ${
                    selectedCase?.id === c.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedCaseId(c.id)}
                >
                  <div className="text-xs font-semibold opacity-80">{c.case_number}</div>
                  <div className="text-sm font-semibold">{c.title}</div>
                  <div className="text-xs opacity-80">
                    {c.case_type_detail?.name}
                    {c.case_type_detail?.code ? ` (${c.case_type_detail.code})` : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {selectedCase ? (
            <>
              <div className="mb-3 flex flex-wrap items-end gap-2 border-b border-slate-200 pb-3">
                <div className="min-w-[220px] flex-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Title (optional)</label>
                  <input
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Passport copy"
                  />
                </div>
                <div className="min-w-[220px] flex-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">File</label>
                  <input
                    id="case-doc-upload"
                    type="file"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 cursor-pointer items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={!file || uploadMutation.isPending}
                  onClick={onUpload}
                >
                  {uploadMutation.isPending ? "Uploading..." : "Add Document"}
                </button>
              </div>

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
                                onClick={() => onDelete(d.id)}
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

              {meta ? (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Page {meta.page} / {meta.total_pages} • {meta.total} documents
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="cursor-pointer rounded border border-slate-200 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!meta.has_prev}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded border border-slate-200 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!meta.has_next}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              Select a case to manage documents.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

