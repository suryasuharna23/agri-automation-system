"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { UserRole } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Extract<UserRole, "farmer" | "buyer">>("farmer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await authApi.register({
        full_name: fullName,
        email,
        password,
        role,
      });
      setSession(data.access_token, data.user);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Registration failed:", err?.response?.status, err?.message ?? err);
      setError(err?.response?.status === 409 ? "Email sudah terdaftar." : "Pendaftaran gagal. Periksa kembali data Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-agri-bg flex items-center justify-center px-4 py-10">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-agri-green mb-2">Daftar Akun Agri</h1>
        <p className="text-sm text-gray-500 mb-6">Buat akun untuk mengelola lahan atau membeli komoditas.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-agri-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-agri-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-agri-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peran</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Extract<UserRole, "farmer" | "buyer">)}
              className="w-full border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-agri-green"
            >
              <option value="farmer">Petani</option>
              <option value="buyer">Pembeli</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-agri-green text-white py-2 rounded-lg hover:bg-agri-light transition-colors disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Daftar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-agri-green hover:text-agri-light">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
