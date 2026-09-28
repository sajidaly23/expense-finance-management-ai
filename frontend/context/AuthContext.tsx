'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import { authService } from '../services/auth.service';
import { ApiError } from '../lib/api';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  completeReset: (token: string, password: string, confirmPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'smartfin_token';
const USER_KEY = 'smartfin_user';

function readStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = (nextToken: string, nextUser: User) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
    const storedUser = readStoredUser();

    if (!storedToken) {
      setLoading(false);
      return;
    }

    localStorage.setItem(TOKEN_KEY, storedToken);

    setToken(storedToken);
    if (storedUser) setUser(storedUser);

    let finished = false;
    const safetyTimer = setTimeout(() => {
      if (!finished) {
        setLoading(false);
      }
    }, 4000);

    authService
      .me()
      .then((res) => persist(storedToken, res.user))
      .catch((err: unknown) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          logout();
        }
      })
      .finally(() => {
        finished = true;
        clearTimeout(safetyTimer);
        setLoading(false);
      });
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login({ email, password });
    persist(res.token, res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await authService.register({ name, email, password });
    persist(res.token, res.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
    if (!storedToken) return;
    const res = await authService.me();
    persist(storedToken, res.user);
  }, []);

  const completeReset = useCallback(async (token: string, password: string, confirmPassword: string) => {
    const res = await authService.resetPassword({ token, password, confirmPassword });
    persist(res.token, res.user);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, refreshUser, completeReset }),
    [user, token, loading, login, register, logout, refreshUser, completeReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function getInitials(name?: string) {
  if (!name) return 'SF';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
