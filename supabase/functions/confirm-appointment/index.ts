// Edge Function: confirm-appointment
//
// Confirma una cita después de que se registra un pago.
// Puede ser llamada por:
//   a) El webhook de Stripe/PayPal al recibir el pago (modo automático).
//   b) El admin al aprobar un pago manual (modo manual).
//
// Lógica de transición de estados (BE-005, BE-006):
//   - Si monto_pagado >= precio_total → estado = 'confirmada'
//   - Si monto_pagado > 0 && monto_pagado < precio_total → estado = 'parcialmente_pagada'
//
// La transición la valida el trigger de PostgreSQL (007_maquina_estados_cita.sql).
// Si la transición no es válida (ej: intentar confirmar una cita cancelada),
// la BD rechazará el UPDATE y retornaremos un error claro.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface ConfirmInput {
  cita_id: string;
  monto_pagado: number;       // En unidad mínima (centavos, etc.)
  metodo_pago: string;        // 'stripe' | 'paypal' | 'manual' | 'transferencia'
  referencia_pago?: string;   // ID de transacción externo (Stripe, PayPal, etc.)
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  // Esta función puede ser llamada tanto por webhooks (sin usuario autenticado)
  // como por el admin autenticado. Intentamos obtener el usuario, pero no es obligatorio.
  const userClient = createUserClient(req);
  const { data: authData } = await userClient.auth.getUser();
  const llamadorId = authData?.user?.id ?? null;

  // Validar payload
  const body = await readJson<ConfirmInput>(req);
  if (!body?.cita_id || body?.monto_pagado === undefined || !body?.metodo_pago) {
    return jsonError('invalid_payload', 'Faltan campos: cita_id, monto_pagado, metodo_pago.', 422, requestId);
  }

  if (body.monto_pagado <= 0) {
    return jsonError('invalid_amount', 'El monto_pagado debe ser mayor a 0.', 422, requestId);
  }

  const serviceClient = createServiceClient();

  // 1. Obtener la cita con su orden asociada
  const { data: cita, error: citaError } = await serviceClient
    .from('citas')
    .select('*')
    .eq('id', body.cita_id)
    .maybeSingle();

  if (citaError || !cita) {
    return jsonError('not_found', 'Cita no encontrada.', 404, requestId);
  }

  // 2. Validar que la cita esté en estado que permita pagos
  const estadosAceptanPago = ['pendiente_pago', 'parcialmente_pagada'];
  if (!estadosAceptanPago.includes(cita.estado)) {
    return jsonError(
      'invalid_state',
      `La cita está en estado "${cita.estado}" y no acepta pagos adicionales.`,
      409,
      requestId
    );
  }

  // 3. Validar que el monto no supere el saldo pendiente
  if (body.monto_pagado > cita.saldo_pendiente) {
    return jsonError(
      'overpayment',
      `El monto pagado (${body.monto_pagado}) supera el saldo pendiente (${cita.saldo_pendiente}).`,
      422,
      requestId
    );
  }

  // 4. Obtener la orden para registrar el pago
  const { data: orden } = await serviceClient
    .from('ordenes')
    .select('id')
    .eq('tipo_producto', 'cita')
    .eq('producto_id', body.cita_id)
    .maybeSingle();

  // 5. Registrar el pago individual
  const { error: pagoError } = await serviceClient.from('pagos').insert({
    orden_id: orden?.id ?? null,
    usuario_id: cita.usuario_id,
    monto: body.monto_pagado,
    moneda: cita.moneda,
    metodo: body.metodo_pago,
    estado: 'aprobado',
    referencia: body.referencia_pago ?? null,
  });

  if (pagoError) return jsonError('db_error', 'No se pudo registrar el pago.', 500, requestId);

  // 6. Calcular nuevo monto abonado y saldo pendiente
  const nuevoMontoAbonado = cita.monto_abonado + body.monto_pagado;
  const nuevoSaldoPendiente = cita.precio_total - nuevoMontoAbonado;

  // 7. Determinar nuevo estado según los montos
  let nuevoEstado: string;
  if (nuevoSaldoPendiente <= 0) {
    nuevoEstado = 'confirmada';
  } else {
    nuevoEstado = 'parcialmente_pagada';
  }

  // 8. Actualizar la cita (el trigger de BD validará la transición de estado)
  const { error: updateError } = await serviceClient
    .from('citas')
    .update({
      monto_abonado: nuevoMontoAbonado,
      saldo_pendiente: Math.max(0, nuevoSaldoPendiente),
      estado: nuevoEstado,
    })
    .eq('id', body.cita_id);

  if (updateError) {
    // Si el trigger rechaza la transición, devolvemos un error claro
    return jsonError(
      'state_transition_error',
      `No se pudo actualizar el estado de la cita: ${updateError.message}`,
      409,
      requestId
    );
  }

  // 9. Registrar en historial
  await serviceClient.from('historial_citas').insert({
    cita_id: body.cita_id,
    usuario_id: llamadorId,
    accion: nuevoEstado === 'confirmada' ? 'confirmada' : 'pago_registrado',
    datos_anteriores: {
      estado: cita.estado,
      monto_abonado: cita.monto_abonado,
      saldo_pendiente: cita.saldo_pendiente,
    },
    datos_nuevos: {
      estado: nuevoEstado,
      monto_abonado: nuevoMontoAbonado,
      saldo_pendiente: Math.max(0, nuevoSaldoPendiente),
      pago_registrado: body.monto_pagado,
      metodo: body.metodo_pago,
    },
    motivo: `Pago registrado: ${body.metodo_pago} - ref: ${body.referencia_pago ?? 'N/A'}`,
  });

  return jsonOk({
    cita_id: body.cita_id,
    estado_anterior: cita.estado,
    estado_nuevo: nuevoEstado,
    monto_abonado: nuevoMontoAbonado,
    saldo_pendiente: Math.max(0, nuevoSaldoPendiente),
    precio_total: cita.precio_total,
    confirmada: nuevoEstado === 'confirmada',
    mensaje: nuevoEstado === 'confirmada'
      ? '¡Cita confirmada! El pago fue procesado completamente.'
      : `Abono registrado. Saldo pendiente: ${Math.max(0, nuevoSaldoPendiente)} ${cita.moneda}.`,
  }, 200, requestId);
});
