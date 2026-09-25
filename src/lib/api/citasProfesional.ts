import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { CitaEstado } from '@/data/admin/agendaData';
import type { CitaInstructor, NotaPaciente } from '@/data/citasInstructorData';

// Citas del profesional con sesión real (migración 015): la RLS limita las
// filas a las citas donde citas.profesional_id es el suyo, y le deja ver
// nombre/correo/teléfono de esos pacientes.

interface CitaRow {
  id: string;
  usuario_id: string | null;
  fecha: string;
  hora: string;
  duracion_minutos: number;
  precio_total: number;
  estado: string;
  notas_profesional: string | null;
  usuarios: { nombre: string | null; email: string; telefono: string | null } | null;
  servicios: { nombre: string } | null;
  modalidades: { nombre: string } | null;
  lugares: { nombre: string; direccion: string | null } | null;
}

interface NotaRow {
  id: number;
  paciente_id: string;
  texto: string;
  creado_en: string;
  usuarios: { nombre: string | null; email: string } | null;
}

// Estados de la base → los 4 del panel. Pendiente de pago, abonada, confirmada
// y reprogramada son citas vigentes: "Programada".
export function estadoDesdeBase(estado: string): CitaEstado {
  if (estado === 'completada') return 'Completada';
  if (estado === 'cancelada') return 'Cancelada';
  if (estado === 'no_asistio') return 'No asistió';
  return 'Programada';
}

const ESTADO_A_BASE: Partial<Record<CitaEstado, string>> = {
  Completada: 'completada',
  Cancelada: 'cancelada',
  'No asistió': 'no_asistio',
};

export interface CitasProfesional {
  citas: CitaInstructor[];
  notas: NotaPaciente[];
  // correo del paciente → id en `usuarios` (las notas del panel se agrupan por correo).
  pacientePorCorreo: Record<string, string>;
}

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function cargarCitasProfesional(profesionalId: number, nombreProfesional: string): Promise<Result<CitasProfesional>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const [citas, notas] = await Promise.all([
    supabase
      .from('citas')
      .select('id, usuario_id, fecha, hora, duracion_minutos, precio_total, estado, notas_profesional, usuarios(nombre, email, telefono), servicios(nombre), modalidades(nombre), lugares(nombre, direccion)')
      .eq('profesional_id', profesionalId)
      .order('fecha')
      .order('hora'),
    supabase
      .from('notas_paciente')
      .select('id, paciente_id, texto, creado_en, usuarios(nombre, email)')
      .eq('profesional_id', profesionalId)
      .order('creado_en', { ascending: false }),
  ]);
  const error = citas.error ?? notas.error;
  if (error) return fail(toServiceError(error));

  const pacientePorCorreo: Record<string, string> = {};
  const filas = (citas.data ?? []) as unknown as CitaRow[];
  const lista: CitaInstructor[] = filas.map((c) => {
    const correo = c.usuarios?.email ?? '';
    if (correo && c.usuario_id) pacientePorCorreo[correo] = c.usuario_id;
    const presencial = c.modalidades?.nombre === 'presencial';
    return {
      id: c.id,
      fechaISO: c.fecha,
      hora: c.hora.slice(0, 5),
      duracionMin: c.duracion_minutos,
      paciente: c.usuarios?.nombre || correo || 'Paciente',
      correo,
      telefono: c.usuarios?.telefono ?? undefined,
      servicio: c.servicios?.nombre ?? 'Sesión',
      profesional: nombreProfesional,
      modalidad: presencial ? 'Presencial' : 'Online',
      lugar: presencial && c.lugares ? `${c.lugares.nombre}${c.lugares.direccion ? ` — ${c.lugares.direccion}` : ''}` : undefined,
      estado: estadoDesdeBase(c.estado),
      notas: c.notas_profesional ?? '',
      precio: c.precio_total / 100,
      origenReserva: true,
    };
  });

  const listaNotas: NotaPaciente[] = ((notas.data ?? []) as unknown as NotaRow[]).map((n) => ({
    id: String(n.id),
    correo: n.usuarios?.email ?? '',
    paciente: n.usuarios?.nombre || n.usuarios?.email || 'Paciente',
    fecha: fechaCorta(n.creado_en),
    texto: n.texto,
  }));

  return ok({ citas: lista, notas: listaNotas, pacientePorCorreo });
}

export async function actualizarCita(
  citaId: string,
  cambios: { estado?: CitaEstado; notas?: string; fechaISO?: string; hora?: string }
): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const fila: Record<string, unknown> = {};
  if (cambios.estado) {
    const estado = ESTADO_A_BASE[cambios.estado];
    if (estado) fila.estado = estado;
  }
  if (cambios.notas !== undefined) fila.notas_profesional = cambios.notas || null;
  if (cambios.fechaISO) fila.fecha = cambios.fechaISO;
  if (cambios.hora) fila.hora = cambios.hora;

  const { data, error } = await supabase.from('citas').update(fila).eq('id', citaId).select('id');
  if (error) {
    if (error.code === '23514' || /Transición de estado inválida/.test(error.message)) {
      return fail({ code: 'invalid_state', message: 'Esa cita ya no admite ese cambio de estado.' });
    }
    return fail(toServiceError(error));
  }
  if (!data || data.length === 0) return fail({ code: 'not_found', message: 'No se encontró la cita o no tienes permiso para modificarla.' });
  return ok(null);
}

export async function crearNotaPaciente(profesionalId: number, pacienteId: string, texto: string): Promise<Result<{ id: string; fecha: string }>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase
    .from('notas_paciente')
    .insert({ profesional_id: profesionalId, paciente_id: pacienteId, texto })
    .select('id, creado_en')
    .single();
  if (error) return fail(toServiceError(error));
  return ok({ id: String(data.id), fecha: fechaCorta(data.creado_en) });
}
