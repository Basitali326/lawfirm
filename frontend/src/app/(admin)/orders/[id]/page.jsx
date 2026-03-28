"use client";

import { useParams } from "next/navigation";

import Loader from "@/components/Loader";
import OrderDetailPanel from "@/components/ecommerce/admin/OrderDetailPanel";
import { useAdminOrderQuery, useOrderMutations } from "@/features/ecommerce/ecommerce.hooks";

export default function OrderDetailPage() {
  const params = useParams();
  const orderQuery = useAdminOrderQuery(params.id);
  const orderMutations = useOrderMutations();

  if (orderQuery.isLoading) return <Loader />;

  const order = orderQuery.data?.data || orderQuery.data;

  return (
    <OrderDetailPanel
      order={order}
      updatingStatus={orderMutations.updateStatus.isPending}
      updatingPaymentStatus={orderMutations.updatePaymentStatus.isPending}
      onOrderStatusChange={(value) => {
        nextOrderStatus.current = value;
        orderMutations.updateStatus.mutate({ id: params.id, payload: { order_status: value } });
      }}
      onPaymentStatusChange={(value) => {
        nextPaymentStatus.current = value;
        orderMutations.updatePaymentStatus.mutate({ id: params.id, payload: { payment_status: value } });
      }}
    />
  );
}
