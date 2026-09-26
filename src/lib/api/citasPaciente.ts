import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { CitaPaciente } from '@/data/patientPortalData';

// Citas del paciente con sesión (función mis_citas_paciente, migración 020),
// con nombres de servicio/profesional/modalidad/sede y montos en dólares.

interface CitaFila {
  id: string;
  fecha: string;
  hora: string;
  duracionMin: number;
  estado: string;
  servicioId: number | null;
  servicio: string | null;
  profesionalId: number | null;
  profesional: string | null;
  modalidadId: number | null;
  modalidad: string | null;
  lugar: string | null;
  total: number;
  abonado: number;
  reprogramaciones: number;
}

// Estados de la base → los 4 del portal (pendiente de pago, abonada y
// reprogramada son citas vigentes: "agendada").
function estadoPortal(estado: string): CitaPaciente['estado'] {
  if (estado === 'confirmada') return 'confirmada';
  if (estado === 'completada') return 'completada';
  if (estado === 'cancelada' || estado === 'no_asistio') return 'cancelada';
  return 'agendada';
}

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

export async function cargarMisCitas(): Promise<Result<CitaPaciente[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('mis_citas_paciente');
  if (error) return fail(toServiceError(error));
  return ok(((data ?? []) as CitaFila[]).map((c) => {
    const d = new Date(`${c.fecha}T00:00:00`);
    const online = c.modalidad !== 'presencial';
    return {
      id: c.id,
      dia: d.toLocaleDateString('es-ES', { day: '2-digit' }),
      mes: d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', ''),
      fecha: {
        es: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
        en: d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      },
      servicio: { es: c.servicio ?? 'Sesión', en: c.servicio ?? 'Session' },
      hora: c.hora,
      modalidad: online ? 'Online' : 'Presencial',
      profesional: c.profesional ?? 'Profesional',
      estado: estadoPortal(c.estado),
      total: c.total / 100,
      pagado: c.abonado / 100,
      origenReserva: true,
      fechaISO: c.fecha,
      duracionMin: c.duracionMin,
      profesionalId: c.profesionalId ?? undefined,
      servicioId: c.servicioId ?? undefined,
      modalidadId: c.modalidadId ?? undefined,
      lugar: c.lugar ?? undefined,
      reprogramaciones: c.reprogramaciones,
    } satisfies CitaPaciente;
  }));
}
