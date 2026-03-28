"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import EmptyState from "@/components/admin/EmptyState";
import FieldMessage from "@/components/ecommerce/FieldMessage";
import QuantityInput from "@/components/ecommerce/store/QuantityInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { checkoutSchema } from "@/lib/validations/ecommerce";
import { collectFieldErrors, formatAED } from "@/lib/ecommerce";
import { normalizeError } from "@/lib/errors";
import { useCartMutations, useCartQuery, useCheckoutMutation } from "@/features/ecommerce/ecommerce.hooks";

export default function CheckoutPage() {
  const { data } = useCartQuery();
  const cart = data?.data;
  const cartMutations = useCartMutations();
  const checkoutMutation = useCheckoutMutation();
  const [serverErrors, setServerErrors] = useState({});

  const form = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      country: "UAE",
      city: "",
      area: "",
      address_line_1: "",
      address_line_2: "",
      postal_code: "",
      notes: "",
      shipping_method: "Standard Delivery",
      payment_method: "COD",
      shipping_amount_aed: "0.00",
      discount_amount_aed: "0.00",
      same_as_billing: true,
    },
  });

  const { register, handleSubmit, formState: { errors } } = form;
  const items = useMemo(() => cart?.items || [], [cart]);

  if (!items.length) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState title="Your cart is empty" actionLabel="Browse products" onAction={() => window.location.assign("/products")} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Checkout</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Complete your COD order</h1>
      </div>
      <form
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
        onSubmit={handleSubmit(async (values) => {
          try {
            setServerErrors({});
            const result = await checkoutMutation.mutateAsync(values);
            window.location.assign(`/order-success/${result.data.public_token}`);
          } catch (error) {
            setServerErrors(collectFieldErrors(normalizeError(error)));
          }
        })}
      >
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Contact information</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>First name</Label><Input {...register("first_name")} /><FieldMessage error={errors.first_name?.message || serverErrors.first_name} /></div>
              <div className="space-y-2"><Label>Last name</Label><Input {...register("last_name")} /><FieldMessage error={errors.last_name?.message || serverErrors.last_name} /></div>
              <div className="space-y-2"><Label>Email</Label><Input {...register("email")} /><FieldMessage error={errors.email?.message || serverErrors.email} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input {...register("phone")} /><FieldMessage error={errors.phone?.message || serverErrors.phone} /></div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Shipping address</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Country</Label><Input {...register("country")} /><FieldMessage error={errors.country?.message || serverErrors.country} /></div>
              <div className="space-y-2"><Label>City</Label><Input {...register("city")} /><FieldMessage error={errors.city?.message || serverErrors.city} /></div>
              <div className="space-y-2"><Label>Area</Label><Input {...register("area")} /><FieldMessage error={errors.area?.message || serverErrors.area} /></div>
              <div className="space-y-2"><Label>Postal code</Label><Input {...register("postal_code")} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Address line 1</Label><Input {...register("address_line_1")} /><FieldMessage error={errors.address_line_1?.message || serverErrors.address_line_1} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Address line 2</Label><Input {...register("address_line_2")} /></div>
            </div>
            <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <Checkbox {...register("same_as_billing")} />
              <span className="text-sm text-slate-700">Address same as billing</span>
            </label>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Shipping and payment</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Shipping method</Label>
                <Select {...register("shipping_method")}>
                  <option value="Standard Delivery">Standard Delivery</option>
                  <option value="Express Delivery">Express Delivery</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment method</Label>
                <Input value="Cash on Delivery (COD)" disabled />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Order notes</Label>
                <Textarea {...register("notes")} className="min-h-24" />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Order summary</h2>
            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-[72px_1fr] gap-4 rounded-2xl bg-slate-50 p-3">
                  {item.feature_image ? <img src={item.feature_image} alt={item.title} className="h-[72px] w-[72px] rounded-xl object-cover" /> : <div className="h-[72px] w-[72px] rounded-xl bg-slate-200" />}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        {item.variant_title ? <p className="text-xs text-slate-500">{item.variant_title}</p> : null}
                      </div>
                      <span className="font-medium text-slate-900">{formatAED(item.subtotal_aed)}</span>
                    </div>
                    <QuantityInput value={item.quantity} onChange={(quantity) => cartMutations.update.mutate({ itemId: item.id, payload: { quantity } })} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatAED(cart.subtotal_aed)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span>{formatAED(0)}</span></div>
              <div className="flex justify-between text-base font-semibold text-slate-950"><span>Total</span><span>{formatAED(cart.subtotal_aed)}</span></div>
            </div>
            <Button className="mt-6 w-full" type="submit" disabled={checkoutMutation.isPending}>
              {checkoutMutation.isPending ? "Placing order..." : "Place COD Order"}
            </Button>
          </section>
        </aside>
      </form>
    </main>
  );
}
