import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MoneyCard, PageHeader, SectionTitle } from "@/components/dashboard/ui";
import { transactions } from "@/lib/dashboard-data";

export default function KeuanganPage() {
  return (
    <DashboardShell>
      <PageHeader title="Keuangan" subtitle="Lihat pemasukan, pengeluaran, dan riwayat transaksi usaha." />

      <section className="grid gap-5 md:grid-cols-2">
        <MoneyCard title="Pemasukan" value="Rp20.000.000" tone="income" />
        <MoneyCard title="Pengeluaran" value="Rp10.000.000" tone="expense" />
      </section>

      <section className="mt-10 rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
        <SectionTitle title="Daftar Transaksi" />
        <div className="space-y-4">
          {transactions.map((transaction) => {
            const income = transaction.type === "Pemasukan";
            return (
              <div key={`${transaction.title}-${transaction.date}`} className="flex items-center gap-5 rounded-[18px] bg-[#f7fbf3] p-5">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${income ? "bg-[#eaf4ec] text-[#2d6a4f]" : "bg-[#fff0d8] text-[#c7772b]"}`}>
                  {income ? <ArrowUpRight className="h-5 w-5" aria-hidden="true" /> : <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-bold text-[#0e4719]">{transaction.title}</h2>
                  <p className="mt-1 text-[14px] font-semibold text-[#75826e]">{transaction.date}</p>
                </div>
                <p className={`text-right text-[18px] font-bold ${income ? "text-[#0e4719]" : "text-[#c7772b]"}`}>
                  {transaction.amount}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </DashboardShell>
  );
}
