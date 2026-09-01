import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { Database } from '@/types/database';

type Servicio = Database['public']['Tables']['servicios']['Row'];
type Modalidad = Database['public']['Tables']['modalidades']['Row'];
type ServicioModalidad = Database['public']['Tables']['servicio_modalidad']['Row'];
type Profesional = Database['public']['Tables']['profesionales']['Row'];
type Lugar = Database['public']['Tables']['lugares']['Row'];
type Curso = Database['public']['Tables']['cursos']['Row'];

// Servicios de catálogo público. Son lecturas que no requieren autenticación;
// el acceso real dependerá de las políticas RLS configuradas en Supabase.

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

export async function listServicios(): Promise<Result<Servicio[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.from('servicios').select('*').order('nombre');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as Servicio[]);
}

export async function listModalidades(): Promise<Result<Modalidad[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.from('modalidades').select('*').order('id');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as Modalidad[]);
}

export async function listServicioModalidades(): Promise<Result<ServicioModalidad[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.from('servicio_modalidad').select('*');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as ServicioModalidad[]);
}

export async function listProfesionales(): Promise<Result<Profesional[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.from('profesionales').select('*').order('id');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as Profesional[]);
}

export async function listLugares(): Promise<Result<Lugar[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.from('lugares').select('*').order('nombre');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as Lugar[]);
}

export async function listCursosPublicos(): Promise<Result<Curso[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.from('cursos').select('*').eq('estado', 'publicado').order('nombre');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as Curso[]);
}
