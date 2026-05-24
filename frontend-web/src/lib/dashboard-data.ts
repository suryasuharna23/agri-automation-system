import type { LucideIcon } from "lucide-react";
import { Boxes, ClipboardList, LayoutDashboard, ShoppingCart, Store, WalletCards } from "lucide-react";
import type { UserRole } from "@/types";

export type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
  roles: UserRole[];
};

export const sidebarItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: ["/dashboard"], roles: ["farmer", "buyer", "admin"] },
  {
    href: "/marketplace",
    label: "Katalog produk",
    icon: Store,
    match: ["/marketplace", "/katalog-detail", "/keranjang"],
    roles: ["buyer", "admin"],
  },
  {
    href: "/katalog-dagangan",
    label: "Kelola",
    icon: Boxes,
    match: ["/katalog-dagangan", "/kelola-produk"],
    roles: ["farmer", "admin"],
  },
  { href: "/keranjang", label: "Keranjang", icon: ShoppingCart, match: ["/keranjang"], roles: ["buyer", "admin"] },
  { href: "/status-pesanan", label: "Status Pesanan", icon: ClipboardList, match: ["/status-pesanan"], roles: ["farmer", "buyer", "admin"] },
  { href: "/keuangan", label: "Keuangan", icon: WalletCards, match: ["/keuangan"], roles: ["farmer", "buyer", "admin"] },
];
