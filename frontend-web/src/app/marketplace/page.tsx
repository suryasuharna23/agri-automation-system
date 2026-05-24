"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader, ProductCard, PrimaryButton, StateMessage } from "@/components/dashboard/ui";
import { marketplaceApi } from "@/lib/api";

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const cropsQuery = useQuery({ queryKey: ["crops", true], queryFn: () => marketplaceApi.listCrops(true) });

  const crops = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (cropsQuery.data ?? []).filter((crop) => {
      if (!term) return true;
      return [crop.name, crop.variety, crop.description, crop.grade].filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [cropsQuery.data, search]);

  return (
    <DashboardShell>
      <PageHeader
        title="Katalog Produk"
        subtitle="Pilih produk segar dari petani untuk kebutuhan pembelian B2B."
        action={<PrimaryButton href="/keranjang">Lihat Keranjang</PrimaryButton>}
      />

      <div className="mb-8 flex flex-col gap-4 rounded-[22px] bg-white p-5 shadow-[0_16px_40px_rgba(14,71,25,0.08)] sm:flex-row">
        <label className="flex h-14 flex-1 items-center gap-3 rounded-[16px] bg-[#f7fbf3] px-5 text-[#7a8574]">
          <Search className="h-5 w-5" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-transparent text-[16px] font-medium text-[#0e4719] outline-none placeholder:text-[#96a190]"
            placeholder="Cari produk"
            aria-label="Cari produk"
          />
        </label>
        <button className="inline-flex h-14 items-center justify-center gap-3 rounded-[16px] bg-[#fffbd2] px-5 text-[15px] font-bold text-[#0e4719]">
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          Tersedia
        </button>
      </div>

      {cropsQuery.isLoading && <StateMessage title="Memuat katalog..." message="Mengambil produk tersedia." />}
      {cropsQuery.isError && <StateMessage title="Katalog belum bisa dimuat" message="Periksa koneksi backend lalu coba lagi." />}
      {!cropsQuery.isLoading && !cropsQuery.isError && crops.length === 0 && (
        <StateMessage title="Produk tidak ditemukan" message="Coba kata kunci lain atau cek kembali nanti." />
      )}
      {crops.length > 0 && (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {crops.map((crop) => (
            <ProductCard key={crop.id} crop={crop} href={`/katalog-detail?id=${crop.id}`} />
          ))}
        </section>
      )}
    </DashboardShell>
  );
}
