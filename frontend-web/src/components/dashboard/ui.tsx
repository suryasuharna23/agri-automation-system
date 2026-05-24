import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ImageIcon } from "lucide-react";
import type { Crop } from "@/types";
import { getUploadUrl } from "@/lib/api";
import { formatCurrency, formatQuantity } from "@/lib/format";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[34px] font-bold leading-tight text-[#0e4719]">{title}</h1>
        {subtitle && <p className="mt-2 text-[17px] leading-7 text-[#74806e]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-[20px] bg-white p-6 shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
      <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#eaf4ec] text-[#71af7d]">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="text-[32px] font-bold leading-none text-[#0e4719]">{value}</p>
      <p className="mt-3 text-[16px] font-medium text-[#75826e]">{label}</p>
    </div>
  );
}

type MoneyCardProps = {
  title: string;
  value: string;
  tone: "income" | "expense";
};

export function MoneyCard({ title, value, tone }: MoneyCardProps) {
  const isIncome = tone === "income";

  return (
    <div className={`rounded-[22px] p-7 ${isIncome ? "bg-[#fffbd2]" : "bg-white"} shadow-[0_16px_40px_rgba(14,71,25,0.08)]`}>
      <p className="text-[18px] font-semibold text-[#65725e]">{title}</p>
      <p className="mt-5 text-[32px] font-bold leading-tight text-[#0e4719]">{value}</p>
    </div>
  );
}

export function SectionTitle({ title, href, actionLabel }: { title: string; href?: string; actionLabel?: string }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-[24px] font-bold text-[#0e4719]">{title}</h2>
      {href && actionLabel && (
        <Link href={href} className="text-[15px] font-semibold text-[#2d6a4f] hover:text-[#52b788]">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function ProductCard({
  crop,
  href = "/katalog-detail",
}: {
  crop: Crop;
  href?: string;
}) {
  const imageUrl = getUploadUrl(crop.image_url);

  return (
    <article className="overflow-hidden rounded-[22px] bg-white shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
      <Link href={href} className="block">
        <div className="flex h-[190px] items-center justify-center bg-[#e7efe1] text-[#71af7d]">
          {imageUrl ? (
            <img src={imageUrl} alt={crop.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-12 w-12" aria-hidden="true" />
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[22px] font-bold text-[#0e4719]">{crop.name}</h3>
              <p className="mt-1 text-[15px] font-medium text-[#7a8574]">{formatQuantity(crop.quantity_kg)} tersedia</p>
            </div>
            <p className="whitespace-nowrap rounded-full bg-[#f7fbf3] px-3 py-1 text-[13px] font-semibold text-[#71af7d]">
              Grade {crop.grade}
            </p>
          </div>
          <p className="mt-5 text-[24px] font-bold text-[#0e4719]">
            {formatCurrency(crop.price_per_kg)}
            <span className="text-[15px] font-semibold text-[#7a8574]">/kg</span>
          </p>
        </div>
      </Link>
    </article>
  );
}

export function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#0e4719] px-6 text-[15px] font-bold text-white shadow-[0_12px_24px_rgba(14,71,25,0.18)] transition-colors hover:bg-[#2d6a4f]"
    >
      {children}
    </Link>
  );
}

export function StateMessage({ title, message }: { title: string; message?: string }) {
  return (
    <div className="rounded-[22px] bg-white p-8 text-center shadow-[0_16px_40px_rgba(14,71,25,0.08)]">
      <h2 className="text-[22px] font-bold text-[#0e4719]">{title}</h2>
      {message && <p className="mt-2 text-[16px] font-semibold text-[#75826e]">{message}</p>}
    </div>
  );
}
