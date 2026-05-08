import { Minus, Plus, ShoppingCart } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader, PrimaryButton } from "@/components/dashboard/ui";
import { products } from "@/lib/dashboard-data";

const product = products[0];

export default function KatalogDetailPage() {
  return (
    <DashboardShell>
      <PageHeader title="Detail Produk" subtitle="Informasi lengkap produk Kangkung untuk pembelian." />

      <section className="grid gap-8 rounded-[24px] bg-white p-7 shadow-[0_16px_40px_rgba(14,71,25,0.08)] lg:grid-cols-[470px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[24px] bg-[#eaf4ec]">
          <img src={product.image} alt={product.name} className="h-[460px] w-full object-cover" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="mb-4 inline-flex w-fit rounded-full bg-[#fffbd2] px-4 py-2 text-[14px] font-bold text-[#0e4719]">
            {product.category}
          </p>
          <h2 className="text-[42px] font-bold leading-tight text-[#0e4719]">{product.name}</h2>
          <p className="mt-5 max-w-xl text-[18px] leading-8 text-[#65725e]">{product.description}</p>
          <p className="mt-8 text-[36px] font-bold text-[#0e4719]">
            {product.price}
            <span className="text-[18px] font-semibold text-[#7a8574]">{product.unit}</span>
          </p>
          <p className="mt-3 text-[16px] font-semibold text-[#71af7d]">Stok tersedia: {product.stock}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex h-12 items-center overflow-hidden rounded-[16px] border border-[#dfe8d9]">
              <button className="flex h-full w-12 items-center justify-center text-[#0e4719]">
                <Minus className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="flex h-full w-16 items-center justify-center border-x border-[#dfe8d9] text-[16px] font-bold text-[#0e4719]">
                10
              </span>
              <button className="flex h-full w-12 items-center justify-center text-[#0e4719]">
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <PrimaryButton href="/keranjang">
              <span className="inline-flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                Tambah ke Keranjang
              </span>
            </PrimaryButton>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
