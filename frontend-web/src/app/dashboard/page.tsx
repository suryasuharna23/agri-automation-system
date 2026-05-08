import { ArrowDownRight, ArrowUpRight, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MoneyCard, PageHeader, ProductCard, SectionTitle, StatCard } from "@/components/dashboard/ui";
import { products } from "@/lib/dashboard-data";

export default function DashboardPage() {
  return (
    <DashboardShell>
      <PageHeader title="Halo, Petani!" subtitle="Pantau penjualan, pesanan, dan stok produk pertanian hari ini." />

      <section className="grid gap-5 md:grid-cols-3">
        <StatCard icon={ShoppingBag} value="39" label="Terjual" />
        <StatCard icon={PackageCheck} value="240" label="Pesanan Masuk" />
        <StatCard icon={Truck} value="225" label="Barang Dikirim" />
      </section>

      <section className="mt-7 grid gap-5 md:grid-cols-2">
        <MoneyCard title="Pemasukan" value="Rp20.000.000" tone="income" />
        <MoneyCard title="Pengeluaran" value="Rp5.000.000" tone="expense" />
      </section>

      <section className="mt-10">
        <SectionTitle title="Produk" href="/katalog-dagangan" actionLabel="Lihat semua" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ProductCard {...products[0]} />
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
                <span className="font-bold text-[#0e4719]">Rp2.400.000</span>
              </div>
              <div className="flex items-center justify-between rounded-[18px] bg-[#fff8eb] p-5">
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0d8] text-[#c7772b]">
                    <ArrowDownRight className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-semibold text-[#65725e]">Biaya</span>
                </div>
                <span className="font-bold text-[#0e4719]">Rp650.000</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
