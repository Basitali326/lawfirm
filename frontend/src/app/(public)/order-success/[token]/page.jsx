"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import Loader from "@/components/Loader";
import StatusBadge from "@/components/ecommerce/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatAED, formatDateTime } from "@/lib/ecommerce";
import { useOrderSuccessQuery } from "@/features/ecommerce/ecommerce.hooks";

export default function OrderSuccessPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";
  const { data, isLoading, isError } = useOrderSuccessQuery(token, { enabled: !!token });

  if (isLoading) return <Loader />;
  const order = data?.data || data;
  if (isError || !order?.id) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Order success</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Unable to load this order</h1>
          <p className="mt-3 text-sm text-slate-600">The order token may be invalid or the public order response failed.</p>
          <Button asChild className="mt-6">
            <Link href="/products">Back to products</Link>
          </Button>
        </div>
      </main>
    );
  }
  const shipping = order.shipping_address || {};

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Order success</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Thank you for your order</h1>
        <p className="mt-3 text-base text-slate-600">
          Your order <span className="font-semibold text-slate-950">{order.order_number}</span> has been placed successfully.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] bg-slate-50 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge value={order.order_status} />
                <StatusBadge value={order.payment_status} />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <p><span className="font-medium text-slate-900">Placed:</span> {formatDateTime(order.placed_at)}</p>
                <p><span className="font-medium text-slate-900">Customer:</span> {order.customer_name}</p>
                <p><span className="font-medium text-slate-900">Email:</span> {order.customer_email}</p>
                <p><span className="font-medium text-slate-900">Phone:</span> {order.customer_phone}</p>
                <p><span className="font-medium text-slate-900">Payment method:</span> Cash on Delivery</p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-950">Order summary</h2>
              <div className="mt-5 space-y-3">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{item.product_title}</p>
                      {item.variant_title ? <p className="text-xs text-slate-500">{item.variant_title}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">{formatAED(item.subtotal_aed)}</p>
                      <p className="text-xs text-slate-500">Qty {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-950">Shipping details</h2>
              <div className="mt-4 text-sm text-slate-600">
                <p>{shipping.first_name} {shipping.last_name}</p>
                <p>{shipping.address_line_1}</p>
                {shipping.address_line_2 ? <p>{shipping.address_line_2}</p> : null}
                <p>{shipping.area}, {shipping.city}</p>
                <p>{shipping.country} {shipping.postal_code || ""}</p>
              </div>
            </section>
            <section className="rounded-[2rem] bg-slate-950 p-6 text-white">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-300">Subtotal</span><span>{formatAED(order.subtotal_aed)}</span></div>
                <div className="flex justify-between"><span className="text-slate-300">Shipping</span><span>{formatAED(order.shipping_amount_aed)}</span></div>
                <div className="flex justify-between"><span className="text-slate-300">Discount</span><span>-{formatAED(order.discount_amount_aed)}</span></div>
                <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold"><span>Total</span><span>{formatAED(order.total_amount_aed)}</span></div>
              </div>
              <Button asChild className="mt-6 w-full bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/products">Continue shopping</Link>
              </Button>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

