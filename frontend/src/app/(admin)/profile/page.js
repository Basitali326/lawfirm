"use client";

import { useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useMeQuery } from "@/features/me/me.hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppButton from "@/components/AppButton";
import { Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { data } = useMeQuery();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const user = useMemo(() => {
    if (data?.user) return data.user;
    if (session?.user) {
      return {
        email: session.user.email,
        first_name: session.user.first_name || session.user.name || "",
        last_name: session.user.last_name || "",
        role: session.role || session.user.role,
      };
    }
    return null;
  }, [data, session]);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { current_password: "", new_password: "" },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body?.success === false) {
        const error = new Error(body?.message || "Request failed");
        error.errors = body?.errors || {};
        error.status = res.status;
        throw error;
      }
      return body;
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      reset({ current_password: "", new_password: "" });
    },
    onError: (error) => {
      const fieldErrors = error?.errors || {};
      Object.entries(fieldErrors).forEach(([field, messages]) => {
        const message = Array.isArray(messages) ? messages.join(" ") : String(messages);
        setError(field, { type: "server", message });
      });
      toast.error(error?.message || "Unable to update password");
    },
  });

  const onSubmit = (values) => {
    changePasswordMutation.mutate(values);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500">Your account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={user?.email || "—"} />
          <Field label="Role" value={user?.role || "—"} />
          <Field label="First name" value={user?.first_name || "—"} />
          <Field label="Last name" value={user?.last_name || "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("current_password", { required: "Current password is required" })}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-500"
                  aria-label={showCurrent ? "Hide current password" : "Show current password"}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.current_password && (
                <p className="text-sm text-red-500">{errors.current_password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("new_password", { required: "New password is required" })}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-500"
                  aria-label={showNew ? "Hide new password" : "Show new password"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.new_password && (
                <p className="text-sm text-red-500">{errors.new_password.message}</p>
              )}
            </div>

            <AppButton
              type="submit"
              loading={changePasswordMutation.isPending}
              disabled={changePasswordMutation.isPending}
              className="w-full sm:w-auto"
            >
              Update Password
            </AppButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{value}</div>
    </div>
  );
}
