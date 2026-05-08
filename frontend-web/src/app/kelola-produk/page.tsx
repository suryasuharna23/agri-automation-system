import { ImagePlus, Save } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/ui";

const fields = [
  { label: "Nama Produk", value: "Kangkung" },
  { label: "Deskripsi", value: "Kangkung segar dari lahan hidroponik, dipanen pagi dan siap kirim.", textarea: true },
  { label: "Harga", value: "Rp20.000" },
  { label: "Stok", value: "200 ikat" },
];

export default function KelolaProdukPage() {
  return (
    <DashboardShell>
      <PageHeader title="Kelola Produk" subtitle="Perbarui detail produk yang tampil di katalog dagangan." />

      <section className="grid gap-7 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
          <p className="mb-4 text-[18px] font-bold text-[#0e4719]">Gambar</p>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[22px] bg-[#eaf4ec]">
            <div className="text-center text-[#71af7d]">
              <ImagePlus className="mx-auto h-14 w-14" aria-hidden="true" />
              <p className="mt-4 text-[15px] font-semibold">Unggah gambar produk</p>
            </div>
          </div>
        </div>

        <form className="rounded-[24px] bg-white p-7 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
          <div className="grid gap-6">
            {fields.map((field) => (
              <label key={field.label} className="block">
                <span className="mb-3 block text-[17px] font-bold text-[#0e4719]">{field.label}</span>
                {field.textarea ? (
                  <textarea
                    defaultValue={field.value}
                    rows={5}
                    className="w-full resize-none rounded-[18px] border border-[#dfe8d9] bg-[#f9fcf7] px-5 py-4 text-[16px] font-medium text-[#0e4719] outline-none focus:border-[#71af7d]"
                  />
                ) : (
                  <input
                    defaultValue={field.value}
                    className="h-14 w-full rounded-[18px] border border-[#dfe8d9] bg-[#f9fcf7] px-5 text-[16px] font-medium text-[#0e4719] outline-none focus:border-[#71af7d]"
                  />
                )}
              </label>
            ))}
          </div>
          <button className="mt-8 inline-flex h-14 items-center justify-center gap-3 rounded-[16px] bg-[#0e4719] px-7 py-4 text-[15px] font-bold text-white">
            <Save className="h-5 w-5" aria-hidden="true" />
            Simpan Perubahan
          </button>
        </form>
      </section>
    </DashboardShell>
  );
}
