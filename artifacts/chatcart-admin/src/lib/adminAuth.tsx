import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminFetch } from './adminFetch';

interface Admin {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  admin: Admin | null;
}

interface AdminAuthContextType extends AuthState {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('chatcart_admin_token');
    const adminStr = localStorage.getItem('chatcart_admin_user');
    let admin = null;
    try {
      if (adminStr) admin = JSON.parse(adminStr);
    } catch (e) {
      // Ignore
    }
    return { token, admin };
  });

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data = await res.json();
    localStorage.setItem('chatcart_admin_token', data.token);
    localStorage.setItem('chatcart_admin_user', JSON.stringify(data.admin));
    setState({ token: data.token, admin: data.admin });
  };

  const logout = async () => {
    try {
      await adminFetch('/api/admin/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('chatcart_admin_token');
      localStorage.removeItem('chatcart_admin_user');
      setState({ token: null, admin: null });
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        ...state,
        isAuthenticated: !!state.token,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
