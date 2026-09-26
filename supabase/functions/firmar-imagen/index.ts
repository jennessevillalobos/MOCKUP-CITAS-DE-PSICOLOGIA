// Edge Function: firmar-imagen
//
// Firma una subida directa del navegador a Cloudinary para imágenes PÚBLICAS
// (decidido con la usuaria: comprobantes y archivos de productos siguen
// privados en Supabase Storage). El secreto de Cloudinary nunca sale del
// servidor: aquí se comprueba quién pide y qué puede cambiar, y se devuelve
// una firma de corta duración con el `public_id` fijo, así nadie puede subir
// a otra ruta ni sobrescribir imágenes ajenas.
//
//   destino 'avatar'   → foto de perfil del propio usuario
//   destino 'curso'    → portada de un curso de la profesional (clave = slug)
//   destino 'producto' → portada de un producto de la profesional (clave = pd1…)
//
// Secretos: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
// Si faltan responde `config_error` y el frontend usa Supabase Storage (fotos).

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface Entrada {
  destino?: 'avatar' | 'curso' | 'producto';
  clave?: string;
}

// Solo imágenes; se limitan a 1600 px al recibirlas (transformación entrante).
const FORMATOS = 'jpg,jpeg,png,webp';
const TRANSFORMACION = 'c_limit,w_1600,h_1600';

async function sha1Hex(texto: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  if (!cloudName || !apiKey || !apiSecret) {
    return jsonError('config_error', 'Cloudinary no está configurado.', 503, requestId);
  }

  const userClient = createUserClient(req);
  const { data: auth, error: authErr } = await userClient.auth.getUser();
  if (authErr || !auth.user) return jsonError('unauthenticated', 'Debes iniciar sesión.', 401, requestId);
  const uid = auth.user.id;

  const body = await readJson<Entrada>(req);
  const destino = body?.destino;
  const clave = typeof body?.clave === 'string' ? body.clave.trim() : '';

  let publicId: string;
  if (destino === 'avatar') {
    publicId = `psiqueamor/avatares/${uid}`;
  } else if (destino === 'curso' || destino === 'producto') {
    if (!/^[a-z0-9-]{1,80}$/.test(clave)) return jsonError('invalid_payload', 'Clave inválida.', 422, requestId);
    const db = createServiceClient();
    const { data: prof } = await db.from('profesionales').select('id').eq('usuario_id', uid).maybeSingle();
    if (!prof) return jsonError('forbidden', 'Solo las profesionales pueden cambiar portadas.', 403, requestId);
    const tabla = destino === 'curso' ? 'cursos' : 'productos_digitales';
    const columna = destino === 'curso' ? 'slug' : 'clave';
    const { data: fila } = await db.from(tabla).select('id').eq(columna, clave).eq('profesional_id', prof.id).maybeSingle();
    if (!fila) return jsonError('forbidden', 'No tienes permiso para cambiar esta portada.', 403, requestId);
    publicId = `psiqueamor/${destino === 'curso' ? 'cursos' : 'productos'}/${clave}`;
  } else {
    return jsonError('invalid_payload', 'Destino inválido.', 422, requestId);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Parámetros firmados (orden alfabético, como exige Cloudinary).
  const parametros: Record<string, string> = {
    allowed_formats: FORMATOS,
    invalidate: 'true',
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
    transformation: TRANSFORMACION,
  };
  const aFirmar = Object.keys(parametros).sort().map((k) => `${k}=${parametros[k]}`).join('&');
  const signature = await sha1Hex(aFirmar + apiSecret);

  return jsonOk({
    url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    campos: { ...parametros, api_key: apiKey, signature },
  }, 200, requestId);
});
