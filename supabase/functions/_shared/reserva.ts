// Reserva de citas compartida por book-appointment (paciente con sesión) y
// book-appointment-guest (reserva sin sesión que crea la cuenta).
//
// `validarReserva` comprueba precio/duración, horario de atención, excepciones
// y choques con otras citas; `crearCitaConOrden` registra la cita y su orden.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface DatosReserva {
  servicio_id: number;
  profesional_id: number;
  lugar_id?: number;
  modalidad_id: number;
  fecha: string;
  hora: string;
}

export interface ReservaValida {
  duracion: number;
  precio: number;
  moneda: string | null;
}

export interface ErrorReserva {
  code: string;
  message: string;
  status: number;
}

const toMins = (h: string) => parseInt(h.slice(0, 2)) * 60 + parseInt(h.slice(3, 5));

export function validarFormato(body: Partial<DatosReserva> | null): ErrorReserva | null {
  if (!body?.servicio_id || !body?.profesional_id || !body?.modalidad_id || !body?.fecha || !body?.hora) {
    return { code: 'invalid_payload', message: 'Faltan campos obligatorios (servicio_id, profesional_id, modalidad_id, fecha, hora).', status: 422 };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) return { code: 'invalid_date', message: 'Formato de fecha inválido (YYYY-MM-DD).', status: 422 };
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(body.hora)) return { code: 'invalid_time', message: 'Formato de hora inválido (HH:MM).', status: 422 };
  return null;
}

export async function validarReserva(
  serviceClient: SupabaseClient,
  body: DatosReserva
): Promise<{ data: ReservaValida; error: null } | { data: null; error: ErrorReserva }> {
  const falla = (code: string, message: string, status: number) => ({ data: null, error: { code, message, status } });

  // Precio y duración del servicio en esa modalidad
  const { data: svcMod, error: svcError } = await serviceClient
    .from('servicio_modalidad')
    .select('duracion_minutos, precio, moneda')
    .eq('servicio_id', body.servicio_id)
    .eq('modalidad_id', body.modalidad_id)
    .maybeSingle();
  if (svcError || !svcMod) return falla('service_not_found', 'No se encontró el servicio con esa modalidad.', 404);

  // No se reserva en el pasado
  const hoy = new Date().toISOString().slice(0, 10);
  if (body.fecha < hoy) return falla('past_date', 'No se puede reservar en una fecha pasada.', 409);

  // a) La sesión completa cabe en el horario de atención de ese día
  const diaSemana = new Date(`${body.fecha}T12:00:00`).getUTCDay();
  const { data: horarios, error: horError } = await serviceClient
    .from('horarios')
    .select('hora_inicio, hora_fin')
    .eq('profesional_id', body.profesional_id)
    .eq('dia_semana', diaSemana);
  if (horError) return falla('db_error', 'Error al consultar horarios.', 500);

  const slotStart = toMins(body.hora);
  const slotEnd = slotStart + svcMod.duracion_minutos;
  const enHorario = (horarios ?? []).some((h) => slotStart >= toMins(h.hora_inicio) && slotEnd <= toMins(h.hora_fin));
  if (!enHorario) return falla('no_schedule', 'El profesional no atiende ese día y horario.', 409);

  // b) Vacaciones o bloqueos de día completo cierran el día; los de horas, su franja
  const { data: excepciones, error: excError } = await serviceClient
    .from('excepciones_horario')
    .select('tipo, hora_inicio, hora_fin')
    .eq('profesional_id', body.profesional_id)
    .eq('fecha', body.fecha);
  if (excError) return falla('db_error', 'Error al consultar excepciones.', 500);
  const bloqueada = (excepciones ?? []).some(
    (e) => e.tipo === 'vacacion' || !e.hora_inicio || !e.hora_fin || (slotStart < toMins(e.hora_fin) && slotEnd > toMins(e.hora_inicio))
  );
  if (bloqueada) return falla('blocked_date', 'El profesional no está disponible en ese horario.', 409);

  // c) No se solapa con otra cita vigente
  const { data: citas, error: citasError } = await serviceClient
    .from('citas')
    .select('hora, duracion_minutos')
    .eq('profesional_id', body.profesional_id)
    .eq('fecha', body.fecha)
    .in('estado', ['pendiente_pago', 'parcialmente_pagada', 'confirmada', 'reprogramada']);
  if (citasError) return falla('db_error', 'Error al verificar conflictos.', 500);
  const ocupada = (citas ?? []).some((c) => {
    const inicio = toMins(c.hora);
    return slotStart < inicio + c.duracion_minutos && slotEnd > inicio;
  });
  if (ocupada) return falla('slot_taken', 'El horario ya está reservado.', 409);

  return { data: { duracion: svcMod.duracion_minutos, precio: svcMod.precio, moneda: svcMod.moneda }, error: null };
}

export async function crearCitaConOrden(
  serviceClient: SupabaseClient,
  usuarioId: string,
  body: DatosReserva,
  reserva: ReservaValida
): Promise<{ data: { cita_id: string }; error: null } | { data: null; error: ErrorReserva }> {
  const { data: cita, error: citaErr } = await serviceClient
    .from('citas')
    .insert({
      usuario_id: usuarioId,
      servicio_id: body.servicio_id,
      profesional_id: body.profesional_id,
      lugar_id: body.lugar_id ?? null,
      modalidad_id: body.modalidad_id,
      fecha: body.fecha,
      hora: body.hora,
      duracion_minutos: reserva.duracion,
      precio_total: reserva.precio,
      moneda: reserva.moneda,
      monto_abonado: 0,
      saldo_pendiente: reserva.precio,
      estado: 'pendiente_pago',
    })
    .select('id')
    .single();
  if (citaErr || !cita) return { data: null, error: { code: 'create_error', message: 'No se pudo crear la cita.', status: 500 } };

  const { error: ordenErr } = await serviceClient.from('ordenes').insert({
    usuario_id: usuarioId,
    concepto: 'Cita psicológica',
    tipo_producto: 'cita',
    producto_id: cita.id,
    monto: reserva.precio,
    moneda: reserva.moneda,
  });
  if (ordenErr) {
    // Sin orden no hay cómo pagarla: se deshace la cita.
    await serviceClient.from('citas').delete().eq('id', cita.id);
    return { data: null, error: { code: 'create_error', message: 'No se pudo crear la orden de pago.', status: 500 } };
  }
  return { data: { cita_id: cita.id }, error: null };
}
