'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AuthUser,
  LoginResponse,
  getStoredUser,
  getStoredToken,
  setSession,
  clearSession,
  loginUser,
  logoutUser,
  LoginCredentials,
} from '@/lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount, luego refresca desde DB para datos actuales
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      // Refrescar datos del usuario (incluye tenant name actualizado)
      fetch('/api/auth/me')
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.user) {
            const freshUser = { ...storedUser, ...data.user };
            setUser(freshUser);
            setSession(storedToken, freshUser);
          }
        })
        .catch(() => {}) // ignorar si falla, usar datos locales
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await loginUser(credentials);
    setToken(response.access_token);
    setUser(response.user);
    return response;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
