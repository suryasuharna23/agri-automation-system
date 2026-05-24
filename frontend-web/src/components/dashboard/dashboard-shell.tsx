"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, Sprout } from "lucide-react";
import { sidebarItems } from "@/lib/dashboard-data";
import { useAuthStore } from "@/lib/auth-store";

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const visibleItems = sidebarItems.filter((item) => !user || item.roles.includes(user.role));

  useEffect(() => {
    if (!localStorage.getItem("access_token")) router.replace("/login");
  }, [router]);

  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#0e4719] lg:flex">
      <aside className="sticky top-0 z-30 flex min-h-screen w-full flex-col border-r border-[#dfe8d9] bg-white px-6 py-8 shadow-[8px_0_30px_rgba(14,71,25,0.06)] lg:w-[292px]">
        <Link href="/dashboard" className="mb-12 flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#eaf4ec] text-[#71af7d]">
            <Sprout className="h-8 w-8" aria-hidden="true" />
          </span>
          <span className="text-[28px] font-bold leading-none text-[#0e4719]">Agri</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-4">
          {visibleItems.map((item) => {
            const active = item.match.some((path) => pathname === path || pathname.startsWith(`${path}/`));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-[58px] items-center gap-4 rounded-[16px] px-5 text-[17px] font-semibold transition-colors ${
                  active
                    ? "bg-[#fffbd2] text-[#0e4719] shadow-[0_12px_24px_rgba(14,71,25,0.08)]"
                    : "text-[#72816c] hover:bg-[#f3f7ef] hover:text-[#0e4719]"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="mt-8 flex h-[52px] items-center gap-3 rounded-[14px] px-5 text-[15px] font-semibold text-[#72816c] transition-colors hover:bg-[#f3f7ef] hover:text-[#0e4719]"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Keluar
        </button>
      </aside>

      <section className="min-h-screen flex-1 overflow-hidden px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-[1088px]">{children}</div>
      </section>
    </main>
  );
}
