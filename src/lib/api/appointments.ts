import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { Database } from '@/types/database';

type Cita = Database['public']['Tables']['citas']['Row'];

export type { Cita };

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

export async function listMisCitas(): Promise<Result<Cita[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const userId = await getCurrentUserId();
  if (!userId) return fail({ code: 'no_session', message: 'No hay sesión activa.' });

  const { data, error } = await supabase
    .from('citas')
    .select('*')
    .eq('usuario_id', userId)
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false });

  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as Cita[]);
}

export async function cancelarCita(citaId: string): Promise<Result<Cita>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const userId = await getCurrentUserId();
  if (!userId) return fail({ code: 'no_session', message: 'No hay sesión activa.' });

  const { data, error } = await supabase
    .from('citas')
    .update({ estado: 'cancelada' })
    .eq('id', citaId)
    .eq('usuario_id', userId)
    .select()
    .maybeSingle();

  if (error) return fail(toServiceError(error));
  if (!data) return fail({ code: 'not_found', message: 'No se encontró la cita.' });
  return ok(data as Cita);
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}