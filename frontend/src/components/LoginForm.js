"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

import { loginSchema } from "@/lib/schemas/auth";
import { login } from "@/lib/auth";
import { USE_NEXTAUTH } from "@/lib/config";
import { mapFieldErrors, normalizeError } from "@/lib/errors";
import AppButton from "@/components/AppButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const errorParam = searchParams.get("error");
  const errorMessage =
    errorParam === "CredentialsSignin"
      ? "Invalid email or password."
      : errorParam
        ? decodeURIComponent(errorParam)
        : "";

  const onSubmit = async (values) => {
    try {
      if (USE_NEXTAUTH) {
        const result = await signIn("credentials", {
          ...values,
          callbackUrl: "/admin",
          redirect: false,
        });
        if (result?.error) {
          throw new Error(result.error);
        }
        router.push(result?.url || "/admin");
        return;
      }

      await login(values);
      toast.success("Welcome back");
      router.push("/admin");
    } catch (error) {
      const { message, fieldErrors } = normalizeError(error);
      const mapped = mapFieldErrors(fieldErrors);
      if (mapped.email) {
        setError("email", { message: mapped.email });
      }
      if (mapped.password) {
        setError("password", { message: mapped.password });
      }
      toast.error(message || "Login failed");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <Card className="w-full border-slate-800 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {errorMessage}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>
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
              <AppButton
                className="w-full"
                type="submit"
                loading={isSubmitting}
                title="Sign in"
              />
            </form>
            <p className="mt-6 text-sm text-slate-400">
              New to the platform?{" "}
              <Link className="text-white underline" href="/register">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
