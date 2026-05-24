"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Minus, Plus, ShoppingCart } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader, PrimaryButton, StateMessage } from "@/components/dashboard/ui";
import { getUploadUrl, marketplaceApi } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

export default function KatalogDetailPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <StateMessage title="Memuat detail..." message="Menyiapkan halaman produk." />
        </DashboardShell>
      }
    >
      <KatalogDetailContent />
    </Suspense>
  );
}

function KatalogDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const user = useAuthStore((state) => state.user);
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const cropQuery = useQuery({ queryKey: ["crop", id], queryFn: () => marketplaceApi.getCrop(id as string), enabled: !!id });
  const crop = cropQuery.data;
  const imageUrl = getUploadUrl(crop?.image_url);
  const canBuy = user?.role === "buyer" || user?.role === "admin";
  const canManage = !!crop && (user?.role === "admin" || user?.id === crop.farmer_id);

  const addToCart = () => {
    if (!crop) return;
    addItem(crop, quantity);
    setMessage("Produk ditambahkan ke keranjang.");
  };

  if (!id) {
    return (
      <DashboardShell>
        <StateMessage title="Produk tidak ditemukan" message="Buka detail dari halaman katalog produk." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader title="Detail Produk" subtitle="Informasi lengkap produk untuk pembelian." />

      {cropQuery.isLoading && <StateMessage title="Memuat detail..." message="Mengambil data produk." />}
      {cropQuery.isError && <StateMessage title="Detail belum bisa dimuat" message="Produk tidak ditemukan atau koneksi backend bermasalah." />}
      {crop && (
        <section className="grid gap-8 rounded-[24px] bg-white p-7 shadow-[0_16px_40px_rgba(14,71,25,0.08)] lg:grid-cols-[470px_minmax(0,1fr)]">
          <div className="flex h-[460px] items-center justify-center overflow-hidden rounded-[24px] bg-[#eaf4ec] text-[#71af7d]">
            {imageUrl ? <img src={imageUrl} alt={crop.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-16 w-16" aria-hidden="true" />}
          </div>
          <div className="flex flex-col justify-center">
            <p className="mb-4 inline-flex w-fit rounded-full bg-[#fffbd2] px-4 py-2 text-[14px] font-bold text-[#0e4719]">
              Grade {crop.grade}
            </p>
            <h2 className="text-[42px] font-bold leading-tight text-[#0e4719]">{crop.name}</h2>
            {crop.variety && <p className="mt-2 text-[17px] font-semibold text-[#71af7d]">{crop.variety}</p>}
            <p className="mt-5 max-w-xl text-[18px] leading-8 text-[#65725e]">{crop.description || "Belum ada deskripsi produk."}</p>
            <p className="mt-8 text-[36px] font-bold text-[#0e4719]">
              {formatCurrency(crop.price_per_kg)}
              <span className="text-[18px] font-semibold text-[#7a8574]">/kg</span>
            </p>
            <p className="mt-3 text-[16px] font-semibold text-[#71af7d]">Stok tersedia: {formatQuantity(crop.quantity_kg)}</p>

            {canBuy && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <div className="flex h-12 items-center overflow-hidden rounded-[16px] border border-[#dfe8d9]">
                  <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-full w-12 items-center justify-center text-[#0e4719]">
                    <Minus className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <input
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Math.min(Number(event.target.value) || 1, crop.quantity_kg)))}
                    className="h-full w-20 border-x border-[#dfe8d9] text-center text-[16px] font-bold text-[#0e4719] outline-none"
                    aria-label="Jumlah kg"
                  />
                  <button type="button" onClick={() => setQuantity((value) => Math.min(crop.quantity_kg, value + 1))} className="flex h-full w-12 items-center justify-center text-[#0e4719]">
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <button type="button" onClick={addToCart} className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#0e4719] px-6 text-[15px] font-bold text-white shadow-[0_12px_24px_rgba(14,71,25,0.18)] transition-colors hover:bg-[#2d6a4f]">
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  Tambah ke Keranjang
                </button>
              </div>
            )}

            {canManage && (
              <div className="mt-6">
                <PrimaryButton href={`/kelola-produk?id=${crop.id}`}>Kelola Produk</PrimaryButton>
              </div>
            )}
            {message && <p className="mt-4 text-[15px] font-semibold text-[#2d6a4f]">{message}</p>}
            {!canBuy && !canManage && (
              <Link href="/marketplace" className="mt-6 text-[15px] font-bold text-[#2d6a4f]">
                Kembali ke katalog
              </Link>
            )}
          </div>
        </section>
      )}
    </DashboardShell>
  );
}
