// Edge Function: create-download-link
//
// Genera un enlace de descarga temporal y personal para un producto
// digital comprado (PDF/libro). Valida compra, controla límite de
// descargas y fecha de vencimiento configurable.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface DownloadLinkInput {
  producto_id: number;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  // ── 1. Autenticar ──
  const userClient = createUserClient(req);
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return jsonError('unauthenticated', 'Debes iniciar sesión.', 401, requestId);
  const usuarioId = authData.user.id;

  // ── 2. Validar payload ──
  const body = await readJson<DownloadLinkInput>(req);
  if (!body?.producto_id) return jsonError('invalid_payload', 'Falta producto_id.', 422, requestId);

  const serviceClient = createServiceClient();

  // ── 3. Validar compra ──
  const { data: compra, error: compErr } = await serviceClient
    .from('compras_digitales')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('producto_id', body.producto_id)
    .maybeSingle();

  if (compErr || !compra) return jsonError('not_purchased', 'No has comprado este producto.', 403, requestId);

  // ── 4. Verificar si ya existe un enlace activo ──
  const now = new Date().toISOString();
  const { data: activo, error: activoErr } = await serviceClient
    .from('enlaces_descarga')
    .select('*')
    .eq('compra_id', compra.id)
    .gt('vencimiento', now)
    .order('vencimiento', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activoErr && activo) {
    const restantes = (activo.descargas_max ?? 3) - (activo.descargas_realizadas ?? 0);
    if (restantes > 0) {
      return jsonOk({
        token: activo.token,
        vencimiento: activo.vencimiento,
        descargas_restantes: restantes,
        reutilizado: true,
      }, 200, requestId);
    }
  }

  // ── 5. Crear nuevo enlace ──
  const token = crypto.randomUUID();
  const vencimiento = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas

  const { data: enlace, error: enlaceErr } = await serviceClient
    .from('enlaces_descarga')
    .insert({
      compra_id: compra.id,
      token,
      vencimiento,
      descargas_max: 3,
      descargas_realizadas: 0,
    })
    .select()
    .single();

  if (enlaceErr || !enlace) return jsonError('create_error', 'No se pudo crear el enlace.', 500, requestId);

  return jsonOk({
    token,
    vencimiento,
    descargas_restantes: 3,
    reutilizado: false,
  }, 201, requestId);
});