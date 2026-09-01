// Edge Function: cancel-appointment
//
// Permite a un usuario cancelar una cita activa.
// Aplica la política de devolución según la anticipación:
//   - Más de 48 horas antes → Reembolso completo
//   - Entre 24 y 48 horas   → Reembolso del 50%
//   - Menos de 24 horas     → Sin reembolso
//
// El reembolso se REGISTRA como "pendiente" en la tabla de pagos para que
// el administrador lo procese manualmente (o via Stripe/PayPal en el futuro).
// Registra el cambio en historial_citas.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

// Política de devolución (configurable)
const HORAS_REEMBOLSO_COMPLETO = 48;
const HORAS_REEMBOLSO_PARCIAL = 24;

interface CancelInput {
  cita_id: string;
  motivo?: string;
}

type PoliticaReembolso = 'completo' | 'parcial_50' | 'sin_reembolso';

function calcularPoliticaReembolso(fechaCita: string, horaCita: string): PoliticaReembolso {
  const citaDateTime = new Date(`${fechaCita}T${horaCita}`);
  const horasRestantes = (citaDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

  if (horasRestantes >= HORAS_REEMBOLSO_COMPLETO) return 'completo';
  if (horasRestantes >= HORAS_REEMBOLSO_PARCIAL) return 'parcial_50';
  return 'sin_reembolso';
}

function calcularMontoReembolso(precioTotal: number, politica: PoliticaReembolso, montoAbonado: number): number {
  const pagado = montoAbonado;
  if (politica === 'completo') return pagado;
  if (politica === 'parcial_50') return Math.floor(pagado * 0.5);
  return 0;
}

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
  const body = await readJson<CancelInput>(req);
  if (!body?.cita_id) {
    return jsonError('invalid_payload', 'El campo "cita_id" es requerido.', 422, requestId);
  }

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

  // 4. Validar que el estado permita cancelación
  const estadosCancelables = ['pendiente_pago', 'parcialmente_pagada', 'confirmada'];
  if (!estadosCancelables.includes(cita.estado)) {
    return jsonError(
      'invalid_state',
      `No se puede cancelar una cita en estado "${cita.estado}".`,
      409,
      requestId
    );
  }

  // 5. Calcular política de reembolso
  const politica = calcularPoliticaReembolso(cita.fecha, cita.hora);
  const montoReembolso = calcularMontoReembolso(cita.precio_total, politica, cita.monto_abonado);

  // 6. Cancelar la cita
  const { error: updateErr } = await serviceClient
    .from('citas')
    .update({ estado: 'cancelada' })
    .eq('id', body.cita_id);

  if (updateErr) return jsonError('db_error', 'No se pudo cancelar la cita.', 500, requestId);

  // 7. Si hay monto a reembolsar, registrarlo como pago con estado "pendiente_reembolso"
  if (montoReembolso > 0) {
    // Obtener la orden asociada para vincular el reembolso
    const { data: orden } = await serviceClient
      .from('ordenes')
      .select('id')
      .eq('tipo_producto', 'cita')
      .eq('producto_id', body.cita_id)
      .maybeSingle();

    await serviceClient.from('pagos').insert({
      orden_id: orden?.id ?? null,
      usuario_id: usuarioId,
      monto: montoReembolso,
      moneda: cita.moneda,
      metodo: 'reembolso',
      estado: 'pendiente_reembolso',
      referencia: `REEMBOLSO-${body.cita_id.slice(0, 8).toUpperCase()}`,
    });
  }

  // 8. Registrar en historial
  await serviceClient.from('historial_citas').insert({
    cita_id: body.cita_id,
    usuario_id: usuarioId,
    accion: 'cancelada',
    datos_anteriores: {
      fecha: cita.fecha,
      hora: cita.hora,
      estado: cita.estado,
      monto_abonado: cita.monto_abonado,
    },
    datos_nuevos: {
      estado: 'cancelada',
      politica_reembolso: politica,
      monto_reembolso: montoReembolso,
    },
    motivo: body.motivo ?? null,
  });

  // 9. Construir respuesta
  const mensajesReembolso: Record<PoliticaReembolso, string> = {
    completo: `Se procesará un reembolso completo de ${montoReembolso} ${cita.moneda}.`,
    parcial_50: `Se procesará un reembolso del 50% (${montoReembolso} ${cita.moneda}) por cancelación tardía.`,
    sin_reembolso: 'No aplica reembolso por cancelación con menos de 24 horas de anticipación.',
  };

  return jsonOk({
    cita_id: body.cita_id,
    estado: 'cancelada',
    politica_reembolso: politica,
    monto_reembolso: montoReembolso,
    moneda: cita.moneda,
    mensaje_reembolso: mensajesReembolso[politica],
  }, 200, requestId);
});
