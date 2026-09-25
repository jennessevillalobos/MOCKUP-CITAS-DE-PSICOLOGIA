import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import {
  DIAS_SEMANA, HORARIO_SEMANAL_DEMO,
  type BloqueoAgenda, type DiaSemana, type HorarioSemanal,
} from '@/data/agendaDisponibilidadInstructorData';

// Agenda del profesional con sesión real: horario semanal en `horarios` y
// bloqueos en `excepciones_horario` (migración 013). La RLS solo permite
// leer/escribir las filas del profesional vinculado a auth.uid().

interface HorarioRow {
  dia_semana: number | null;
  hora_inicio: string;
  hora_fin: string;
}

interface ExcepcionRow {
  id: number;
  fecha: string;
  tipo: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string | null;
  grupo_id: string | null;
}

// dia_semana en la base: 0 = domingo … 6 = sábado.
const NUMERO_DIA: Record<DiaSemana, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
};

// Los bloqueos sin grupo (creados fuera de esta pantalla) se identifican por su fila.
const PREFIJO_FILA = 'exc-';

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

const hhmm = (t: string) => t.slice(0, 5);

function fechasEntre(inicio: string, fin: string): string[] {
  const fechas: string[] = [];
  const cursor = new Date(`${inicio}T12:00:00Z`);
  const limite = new Date(`${fin}T12:00:00Z`);
  while (cursor <= limite) {
    fechas.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return fechas;
}

function aHorarioSemanal(rows: HorarioRow[]): HorarioSemanal {
  const horario = Object.fromEntries(
    DIAS_SEMANA.map((dia) => [dia, { ...HORARIO_SEMANAL_DEMO[dia], activo: false }])
  ) as HorarioSemanal;
  for (const dia of DIAS_SEMANA) {
    const delDia = rows.filter((r) => r.dia_semana === NUMERO_DIA[dia]);
    if (delDia.length === 0) continue;
    horario[dia] = {
      activo: true,
      inicio: hhmm(delDia.map((r) => r.hora_inicio).sort()[0]),
      fin: hhmm(delDia.map((r) => r.hora_fin).sort()[delDia.length - 1]),
    };
  }
  return horario;
}

function aBloqueos(rows: ExcepcionRow[]): BloqueoAgenda[] {
  const grupos = new Map<string, ExcepcionRow[]>();
  for (const r of rows) {
    const clave = r.grupo_id ?? `${PREFIJO_FILA}${r.id}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), r]);
  }
  return [...grupos.entries()].map(([id, filas]) => {
    const fechas = filas.map((f) => f.fecha).sort();
    const primera = filas[0];
    const motivo = primera.motivo ?? undefined;
    if (filas.length > 1 || primera.tipo === 'vacacion') {
      return { id, tipo: 'rango', fechaInicio: fechas[0], fechaFin: fechas[fechas.length - 1], motivo };
    }
    if (primera.hora_inicio && primera.hora_fin) {
      return { id, tipo: 'horas', fechaInicio: primera.fecha, horaInicio: hhmm(primera.hora_inicio), horaFin: hhmm(primera.hora_fin), motivo };
    }
    return { id, tipo: 'dia', fechaInicio: primera.fecha, motivo };
  });
}

// id del profesional vinculado a la sesión actual, o null si no hay sesión o
// el usuario no es un profesional registrado.
export async function obtenerMiProfesionalId(): Promise<Result<number | null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data: sesion } = await supabase.auth.getSession();
  const userId = sesion.session?.user.id;
  if (!userId) return ok(null);

  const { data, error } = await supabase.from('profesionales').select('id').eq('usuario_id', userId).maybeSingle();
  if (error) return fail(toServiceError(error));
  return ok(data?.id ?? null);
}

export async function cargarAgenda(
  profesionalId: number
): Promise<Result<{ horarioSemanal: HorarioSemanal; bloqueos: BloqueoAgenda[] }>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const [horarios, excepciones] = await Promise.all([
    supabase.from('horarios').select('dia_semana, hora_inicio, hora_fin').eq('profesional_id', profesionalId),
    supabase.from('excepciones_horario').select('id, fecha, tipo, hora_inicio, hora_fin, motivo, grupo_id').eq('profesional_id', profesionalId).order('fecha'),
  ]);
  const error = horarios.error ?? excepciones.error;
  if (error) return fail(toServiceError(error));

  return ok({
    horarioSemanal: aHorarioSemanal((horarios.data ?? []) as HorarioRow[]),
    bloqueos: aBloqueos((excepciones.data ?? []) as ExcepcionRow[]),
  });
}

export async function guardarHorarioSemanal(profesionalId: number, horario: HorarioSemanal): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const filas = DIAS_SEMANA.filter((dia) => horario[dia].activo).map((dia) => ({
    profesional_id: profesionalId,
    dia_semana: NUMERO_DIA[dia],
    hora_inicio: horario[dia].inicio,
    hora_fin: horario[dia].fin,
  }));

  const { error: delError } = await supabase.from('horarios').delete().eq('profesional_id', profesionalId);
  if (delError) return fail(toServiceError(delError));
  if (filas.length > 0) {
    const { error } = await supabase.from('horarios').insert(filas);
    if (error) return fail(toServiceError(error));
  }
  return ok(null);
}

// Devuelve el id con el que queda identificado el bloqueo (su grupo_id).
export async function crearBloqueo(profesionalId: number, bloqueo: Omit<BloqueoAgenda, 'id'>): Promise<Result<string>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const grupoId = crypto.randomUUID();
  const fechas = bloqueo.tipo === 'rango' && bloqueo.fechaFin ? fechasEntre(bloqueo.fechaInicio, bloqueo.fechaFin) : [bloqueo.fechaInicio];
  const filas = fechas.map((fecha) => ({
    profesional_id: profesionalId,
    fecha,
    tipo: bloqueo.tipo === 'rango' ? 'vacacion' : 'bloqueo',
    hora_inicio: bloqueo.tipo === 'horas' ? bloqueo.horaInicio ?? null : null,
    hora_fin: bloqueo.tipo === 'horas' ? bloqueo.horaFin ?? null : null,
    motivo: bloqueo.motivo ?? null,
    grupo_id: grupoId,
  }));

  const { error } = await supabase.from('excepciones_horario').insert(filas);
  if (error) return fail(toServiceError(error));
  return ok(grupoId);
}

export async function eliminarBloqueo(profesionalId: number, id: string): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const consulta = supabase.from('excepciones_horario').delete().eq('profesional_id', profesionalId);
  const { error } = id.startsWith(PREFIJO_FILA)
    ? await consulta.eq('id', Number(id.slice(PREFIJO_FILA.length)))
    : await consulta.eq('grupo_id', id);
  if (error) return fail(toServiceError(error));
  return ok(null);
}
