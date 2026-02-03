"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";

import { registerSchema } from "@/lib/schemas/auth";
import { register as registerFirm } from "@/lib/auth";
import { mapFieldErrors, normalizeError } from "@/lib/errors";
import { USE_NEXTAUTH } from "@/lib/config";
import AppButton from "@/components/AppButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const firmName = watch("firm_name");
  const firmSlug = useMemo(() => slugify(firmName || ""), [firmName]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        firm_slug: firmSlug || undefined,
      };
      await registerFirm(payload);
      if (USE_NEXTAUTH) {
        const result = await signIn("credentials", {
          email: values.owner_email,
          password: values.password,
          callbackUrl: "/admin",
          redirect: true,
        });
        if (result?.error) {
          throw new Error(result.error);
        }
        return;
      }
      toast.success("Firm created");
      router.push("/admin");
    } catch (error) {
      const { message, fieldErrors } = normalizeError(error);
      const mapped = mapFieldErrors(fieldErrors);
      if (mapped.firm_name) setError("firm_name", { message: mapped.firm_name });
      if (mapped.owner_full_name)
        setError("owner_full_name", { message: mapped.owner_full_name });
      if (mapped.owner_email)
        setError("owner_email", { message: mapped.owner_email });
      if (mapped.password) setError("password", { message: mapped.password });
      if (mapped.confirm_password)
        setError("confirm_password", { message: mapped.confirm_password });
      toast.error(message || "Registration failed");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-6">
        <Card className="w-full border-slate-800 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle>Register your firm</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="firm_name">
                  Firm name <span className="text-red-400">*</span>
                </Label>
                <Input id="firm_name" {...register("firm_name")} />
                {errors.firm_name && (
                  <p className="text-sm text-red-400">
                    {errors.firm_name.message}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="owner_full_name">
                    Owner full name <span className="text-red-400">*</span>
                  </Label>
                  <Input id="owner_full_name" {...register("owner_full_name")} />
                  {errors.owner_full_name && (
                    <p className="text-sm text-red-400">
                      {errors.owner_full_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_email">
                    Owner email <span className="text-red-400">*</span>
                  </Label>
                  <Input id="owner_email" type="email" {...register("owner_email")} />
                  {errors.owner_email && (
                    <p className="text-sm text-red-400">
                      {errors.owner_email.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">
                    Confirm password <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirm ? "text" : "password"}
                      {...register("confirm_password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="text-sm text-red-400">
                      {errors.confirm_password.message}
                    </p>
                  )}
                </div>
              </div>
              <AppButton
                className="w-full"
                type="submit"
                loading={isSubmitting}
                title="Create firm"
              />
            </form>
            <p className="mt-6 text-sm text-slate-400">
              Already have an account?{" "}
              <Link className="text-white underline" href="/login">
                Login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
