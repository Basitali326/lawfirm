"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import { useFirmMe, useUpdateFirmMe } from "@/lib/queries/useFirmMe";
import { ensureAccessToken } from "@/lib/api";
import AppButton from "@/components/AppButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { data, isLoading } = useFirmMe();
  const updateMutation = useUpdateFirmMe();

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      email: "",
    },
  });

  const phonePrefix = "+971 ";
  const phoneValue = watch("phone");

  useEffect(() => {
    if (data) {
      reset({
        name: data.name || "",
        phone: data.phone?.startsWith(phonePrefix)
          ? data.phone
          : data.phone
          ? `${phonePrefix}${data.phone.replace(/^\+?971\s?/, "")}`
          : phonePrefix,
        address: data.address || "",
        email: data.email || data.owner_email || "",
      });
    }
  }, [data, reset]);

  useEffect(() => {
    if (!phoneValue) {
      setValue("phone", phonePrefix, { shouldDirty: false });
    }
  }, [phoneValue, phonePrefix, setValue]);

  const onSubmit = async (values) => {
    try {
      await ensureAccessToken();
      await updateMutation.mutateAsync({
        name: values.name,
        phone: values.phone,
        address: values.address,
      });
      toast.success("Profile updated");
    } catch (error) {
      // errors handled globally
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Firm Profile</h1>
        <p className="text-sm text-slate-500">Manage your firm information.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Firm name</Label>
            <Input id="name" placeholder="Firm name" {...register("name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" disabled {...register("email")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (UAE)</Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input
                  id="phone"
                  placeholder="+971 50 123 4567"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value || "";
                    const stripped = value.startsWith(phonePrefix)
                      ? value.slice(phonePrefix.length)
                      : value.replace(/^\+?971\s?/, "");
                    field.onChange(`${phonePrefix}${stripped}`);
                  }}
                  onFocus={(e) => {
                    if (!e.target.value) {
                      field.onChange(phonePrefix);
                    }
                  }}
                />
              )}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="Address" {...register("address")} />
          </div>
        </div>

        <div className="pt-2">
          <AppButton type="submit" loading={isSubmitting || updateMutation.isPending || isLoading} title="Save changes" />
        </div>
      </form>
    </div>
  );
}
