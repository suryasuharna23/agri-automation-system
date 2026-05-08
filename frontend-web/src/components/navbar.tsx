"use client";

import Link from "next/link";
import { useState } from "react";
import { Home, LayoutDashboard, LogIn, LogOut, Menu, ShoppingBasket, Sprout, UserPlus, X } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const closeMenu = () => setOpen(false);

  const navItems = isAuthenticated
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/marketplace", label: "Marketplace", icon: ShoppingBasket },
      ]
    : [
        { href: "/login", label: "Masuk", icon: LogIn },
        { href: "/register", label: "Daftar", icon: UserPlus },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-green-100 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-agri-green" onClick={closeMenu}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-agri-green text-white">
            <Sprout className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-xl">Agri</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <NavLink href="/" label="Beranda" icon={Home} />
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          {isAuthenticated && (
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-agri-green"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Keluar
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-green-50 hover:text-agri-green md:hidden"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-green-100 bg-white px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            <NavLink href="/" label="Beranda" icon={Home} onClick={closeMenu} />
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} onClick={closeMenu} />
            ))}
            {isAuthenticated && (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-agri-green"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Keluar
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

type NavLinkProps = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onClick?: () => void;
};

function NavLink({ href, label, icon: Icon, onClick }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-agri-green"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
