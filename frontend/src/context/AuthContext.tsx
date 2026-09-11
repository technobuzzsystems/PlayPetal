"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Customer = {
  id: string;
  name: string;
  email: string;
  playPoints: number;
};

type AuthContextType = {
  user: Customer | null;
  login: (userData: Customer) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("playpetal_user") || localStorage.getItem("toyjoy_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const login = (userData: Customer) => {
    setUser(userData);
    localStorage.setItem("playpetal_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("playpetal_user");
    localStorage.removeItem("toyjoy_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
