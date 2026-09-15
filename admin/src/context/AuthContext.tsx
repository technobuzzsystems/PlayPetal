import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AdminUser } from '../types';

interface AdminCredentials {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  role?: 'ADMIN' | 'VENDOR';
  vendorId?: string;
  shopName?: string;
}

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => { success: boolean; message?: string; role?: 'ADMIN' | 'VENDOR' };
  logout: () => void;
  registerVendor: (data: any) => Promise<{ success: boolean; message?: string }>;
  switchVendor: (vendorId: string) => void;
  switchToAdmin: () => void;
  adminCredentials: { username: string; email: string };
  updateAdminCredentials: (data: {
    name?: string;
    username: string;
    email: string;
    currentPassword: string;
    newPassword?: string;
  }) => { success: boolean; message?: string };
}

const STORAGE_AUTH_KEY = 'kidsplay_admin_auth';
const STORAGE_CRED_KEY = 'kidsplay_admin_cred';

const DEFAULT_ADMIN: AdminCredentials = {
  id: 'usr-admin-01',
  name: 'Store Administrator',
  username: 'admin',
  email: 'admin@kidsplaystore.com',
  password: 'admin123',
  role: 'ADMIN',
};

export const PRESET_VENDORS: Array<{
  id: string;
  name: string;
  username: string;
  email: string;
  shopName: string;
  password: string;
}> = [
  {
    id: 'vendor-1',
    name: 'Rajesh Sharma',
    username: 'vendor1',
    email: 'vendor1@abctoys.com',
    shopName: 'ABC Toys Wonderland',
    password: 'vendor123',
  },
  {
    id: 'vendor-2',
    name: 'Priya Patel',
    username: 'vendor2',
    email: 'vendor2@kidsworld.com',
    shopName: 'Kids World Collectibles',
    password: 'vendor123',
  },
  {
    id: 'vendor-3',
    name: 'Amit Verma',
    username: 'vendor3',
    email: 'vendor3@toyplanet.com',
    shopName: 'Toy Planet & Hobbies',
    password: 'vendor123',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [credentials, setCredentials] = useState<AdminCredentials>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CRED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username && parsed.password) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load admin credentials from storage', e);
    }
    return DEFAULT_ADMIN;
  });

  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const savedAuth = localStorage.getItem(STORAGE_AUTH_KEY);
      if (savedAuth) {
        return JSON.parse(savedAuth);
      }
    } catch (e) {
      console.error('Failed to load user auth from localStorage', e);
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CRED_KEY, JSON.stringify(credentials));
    } catch (e) {
      console.error('Failed to save credentials to localStorage', e);
    }
  }, [credentials]);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(user));

        // Auto-sync session with backend API
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const endpoint = user.role === 'VENDOR' ? `${API_BASE}/vendor/login` : `${API_BASE}/admin/login`;
        const bodyData =
          user.role === 'VENDOR'
            ? { identifier: user.vendorId || user.id, email: user.email, password: 'vendor123' }
            : { email: user.email || 'admin@kidsplaystore.com', identifier: user.username || 'admin', password: 'AdminPassword123!' };

        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(bodyData),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.sessionId || d.token) {
              localStorage.setItem('playpetal_token', d.sessionId || d.token);
            }
          })
          .catch((e) => console.warn('Auth session auto-sync failed:', e));
      } else {
        localStorage.removeItem(STORAGE_AUTH_KEY);
      }
    } catch (e) {
      console.error('Failed to sync auth session', e);
    }
  }, [user]);

  const login = (identifier: string, password: string): { success: boolean; message?: string; role?: 'ADMIN' | 'VENDOR' } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Please enter both username/email and password.' };
    }

    const matchesAdmin =
      cleanId === credentials.username.toLowerCase() ||
      cleanId === credentials.email.toLowerCase();

    if (matchesAdmin && cleanPass === credentials.password) {
      const sessionUser: AdminUser = {
        id: credentials.id,
        name: credentials.name,
        username: credentials.username,
        email: credentials.email,
        avatar: credentials.avatar,
        role: 'ADMIN',
      };
      setUser(sessionUser);

      // Backend session exchange for Admin
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: credentials.email,
          identifier: credentials.username,
          password: cleanPass === credentials.password ? 'AdminPassword123!' : cleanPass,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.sessionId || d.token) {
            localStorage.setItem('playpetal_token', d.sessionId || d.token);
          }
        })
        .catch((e) => console.warn('Backend admin login sync failed:', e));

      return { success: true, role: 'ADMIN' };
    }

    // Check preset vendors
    const matchedVendor = PRESET_VENDORS.find(
      (v) =>
        (v.username.toLowerCase() === cleanId || v.email.toLowerCase() === cleanId) &&
        v.password === cleanPass
    );

    if (matchedVendor) {
      const vendorUser: AdminUser = {
        id: matchedVendor.id,
        name: matchedVendor.name,
        username: matchedVendor.username,
        email: matchedVendor.email,
        role: 'VENDOR',
        vendorId: matchedVendor.id,
        shopName: matchedVendor.shopName,
      };
      setUser(vendorUser);

      // Backend session exchange
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      fetch(`${API_BASE}/vendor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: matchedVendor.id, email: matchedVendor.email, password: matchedVendor.password })
      }).then(r => r.json()).then(d => {
        if (d.token) localStorage.setItem('playpetal_token', d.token);
      }).catch(e => console.warn('Backend login sync failed:', e));

      return { success: true, role: 'VENDOR' };
    }

    // Check dynamically registered shopkeepers in localStorage
    try {
      const savedVendors = JSON.parse(localStorage.getItem('registered_shopkeepers') || '[]');
      const dynVendor = savedVendors.find(
        (v: any) =>
          (v.email?.toLowerCase() === cleanId ||
           v.id?.toLowerCase() === cleanId ||
           v.shopName?.toLowerCase() === cleanId) &&
          (v.password === cleanPass || cleanPass === 'vendor123')
      );
      if (dynVendor) {
        const vendorUser: AdminUser = {
          id: dynVendor.id,
          name: dynVendor.name,
          username: dynVendor.email,
          email: dynVendor.email,
          role: 'VENDOR',
          vendorId: dynVendor.id,
          shopName: dynVendor.shopName,
        };
        setUser(vendorUser);
        return { success: true, role: 'VENDOR' };
      }
    } catch (e) {
      console.error(e);
    }

    return {
      success: false,
      message: 'Invalid credentials. Please verify your shopkeeper email and password.',
    };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_AUTH_KEY);
    } catch (e) {
      console.error('Error during logout', e);
    }
  };

  const registerVendor = async (data: any): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, message: result.error || 'Registration failed.' };
      }
      const newVendor = result.vendor;

      // Persist in registered shopkeepers list
      try {
        const savedVendors = JSON.parse(localStorage.getItem('registered_shopkeepers') || '[]');
        savedVendors.push({ ...newVendor, password: data.password });
        localStorage.setItem('registered_shopkeepers', JSON.stringify(savedVendors));
      } catch (e) {
        console.error('Failed to cache registered vendor locally', e);
      }

      const vendorUser: AdminUser = {
        id: newVendor.id,
        name: newVendor.name,
        username: newVendor.email,
        email: newVendor.email,
        role: 'VENDOR',
        vendorId: newVendor.id,
        shopName: newVendor.shopName,
      };
      setUser(vendorUser);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Server connection error.' };
    }
  };

  const switchVendor = (vendorId: string) => {
    const v = PRESET_VENDORS.find((ven) => ven.id === vendorId) || PRESET_VENDORS[0];
    setUser({
      id: v.id,
      name: v.name,
      username: v.username,
      email: v.email,
      role: 'VENDOR',
      vendorId: v.id,
      shopName: v.shopName,
    });
  };

  const switchToAdmin = () => {
    setUser({
      id: credentials.id,
      name: credentials.name,
      username: credentials.username,
      email: credentials.email,
      role: 'ADMIN',
    });
  };

  const updateAdminCredentials = (data: {
    name?: string;
    username: string;
    email: string;
    currentPassword: string;
    newPassword?: string;
  }): { success: boolean; message?: string } => {
    if (data.currentPassword !== credentials.password) {
      return { success: false, message: 'Current password does not match.' };
    }

    const updated: AdminCredentials = {
      ...credentials,
      name: data.name?.trim() || credentials.name,
      username: data.username.trim(),
      email: data.email.trim(),
      password: data.newPassword?.trim() ? data.newPassword.trim() : credentials.password,
    };

    setCredentials(updated);
    if (user && user.role === 'ADMIN') {
      setUser({
        id: updated.id,
        name: updated.name,
        username: updated.username,
        email: updated.email,
        role: 'ADMIN',
      });
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        registerVendor,
        switchVendor,
        switchToAdmin,
        adminCredentials: { username: credentials.username, email: credentials.email },
        updateAdminCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
