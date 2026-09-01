// Edge Function: create-paypal-order
//
// Crea una orden de pago en PayPal y devuelve el enlace de aprobación.
// El usuario es redirigido a PayPal para aprobar el pago.
//
// Variables de entorno requeridas:
//   PAYPAL_CLIENT_ID        — Client ID de la app PayPal
//   PAYPAL_CLIENT_SECRET    — Client Secret de la app PayPal
//   PAYPAL_MODE             — 'sandbox' | 'live'
//   SITE_URL                — URL base del sitio

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface CreatePaypalOrderInput {
  orden_id: string;
  monto_personalizado?: number;
}

async function getPaypalAccessToken(clientId: string, clientSecret: string, mode: string): Promise<string> {
  const base = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('No se pudo obtener el token de PayPal.');
  const data = await res.json();
  return data.access_token;
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

  const body = await readJson<CreatePaypalOrderInput>(req);
  if (!body?.orden_id) {
    return jsonError('invalid_payload', 'Falta el campo orden_id.', 422, requestId);
  }

  // 2. Verificar credenciales de PayPal
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  const mode = Deno.env.get('PAYPAL_MODE') ?? 'sandbox';
  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

  if (!clientId || !clientSecret) {
    return jsonError('config_error', 'PayPal no está configurado en este entorno.', 503, requestId);
  }

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

  if (orden.estado === 'pagado') return jsonError('already_paid', 'Esta orden ya fue pagada.', 409, requestId);
  if (orden.estado === 'cancelado') return jsonError('cancelled', 'Esta orden está cancelada.', 409, requestId);

  const montoACobrar = body.monto_personalizado ?? orden.monto;
  if (montoACobrar <= 0 || montoACobrar > orden.monto) {
    return jsonError('invalid_amount', 'Monto inválido.', 422, requestId);
  }

  // PayPal usa el formato decimal (no centavos)
  const montoCobrarDecimal = (montoACobrar / 100).toFixed(2);
  const moneda = (orden.moneda ?? 'USD').toUpperCase();

  // 4. Obtener token de acceso PayPal
  let accessToken: string;
  try {
    accessToken = await getPaypalAccessToken(clientId, clientSecret, mode);
  } catch {
    return jsonError('paypal_auth_error', 'No se pudo autenticar con PayPal.', 502, requestId);
  }

  const baseUrl = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  // 5. Crear la orden en PayPal
  const paypalRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: orden.id,
          description: orden.concepto,
          custom_id: JSON.stringify({
            orden_id: orden.id,
            usuario_id: usuarioId,
            tipo_producto: orden.tipo_producto,
            producto_id: orden.producto_id,
          }),
          amount: {
            currency_code: moneda,
            value: montoCobrarDecimal,
          },
        },
      ],
      application_context: {
        return_url: `${siteUrl}/pago/exitoso?orden=${orden.id}&gateway=paypal`,
        cancel_url: `${siteUrl}/pago/cancelado?orden=${orden.id}`,
        brand_name: 'Psique Amor',
        user_action: 'PAY_NOW',
      },
    }),
  });

  if (!paypalRes.ok) {
    const err = await paypalRes.json();
    return jsonError('paypal_error', err?.message ?? 'Error al crear la orden PayPal.', 502, requestId);
  }

  const paypalOrder = await paypalRes.json();
  const approvalLink = paypalOrder.links?.find((l: { rel: string }) => l.rel === 'approve')?.href;

  return jsonOk({
    paypal_order_id: paypalOrder.id,
    approval_url: approvalLink,
    monto_a_cobrar: montoACobrar,
    moneda,
  }, 200, requestId);
});
