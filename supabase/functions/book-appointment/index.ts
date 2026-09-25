// Edge Function: book-appointment
//
// Crea una cita para el paciente con sesión, validando disponibilidad, precio
// y modalidad en el servidor (lógica compartida en _shared/reserva.ts con
// book-appointment-guest). Usa el service_role para la mutación; la
// autenticación del usuario se verifica con el token del request.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';
import { validarFormato, validarReserva, crearCitaConOrden, type DatosReserva } from '../_shared/reserva.ts';

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
  const body = await readJson<DatosReserva>(req);
  const errorFormato = validarFormato(body);
  if (errorFormato) return jsonError(errorFormato.code, errorFormato.message, errorFormato.status, requestId);

  const serviceClient = createServiceClient();

  // ── 3. Validar disponibilidad y registrar la cita con su orden ──
  const reserva = await validarReserva(serviceClient, body!);
  if (reserva.error) return jsonError(reserva.error.code, reserva.error.message, reserva.error.status, requestId);

  const cita = await crearCitaConOrden(serviceClient, usuarioId, body!, reserva.data);
  if (cita.error) return jsonError(cita.error.code, cita.error.message, cita.error.status, requestId);

  return jsonOk({
    cita_id: cita.data.cita_id,
    fecha: body!.fecha,
    hora: body!.hora,
    duracion_minutos: reserva.data.duracion,
    precio: reserva.data.precio,
    moneda: reserva.data.moneda,
    estado: 'pendiente_pago',
  }, 201, requestId);
});
