import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  PackageCheck,
  ShoppingCart,
  Store,
  WalletCards,
} from "lucide-react";

export type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
};

export const sidebarItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: ["/dashboard"] },
  {
    href: "/marketplace",
    label: "Katalog produk",
    icon: Store,
    match: ["/marketplace", "/katalog-detail", "/keranjang"],
  },
  {
    href: "/katalog-dagangan",
    label: "Kelola",
    icon: Boxes,
    match: ["/katalog-dagangan", "/kelola-produk"],
  },
  { href: "/status-pesanan", label: "Status Pesanan", icon: ClipboardList, match: ["/status-pesanan"] },
  { href: "/keuangan", label: "Keuangan", icon: WalletCards, match: ["/keuangan"] },
];

export const products = [
  {
    id: "kangkung",
    name: "Kangkung",
    price: "Rp20.000",
    unit: "/ikat",
    stock: "200 ikat",
    sold: "39 terjual",
    image:
      "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80",
    description:
      "Kangkung segar dari lahan hidroponik dengan panen pagi, cocok untuk kebutuhan restoran dan toko sayur.",
    category: "Sayuran hijau",
  },
  {
    id: "bayam",
    name: "Bayam",
    price: "Rp18.000",
    unit: "/ikat",
    stock: "150 ikat",
    sold: "28 terjual",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
    description: "Bayam segar siap kirim dengan kualitas seragam.",
    category: "Sayuran hijau",
  },
  {
    id: "selada",
    name: "Selada",
    price: "Rp25.000",
    unit: "/kg",
    stock: "90 kg",
    sold: "41 terjual",
    image:
      "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=600&q=80",
    description: "Selada renyah untuk salad dan kebutuhan hotel.",
    category: "Sayuran segar",
  },
  {
    id: "tomat",
    name: "Tomat",
    price: "Rp16.000",
    unit: "/kg",
    stock: "120 kg",
    sold: "32 terjual",
    image:
      "https://images.unsplash.com/photo-1546470427-e5ac89be7391?auto=format&fit=crop&w=600&q=80",
    description: "Tomat merah dengan ukuran stabil dan masa simpan baik.",
    category: "Buah sayur",
  },
];

export const cartItems = [
  { name: "Kangkung", quantity: "10 ikat", price: "Rp200.000", status: "Siap dikirim", icon: ShoppingCart },
  { name: "Bayam", quantity: "8 ikat", price: "Rp144.000", status: "Menunggu konfirmasi", icon: PackageCheck },
  { name: "Selada", quantity: "12 kg", price: "Rp300.000", status: "Diproses petani", icon: Boxes },
  { name: "Tomat", quantity: "15 kg", price: "Rp240.000", status: "Siap dibayar", icon: BadgeDollarSign },
];

export const orderStatuses = [
  { title: "Pesanan Masuk", code: "AGR-2401", product: "Kangkung", amount: "Rp200.000", state: "Menunggu konfirmasi" },
  { title: "Diproses", code: "AGR-2402", product: "Bayam", amount: "Rp144.000", state: "Pengemasan" },
  { title: "Barang Dikirim", code: "AGR-2403", product: "Selada", amount: "Rp300.000", state: "Dalam perjalanan" },
  { title: "Selesai", code: "AGR-2398", product: "Tomat", amount: "Rp240.000", state: "Diterima pembeli" },
];

export const transactions = [
  { type: "Pemasukan", title: "Penjualan Kangkung", date: "8 Mei 2026", amount: "+Rp4.000.000" },
  { type: "Pemasukan", title: "Penjualan Selada", date: "7 Mei 2026", amount: "+Rp6.500.000" },
  { type: "Pengeluaran", title: "Pengiriman dan kemasan", date: "6 Mei 2026", amount: "-Rp1.250.000" },
  { type: "Pengeluaran", title: "Perawatan hidroponik", date: "5 Mei 2026", amount: "-Rp2.800.000" },
  { type: "Pemasukan", title: "Penjualan Bayam", date: "4 Mei 2026", amount: "+Rp3.200.000" },
];
