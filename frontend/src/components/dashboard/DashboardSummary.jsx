"use client";

import { useMemo, useState } from "react";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDashboardSummary } from "@/features/dashboard/dashboard.hooks";

const DATE_FIELDS = [
  { value: "created_at", label: "Created at" },
  { value: "updated_at", label: "Updated at" },
  { value: "due_date", label: "Due date" },
];

const CARD_CONFIG = [
  { key: "open_cases", label: "Open Cases" },
  { key: "active_tasks", label: "Active Tasks" },
  { key: "overdue_tasks", label: "Overdue Tasks" },
  { key: "active_clients", label: "Active Clients" },
];

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaultFilters() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 30);

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(today),
    dateField: "created_at",
  };
}

function SummaryCardSkeleton() {
  return (
    <Card className="border-slate-200/70">
      <CardHeader className="pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
      </CardContent>
    </Card>
  );
}

export default function DashboardSummary() {
  const defaults = useMemo(() => getDefaultFilters(), []);
  const [draft, setDraft] = useState(defaults);
  const [applied, setApplied] = useState(defaults);
  const [validationError, setValidationError] = useState("");

  const { data, loading, error, refetch } = useDashboardSummary({
    startDate: applied.startDate,
    endDate: applied.endDate,
    dateField: applied.dateField,
  });

  const handleDateChange = (field, value) => {
    if (!value) {
      const reset = getDefaultFilters();
      setDraft(reset);
      setValidationError("");
      return;
    }
    setDraft((prev) => ({ ...prev, [field]: value }));
    setValidationError("");
  };

  const handleApply = () => {
    const next = {
      startDate: draft.startDate || defaults.startDate,
      endDate: draft.endDate || defaults.endDate,
      dateField: draft.dateField || "created_at",
    };

    if (next.startDate > next.endDate) {
      const message = "Start date cannot be after end date.";
      setValidationError(message);
      toast.error(message);
      return;
    }

    setValidationError("");
    setDraft(next);
    setApplied(next);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:w-auto">
          <div className="space-y-1">
            <label htmlFor="dashboard-start-date" className="text-xs font-medium text-slate-600">
              Start date
            </label>
            <Input
              id="dashboard-start-date"
              type="date"
              value={draft.startDate}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="dashboard-end-date" className="text-xs font-medium text-slate-600">
              End date
            </label>
            <Input
              id="dashboard-end-date"
              type="date"
              value={draft.endDate}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="dashboard-date-field" className="text-xs font-medium text-slate-600">
              Date field
            </label>
            <select
              id="dashboard-date-field"
              value={draft.dateField}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateField: e.target.value }))}
              className="border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {DATE_FIELDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => refetch()} disabled={loading}>
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button type="button" onClick={handleApply} disabled={loading}>
            Apply
          </Button>
        </div>
      </div>

      {validationError ? <p className="text-sm text-rose-600">{validationError}</p> : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">{error?.message || "Invalid filter"}</p>
          <div className="mt-3">
            <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? CARD_CONFIG.map((card) => <SummaryCardSkeleton key={card.key} />)
          : CARD_CONFIG.map((card) => (
              <Card key={card.key} className="border-slate-200/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">{card.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-slate-900">{data?.[card.key] ?? 0}</div>
                </CardContent>
              </Card>
            ))}
      </div>
    </section>
  );
}

