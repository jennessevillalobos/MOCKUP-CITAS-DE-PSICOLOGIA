import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { IntentoEvaluacion } from '@/data/evaluacionesInstructorData';

// Intentos de evaluación de los cursos del profesional (migración 017). Las
// preguntas y opciones se identifican por su `clave`, igual que en el árbol
// del Constructor, así el panel las cruza con `preguntasDetalle`.

interface IntentoFila extends Omit<IntentoEvaluacion, 'enviadoHace'> {
  fecha: string;
}

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

function haceCuanto(iso: string): { es: string; en: string } {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return { es: 'hace un momento', en: 'just now' };
  if (minutos < 60) return { es: `hace ${minutos} min`, en: `${minutos} min ago` };
  const horas = Math.round(minutos / 60);
  if (horas < 24) return { es: `hace ${horas} h`, en: `${horas}h ago` };
  const dias = Math.round(horas / 24);
  return { es: `hace ${dias} ${dias === 1 ? 'día' : 'días'}`, en: `${dias} ${dias === 1 ? 'day' : 'days'} ago` };
}

export async function cargarIntentos(): Promise<Result<IntentoEvaluacion[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('intentos_mis_cursos');
  if (error) return fail(toServiceError(error));
  return ok(((data ?? []) as IntentoFila[]).map(({ fecha, ...intento }) => ({
    ...intento,
    notaFinalPct: intento.notaFinalPct ?? undefined,
    enviadoHace: haceCuanto(fecha),
    respuestas: intento.respuestas.map((r) => ({
      ...r,
      opcionElegidaId: r.opcionElegidaId ?? undefined,
      textoRespuesta: r.textoRespuesta ?? undefined,
      puntajeObtenido: r.puntajeObtenido === null || r.puntajeObtenido === undefined ? undefined : Number(r.puntajeObtenido),
      retroalimentacion: r.retroalimentacion ?? undefined,
    })),
  })));
}

export async function calificarRespuesta(intentoId: string, preguntaClave: string, puntaje: number, retroalimentacion: string): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.rpc('calificar_respuesta', {
    p_intento_id: Number(intentoId), p_pregunta_clave: preguntaClave, p_puntaje: puntaje, p_retroalimentacion: retroalimentacion,
  });
  if (error) return fail(toServiceError(error));
  return ok(null);
}

export async function publicarCalificacionIntento(intentoId: string, notaFinalPct: number): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.rpc('publicar_calificacion', { p_intento_id: Number(intentoId), p_nota: Math.round(notaFinalPct) });
  if (error) return fail(toServiceError(error));
  return ok(null);
}
