"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader, ProductCard, PrimaryButton, StateMessage } from "@/components/dashboard/ui";
import { marketplaceApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function KatalogDaganganPage() {
  const user = useAuthStore((state) => state.user);
  const cropsQuery = useQuery({ queryKey: ["crops", false], queryFn: () => marketplaceApi.listCrops(false), enabled: !!user });

  const crops = useMemo(() => {
    const all = cropsQuery.data ?? [];
    if (user?.role === "farmer") return all.filter((crop) => crop.farmer_id === user.id);
    return all;
  }, [cropsQuery.data, user]);

  return (
    <DashboardShell>
      <PageHeader
        title="Katalog Dagangan"
        subtitle="Kelola stok, harga, dan informasi produk yang dijual."
        action={
          <PrimaryButton href="/kelola-produk">
            <span className="inline-flex items-center gap-2">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Tambah Produk
            </span>
          </PrimaryButton>
        }
      />

      {cropsQuery.isLoading && <StateMessage title="Memuat produk..." message="Mengambil katalog dagangan Anda." />}
      {cropsQuery.isError && <StateMessage title="Produk belum bisa dimuat" message="Periksa koneksi backend lalu coba lagi." />}
      {!cropsQuery.isLoading && !cropsQuery.isError && crops.length === 0 && (
        <StateMessage title="Belum ada produk" message="Tambahkan produk pertama untuk mulai berjualan." />
      )}
      {crops.length > 0 && (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {crops.map((crop) => (
            <ProductCard key={crop.id} crop={crop} href={`/kelola-produk?id=${crop.id}`} />
          ))}
        </section>
      )}
    </DashboardShell>
  );
}
