// Edge Function: hold-appointment-slot
//
// Crea un bloqueo temporal de 15 minutos sobre un horario mientras el
// usuario completa el proceso de pago. Previene que otro usuario reserve
// el mismo slot durante ese tiempo.
//
// También expone una acción "release" para liberar el bloqueo manualmente
// (ej. si el usuario cancela el pago antes del timeout).
//
// Entrada (POST /hold-appointment-slot):
// {
//   action: "hold" | "release",
//   profesional_id: number,
//   fecha: "YYYY-MM-DD",
//   hora: "HH:MM",
//   modalidad_id: number,
//   servicio_id: number,
//   bloqueo_id?: string  // obligatorio para "release"
// }

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface HoldInput {
  action: 'hold' | 'release';
  profesional_id?: number;
  fecha?: string;
  hora?: string;
  modalidad_id?: number;
  servicio_id?: number;
  bloqueo_id?: string;
}

const toMins = (h: string) => parseInt(h.slice(0, 2)) * 60 + parseInt(h.slice(3, 5));

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  // Autenticar al usuario (no se puede bloquear un slot sin estar logueado)
  const userClient = createUserClient(req);
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonError('unauthenticated', 'Debes iniciar sesión.', 401, requestId);
  }
  const usuarioId = authData.user.id;

  const body = await readJson<HoldInput>(req);
  if (!body?.action) {
    return jsonError('invalid_payload', 'El campo "action" es requerido ("hold" o "release").', 422, requestId);
  }

  const serviceClient = createServiceClient();

  // ──────────────────────────────────────
  // ACCIÓN: release — Liberar un bloqueo existente
  // ──────────────────────────────────────
  if (body.action === 'release') {
    if (!body.bloqueo_id) {
      return jsonError('invalid_payload', 'Se requiere "bloqueo_id" para liberar un bloqueo.', 422, requestId);
    }

    // Solo el usuario que creó el bloqueo puede liberarlo
    const { error: deleteErr } = await serviceClient
      .from('bloqueos_temporales')
      .delete()
      .eq('id', body.bloqueo_id)
      .eq('usuario_id', usuarioId);

    if (deleteErr) return jsonError('db_error', 'No se pudo liberar el bloqueo.', 500, requestId);

    return jsonOk({ message: 'Bloqueo liberado correctamente.' }, 200, requestId);
  }

  // ──────────────────────────────────────
  // ACCIÓN: hold — Crear un nuevo bloqueo
  // ──────────────────────────────────────
  if (body.action === 'hold') {
    const { profesional_id, fecha, hora, modalidad_id, servicio_id } = body;

    if (!profesional_id || !fecha || !hora || !modalidad_id || !servicio_id) {
      return jsonError(
        'invalid_payload',
        'Para "hold" se requiere: profesional_id, fecha, hora, modalidad_id, servicio_id.',
        422,
        requestId
      );
    }

    // Validar formato de fecha y hora
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      return jsonError('invalid_date', 'Formato de fecha inválido (YYYY-MM-DD).', 422, requestId);
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(hora))
      return jsonError('invalid_time', 'Formato de hora inválido (HH:MM).', 422, requestId);

    // Limpiar bloqueos expirados primero (mantenimiento inline)
    await serviceClient.rpc('limpiar_bloqueos_expirados');

    // Obtener duración del servicio
    const { data: svcMod, error: svcError } = await serviceClient
      .from('servicio_modalidad')
      .select('duracion_minutos')
      .eq('servicio_id', servicio_id)
      .eq('modalidad_id', modalidad_id)
      .maybeSingle();

    if (svcError || !svcMod)
      return jsonError('service_not_found', 'Servicio/Modalidad no encontrado.', 404, requestId);

    const duracion = svcMod.duracion_minutos;
    const slotStart = toMins(hora);
    const slotEnd = slotStart + duracion;

    // Verificar que no existe ya otro bloqueo activo para ese slot
    const { data: bloqueos, error: blqError } = await serviceClient
      .from('bloqueos_temporales')
      .select('id, expira_en')
      .eq('profesional_id', profesional_id)
      .eq('fecha', fecha)
      .gte('expira_en', new Date().toISOString());

    if (blqError) return jsonError('db_error', 'Error al verificar bloqueos.', 500, requestId);

    const colision = (bloqueos ?? []).some(b => {
      const bStart = toMins(b.expira_en); // No usamos hora del bloqueo aquí
      return true; // Chequeo por existencia: si hay bloqueo en ese profesional+fecha...
      // El chequeo real usa la validación de intervalo abajo
    });

    // Chequeo preciso: revisar si algún bloqueo activo tiene intersección con nuestro slot
    const { data: bloqueosPrecise, error: blqPError } = await serviceClient
      .from('bloqueos_temporales')
      .select('id, hora, duracion_minutos')
      .eq('profesional_id', profesional_id)
      .eq('fecha', fecha)
      .gte('expira_en', new Date().toISOString());

    if (blqPError) return jsonError('db_error', 'Error al verificar bloqueos.', 500, requestId);

    const hayColisionBloqueo = (bloqueosPrecise ?? []).some(b => {
      const bStart = toMins(b.hora);
      const bEnd = bStart + b.duracion_minutos;
      return (slotStart < bEnd && slotEnd > bStart);
    });

    if (hayColisionBloqueo) {
      return jsonError(
        'slot_blocked',
        'El horario está siendo reservado por otro usuario. Intenta en unos minutos.',
        409,
        requestId
      );
    }

    // Verificar que no hay cita ya confirmada en ese slot
    const { data: citas, error: citError } = await serviceClient
      .from('citas')
      .select('id, hora, duracion_minutos')
      .eq('profesional_id', profesional_id)
      .eq('fecha', fecha)
      .in('estado', ['pendiente_pago', 'parcialmente_pagada', 'confirmada']);

    if (citError) return jsonError('db_error', 'Error al verificar citas.', 500, requestId);

    const hayColisionCita = (citas ?? []).some(c => {
      const cStart = toMins(c.hora);
      const cEnd = cStart + c.duracion_minutos;
      return (slotStart < cEnd && slotEnd > cStart);
    });

    if (hayColisionCita) {
      return jsonError('slot_taken', 'El horario ya fue reservado.', 409, requestId);
    }

    // Crear el bloqueo temporal (15 minutos)
    const expira_en = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: nuevoBloqueo, error: insertErr } = await serviceClient
      .from('bloqueos_temporales')
      .insert({
        profesional_id,
        fecha,
        hora,
        duracion_minutos: duracion,
        usuario_id: usuarioId,
        expira_en,
      })
      .select('id, expira_en')
      .single();

    if (insertErr) return jsonError('db_error', 'No se pudo crear el bloqueo.', 500, requestId);

    return jsonOk(
      {
        bloqueo_id: nuevoBloqueo.id,
        expira_en: nuevoBloqueo.expira_en,
        mensaje: 'Horario reservado por 15 minutos. Completa tu pago antes de que expire.',
      },
      201,
      requestId
    );
  }

  return jsonError('invalid_action', 'Acción no reconocida. Usa "hold" o "release".', 400, requestId);
});
