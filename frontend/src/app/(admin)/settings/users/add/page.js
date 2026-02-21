"use client";

import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRolesList } from "@/hooks/useRolesList";
import { ensureAccessToken } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

const extractMessage = (payload, fallback = "Request failed") => {
  if (!payload) return fallback;
  if (payload.message) return payload.message;
  if (payload.detail) return payload.detail;
  if (payload.errors?.detail) return payload.errors.detail;
  // unwrap nested envelope if present
  if (payload.errors && payload.errors.message) return payload.errors.message;
  const firstError = payload.errors && Object.values(payload.errors)[0];
  if (Array.isArray(firstError)) return firstError.join(" ");
  if (typeof firstError === "string") return firstError;
  return fallback;
};

export default function AddUserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: rolesData, isLoading: rolesLoading } = useRolesList({ page_size: 100 });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm();

  const onSubmit = async (values) => {
    try {
      const token = await ensureAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/settings/users/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const err = new Error(extractMessage(json));
        err.body = json;
        err.status = res.status;
        throw err;
      }
      toast.success("User created (default password set)");
      queryClient.setQueryData(["users-list"], (old) => {
        if (!old) return old;
        const arr = Array.isArray(old?.data) ? old.data : Array.isArray(old) ? old : [];
        const created = {
          id: json?.data?.id,
          name: `${values.first_name || ""} ${values.last_name || ""}`.trim() || values.email,
          email: values.email,
          roles: [values.role].filter(Boolean),
          role: values.role,
          created_at: new Date().toISOString(),
        };
        if (Array.isArray(old?.data)) return { ...old, data: [created, ...arr] };
        if (Array.isArray(old)) return [created, ...arr];
        return old;
      });
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      router.push("/settings/users");
    } catch (err) {
      const body = err?.body;
      const envelopeErrors = body?.errors && typeof body.errors === "object" ? body.errors : null;
      const innerErrors =
        envelopeErrors && envelopeErrors.errors && typeof envelopeErrors.errors === "object"
          ? envelopeErrors.errors
          : envelopeErrors;
      toast.error(extractMessage(body, err.message || "Invite failed"));
      if (innerErrors) {
        Object.entries(innerErrors).forEach(([field, msg]) =>
          setError(field, { message: Array.isArray(msg) ? msg.join(" ") : String(msg) })
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Add User</h1>
        <button
          type="button"
          onClick={() => router.push("/settings/users")}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to users
        </button>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Field
          label="First name"
          error={errors.first_name?.message}
          inputProps={{ ...register("first_name", { required: "Required", minLength: 2 }) }}
        />
        <Field
          label="Last name"
          error={errors.last_name?.message}
          inputProps={{ ...register("last_name", { required: "Required", minLength: 2 }) }}
        />
        <Field
          label="Email"
          error={errors.email?.message}
          inputProps={{ ...register("email", { required: "Required" }), type: "email" }}
        />
        <SelectField
          label="Role"
          error={errors.role?.message}
          options={
            rolesLoading
              ? [{ value: "", label: "Loading roles..." }]
              : (Array.isArray(rolesData?.data) ? rolesData.data : rolesData?.results || rolesData || []).map((r) => ({
                  value: r.name,
                  label: r.name,
                }))
          }
          registerProps={register("role", { required: "Required" })}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Sending..." : "Send Invite"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, error, inputProps }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <input className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" {...inputProps} />
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, error, options, registerProps }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <select className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" {...registerProps}>
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
