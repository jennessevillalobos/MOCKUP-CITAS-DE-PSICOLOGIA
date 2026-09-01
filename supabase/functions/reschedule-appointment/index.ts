// Edge Function: reschedule-appointment
//
// Permite a un usuario reprogramar una cita activa a un nuevo horario.
// Valida políticas de reprogramación:
//   - La cita debe ser del usuario autenticado.
//   - El estado debe ser "confirmada" o "pendiente_pago".
//   - No puede reprogramarse si faltan menos de 24 horas para la cita (configurable).
//   - No puede superar el máximo de reprogramaciones (por defecto: 2).
//   - El nuevo slot debe estar disponible.
// Registra el cambio en historial_citas.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

// Políticas configurables (en el futuro pueden venir de una tabla de configuración)
const HORAS_MINIMAS_ANTES_DE_REPROGRAMAR = 24;
const MAX_REPROGRAMACIONES = 2;

interface RescheduleInput {
  cita_id: string;
  nueva_fecha: string;  // YYYY-MM-DD
  nueva_hora: string;   // HH:MM
  motivo?: string;
}

const toMins = (h: string) => parseInt(h.slice(0, 2)) * 60 + parseInt(h.slice(3, 5));

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  // 1. Autenticar
  const userClient = createUserClient(req);
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonError('unauthenticated', 'Debes iniciar sesión.', 401, requestId);
  }
  const usuarioId = authData.user.id;

  // 2. Validar payload
  const body = await readJson<RescheduleInput>(req);
  if (!body?.cita_id || !body?.nueva_fecha || !body?.nueva_hora) {
    return jsonError('invalid_payload', 'Faltan campos: cita_id, nueva_fecha, nueva_hora.', 422, requestId);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.nueva_fecha))
    return jsonError('invalid_date', 'Formato de fecha inválido (YYYY-MM-DD).', 422, requestId);
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(body.nueva_hora))
    return jsonError('invalid_time', 'Formato de hora inválido (HH:MM).', 422, requestId);

  const serviceClient = createServiceClient();

  // 3. Obtener la cita
  const { data: cita, error: citaError } = await serviceClient
    .from('citas')
    .select('*')
    .eq('id', body.cita_id)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (citaError || !cita) {
    return jsonError('not_found', 'Cita no encontrada o no te pertenece.', 404, requestId);
  }

  // 4. Validar que el estado permita reprogramación
  const estadosPermitidos = ['pendiente_pago', 'parcialmente_pagada', 'confirmada'];
  if (!estadosPermitidos.includes(cita.estado)) {
    return jsonError(
      'invalid_state',
      `No se puede reprogramar una cita en estado "${cita.estado}".`,
      409,
      requestId
    );
  }

  // 5. Validar máximo de reprogramaciones (contar en historial)
  const { count: reprogramaciones } = await serviceClient
    .from('historial_citas')
    .select('id', { count: 'exact', head: true })
    .eq('cita_id', body.cita_id)
    .eq('accion', 'reprogramada');

  if ((reprogramaciones ?? 0) >= MAX_REPROGRAMACIONES) {
    return jsonError(
      'max_reschedules_reached',
      `Esta cita ya fue reprogramada ${MAX_REPROGRAMACIONES} veces. No se permiten más cambios.`,
      409,
      requestId
    );
  }

  // 6. Validar que falten más de 24 horas para la cita actual
  const citaDateTime = new Date(`${cita.fecha}T${cita.hora}`);
  const horasRestantes = (citaDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (horasRestantes < HORAS_MINIMAS_ANTES_DE_REPROGRAMAR) {
    return jsonError(
      'too_late_to_reschedule',
      `Solo puedes reprogramar con al menos ${HORAS_MINIMAS_ANTES_DE_REPROGRAMAR} horas de anticipación.`,
      409,
      requestId
    );
  }

  // 7. Verificar disponibilidad en el nuevo slot
  //   a) Horario válido ese día
  const diaSemana = new Date(`${body.nueva_fecha}T12:00:00Z`).getUTCDay();
  const { data: horarios } = await serviceClient
    .from('horarios')
    .select('hora_inicio, hora_fin')
    .eq('profesional_id', cita.profesional_id)
    .eq('dia_semana', diaSemana);

  const horarioValido = (horarios ?? []).find(
    (h) => body.nueva_hora >= h.hora_inicio.slice(0, 5) && body.nueva_hora <= h.hora_fin.slice(0, 5)
  );
  if (!horarioValido) {
    return jsonError('no_schedule', 'El profesional no atiende en ese día y horario.', 409, requestId);
  }

  //   b) Sin excepciones ese día
  const { data: excepciones } = await serviceClient
    .from('excepciones_horario')
    .select('id')
    .eq('profesional_id', cita.profesional_id)
    .eq('fecha', body.nueva_fecha);

  if ((excepciones ?? []).length > 0) {
    return jsonError('blocked_date', 'El profesional no está disponible esa fecha.', 409, requestId);
  }

  //   c) Sin cita (excluyendo la actual) ni bloqueo activo en ese slot
  const slotStart = toMins(body.nueva_hora);
  const slotEnd = slotStart + cita.duracion_minutos;

  const { data: citasConflicto } = await serviceClient
    .from('citas')
    .select('id, hora, duracion_minutos')
    .eq('profesional_id', cita.profesional_id)
    .eq('fecha', body.nueva_fecha)
    .neq('id', body.cita_id)  // Excluir la cita que se está reprogramando
    .in('estado', ['pendiente_pago', 'parcialmente_pagada', 'confirmada']);

  const hayConflictoCita = (citasConflicto ?? []).some(c => {
    const cStart = toMins(c.hora);
    const cEnd = cStart + c.duracion_minutos;
    return slotStart < cEnd && slotEnd > cStart;
  });

  if (hayConflictoCita) {
    return jsonError('slot_taken', 'El nuevo horario ya está reservado.', 409, requestId);
  }

  const { data: bloqueos } = await serviceClient
    .from('bloqueos_temporales')
    .select('hora, duracion_minutos')
    .eq('profesional_id', cita.profesional_id)
    .eq('fecha', body.nueva_fecha)
    .gte('expira_en', new Date().toISOString());

  const hayConflictoBloqueo = (bloqueos ?? []).some(b => {
    const bStart = toMins(b.hora);
    const bEnd = bStart + b.duracion_minutos;
    return slotStart < bEnd && slotEnd > bStart;
  });

  if (hayConflictoBloqueo) {
    return jsonError('slot_blocked', 'El nuevo horario está siendo reservado por otro usuario. Intenta en unos minutos.', 409, requestId);
  }

  // 8. Registrar estado anterior y actualizar la cita
  const datosAnteriores = { fecha: cita.fecha, hora: cita.hora, estado: cita.estado };

  const { error: updateErr } = await serviceClient
    .from('citas')
    .update({
      fecha: body.nueva_fecha,
      hora: body.nueva_hora,
      estado: cita.estado === 'confirmada' ? 'confirmada' : cita.estado,
    })
    .eq('id', body.cita_id);

  if (updateErr) return jsonError('db_error', 'No se pudo actualizar la cita.', 500, requestId);

  // 9. Registrar en historial
  await serviceClient.from('historial_citas').insert({
    cita_id: body.cita_id,
    usuario_id: usuarioId,
    accion: 'reprogramada',
    datos_anteriores: datosAnteriores,
    datos_nuevos: { fecha: body.nueva_fecha, hora: body.nueva_hora },
    motivo: body.motivo ?? null,
  });

  return jsonOk({
    cita_id: body.cita_id,
    nueva_fecha: body.nueva_fecha,
    nueva_hora: body.nueva_hora,
    reprogramaciones_usadas: (reprogramaciones ?? 0) + 1,
    reprogramaciones_restantes: MAX_REPROGRAMACIONES - ((reprogramaciones ?? 0) + 1),
    mensaje: 'Cita reprogramada correctamente.',
  }, 200, requestId);
});
