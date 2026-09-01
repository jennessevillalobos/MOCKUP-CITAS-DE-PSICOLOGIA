// Edge Function: create-stripe-session
//
// Crea una sesión de pago de Stripe Checkout para una orden existente.
// Soporta pago completo y abono parcial (monto personalizado).
// Devuelve la URL de checkout para redirigir al usuario.
//
// Variables de entorno requeridas:
//   STRIPE_SECRET_KEY       — Clave secreta de Stripe
//   SITE_URL                — URL base del sitio (para success/cancel URL)

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface CreateStripeSessionInput {
  orden_id: string;
  monto_personalizado?: number;  // Para pagos fraccionados (abono). Si no se pasa, se cobra el saldo completo.
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

  const body = await readJson<CreateStripeSessionInput>(req);
  if (!body?.orden_id) {
    return jsonError('invalid_payload', 'Falta el campo orden_id.', 422, requestId);
  }

  // 2. Verificar clave de Stripe
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return jsonError('config_error', 'Stripe no está configurado en este entorno.', 503, requestId);
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

  const serviceClient = createServiceClient();

  // 3. Obtener y validar la orden
  const { data: orden, error: ordenError } = await serviceClient
    .from('ordenes')
    .select('*')
    .eq('id', body.orden_id)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (ordenError || !orden) {
    return jsonError('not_found', 'Orden no encontrada o no te pertenece.', 404, requestId);
  }

  if (orden.estado === 'pagado') {
    return jsonError('already_paid', 'Esta orden ya fue pagada.', 409, requestId);
  }

  if (orden.estado === 'cancelado') {
    return jsonError('cancelled', 'Esta orden está cancelada.', 409, requestId);
  }

  // 4. Calcular monto a cobrar en esta sesión
  const montoACobrar = body.monto_personalizado ?? orden.monto;

  if (montoACobrar <= 0) {
    return jsonError('invalid_amount', 'El monto a cobrar debe ser mayor a 0.', 422, requestId);
  }

  if (montoACobrar > orden.monto) {
    return jsonError('overpayment', 'El monto no puede superar el total de la orden.', 422, requestId);
  }

  // 5. Crear la sesión de Stripe Checkout
  const stripePayload = {
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: (orden.moneda ?? 'usd').toLowerCase(),
          unit_amount: montoACobrar,
          product_data: {
            name: orden.concepto,
            metadata: {
              orden_id: orden.id,
              tipo_producto: orden.tipo_producto,
              producto_id: orden.producto_id,
            },
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${siteUrl}/pago/exitoso?orden=${orden.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/pago/cancelado?orden=${orden.id}`,
    metadata: {
      orden_id: orden.id,
      usuario_id: usuarioId,
      tipo_producto: orden.tipo_producto,
      producto_id: orden.producto_id,
    },
  };

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(
      Object.entries(flattenStripeObject(stripePayload)).map(([k, v]) => [k, String(v)])
    ).toString(),
  });

  if (!stripeRes.ok) {
    const err = await stripeRes.json();
    return jsonError('stripe_error', err?.error?.message ?? 'Error al crear la sesión de Stripe.', 502, requestId);
  }

  const session = await stripeRes.json();

  return jsonOk({
    session_id: session.id,
    checkout_url: session.url,
    monto_a_cobrar: montoACobrar,
    moneda: orden.moneda,
    expira_en: new Date(session.expires_at * 1000).toISOString(),
  }, 200, requestId);
});

// Utility: aplana un objeto anidado al formato de la API de Stripe
function flattenStripeObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          Object.assign(result, flattenStripeObject(item as Record<string, unknown>, `${fullKey}[${i}]`));
        } else {
          result[`${fullKey}[${i}]`] = item as string | number | boolean;
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenStripeObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value as string | number | boolean;
    }
  }
  return result;
}
