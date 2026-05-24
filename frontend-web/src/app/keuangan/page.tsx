"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MoneyCard, PageHeader, SectionTitle, StateMessage } from "@/components/dashboard/ui";
import { marketplaceApi, transactionApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

const countedStatuses = new Set(["confirmed", "processing", "completed"]);

export default function KeuanganPage() {
  const user = useAuthStore((state) => state.user);
  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: transactionApi.listOrders, enabled: !!user });
  const cropsQuery = useQuery({ queryKey: ["crops", false], queryFn: () => marketplaceApi.listCrops(false), enabled: !!user });
  const cropMap = useMemo(() => new Map((cropsQuery.data ?? []).map((crop) => [crop.id, crop])), [cropsQuery.data]);
  const orders = [...(ordersQuery.data ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const isBuyer = user?.role === "buyer";
  const income = orders.filter((order) => countedStatuses.has(order.status)).reduce((sum, order) => sum + order.total_amount, 0);
  const expense = isBuyer ? orders.reduce((sum, order) => sum + order.total_amount, 0) : income * 0.15;

  return (
    <DashboardShell>
      <PageHeader title="Keuangan" subtitle="Lihat pemasukan, pengeluaran, dan riwayat transaksi usaha." />

      {(ordersQuery.isLoading || cropsQuery.isLoading) && <StateMessage title="Memuat keuangan..." message="Mengambil transaksi terbaru." />}
      {(ordersQuery.isError || cropsQuery.isError) && <StateMessage title="Keuangan belum bisa dimuat" message="Periksa koneksi backend lalu coba lagi." />}
      {!ordersQuery.isLoading && !ordersQuery.isError && (
        <>
          <section className="grid gap-5 md:grid-cols-2">
            <MoneyCard title={isBuyer ? "Total Belanja" : "Pemasukan"} value={formatCurrency(isBuyer ? expense : income)} tone="income" />
            <MoneyCard title={isBuyer ? "Pesanan" : "Estimasi Pengeluaran"} value={isBuyer ? String(orders.length) : formatCurrency(expense)} tone="expense" />
          </section>

          <section className="mt-10 rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
            <SectionTitle title="Daftar Transaksi" />
            {orders.length === 0 ? (
              <p className="rounded-[18px] bg-[#f7fbf3] p-5 text-[16px] font-semibold text-[#75826e]">
                Belum ada transaksi. Riwayat pesanan akan tampil setelah ada order.
              </p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const crop = cropMap.get(order.crop_id);
                  const incomeRow = !isBuyer;
                  return (
                    <div key={order.id} className="flex items-center gap-5 rounded-[18px] bg-[#f7fbf3] p-5">
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${incomeRow ? "bg-[#eaf4ec] text-[#2d6a4f]" : "bg-[#fff0d8] text-[#c7772b]"}`}>
                        {incomeRow ? <ArrowUpRight className="h-5 w-5" aria-hidden="true" /> : <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-[18px] font-bold text-[#0e4719]">{incomeRow ? "Penjualan" : "Pembelian"} {crop?.name ?? "Produk"}</h2>
                        <p className="mt-1 text-[14px] font-semibold text-[#75826e]">{formatDate(order.created_at)} · {order.status}</p>
                      </div>
                      <p className={`text-right text-[18px] font-bold ${incomeRow ? "text-[#0e4719]" : "text-[#c7772b]"}`}>
                        {incomeRow ? "+" : "-"}{formatCurrency(order.total_amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </DashboardShell>
  );
}
