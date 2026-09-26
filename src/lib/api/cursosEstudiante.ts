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

export async function cargarMisCursos(): Promise<Result<CursoEstudiante[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('mis_cursos_estudiante');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as CursoEstudiante[]);
}
