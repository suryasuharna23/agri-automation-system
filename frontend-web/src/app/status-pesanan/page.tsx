import { CheckCircle2, Clock3, Package, Truck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/ui";
import { orderStatuses } from "@/lib/dashboard-data";

const icons = [Clock3, Package, Truck, CheckCircle2];

export default function StatusPesananPage() {
  return (
    <DashboardShell>
      <PageHeader title="Status Pesanan" subtitle="Pantau proses pesanan dari konfirmasi hingga diterima pembeli." />

      <section className="grid gap-5 md:grid-cols-2">
        {orderStatuses.map((order, index) => {
          const Icon = icons[index];
          return (
            <article key={order.code} className="rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#eaf4ec] text-[#71af7d]">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-[#fffbd2] px-4 py-2 text-[13px] font-bold text-[#0e4719]">{order.code}</span>
              </div>
              <h2 className="mt-7 text-[24px] font-bold text-[#0e4719]">{order.title}</h2>
              <p className="mt-2 text-[16px] font-semibold text-[#65725e]">{order.product}</p>
              <div className="mt-6 flex items-center justify-between rounded-[18px] bg-[#f7fbf3] p-5">
                <span className="text-[15px] font-semibold text-[#75826e]">{order.state}</span>
                <span className="text-[18px] font-bold text-[#0e4719]">{order.amount}</span>
              </div>
            </article>
          );
        })}
      </section>
    </DashboardShell>
  );
}
