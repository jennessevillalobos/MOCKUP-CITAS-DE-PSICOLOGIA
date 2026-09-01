// Edge Function: paypal-webhook
//
// Recibe y procesa eventos de PayPal de forma segura.
// Implementa: BE-024 (handler), BE-026 (verificar firma), BE-027 (idempotencia),
//             BE-031 (actualizar estados).
//
// Variables de entorno requeridas:
//   PAYPAL_CLIENT_ID        — Client ID de la app PayPal
//   PAYPAL_CLIENT_SECRET    — Client Secret de la app PayPal
//   PAYPAL_WEBHOOK_ID       — ID del webhook registrado en PayPal Developer Dashboard
//   PAYPAL_MODE             — 'sandbox' | 'live'

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId } from '../_shared/http.ts';
import { createServiceClient } from '../_shared/auth.ts';
import { checkAndMarkIdempotency } from '../_shared/idempotency.ts';

// Verificar firma de PayPal usando su API de verificación (BE-026)
async function verificarFirmaPayPal(
  headers: Headers,
  payload: string,
  clientId: string,
  clientSecret: string,
  webhookId: string,
  mode: string
): Promise<boolean> {
  const base = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  // Obtener token de acceso
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!tokenRes.ok) return false;
  const { access_token } = await tokenRes.json();

  // Verificar firma
  const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(payload),
    }),
  });

  if (!verifyRes.ok) return false;
  const { verification_status } = await verifyRes.json();
  return verification_status === 'SUCCESS';
}

Deno.serve(async (req) => {
  handleOptions(req);

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
  const mode = Deno.env.get('PAYPAL_MODE') ?? 'sandbox';

  if (!clientId || !clientSecret || !webhookId) {
    return jsonError('config_error', 'PayPal no está configurado.', 503, requestId);
  }

  const payload = await req.text();

  // 1. Verificar firma (BE-026)
  const firmaValida = await verificarFirmaPayPal(
    req.headers, payload, clientId, clientSecret, webhookId, mode
  );
  if (!firmaValida) {
    return jsonError('invalid_signature', 'Firma de webhook PayPal inválida.', 400, requestId);
  }

  let evento: Record<string, unknown>;
  try {
    evento = JSON.parse(payload);
  } catch {
    return jsonError('invalid_payload', 'Payload no es JSON válido.', 400, requestId);
  }

  const eventoId = evento.id as string;
  const eventoTipo = evento.event_type as string;
  const resource = evento.resource as Record<string, unknown>;

  const serviceClient = createServiceClient();

  // 2. Idempotencia (BE-027)
  const idempotenciaResult = await checkAndMarkIdempotency(
    serviceClient,
    `paypal:${eventoId}`,
    { tipo: eventoTipo, procesado_en: new Date().toISOString() }
  );

  if (idempotenciaResult.alreadyProcessed) {
    return jsonOk({ message: 'Evento ya procesado.', evento_id: eventoId }, 200, requestId);
  }

  // 3. Manejar eventos relevantes
  switch (eventoTipo) {

    // Pago capturado exitosamente (BE-028, BE-029, BE-031)
    case 'PAYMENT.CAPTURE.COMPLETED': {
      const purchaseUnits = (resource.supplementary_data as Record<string, unknown>)
        ?.related_ids as Record<string, string> | undefined;

      // Intentar leer custom_id de la orden PayPal para obtener metadatos
      const customIdStr = (resource.custom_id as string) ?? '{}';
      let meta: Record<string, string> = {};
      try { meta = JSON.parse(customIdStr); } catch { /* sin metadatos */ }

      const ordenId = meta.orden_id;
      const usuarioId = meta.usuario_id;
      const tipoProducto = meta.tipo_producto;
      const productoId = meta.producto_id;
      const captureId = resource.id as string;
      const montoCapturado = parseFloat((resource.amount as Record<string, string>)?.value ?? '0');
      const monedaCapturada = ((resource.amount as Record<string, string>)?.currency_code ?? 'USD');
      // PayPal retorna en decimal; convertir a centavos
      const montoEnCentavos = Math.round(montoCapturado * 100);

      if (!ordenId) break;

      // Registrar el pago
      await serviceClient.from('pagos').insert({
        orden_id: ordenId,
        usuario_id: usuarioId ?? null,
        monto: montoEnCentavos,
        moneda: monedaCapturada,
        metodo: 'paypal',
        referencia: captureId,
        estado: 'aprobado',
      });

      // Confirmar cita si aplica
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
              monto_pagado: montoEnCentavos,
              metodo_pago: 'paypal',
              referencia_pago: captureId,
            }),
          }
        );
      } else if (ordenId) {
        await serviceClient.from('ordenes').update({ estado: 'pagado' }).eq('id', ordenId);
      }
      break;
    }

    // Reembolso completado (BE-034, BE-035)
    case 'PAYMENT.CAPTURE.REFUNDED': {
      const captureId = (resource.links as Array<{ rel: string; href: string }>)
        ?.find(l => l.rel === 'up')?.href?.split('/').pop();

      if (captureId) {
        const { data: pago } = await serviceClient
          .from('pagos')
          .select('id')
          .eq('referencia', captureId)
          .maybeSingle();

        if (pago) {
          await serviceClient
            .from('reembolsos')
            .update({ estado: 'completado' })
            .eq('pago_id', pago.id);
        }
      }
      break;
    }

    default:
      break;
  }

  return jsonOk({ received: true, evento_id: eventoId, tipo: eventoTipo }, 200, requestId);
});
