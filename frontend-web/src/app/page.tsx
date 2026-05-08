import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-agri-bg flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-agri-green mb-4">Agri</h1>
      <p className="text-gray-600 text-lg mb-8 text-center max-w-md">
        Platform Agriculture Intelligence of Things — menghubungkan petani hortikultura dengan pembeli B2B
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-agri-green text-white rounded-lg hover:bg-agri-light transition-colors"
        >
          Masuk
        </Link>
        <Link
          href="/marketplace"
          className="px-6 py-3 border border-agri-green text-agri-green rounded-lg hover:bg-agri-bg transition-colors"
        >
          Lihat Marketplace
        </Link>
      </div>
    </main>
  );
}
