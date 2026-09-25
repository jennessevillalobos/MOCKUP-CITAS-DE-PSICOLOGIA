import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { ClaseEnVivo, ClaseVivoEstado, DestinatarioTipo } from '@/data/clasesVivoInstructorData';

// Clases en vivo (migración 018): el profesional gestiona las suyas y ve las
// de sus colegas; "Recordarme" se guarda en `recordatorios_clase`.

export interface ClaseVivoBase extends ClaseEnVivo {
  recordarme: boolean;
}

export interface DatosClaseVivo {
  titulo: string;
  cursoId?: number | null;
  fechaISO: string;
  hora: string;
  duracionMin: number;
  enlace: string;
  destinatarioTipo: DestinatarioTipo;
  pacientesCorreos?: string[];
  grabar: boolean;
  recordatorio: boolean;
}

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

function aFila(d: DatosClaseVivo) {
  return {
    titulo: d.titulo,
    curso_id: d.cursoId ?? null,
    fecha: d.fechaISO,
    hora: d.hora,
    duracion_min: d.duracionMin,
    enlace: d.enlace || null,
    destinatario_tipo: d.destinatarioTipo,
    pacientes_correos: d.destinatarioTipo === 'pacientes' ? d.pacientesCorreos ?? [] : [],
    grabar: d.grabar,
    recordatorio: d.recordatorio,
  };
}

export async function cargarClasesVivo(): Promise<Result<ClaseVivoBase[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('clases_en_vivo_panel');
  if (error) return fail(toServiceError(error));
  return ok(((data ?? []) as ClaseVivoBase[]).map((c) => ({
    ...c,
    cursoKey: c.cursoKey ?? undefined,
    cursoTitulo: c.cursoTitulo ?? undefined,
    conectados: c.conectados ?? undefined,
    asistieron: c.asistieron ?? undefined,
    grabacionImagen: c.grabacionImagen ?? undefined,
    grabacionDuracion: c.grabacionDuracion ?? undefined,
  })));
}

export async function crearClaseVivo(profesionalId: number, datos: DatosClaseVivo): Promise<Result<string>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase
    .from('clases_en_vivo')
    .insert({ ...aFila(datos), profesional_id: profesionalId })
    .select('id')
    .single();
  if (error) return fail(toServiceError(error));
  return ok(String(data.id));
}

export async function actualizarClaseVivo(
  claseId: string,
  cambios: Partial<DatosClaseVivo> & { estado?: ClaseVivoEstado; conectados?: number | null; asistieron?: number | null }
): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { estado, conectados, asistieron, ...datos } = cambios;
  const fila: Record<string, unknown> = datos.titulo !== undefined ? aFila(datos as DatosClaseVivo) : {};
  if (estado) fila.estado = estado;
  if (conectados !== undefined) fila.conectados = conectados;
  if (asistieron !== undefined) fila.asistieron = asistieron;

  const { data, error } = await supabase.from('clases_en_vivo').update(fila).eq('id', Number(claseId)).select('id');
  if (error) return fail(toServiceError(error));
  if (!data || data.length === 0) return fail({ code: 'not_found', message: 'No se encontró la clase o no tienes permiso para modificarla.' });
  return ok(null);
}

export async function cambiarRecordatorio(claseId: string, activar: boolean): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data: sesion } = await supabase.auth.getSession();
  const usuarioId = sesion.session?.user.id;
  if (!usuarioId) return fail({ code: 'no_session', message: 'No hay sesión activa.' });

  const { error } = activar
    ? await supabase.from('recordatorios_clase').upsert({ usuario_id: usuarioId, clase_id: Number(claseId) })
    : await supabase.from('recordatorios_clase').delete().eq('usuario_id', usuarioId).eq('clase_id', Number(claseId));
  if (error) return fail(toServiceError(error));
  return ok(null);
}

// id del curso a partir de su slug (la key que usa el panel).
export async function idCursoPorSlug(slug?: string): Promise<number | null> {
  const supabase = getSupabaseClient();
  if (!slug || !supabase || !isSupabaseConfigured()) return null;
  const { data } = await supabase.from('cursos').select('id').eq('slug', slug).maybeSingle();
  return data?.id ?? null;
}
