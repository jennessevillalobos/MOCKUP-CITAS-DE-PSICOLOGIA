import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { Database } from '@/types/database';

type Servicio = Database['public']['Tables']['servicios']['Row'];
type Modalidad = Database['public']['Tables']['modalidades']['Row'];
type ServicioModalidad = Database['public']['Tables']['servicio_modalidad']['Row'];
type Profesional = Database['public']['Tables']['profesionales']['Row'];
type Lugar = Database['public']['Tables']['lugares']['Row'];
type Curso = Database['public']['Tables']['cursos']['Row'];
type ProfesionalPublico = Database['public']['Views']['profesionales_publicos']['Row'];

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

// Perfil público (nombre y foto vienen de `usuarios`, cuya RLS no es pública:
// por eso se lee desde la vista `profesionales_publicos`, migración 012).
export async function listProfesionalesPublicos(): Promise<Result<ProfesionalPublico[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.from('profesionales_publicos').select('*').order('id');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as ProfesionalPublico[]);
}

export interface IdsReserva {
  servicio_id: number;
  profesional_id: number;
  modalidad_id: number;
  lugar_id?: number;
}

// Traduce las claves del wizard /agendar (keys de SERVICIOS_PUBLICOS,
// PROFESIONALES_PUBLICOS y SEDES) a los IDs de la base, que las guarda como `slug`.
export async function resolverIdsReserva(input: {
  servicioSlug: string;
  profesionalSlug: string;
  modalidad: 'Online' | 'Presencial';
  sedeSlug?: string | null;
}): Promise<Result<IdsReserva>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const nombreModalidad = input.modalidad === 'Online' ? 'virtual' : 'presencial';
  const [servicio, profesional, modalidad, lugar] = await Promise.all([
    supabase.from('servicios').select('id').eq('slug', input.servicioSlug).maybeSingle(),
    supabase.from('profesionales_publicos').select('id').eq('slug', input.profesionalSlug).maybeSingle(),
    supabase.from('modalidades').select('id').eq('nombre', nombreModalidad).maybeSingle(),
    input.modalidad === 'Presencial' && input.sedeSlug
      ? supabase.from('lugares').select('id').eq('slug', input.sedeSlug).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const error = servicio.error ?? profesional.error ?? modalidad.error ?? lugar.error;
  if (error) return fail(toServiceError(error));
  if (!servicio.data || !profesional.data || !modalidad.data) {
    return fail({ code: 'not_found', message: 'El servicio o profesional elegido no está disponible para reservas en línea.' });
  }

  return ok({
    servicio_id: servicio.data.id,
    profesional_id: profesional.data.id,
    modalidad_id: modalidad.data.id,
    lugar_id: lugar.data?.id,
  });
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
