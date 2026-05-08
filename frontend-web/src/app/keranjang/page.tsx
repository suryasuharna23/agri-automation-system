import { Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader, PrimaryButton } from "@/components/dashboard/ui";
import { cartItems } from "@/lib/dashboard-data";

export default function KeranjangPage() {
  return (
    <DashboardShell>
      <PageHeader title="Keranjang" subtitle="Tinjau produk yang akan dibeli sebelum membuat pesanan." />

      <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {cartItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.name} className="flex items-center gap-5 rounded-[22px] bg-white p-5 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-[#eaf4ec] text-[#71af7d]">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[21px] font-bold text-[#0e4719]">{item.name}</h2>
                  <p className="mt-1 text-[15px] font-semibold text-[#75826e]">
                    {item.quantity} · {item.status}
                  </p>
                </div>
                <p className="text-right text-[20px] font-bold text-[#0e4719]">{item.price}</p>
                <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#fff3ef] text-[#bf4f37]">
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>

        <aside className="h-fit rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
          <h2 className="text-[24px] font-bold text-[#0e4719]">Ringkasan</h2>
          <div className="mt-6 space-y-4 text-[16px] font-semibold text-[#65725e]">
            <div className="flex justify-between"><span>Subtotal</span><span>Rp884.000</span></div>
            <div className="flex justify-between"><span>Pengiriman</span><span>Rp65.000</span></div>
            <div className="flex justify-between"><span>Layanan</span><span>Rp15.000</span></div>
          </div>
          <div className="my-6 h-px bg-[#dfe8d9]" />
          <div className="flex justify-between text-[22px] font-bold text-[#0e4719]">
            <span>Total</span>
            <span>Rp964.000</span>
          </div>
          <div className="mt-7">
            <PrimaryButton href="/status-pesanan">Buat Pesanan</PrimaryButton>
          </div>
        </aside>
      </section>
    </DashboardShell>
  );
}
