import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { Database } from '@/types/database';

type ProductoDigital = Database['public']['Tables']['productos_digitales']['Row'];
type CompraDigital = Database['public']['Tables']['compras_digitales']['Row'];

export type { CompraDigital };

// Servicio de productos digitales. Las compras y la entrega de archivos
// protegidos deben pasar por Edge Functions; aquí solo se exponen las
// consultas de catálogo y el historial de compras del usuario.

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

export async function listProductos(): Promise<Result<ProductoDigital[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase
    .from('productos_digitales')
    .select('*')
    .eq('estado', 'activo')
    .order('titulo');

  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as ProductoDigital[]);
}

export async function listMisCompras(): Promise<Result<CompraDigital[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return fail({ code: 'no_session', message: 'No hay sesión activa.' });

  const { data, error } = await supabase
    .from('compras_digitales')
    .select('*')
    .eq('usuario_id', userId)
    .order('fecha', { ascending: false });

  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as CompraDigital[]);
}
