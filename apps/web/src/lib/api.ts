/**
 * API Client - Gestiona tu Flotilla
 * Communicates with Next.js API routes (same origin).
 * Ready to swap to external NestJS backend via NEXT_PUBLIC_API_URL env var.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiResponse<T = unknown> {
  data: T;
  ok: boolean;
  status: number;
  message?: string;
}

/**
 * Core fetch wrapper with auth token injection and error handling.
 */
async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = options;

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('gtf_token') : null;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  // Handle 401: clear session and redirect to login
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gtf_token');
      localStorage.removeItem('gtf_user');
      window.location.href = '/login';
    }
    return { data: null as T, ok: false, status: 401, message: 'No autorizado' };
  }

  let data: T;
  try {
    data = await response.json();
  } catch {
    data = null as T;
  }

  return {
    data,
    ok: response.ok,
    status: response.status,
  };
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

export const api = {
  get: <T = unknown>(endpoint: string) => request<T>(endpoint),
  post: <T = unknown>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body }),
  put: <T = unknown>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body }),
  patch: <T = unknown>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

// ─── Formatting utilities ────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
