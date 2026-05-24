"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Package, Truck, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader, StateMessage } from "@/components/dashboard/ui";
import { marketplaceApi, transactionApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import type { OrderStatus } from "@/types";

const labels: Record<OrderStatus, string> = {
  pending: "Menunggu konfirmasi",
  confirmed: "Dikonfirmasi",
  processing: "Diproses",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "completed",
};

const icons: Record<OrderStatus, typeof Clock3> = {
  pending: Clock3,
  confirmed: Package,
  processing: Truck,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export default function StatusPesananPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: transactionApi.listOrders, enabled: !!user });
  const cropsQuery = useQuery({ queryKey: ["crops", false], queryFn: () => marketplaceApi.listCrops(false), enabled: !!user });
  const cropMap = useMemo(() => new Map((cropsQuery.data ?? []).map((crop) => [crop.id, crop])), [cropsQuery.data]);

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => transactionApi.updateOrderStatus(orderId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const orders = [...(ordersQuery.data ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const canUpdate = user?.role === "farmer" || user?.role === "admin";

  return (
    <DashboardShell>
      <PageHeader title="Status Pesanan" subtitle="Pantau proses pesanan dari konfirmasi hingga diterima pembeli." />

      {(ordersQuery.isLoading || cropsQuery.isLoading) && <StateMessage title="Memuat pesanan..." message="Mengambil status terbaru." />}
      {(ordersQuery.isError || cropsQuery.isError) && <StateMessage title="Pesanan belum bisa dimuat" message="Periksa koneksi backend lalu coba lagi." />}
      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 && (
        <StateMessage title="Belum ada pesanan" message="Pesanan yang dibuat atau diterima akan tampil di sini." />
      )}
      {orders.length > 0 && (
        <section className="grid gap-5 md:grid-cols-2">
          {orders.map((order) => {
            const crop = cropMap.get(order.crop_id);
            const Icon = icons[order.status];
            const targetStatus = nextStatus[order.status];
            return (
              <article key={order.id} className="rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#eaf4ec] text-[#71af7d]">
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-[#fffbd2] px-4 py-2 text-[13px] font-bold text-[#0e4719]">AGR-{order.id.slice(0, 8)}</span>
                </div>
                <h2 className="mt-7 text-[24px] font-bold text-[#0e4719]">{labels[order.status]}</h2>
                <p className="mt-2 text-[16px] font-semibold text-[#65725e]">{crop?.name ?? "Produk"} · {formatDate(order.created_at)}</p>
                <div className="mt-6 flex items-center justify-between rounded-[18px] bg-[#f7fbf3] p-5">
                  <span className="text-[15px] font-semibold text-[#75826e]">{order.quantity_kg} kg</span>
                  <span className="text-[18px] font-bold text-[#0e4719]">{formatCurrency(order.total_amount)}</span>
                </div>
                {canUpdate && targetStatus && (
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ orderId: order.id, status: targetStatus })}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-[14px] bg-[#0e4719] px-5 text-[14px] font-bold text-white disabled:opacity-60"
                  >
                    Ubah ke {labels[targetStatus]}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}
    </DashboardShell>
  );
}
