import { Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader, ProductCard, PrimaryButton } from "@/components/dashboard/ui";
import { products } from "@/lib/dashboard-data";

export default function KatalogDaganganPage() {
  return (
    <DashboardShell>
      <PageHeader
        title="Katalog Dagangan"
        subtitle="Kelola stok, harga, dan informasi produk yang dijual."
        action={
          <PrimaryButton href="/kelola-produk">
            <span className="inline-flex items-center gap-2">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Tambah Produk
            </span>
          </PrimaryButton>
        }
      />
      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} {...product} href="/kelola-produk" />
        ))}
      </section>
    </DashboardShell>
  );
}
