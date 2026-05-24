import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { authApi, setUnauthorizedHandler } from "./api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("access_token");
        if (__DEV__) console.log("[AuthContext] token found:", !!token);
        if (!token) {
          setIsAuthenticated(false);
          return;
        }
        await authApi.me();
        setIsAuthenticated(true);
      } catch (err) {
        if (__DEV__) console.error("[AuthContext] auth check failed:", err);
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("user");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsAuthenticated(false);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(() => {
    if (__DEV__) console.log("[AuthContext] login() called");
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    if (__DEV__) console.log("[AuthContext] logout() called");
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("user");
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
