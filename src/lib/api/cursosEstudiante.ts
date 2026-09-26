import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import { subirComprobante } from '@/lib/api/pagos';

// Lado del estudiante de los cursos (migración 027): estado de inscripción,
// inscripción gratis, pago por transferencia y "Mis cursos" del Aula Virtual.
// Montos de la base en centavos; esta capa trabaja en unidades (USD).

export interface EstadoInscripcion {
  cursoId: number;
  nombre: string;
  precio: number;
  moneda: string;
  inscrito: boolean;
  pagado: number;
  enRevision: number;
}

export interface CursoEstudiante {
  cursoId: number;
  slug: string;
  nombre: string;
  imagen: string | null;
  profesional: string | null;
  inscritoEn: string;
  totalClases: number;
  completadas: number;
  porcentaje: number;
  ultimaActividad: string | null;
}

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

// null si el curso no existe (o no está publicado) en la base.
export async function estadoInscripcion(slug: string): Promise<Result<EstadoInscripcion | null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('estado_inscripcion', { p_slug: slug });
  if (error) return fail(toServiceError(error));
  if (!data) return ok(null);
  const e = data as EstadoInscripcion;
  return ok({ ...e, precio: e.precio / 100, pagado: e.pagado / 100, enRevision: e.enRevision / 100 });
}

export async function inscribirseGratis(cursoId: number): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.rpc('inscribirse_curso_gratis', { p_curso_id: cursoId });
  if (error) return fail(toServiceError(error));
  return ok(null);
}

// Sube el comprobante (si hay) y registra la transferencia del curso en revisión.
export async function reportarPagoCurso(cursoId: number, montoUsd: number, referencia: string, archivo: File | null): Promise<Result<string>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const subida = await subirComprobante(archivo);
  if (subida.error) return fail(subida.error);

  const { data, error } = await supabase.rpc('reportar_pago_curso', {
    p_curso_id: cursoId,
    p_monto: Math.round(montoUsd * 100),
    p_referencia: referencia,
    p_comprobante: subida.data,
  });
  if (error) return fail(toServiceError(error));
  return ok(data as string);
}

// Momentos de actividad de los últimos 90 días (para la racha).
export async function cargarActividadReciente(): Promise<Result<string[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('mi_actividad_reciente');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as string[]);
}

export async function cargarMisCursos(): Promise<Result<CursoEstudiante[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('mis_cursos_estudiante');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as CursoEstudiante[]);
}

// ── Reproductor de clases (migración 029) ──

export type MotivoBloqueo = 'secuencial' | 'evaluacion' | 'pago' | 'clases';

export interface MaterialClaseBase {
  tipo: string;
  nombre: string;
  tamano?: string;
}

export interface ItemClase {
  tipo: 'clase';
  id: number;
  titulo: string;
  duracion: string;
  completado: boolean;
  bloqueado: boolean;
  motivoBloqueo: MotivoBloqueo | null;
  // null si la clase está bloqueada (el servidor no envía el contenido).
  contenido: string | null;
  video: string | null;
  materiales: MaterialClaseBase[];
  nota: string;
}

export interface ItemEvaluacion {
  tipo: 'evaluacion';
  id: number;
  titulo: string;
  preguntas: number;
  notaMinima: number | null;
  intentosMax: number | null;
  intentosUsados: number;
  aprobado: boolean;
  mejorNota: number | null;
  bloqueado: boolean;
  motivoBloqueo: MotivoBloqueo | null;
}

export type ItemCurso = ItemClase | ItemEvaluacion;

export interface CursoEstudianteDetalle {
  curso: { id: number; slug: string; nombre: string; imagen: string | null; profesional: string | null };
  modulos: { id: number; titulo: string; items: ItemCurso[] }[];
  totalClases: number;
  completadas: number;
  porcentaje: number;
}

export async function cargarCursoEstudiante(slug: string): Promise<Result<CursoEstudianteDetalle>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('curso_estudiante', { p_slug: slug });
  if (error) return fail(toServiceError(error));
  return ok(data as CursoEstudianteDetalle);
}

export async function completarClase(claseId: number): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.rpc('completar_clase', { p_clase_id: claseId });
  if (error) return fail(toServiceError(error));
  return ok(null);
}

export async function guardarNotaClase(claseId: number, texto: string): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data: sesion } = await supabase.auth.getSession();
  const userId = sesion.session?.user.id;
  if (!userId) return fail({ code: 'no_session', message: 'Tu sesión expiró. Vuelve a iniciar sesión.' });

  const { error } = await supabase
    .from('notas_clase')
    .upsert({ usuario_id: userId, clase_id: claseId, texto, actualizado_en: new Date().toISOString() });
  if (error) return fail(toServiceError(error));
  return ok(null);
}

// ── Evaluaciones (migración 031) ──

export interface PreguntaEstudiante {
  id: number;
  tipo: 'opcion' | 'vf' | 'abierta';
  texto: string;
  puntaje: number;
  opciones: { id: number; texto: string }[];
}

export interface IntentoEstudiante {
  numero: number;
  fecha: string;
  nota: number | null;
  aprobado: boolean;
  estado: 'pendiente' | 'calificado';
}

export interface EvaluacionEstudiante {
  id: number;
  titulo: string;
  curso: { id: number; slug: string; nombre: string };
  moduloTitulo: string | null;
  moduloNumero: number | null;
  // 0 = sin límite.
  tiempoLimiteMin: number;
  notaMinima: number;
  intentosMax: number | null;
  barajar: boolean;
  mostrarRetroalimentacion: boolean;
  desbloqueaSiguiente: boolean;
  bloqueado: boolean;
  // Vacío si está bloqueada. Sin indicar la opción correcta.
  preguntas: PreguntaEstudiante[];
  intentos: IntentoEstudiante[];
}

export async function cargarEvaluacionEstudiante(evaluacionId: number): Promise<Result<EvaluacionEstudiante>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('evaluacion_estudiante', { p_evaluacion_id: evaluacionId });
  if (error) return fail(toServiceError(error));
  return ok(data as EvaluacionEstudiante);
}

// ── Calificaciones y clases en vivo (migración 032) ──

export interface CalificacionEstudiante {
  evaluacionId: number;
  evaluacion: string;
  cursoSlug: string;
  curso: string;
  // Mejor nota calificada (%), null si aún no hay.
  nota: number | null;
  estado: 'aprobada' | 'pendiente' | 'reprobada';
  fecha: string | null;
}

export async function cargarMisCalificaciones(): Promise<Result<CalificacionEstudiante[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('mis_calificaciones');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as CalificacionEstudiante[]);
}

export interface ClaseVivoEstudiante {
  id: number;
  titulo: string;
  fecha: string;
  hora: string;
  duracionMin: number;
  enlace: string | null;
  estado: 'programada' | 'vivo' | 'finalizada';
  curso: string | null;
  profesional: string | null;
  grabacionUrl: string | null;
  grabacionDuracion: string | null;
  recordatorio: boolean;
}

export async function cargarMisClasesVivo(): Promise<Result<ClaseVivoEstudiante[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('mis_clases_vivo');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as ClaseVivoEstudiante[]);
}
