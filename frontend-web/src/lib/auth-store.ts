"use client";

import { create } from "zustand";
import { authApi } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setSession: (token: string, user: User) => void;
}

const persistSession = (token: string, user: User) => {
  localStorage.setItem("access_token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setSession: (token, user) => {
    persistSession(token, user);
    set({ token, user, isAuthenticated: true });
  },

  login: async (email, password) => {
    const data = await authApi.login(email, password);
    persistSession(data.access_token, data.user);
    set({ token: data.access_token, user: data.user, isAuthenticated: true });
  },

  logout: () => {
    clearSession();
    set({ token: null, user: null, isAuthenticated: false });
    window.location.href = "/login";
  },

  checkAuth: async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      clearSession();
      set({ token: null, user: null, isAuthenticated: false });
      return;
    }

    try {
      const user = await authApi.me();
      localStorage.setItem("user", JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    } catch (err) {
      console.error("🔧 [auth-store] checkAuth failed:", err);
      clearSession();
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
