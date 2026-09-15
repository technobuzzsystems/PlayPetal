"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Customer = {
  id: string;
  name: string;
  email: string;
  playPoints: number;
  phone?: string | null;
  hasAddress?: boolean;
  addressesCount?: number;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

type AuthContextType = {
  user: Customer | null;
  authLoading: boolean;
  login: (userData: Customer) => void;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<Customer>) => void;
  refreshSession: () => Promise<Customer | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const refreshSession = async (): Promise<Customer | null> => {
    try {
      const token = localStorage.getItem("playpetal_token") || localStorage.getItem("token") || "";
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/customers/me`, {
        credentials: "include",
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.customer) {
          setUser(data.customer);
          localStorage.setItem("playpetal_user", JSON.stringify(data.customer));
          return data.customer;
        }
      }
      // Session invalid or unauthenticated
      setUser(null);
      localStorage.removeItem("playpetal_user");
      localStorage.removeItem("toyjoy_user");
      localStorage.removeItem("playpetal_token");
      return null;
    } catch (err) {
      console.warn("Session refresh failed:", err);
      return null;
    }
  };

  // Sync authenticated session from server on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const stored = localStorage.getItem("playpetal_user") || localStorage.getItem("toyjoy_user");
        let initialUser: Customer | null = stored ? JSON.parse(stored) : null;

        const token = localStorage.getItem("playpetal_token") || localStorage.getItem("token") || "";
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/customers/me`, {
          credentials: "include",
          headers,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.customer) {
            setUser(data.customer);
            localStorage.setItem("playpetal_user", JSON.stringify(data.customer));
          } else if (initialUser) {
            setUser(initialUser);
          }
        } else {
          // If server rejects session, clear stale cached user
          setUser(null);
          localStorage.removeItem("playpetal_user");
          localStorage.removeItem("toyjoy_user");
          localStorage.removeItem("playpetal_token");
        }
      } catch (err) {
        console.warn("Failed to verify server auth session:", err);
        const stored = localStorage.getItem("playpetal_user") || localStorage.getItem("toyjoy_user");
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } finally {
        setAuthLoading(false);
      }
    };

    fetchSession();
  }, []);

  const login = (userData: Customer) => {
    setUser(userData);
    localStorage.setItem("playpetal_user", JSON.stringify(userData));
  };

  const updateUser = (updatedData: Partial<Customer>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedData };
      localStorage.setItem("playpetal_user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/customers/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Server logout notification failed:", err);
    } finally {
      // Clear user state
      setUser(null);

      // Clear customer-specific auth keys from localStorage
      localStorage.removeItem("playpetal_user");
      localStorage.removeItem("toyjoy_user");
      localStorage.removeItem("playpetal_token");
      localStorage.removeItem("token");
      localStorage.removeItem("kidsplay_customer_auth");
    }
  };

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout, updateUser, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
