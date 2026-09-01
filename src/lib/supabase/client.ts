import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cliente Supabase. El tipado estricto del esquema se aplica a nivel de
// servicio usando los tipos de `@/types/database`, no a nivel del cliente,
// para evitar el narrowing agresivo que sufren `.update()` y `.upsert()`
// con el cliente tipado.
//
// El cliente se crea de forma perezosa (lazy) para que la aplicación pueda
// arrancar en modo demo sin las variables de entorno. Si faltan URL o clave
// publishable, `getSupabaseClient()` devuelve null y los servicios deben
// conservar el comportamiento demo existente.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

let client: SupabaseClient | null = null;
let initialized = false;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (initialized) return client;
  initialized = true;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}