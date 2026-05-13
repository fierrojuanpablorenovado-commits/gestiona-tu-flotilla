/**
 * Supabase Browser Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Usado en Client Components ('use client').
 * Se inicializa de forma lazy para evitar errores en modo demo (sin env vars).
 *
 * Si NEXT_PUBLIC_SUPABASE_URL no está configurado, las funciones retornan null
 * y la app cae al modo demo con datos mock.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

// ─── Singleton (evitar múltiples instancias en HMR) ──────────────────────────

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null; // Modo demo — sin Supabase

  if (!_client) {
    _client = createBrowserClient<Database>(url, key);
  }
  return _client;
}

// Alias corto
export const supabase = getSupabaseBrowserClient;

// ─── Helpers de Auth ──────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error('Supabase no configurado — usa credenciales demo');

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.auth.signOut();
}

export async function getSession() {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

// ─── Check mode ───────────────────────────────────────────────────────────────

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
