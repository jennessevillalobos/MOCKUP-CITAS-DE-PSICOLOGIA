// Edge Function: get-protected-content
//
// Valida que el usuario haya comprado un producto digital y devuelve
// una URL firmada temporal del archivo desde Supabase Storage.
// La URL expira después del tiempo configurado y no expone la ruta real.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface ContentInput {
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
  const body = await readJson<ContentInput>(req);
  if (!body?.producto_id) return jsonError('invalid_payload', 'Falta producto_id.', 422, requestId);

  const serviceClient = createServiceClient();

  // ── 3. Validar que el producto existe y está activo ──
  const { data: producto, error: prodErr } = await serviceClient
    .from('productos_digitales')
    .select('id, tipo, titulo, archivo_url, estado')
    .eq('id', body.producto_id)
    .maybeSingle();

  if (prodErr || !producto) return jsonError('not_found', 'Producto no encontrado.', 404, requestId);
  if (producto.estado !== 'activo') return jsonError('inactive_product', 'El producto no está disponible.', 403, requestId);

  // ── 4. Validar compra del usuario ──
  const { data: compra, error: compErr } = await serviceClient
    .from('compras_digitales')
    .select('id, pago_id')
    .eq('usuario_id', usuarioId)
    .eq('producto_id', body.producto_id)
    .maybeSingle();

  if (compErr || !compra) return jsonError('not_purchased', 'No has comprado este producto.', 403, requestId);

  // Validar que el pago fue aprobado
  if (compra.pago_id) {
    const { data: pago, error: pagoErr } = await serviceClient
      .from('pagos')
      .select('estado')
      .eq('id', compra.pago_id)
      .maybeSingle();
    if (!pagoErr && pago && pago.estado !== 'aprobado') {
      return jsonError('payment_pending', 'El pago aún no fue confirmado.', 402, requestId);
    }
  }

  // ── 5. Generar URL firmada desde Storage ──
  if (!producto.archivo_url) return jsonError('no_file', 'El producto no tiene archivo asociado.', 404, requestId);

  // El formato esperado de archivo_url es: bucket/ruta/archivo.ext
  const parts = producto.archivo_url.split('/');
  if (parts.length < 2) return jsonError('invalid_file_path', 'Ruta de archivo inválida.', 500, requestId);

  const bucket = parts[0];
  const filePath = parts.slice(1).join('/');

  // URL firmada: 1 hora para video, 5 minutos para PDF
  const expiresIn = producto.tipo === 'video' ? 3600 : 300;

  const { data: signedData, error: signedErr } = await serviceClient
    .storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (signedErr || !signedData?.signedUrl) {
    return jsonError('signed_url_error', 'No se pudo generar la URL de acceso.', 500, requestId);
  }

  // ── 6. Para libros, actualizar descargas si corresponde ──
  if (producto.tipo === 'libro_pdf') {
    const { data: enlace } = await serviceClient
      .from('enlaces_descarga')
      .select('id, descargas_realizadas, descargas_max')
      .eq('compra_id', compra.id)
      .maybeSingle();

    if (enlace) {
      await serviceClient
        .from('enlaces_descarga')
        .update({ descargas_realizadas: (enlace.descargas_realizadas ?? 0) + 1 })
        .eq('id', enlace.id);
    }
  }

  return jsonOk({
    url: signedData.signedUrl,
    tipo: producto.tipo,
    titulo: producto.titulo,
    expira_en: expiresIn,
  }, 200, requestId);
});