"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MoneyCard, PageHeader, ProductCard, SectionTitle, StatCard, StateMessage } from "@/components/dashboard/ui";
import { marketplaceApi, transactionApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import type { Transaction } from "@/types";

const activeStatuses = new Set(["confirmed", "processing", "completed"]);

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const cropsQuery = useQuery({ queryKey: ["crops", false], queryFn: () => marketplaceApi.listCrops(false), enabled: !!user });
  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: transactionApi.listOrders, enabled: !!user });

  const crops = useMemo(() => {
    const all = cropsQuery.data ?? [];
    if (user?.role === "farmer") return all.filter((crop) => crop.farmer_id === user.id);
    return all;
  }, [cropsQuery.data, user]);

  const orders = ordersQuery.data ?? [];
  const isBuyer = user?.role === "buyer";
  const activeOrders = orders.filter((order) => activeStatuses.has(order.status));
  const completedOrders = orders.filter((order) => order.status === "completed");
  const revenue = activeOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const spending = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const availableStock = crops.reduce((sum, crop) => sum + crop.quantity_kg, 0);
  const recentCrop = crops[0];

  const statusTitle = cropsQuery.isLoading || ordersQuery.isLoading ? "Memuat dashboard..." : null;
  if (statusTitle) {
    return (
      <DashboardShell>
        <StateMessage title={statusTitle} message="Mengambil data terbaru dari server." />
      </DashboardShell>
    );
  }

  if (cropsQuery.isError || ordersQuery.isError) {
    return (
      <DashboardShell>
        <StateMessage title="Dashboard belum bisa dimuat" message="Periksa koneksi backend lalu coba muat ulang halaman." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={isBuyer ? "Halo, Pembeli!" : "Halo, Petani!"}
        subtitle={isBuyer ? "Pantau belanja, pesanan, dan katalog produk segar." : "Pantau penjualan, pesanan, dan stok produk pertanian hari ini."}
      />

      <section className="grid gap-5 md:grid-cols-3">
        <StatCard icon={ShoppingBag} value={String(isBuyer ? orders.length : crops.length)} label={isBuyer ? "Pesanan Saya" : "Produk Aktif"} />
        <StatCard icon={PackageCheck} value={String(activeOrders.length)} label={isBuyer ? "Pesanan Berjalan" : "Pesanan Masuk"} />
        <StatCard icon={Truck} value={isBuyer ? String(completedOrders.length) : `${Math.round(availableStock)} kg`} label={isBuyer ? "Selesai" : "Stok Tersedia"} />
      </section>

      <section className="mt-7 grid gap-5 md:grid-cols-2">
        <MoneyCard title={isBuyer ? "Total Belanja" : "Pemasukan"} value={formatCurrency(isBuyer ? spending : revenue)} tone="income" />
        <MoneyCard title={isBuyer ? "Pesanan Aktif" : "Estimasi Operasional"} value={formatCurrency(isBuyer ? activeOrders.length : revenue * 0.15)} tone="expense" />
      </section>

      <section className="mt-10">
        <SectionTitle title={isBuyer ? "Rekomendasi Produk" : "Produk Terbaru"} href={isBuyer ? "/marketplace" : "/katalog-dagangan"} actionLabel="Lihat semua" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {recentCrop ? (
            <ProductCard crop={recentCrop} href={isBuyer ? `/katalog-detail?id=${recentCrop.id}` : `/kelola-produk?id=${recentCrop.id}`} />
          ) : (
            <StateMessage title="Belum ada produk" message={isBuyer ? "Produk tersedia akan muncul di sini." : "Tambahkan produk pertama dari menu Kelola."} />
          )}
          <FinanceSummary orders={orders} isBuyer={isBuyer} />
        </div>
      </section>
    </DashboardShell>
  );
}

function FinanceSummary({ orders, isBuyer }: { orders: Transaction[]; isBuyer: boolean }) {
  const todayTotal = orders
    .filter((order) => new Date(order.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, order) => sum + order.total_amount, 0);

  return (
    <div className="rounded-[22px] bg-white p-6 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
      <h3 className="text-[22px] font-bold text-[#0e4719]">Ringkasan Keuangan</h3>
      <div className="mt-7 space-y-5">
        <div className="flex items-center justify-between rounded-[18px] bg-[#f7fbf3] p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf4ec] text-[#2d6a4f]">
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-[#65725e]">Hari ini</span>
          </div>
          <span className="font-bold text-[#0e4719]">{formatCurrency(todayTotal)}</span>
        </div>
        <div className="flex items-center justify-between rounded-[18px] bg-[#fff8eb] p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0d8] text-[#c7772b]">
              <ArrowDownRight className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-[#65725e]">{isBuyer ? "Total item" : "Biaya estimasi"}</span>
          </div>
          <span className="font-bold text-[#0e4719]">{isBuyer ? orders.length : formatCurrency(todayTotal * 0.15)}</span>
        </div>
      </div>
    </div>
  );
}
