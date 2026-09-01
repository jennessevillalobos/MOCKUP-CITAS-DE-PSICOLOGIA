// Edge Function: book-appointment
//
// Crea una cita validando disponibilidad, precio y modalidad en el
// servidor. Usa el service_role para la mutación transaccional;
// la autenticación del usuario se verifica con el token del request.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface BookInput {
  servicio_id: number;
  profesional_id: number;
  lugar_id?: number;
  modalidad_id: number;
  fecha: string;
  hora: string;
}

interface AvailabilitySlot {
  profesional_id: number;
  fecha: string;
  hora: string;
  duracion_minutos: number;
  precio: number;
  moneda: string | null;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  // ── 1. Autenticar al usuario ──
  const userClient = createUserClient(req);
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonError('unauthenticated', 'Debes iniciar sesión.', 401, requestId);
  }
  const usuarioId = authData.user.id;

  // ── 2. Validar el payload ──
  const body = await readJson<BookInput>(req);
  if (!body?.servicio_id || !body?.profesional_id || !body?.modalidad_id || !body?.fecha || !body?.hora) {
    return jsonError('invalid_payload', 'Faltan campos obligatorios (servicio_id, profesional_id, modalidad_id, fecha, hora).', 422, requestId);
  }

  // Validar formato de fecha y hora
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) return jsonError('invalid_date', 'Formato de fecha inválido (YYYY-MM-DD).', 422, requestId);
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(body.hora)) return jsonError('invalid_time', 'Formato de hora inválido (HH:MM).', 422, requestId);

  const serviceClient = createServiceClient();

  // ── 3. Obtener precio y duración del servicio ──
  const { data: svcMod, error: svcError } = await serviceClient
    .from('servicio_modalidad')
    .select('duracion_minutos, precio, moneda')
    .eq('servicio_id', body.servicio_id)
    .eq('modalidad_id', body.modalidad_id)
    .maybeSingle();

  if (svcError || !svcMod) {
    return jsonError('service_not_found', 'No se encontró el servicio con esa modalidad.', 404, requestId);
  }

  // ── 4. Validar disponibilidad del profesional ──
  //   a) El profesional tiene horario ese día de la semana.
  const diaSemana = new Date(`${body.fecha}T12:00:00`).getUTCDay();
  const { data: horarios, error: horError } = await serviceClient
    .from('horarios')
    .select('*')
    .eq('profesional_id', body.profesional_id)
    .eq('dia_semana', diaSemana);

  if (horError) return jsonError('db_error', 'Error al consultar horarios.', 500, requestId);

  const horarioValido = (horarios ?? []).find(
    (h) => body.hora >= h.hora_inicio.slice(0, 5) && body.hora <= h.hora_fin.slice(0, 5)
  );
  if (!horarioValido) {
    return jsonError('no_schedule', 'El profesional no atiende ese día y horario.', 409, requestId);
  }

  //   b) No hay excepciones (bloqueo/vacaciones) en esa fecha.
  const { data: excepciones, error: excError } = await serviceClient
    .from('excepciones_horario')
    .select('*')
    .eq('profesional_id', body.profesional_id)
    .eq('fecha', body.fecha);

  if (excError) return jsonError('db_error', 'Error al consultar excepciones.', 500, requestId);
  if ((excepciones ?? []).length > 0) {
    return jsonError('blocked_date', 'El profesional no está disponible esa fecha.', 409, requestId);
  }

  //   c) No hay otra cita confirmada o pendiente de pago en ese mismo slot.
  const { data: conflictos, error: conflError } = await serviceClient
    .from('citas')
    .select('id')
    .eq('profesional_id', body.profesional_id)
    .eq('fecha', body.fecha)
    .eq('hora', body.hora)
    .in('estado', ['pendiente_pago', 'parcialmente_pagada', 'confirmada']);

  if (conflError) return jsonError('db_error', 'Error al verificar conflictos.', 500, requestId);
  if ((conflictos ?? []).length > 0) {
    return jsonError('slot_taken', 'El horario ya está reservado.', 409, requestId);
  }

  // ── 5. Crear la cita y la orden en una transacción lógica ──
  const duracion = svcMod.duracion_minutos;
  const precio = svcMod.precio;
  const moneda = svcMod.moneda;

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
      duracion_minutos: duracion,
      precio_total: precio,
      moneda,
      monto_abonado: 0,
      saldo_pendiente: precio,
      estado: 'pendiente_pago',
    })
    .select()
    .single();

  if (citaErr) return jsonError('create_error', 'No se pudo crear la cita.', 500, requestId);

  // Crear la orden asociada
  const { error: ordenErr } = await serviceClient
    .from('ordenes')
    .insert({
      usuario_id: usuarioId,
      concepto: 'Cita psicológica',
      tipo_producto: 'cita',
      producto_id: cita.id,
      monto: precio,
      moneda,
    });

  if (ordenErr) {
    // Rollback: marcar la cita como cancelada si falla la orden
    await serviceClient.from('citas').update({ estado: 'cancelada' }).eq('id', cita.id);
    return jsonError('create_error', 'No se pudo crear la orden de pago.', 500, requestId);
  }

  return jsonOk({
    cita_id: cita.id,
    fecha: body.fecha,
    hora: body.hora,
    duracion_minutos: duracion,
    precio,
    moneda,
    estado: 'pendiente_pago',
  }, 201, requestId);
});