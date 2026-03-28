"use client";

import { useState } from "react";

import StatusBadge from "@/components/ecommerce/StatusBadge";
import SectionCard from "@/components/ecommerce/SectionCard";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatAED, formatDateTime } from "@/lib/ecommerce";
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from "@/types/ecommerce";

export default function OrderDetailPanel({
  order,
  updatingStatus,
  updatingPaymentStatus,
  onOrderStatusChange,
  onPaymentStatusChange,
}) {
  const shipping = order?.shipping_address || {};
  const [orderStatus, setOrderStatus] = useState(order.order_status);
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);

  return (
    <div className="space-y-6">
      <SectionCard
        title={`Order ${order.order_number}`}
        description={`Placed ${formatDateTime(order.placed_at)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={order.order_status} />
            <StatusBadge value={order.payment_status} />
          </div>
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-600">
            <p><span className="font-medium text-slate-900">Internal ID:</span> {order.id}</p>
            <p><span className="font-medium text-slate-900">Customer:</span> {order.customer_name}</p>
            <p><span className="font-medium text-slate-900">Email:</span> {order.customer_email}</p>
            <p><span className="font-medium text-slate-900">Phone:</span> {order.customer_phone}</p>
            <p><span className="font-medium text-slate-900">Shipping:</span> {order.shipping_method}</p>
            <p><span className="font-medium text-slate-900">Payment:</span> COD</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Shipping Address</p>
            <p className="mt-2">{shipping.first_name} {shipping.last_name}</p>
            <p>{shipping.address_line_1}</p>
            {shipping.address_line_2 ? <p>{shipping.address_line_2}</p> : null}
            <p>{shipping.area}, {shipping.city}</p>
            <p>{shipping.country} {shipping.postal_code || ""}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Order Items" description="Snapshot of the purchased line items.">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">Product</th>
                <th className="border-b border-slate-200 px-4 py-3">SKU</th>
                <th className="border-b border-slate-200 px-4 py-3">Price</th>
                <th className="border-b border-slate-200 px-4 py-3">Qty</th>
                <th className="border-b border-slate-200 px-4 py-3">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <div className="font-medium text-slate-900">{item.product_title}</div>
                    {item.variant_title ? <div className="text-xs text-slate-500">{item.variant_title}</div> : null}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">{item.sku}</td>
                  <td className="border-b border-slate-100 px-4 py-3">{formatAED(item.price_aed)}</td>
                  <td className="border-b border-slate-100 px-4 py-3">{item.quantity}</td>
                  <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">{formatAED(item.subtotal_aed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <SectionCard title="Notes" description="Customer supplied notes during checkout.">
          <p className="text-sm text-slate-600">{order.notes || "No notes provided."}</p>
        </SectionCard>

        <SectionCard title="Actions" description="Update operational order state.">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Order status</label>
              <div className="flex gap-2">
                <Select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
                <Button disabled={updatingStatus} onClick={() => onOrderStatusChange(orderStatus)}>{updatingStatus ? "Saving..." : "Save"}</Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Payment status</label>
              <div className="flex gap-2">
                <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
                <Button disabled={updatingPaymentStatus} onClick={() => onPaymentStatusChange(paymentStatus)}>{updatingPaymentStatus ? "Saving..." : "Save"}</Button>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between py-1"><span>Subtotal</span><span>{formatAED(order.subtotal_aed)}</span></div>
              <div className="flex justify-between py-1"><span>Shipping</span><span>{formatAED(order.shipping_amount_aed)}</span></div>
              <div className="flex justify-between py-1"><span>Discount</span><span>-{formatAED(order.discount_amount_aed)}</span></div>
              <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900"><span>Total</span><span>{formatAED(order.total_amount_aed)}</span></div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
