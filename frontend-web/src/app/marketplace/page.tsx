"use client";
import { useEffect, useState } from "react";
import { marketplaceApi, transactionApi } from "@/lib/api";
import type { Crop } from "@/types";
import { v4 as uuidv4 } from "uuid";

const gradeColors: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-yellow-100 text-yellow-700",
  C: "bg-orange-100 text-orange-700",
  ungraded: "bg-gray-100 text-gray-500",
};

export default function MarketplacePage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplaceApi.listCrops().then(setCrops).finally(() => setLoading(false));
  }, []);

  const handleOrder = async (crop: Crop) => {
    const qty = prompt(`Masukkan jumlah yang ingin dibeli (max ${crop.quantity_kg} kg):`);
    if (!qty) return;
    const quantity = parseFloat(qty);
    if (isNaN(quantity) || quantity <= 0) return alert("Jumlah tidak valid");
    try {
      await transactionApi.createOrder(crop.id, quantity, uuidv4());
      alert("Pesanan berhasil dibuat!");
    } catch {
      alert("Gagal membuat pesanan. Pastikan sudah login sebagai pembeli.");
    }
  };

  return (
    <main className="min-h-screen bg-agri-bg p-6">
      <h1 className="text-2xl font-bold text-agri-green mb-6">Marketplace Komoditas</h1>
      {loading ? (
        <p className="text-gray-500">Memuat produk...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {crops.map((crop) => (
            <div key={crop.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                {crop.image_url ? (
                  <img src={crop.image_url} alt={crop.name} className="w-full h-full object-cover" />
                ) : (
                  "Tidak ada gambar"
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-semibold text-gray-800">{crop.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${gradeColors[crop.grade]}`}>
                    Grade {crop.grade}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">{crop.variety ?? "—"} · {crop.quantity_kg} kg tersedia</p>
                <p className="text-agri-green font-bold text-lg mb-3">
                  Rp {crop.price_per_kg.toLocaleString("id-ID")}/kg
                </p>
                <button
                  onClick={() => handleOrder(crop)}
                  className="w-full bg-agri-green text-white py-2 rounded-lg hover:bg-agri-light transition-colors text-sm"
                >
                  Pesan Sekarang
                </button>
              </div>
            </div>
          ))}
          {crops.length === 0 && (
            <p className="text-gray-400 col-span-3 text-center py-12">Belum ada produk tersedia.</p>
          )}
        </div>
      )}
    </main>
  );
}
