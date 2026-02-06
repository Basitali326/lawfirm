"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
async function localFetch(url, options) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Request failed");
    err.body = json;
    throw err;
  }
  return json;
}

export default function InviteAcceptPage({ params }) {
  const tokenFromParams = params?.token;
  const token =
    tokenFromParams ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : undefined);
  const router = useRouter();
  const [valid, setValid] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm();

  useEffect(() => {
    localFetch(`/api/auth/invite/validate?token=${encodeURIComponent(token)}`)
      .then(() => setValid(true))
      .catch((err) => {
        setValid(false);
        toast.error(err?.body?.message || "Invite invalid");
      });
  }, [token]);

  const onSubmit = async (values) => {
    try {
      await localFetch("/api/auth/invite/set-password", {
        method: "POST",
        body: JSON.stringify({ ...values, token }),
      });
      toast.success("Password set. Please sign in.");
      router.push("/login?invite=success");
    } catch (err) {
      const body = err?.body;
      toast.error(body?.message || "Failed");
      if (body?.errors) {
        Object.entries(body.errors).forEach(([field, msg]) =>
          setError(field, { message: Array.isArray(msg) ? msg.join(" ") : String(msg) })
        );
      }
    }
  };

  if (valid === false) return <div className="p-6 text-slate-700">Invite link expired or already used.</div>;
  if (valid === null) return <div className="p-6 text-slate-700">Checking invite…</div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Create a password</h1>
        <Field
          label="Password"
          error={errors.password?.message}
          inputProps={{ ...register("password", { required: "Required" }), type: "password" }}
        />
        <Field
          label="Confirm password"
          error={errors.confirm_password?.message}
          inputProps={{ ...register("confirm_password", { required: "Required" }), type: "password" }}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Set password"}
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
