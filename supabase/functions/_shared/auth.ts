// Verificación de autenticación y rol para las Edge Functions.
//
// Usa el cliente de Supabase con la JWT del usuario (creado con la anon key y
// el header Authorization) para identificar la sesión activa. El cliente con
// service role se crea de forma separada y NUNCA se expone al navegador.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function supabaseUrl(): string {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('SUPABASE_URL no está configurada.');
  return url;
}

export function anonKey(): string {
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  if (!key) throw new Error('SUPABASE_ANON_KEY no está configurada.');
  return key;
}

export function serviceRoleKey(): string {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada.');
  return key;
}

// Cliente limitado a los permisos del usuario autenticado (respeta RLS).
export function createUserClient(req: Request): SupabaseClient {
  const auth = req.headers.get('Authorization');
  return createClient(supabaseUrl(), anonKey(), {
    global: { headers: { Authorization: auth ?? '' } },
  });
}

// Cliente con service role: solo debe usarse dentro del servidor para
// operaciones que requieren saltarse RLS de forma controlada.
export function createServiceClient(): SupabaseClient {
  return createClient(supabaseUrl(), serviceRoleKey(), {
    auth: { persistSession: false },
  });
}
