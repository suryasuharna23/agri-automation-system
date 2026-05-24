"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ImageIcon, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader, StateMessage } from "@/components/dashboard/ui";
import { getUploadUrl, marketplaceApi, transactionApi } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency, formatQuantity } from "@/lib/format";

export default function KeranjangPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearItem = useCartStore((state) => state.clearItem);
  const cropsQuery = useQuery({ queryKey: ["crops", true], queryFn: () => marketplaceApi.listCrops(true) });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const crops = cropsQuery.data ?? [];
      for (const item of items) {
        const crop = crops.find((candidate) => candidate.id === item.cropId);
        if (!crop || crop.quantity_kg < item.quantityKg) {
          throw new Error(`${item.name} tidak memiliki stok yang cukup.`);
        }
        const key = `web-${item.cropId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        await transactionApi.createOrder(item.cropId, item.quantityKg, key, "Dibuat dari web marketplace");
        clearItem(item.cropId);
      }
    },
    onSuccess: () => router.push("/status-pesanan"),
  });

  const subtotal = items.reduce((sum, item) => sum + item.quantityKg * item.pricePerKg, 0);
  const shipping = items.length > 0 ? 65000 : 0;
  const service = items.length > 0 ? 15000 : 0;

  return (
    <DashboardShell>
      <PageHeader title="Keranjang" subtitle="Tinjau produk yang akan dibeli sebelum membuat pesanan." />

      {items.length === 0 ? (
        <StateMessage title="Keranjang kosong" message="Tambahkan produk dari marketplace terlebih dahulu." />
      ) : (
        <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {items.map((item) => {
              const imageUrl = getUploadUrl(item.imageUrl);
              return (
                <article key={item.cropId} className="flex flex-wrap items-center gap-5 rounded-[22px] bg-white p-5 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#eaf4ec] text-[#71af7d]">
                    {imageUrl ? <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-7 w-7" aria-hidden="true" />}
                  </span>
                  <div className="min-w-[180px] flex-1">
                    <h2 className="text-[21px] font-bold text-[#0e4719]">{item.name}</h2>
                    <p className="mt-1 text-[15px] font-semibold text-[#75826e]">Stok: {formatQuantity(item.stockKg)}</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={item.stockKg}
                    value={item.quantityKg}
                    onChange={(event) => updateQuantity(item.cropId, Number(event.target.value) || 1)}
                    className="h-11 w-24 rounded-[14px] border border-[#dfe8d9] px-3 text-center font-bold text-[#0e4719] outline-none"
                    aria-label={`Jumlah ${item.name}`}
                  />
                  <p className="min-w-[130px] text-right text-[20px] font-bold text-[#0e4719]">{formatCurrency(item.quantityKg * item.pricePerKg)}</p>
                  <button type="button" onClick={() => removeItem(item.cropId)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#fff3ef] text-[#bf4f37]">
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>

          <aside className="h-fit rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
            <h2 className="text-[24px] font-bold text-[#0e4719]">Ringkasan</h2>
            <div className="mt-6 space-y-4 text-[16px] font-semibold text-[#65725e]">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span>Pengiriman</span><span>{formatCurrency(shipping)}</span></div>
              <div className="flex justify-between"><span>Layanan</span><span>{formatCurrency(service)}</span></div>
            </div>
            <div className="my-6 h-px bg-[#dfe8d9]" />
            <div className="flex justify-between text-[22px] font-bold text-[#0e4719]">
              <span>Total</span>
              <span>{formatCurrency(subtotal + shipping + service)}</span>
            </div>
            {checkoutMutation.isError && (
              <p className="mt-5 text-[14px] font-semibold text-red-600">
                {checkoutMutation.error instanceof Error ? checkoutMutation.error.message : "Pesanan belum bisa dibuat."}
              </p>
            )}
            <button
              type="button"
              disabled={checkoutMutation.isPending || cropsQuery.isLoading}
              onClick={() => checkoutMutation.mutate()}
              className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-[#0e4719] px-6 text-[15px] font-bold text-white shadow-[0_12px_24px_rgba(14,71,25,0.18)] disabled:opacity-60"
            >
              {checkoutMutation.isPending ? "Membuat pesanan..." : "Buat Pesanan"}
            </button>
          </aside>
        </section>
      )}
    </DashboardShell>
  );
}
