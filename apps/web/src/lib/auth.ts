/**
 * Auth utilities - Gestiona tu Flotilla
 * Handles login, logout, and session state via localStorage + server session cookie.
 */

import { UserRole, ROLE_HOME } from './roles';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string | null;
  company?: string;
  avatar?: string;
  plan?: string;         // 'basic' | 'pro' | 'enterprise'
  maxVehicles?: number;  // límite del plan
  trialEndsAt?: string | null; // ISO date, null = sin trial
}

const TOKEN_KEY = 'gtf_token';
const USER_KEY = 'gtf_user';

// ─── Session helpers ─────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

// ─── API calls ───────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
  redirectTo: string;
}

export async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Error al iniciar sesión');
  }

  // Store in localStorage for client-side access
  setSession(data.access_token, data.user);

  return data as LoginResponse;
}

export async function logoutUser(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  clearSession();
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

export function getRoleHome(role: UserRole): string {
  return ROLE_HOME[role] || '/';
}
