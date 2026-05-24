"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Save } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader, StateMessage } from "@/components/dashboard/ui";
import { getUploadUrl, marketplaceApi } from "@/lib/api";
import type { CropInput, CropUpdateInput } from "@/types";

const emptyForm = {
  name: "",
  variety: "",
  quantity_kg: "0",
  price_per_kg: "0",
  description: "",
  harvest_date: "",
  is_available: true,
};

export default function KelolaProdukPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <StateMessage title="Memuat produk..." message="Menyiapkan halaman kelola produk." />
        </DashboardShell>
      }
    >
      <KelolaProdukContent />
    </Suspense>
  );
}

function KelolaProdukContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const cropQuery = useQuery({ queryKey: ["crop", id], queryFn: () => marketplaceApi.getCrop(id as string), enabled: !!id });
  const crop = cropQuery.data;

  useEffect(() => {
    if (!crop) return;
    setForm({
      name: crop.name,
      variety: crop.variety ?? "",
      quantity_kg: String(crop.quantity_kg),
      price_per_kg: String(crop.price_per_kg),
      description: crop.description ?? "",
      harvest_date: crop.harvest_date ? crop.harvest_date.slice(0, 10) : "",
      is_available: crop.is_available,
    });
  }, [crop]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CropInput = {
        name: form.name.trim(),
        variety: form.variety.trim() || null,
        quantity_kg: Number(form.quantity_kg),
        price_per_kg: Number(form.price_per_kg),
        description: form.description.trim() || null,
        harvest_date: form.harvest_date ? new Date(form.harvest_date).toISOString() : null,
      };

      const saved = id
        ? await marketplaceApi.updateCrop(id, { ...payload, is_available: form.is_available } satisfies CropUpdateInput)
        : await marketplaceApi.createCrop(payload);

      if (imageFile) {
        return marketplaceApi.uploadCropImage(saved.id, imageFile);
      }
      return saved;
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["crops"] });
      await queryClient.invalidateQueries({ queryKey: ["crop", saved.id] });
      router.push(`/kelola-produk?id=${saved.id}`);
    },
    onError: () => setError("Produk belum bisa disimpan. Periksa data dan koneksi backend."),
  });

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || Number(form.quantity_kg) <= 0 || Number(form.price_per_kg) <= 0) {
      setError("Nama, stok, dan harga harus diisi dengan benar.");
      return;
    }
    saveMutation.mutate();
  };

  const imageUrl = getUploadUrl(crop?.image_url);

  return (
    <DashboardShell>
      <PageHeader title={id ? "Kelola Produk" : "Tambah Produk"} subtitle="Perbarui detail produk yang tampil di katalog dagangan." />

      {id && cropQuery.isLoading && <StateMessage title="Memuat produk..." message="Mengambil data produk." />}
      {id && cropQuery.isError && <StateMessage title="Produk tidak ditemukan" message="Buka produk dari katalog dagangan Anda." />}
      {(!id || crop) && (
        <section className="grid gap-7 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
            <p className="mb-4 text-[18px] font-bold text-[#0e4719]">Gambar</p>
            <label className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-[22px] bg-[#eaf4ec]">
              {imageFile ? (
                <img src={URL.createObjectURL(imageFile)} alt="Pratinjau produk" className="h-full w-full object-cover" />
              ) : imageUrl ? (
                <img src={imageUrl} alt={crop?.name ?? "Produk"} className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-[#71af7d]">
                  <ImagePlus className="mx-auto h-14 w-14" aria-hidden="true" />
                  <p className="mt-4 text-[15px] font-semibold">Unggah gambar produk</p>
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[24px] bg-white p-7 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
            <div className="grid gap-6">
              <TextField label="Nama Produk" value={form.name} onChange={(value) => updateField("name", value)} />
              <TextField label="Varietas" value={form.variety} onChange={(value) => updateField("variety", value)} />
              <TextField label="Harga per kg" type="number" value={form.price_per_kg} onChange={(value) => updateField("price_per_kg", value)} />
              <TextField label="Stok kg" type="number" value={form.quantity_kg} onChange={(value) => updateField("quantity_kg", value)} />
              <TextField label="Tanggal Panen" type="date" value={form.harvest_date} onChange={(value) => updateField("harvest_date", value)} />
              <label className="block">
                <span className="mb-3 block text-[17px] font-bold text-[#0e4719]">Deskripsi</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-[18px] border border-[#dfe8d9] bg-[#f9fcf7] px-5 py-4 text-[16px] font-medium text-[#0e4719] outline-none focus:border-[#71af7d]"
                />
              </label>
              <label className="flex items-center gap-3 text-[16px] font-bold text-[#0e4719]">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(event) => updateField("is_available", event.target.checked)}
                  className="h-5 w-5 accent-[#0e4719]"
                />
                Tampilkan di marketplace
              </label>
            </div>
            {error && <p className="mt-5 text-[15px] font-semibold text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="mt-8 inline-flex h-14 items-center justify-center gap-3 rounded-[16px] bg-[#0e4719] px-7 py-4 text-[15px] font-bold text-white disabled:opacity-60"
            >
              <Save className="h-5 w-5" aria-hidden="true" />
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        </section>
      )}
    </DashboardShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-3 block text-[17px] font-bold text-[#0e4719]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 w-full rounded-[18px] border border-[#dfe8d9] bg-[#f9fcf7] px-5 text-[16px] font-medium text-[#0e4719] outline-none focus:border-[#71af7d]"
      />
    </label>
  );
}
