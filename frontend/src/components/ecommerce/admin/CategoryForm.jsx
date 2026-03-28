"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import FieldMessage from "@/components/ecommerce/FieldMessage";
import SectionCard from "@/components/ecommerce/SectionCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { categorySchema } from "@/lib/validations/ecommerce";

export default function CategoryForm({
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = "Save Category",
  serverErrors = {},
}) {
  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      is_active: initialValues?.is_active ?? true,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <SectionCard title="Category Details" description="Define a category used for storefront filtering and organization.">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Name <span className="text-rose-600">*</span></Label>
            <Input id="name" {...register("name")} />
            <FieldMessage error={errors.name?.message || serverErrors.name} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description <span className="text-slate-400 text-xs font-normal">(Optional)</span></Label>
            <Textarea id="description" {...register("description")} />
            <FieldMessage error={errors.description?.message || serverErrors.description} />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <Checkbox {...register("is_active")} />
            <span>
              <span className="block text-sm font-medium text-slate-900">Active</span>
              <span className="block text-xs text-slate-500">Inactive categories stay hidden from the storefront.</span>
            </span>
          </label>
        </div>
      </SectionCard>
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
