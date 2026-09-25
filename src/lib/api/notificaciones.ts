import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { GrupoNotif, NotificacionInstructor, TipoNotifInstructor } from '@/data/notificacionesInstructorData';

// Notificaciones del usuario (migración 019): las generan triggers de la base
// ante eventos reales (reservas, cancelaciones, intentos, inscripciones,
// pagos, reseñas, clases en vivo); el usuario solo las lee y las marca.

interface NotificacionFila {
  id: number;
  tipo: TipoNotifInstructor;
  texto_es: string;
  texto_en: string;
  link: string;
  leida: boolean;
  creado_en: string;
}

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

function grupoDe(iso: string): GrupoNotif {
  const creada = new Date(iso);
  const hoy = new Date();
  if (creada.toDateString() === hoy.toDateString()) return 'hoy';
  return (hoy.getTime() - creada.getTime()) / 86400000 <= 7 ? 'semana' : 'anteriores';
}

function tiempoDe(iso: string): { es: string; en: string } {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return { es: 'Hace un momento', en: 'Just now' };
  if (minutos < 60) return { es: `Hace ${minutos} min`, en: `${minutos} min ago` };
  const horas = Math.round(minutos / 60);
  if (horas < 24) return { es: `Hace ${horas} h`, en: `${horas}h ago` };
  const dias = Math.round(horas / 24);
  return { es: `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`, en: `${dias} ${dias === 1 ? 'day' : 'days'} ago` };
}

export async function cargarNotificaciones(): Promise<Result<NotificacionInstructor[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, tipo, texto_es, texto_en, link, leida, creado_en')
    .order('creado_en', { ascending: false })
    .limit(100);
  if (error) return fail(toServiceError(error));
  return ok(((data ?? []) as NotificacionFila[]).map((n) => ({
    id: String(n.id),
    tipo: n.tipo,
    texto: { es: n.texto_es, en: n.texto_en },
    tiempo: tiempoDe(n.creado_en),
    grupo: grupoDe(n.creado_en),
    leida: n.leida,
    link: n.link,
  })));
}

// ids = null marca todas las no leídas.
export async function marcarNotificacionesLeidas(ids: string[] | null): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const consulta = supabase.from('notificaciones').update({ leida: true }).eq('leida', false);
  const { error } = ids ? await consulta.in('id', ids.map(Number)) : await consulta;
  if (error) return fail(toServiceError(error));
  return ok(null);
}
