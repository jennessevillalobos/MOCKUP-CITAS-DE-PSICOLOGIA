import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { Database } from '@/types/database';

type Curso = Database['public']['Tables']['cursos']['Row'];
type Modulo = Database['public']['Tables']['modulos']['Row'];
type Clase = Database['public']['Tables']['clases']['Row'];
type Progreso = Database['public']['Tables']['progreso']['Row'];
type Inscripcion = Database['public']['Tables']['inscripciones']['Row'];

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

async function currentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export interface InscripcionCurso extends Inscripcion {
  curso: Curso | null;
}

export async function listMisCursos(): Promise<Result<InscripcionCurso[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const userId = await currentUserId();
  if (!userId) return fail({ code: 'no_session', message: 'No hay sesión activa.' });

  const { data, error } = await supabase
    .from('inscripciones')
    .select('*, curso:cursos(*)')
    .eq('usuario_id', userId)
    .eq('estado', 'activa');

  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as InscripcionCurso[]);
}

export async function listModulos(cursoId: number): Promise<Result<Modulo[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase
    .from('modulos')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('estado', 'activo')
    .order('orden');

  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as Modulo[]);
}

export async function listClases(moduloId: number): Promise<Result<Clase[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase
    .from('clases')
    .select('*')
    .eq('modulo_id', moduloId)
    .eq('estado', 'activo')
    .order('orden');

  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as Clase[]);
}

export async function getProgreso(claseId: number): Promise<Result<Progreso | null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const userId = await currentUserId();
  if (!userId) return fail({ code: 'no_session', message: 'No hay sesión activa.' });

  const { data, error } = await supabase
    .from('progreso')
    .select('*')
    .eq('usuario_id', userId)
    .eq('clase_id', claseId)
    .maybeSingle();

  if (error) return fail(toServiceError(error));
  return ok((data as Progreso | null) ?? null);
}

export async function guardarProgreso(claseId: number, segundoActual: number, porcentaje: number, completado: boolean): Promise<Result<Progreso>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const userId = await currentUserId();
  if (!userId) return fail({ code: 'no_session', message: 'No hay sesión activa.' });

  const { data, error } = await supabase
    .from('progreso')
    .upsert({ usuario_id: userId, clase_id: claseId, segundo_actual: segundoActual, porcentaje, completado }, { onConflict: 'usuario_id,clase_id' })
    .select()
    .maybeSingle();

  if (error) return fail(toServiceError(error));
  if (!data) return fail({ code: 'not_found', message: 'No se pudo guardar el progreso.' });
  return ok(data as unknown as Progreso);
}