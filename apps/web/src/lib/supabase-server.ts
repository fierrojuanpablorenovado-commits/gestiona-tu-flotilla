/**
 * Supabase Server Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Usado en Server Components, API Routes y middleware.
 * Maneja cookies automáticamente para mantener la sesión.
 *
 * Para API Routes que requieren permisos elevados (admin operations),
 * usa createServiceClient() con la service_role key.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

// ─── Cliente de usuario (respeta RLS) ─────────────────────────────────────────

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  const cookieStore = cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Component — no puede set cookies, ignorar
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Server Component — ignorar
        }
      },
    },
  });
}

// ─── Cliente de servicio (bypass RLS — solo para server-side admin ops) ────────

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ─── Helper: obtener usuario actual en una API Route ──────────────────────────

export async function getCurrentUser() {
  const client = createSupabaseServerClient();
  if (!client) return null;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  // Obtener datos del perfil (rol, tenant, etc.)
  const { data: profile } = await client
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
