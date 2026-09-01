// Edge Function: stripe-webhook
//
// Recibe y procesa eventos de Stripe de forma segura.
// Implementa: BE-023 (handler), BE-025 (verificar firma), BE-027 (idempotencia),
//             BE-028/029 (lógica de pago completo/fraccionado), BE-031 (actualizar estados).
//
// Variables de entorno requeridas:
//   STRIPE_WEBHOOK_SECRET   — Secreto de firma del webhook en Stripe Dashboard

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId } from '../_shared/http.ts';
import { createServiceClient } from '../_shared/auth.ts';
import { checkAndMarkIdempotency } from '../_shared/idempotency.ts';

// Función para verificar la firma HMAC-SHA256 de Stripe (BE-025)
async function verificarFirmaStripe(
  payload: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const signature = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !signature) return false;

  // Prevenir ataques de replay: timestamp no puede ser mayor a 5 minutos
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(mac))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSig === signature;
}

Deno.serve(async (req) => {
  handleOptions(req);  // No retornamos preflight aquí; Stripe no hace OPTIONS

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) return jsonError('config_error', 'Stripe Webhook Secret no configurado.', 503, requestId);

  const signatureHeader = req.headers.get('stripe-signature') ?? '';
  const payload = await req.text();

  // 1. Verificar firma (BE-025)
  const firmaValida = await verificarFirmaStripe(payload, signatureHeader, webhookSecret);
  if (!firmaValida) {
    return jsonError('invalid_signature', 'Firma de webhook inválida.', 400, requestId);
  }

  let evento: Record<string, unknown>;
  try {
    evento = JSON.parse(payload);
  } catch {
    return jsonError('invalid_payload', 'Payload no es JSON válido.', 400, requestId);
  }

  const eventoId = evento.id as string;
  const eventoTipo = evento.type as string;

  const serviceClient = createServiceClient();

  // 2. Idempotencia (BE-027): ignorar eventos duplicados
  const idempotenciaResult = await checkAndMarkIdempotency(
    serviceClient,
    `stripe:${eventoId}`,
    { tipo: eventoTipo, procesado_en: new Date().toISOString() }
  );

  if (idempotenciaResult.alreadyProcessed) {
    // Devolver 200 para que Stripe no reintente
    return jsonOk({ message: 'Evento ya procesado.', evento_id: eventoId }, 200, requestId);
  }

  // 3. Manejar eventos relevantes
  const data = evento.data as Record<string, unknown>;
  const object = data?.object as Record<string, unknown>;

  switch (eventoTipo) {

    // Pago exitoso via Checkout Session (BE-028, BE-029, BE-031)
    case 'checkout.session.completed': {
      const metadata = object.metadata as Record<string, string>;
      const ordenId = metadata?.orden_id;
      const usuarioId = metadata?.usuario_id;
      const tipoProducto = metadata?.tipo_producto;
      const productoId = metadata?.producto_id;
      const montoTotal = (object.amount_total as number) ?? 0;
      const moneda = ((object.currency as string) ?? 'usd').toUpperCase();
      const sessionId = object.id as string;

      if (!ordenId) break;

      // Registrar el pago individual
      await serviceClient.from('pagos').insert({
        orden_id: ordenId,
        usuario_id: usuarioId,
        monto: montoTotal,
        moneda,
        metodo: 'stripe',
        referencia: sessionId,
        estado: 'aprobado',
      });

      // Llamar confirm-appointment si es una cita
      if (tipoProducto === 'cita' && productoId) {
        await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/confirm-appointment`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              cita_id: productoId,
              monto_pagado: montoTotal,
              metodo_pago: 'stripe',
              referencia_pago: sessionId,
            }),
          }
        );
      } else {
        // Para cursos/productos, marcar orden como pagada
        await serviceClient
          .from('ordenes')
          .update({ estado: 'pagado' })
          .eq('id', ordenId);
      }
      break;
    }

    // Reembolso emitido (BE-034, BE-035)
    case 'charge.refund.updated': {
      const refundId = object.id as string;
      const chargeId = object.charge as string;
      const montoReembolso = (object.amount as number) ?? 0;
      const estadoReembolso = object.status as string;

      if (estadoReembolso === 'succeeded') {
        // Buscar el pago por referencia de cargo de Stripe
        const { data: pagoExistente } = await serviceClient
          .from('pagos')
          .select('id, orden_id')
          .eq('referencia', chargeId)
          .maybeSingle();

        if (pagoExistente) {
          // Actualizar el reembolso existente a completado
          await serviceClient
            .from('reembolsos')
            .update({ estado: 'completado' })
            .eq('pago_id', pagoExistente.id)
            .lte('monto', montoReembolso);
        }
      }
      break;
    }

    // Pago fallido
    case 'payment_intent.payment_failed': {
      const metadata = (object.metadata as Record<string, string>) ?? {};
      const ordenId = metadata?.orden_id;
      if (ordenId) {
        // El pago falló; no hacemos nada con la orden (el usuario puede reintentar)
        // Pero sí registramos el intento fallido
        await serviceClient.from('pagos').insert({
          orden_id: ordenId,
          monto: (object.amount as number) ?? 0,
          moneda: ((object.currency as string) ?? 'usd').toUpperCase(),
          metodo: 'stripe',
          referencia: object.id as string,
          estado: 'rechazado',
        });
      }
      break;
    }

    default:
      // Evento no manejado — respondemos 200 para que Stripe no reintente
      break;
  }

  return jsonOk({ received: true, evento_id: eventoId, tipo: eventoTipo }, 200, requestId);
});
