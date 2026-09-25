import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { ModuloBuilder } from '@/data/courseBuilderData';
import type { CursoBuilderInfo } from '@/data/instructorCoursesData';

// Cursos del profesional con sesión real (migración 016). La info del curso
// va en `cursos`; el árbol del Constructor se guarda normalizado en
// modulos/clases/evaluaciones/preguntas/opciones mediante la función
// `guardar_estructura_curso` (inserta/actualiza por `clave` y borra lo quitado).

export interface CursoProfesional {
  id: number;
  key: string;
  info: CursoBuilderInfo;
  estudiantes: number;
  modulos: ModuloBuilder[];
}

const MONEDA_A_BASE: Record<string, string> = { 'USD $': 'USD', 'EUR €': 'EUR', 'MXN $': 'MXN' };

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

export async function cargarMisCursos(): Promise<Result<CursoProfesional[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('mis_cursos_profesional');
  if (error) return fail(toServiceError(error));
  return ok((data ?? []) as CursoProfesional[]);
}

// Columnas de `cursos` a partir de la info editada en el Constructor.
function infoAFila(info: Partial<CursoBuilderInfo>) {
  const fila: Record<string, unknown> = {};
  if (info.titulo !== undefined) fila.nombre = info.titulo.trim() || 'Curso sin título';
  if (info.descripcion !== undefined) fila.descripcion = info.descripcion;
  if (info.categoria !== undefined) fila.categoria = info.categoria;
  if (info.nivel !== undefined) fila.nivel = info.nivel;
  if (info.idioma !== undefined) fila.idioma = info.idioma;
  if (info.imagen !== undefined) fila.imagen = info.imagen || null;
  if (info.estado !== undefined) fila.estado = info.estado;
  if (info.moneda !== undefined) fila.moneda = MONEDA_A_BASE[info.moneda] ?? 'USD';
  if (info.precio !== undefined) {
    const valor = Number(String(info.precio).replace(',', '.'));
    fila.precio = Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) : 0;
  }
  return fila;
}

export async function guardarInfoCurso(cursoId: number, info: Partial<CursoBuilderInfo>): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.from('cursos').update(infoAFila(info)).eq('id', cursoId);
  if (error) return fail(toServiceError(error));
  return ok(null);
}

export async function guardarEstructuraCurso(cursoId: number, modulos: ModuloBuilder[]): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.rpc('guardar_estructura_curso', { p_curso_id: cursoId, p_modulos: modulos });
  if (error) return fail(toServiceError(error));
  return ok(null);
}

// Crea un curso en borrador y devuelve su id y slug (la key de la ruta del Constructor).
export async function crearCursoBorrador(profesionalId: number, info: CursoBuilderInfo): Promise<Result<{ id: number; key: string }>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const slug = `curso-${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await supabase
    .from('cursos')
    .insert({ ...infoAFila({ ...info, estado: 'borrador' }), profesional_id: profesionalId, slug })
    .select('id, slug')
    .single();
  if (error) return fail(toServiceError(error));
  return ok({ id: data.id, key: data.slug });
}
