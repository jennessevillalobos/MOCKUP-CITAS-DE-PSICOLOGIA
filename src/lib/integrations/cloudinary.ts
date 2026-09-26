// ─── Cloudinary: imágenes PÚBLICAS del portal ─────────────────────────────────
//
// Decidido con la usuaria: van a Cloudinary las fotos de perfil y las portadas
// de cursos y de productos (optimizadas al vuelo). Los comprobantes de pago y
// los archivos de productos siguen PRIVADOS en Supabase Storage.
//
// La subida es FIRMADA: la Edge Function `firmar-imagen` comprueba quién sube y
// qué puede cambiar, y devuelve una firma de corta duración con el destino
// fijo. El secreto de Cloudinary vive solo en los secretos de Supabase
// (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET); el
// navegador nunca lo ve ni necesita variables VITE_ de Cloudinary.

import { firmarImagen, type DestinoImagen } from '@/lib/api/edgeFunctions';
import { ok, fail, type Result } from '@/lib/supabase/errors';

export const TIPOS_IMAGEN = 'image/jpeg,image/png,image/webp';
const TAMANO_MAXIMO_MB = 8;

/**
 * Sube una imagen pública a Cloudinary y devuelve su URL (https).
 * Si Cloudinary no está configurado, el error trae code 'config_error'.
 */
export async function subirImagenPublica(archivo: Blob, destino: DestinoImagen, clave?: string): Promise<Result<string>> {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) {
    return fail({ code: 'invalid_type', message: 'Usa una imagen JPG, PNG o WebP.' });
  }
  if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
    return fail({ code: 'too_large', message: `La imagen supera ${TAMANO_MAXIMO_MB} MB.` });
  }

  const firma = await firmarImagen(destino, clave);
  if (firma.error) return fail(firma.error);

  const formulario = new FormData();
  formulario.append('file', archivo);
  Object.entries(firma.data.campos).forEach(([k, v]) => formulario.append(k, v));

  try {
    const respuesta = await fetch(firma.data.url, { method: 'POST', body: formulario });
    const datos = (await respuesta.json()) as { secure_url?: string; error?: { message?: string } };
    if (!respuesta.ok || !datos.secure_url) {
      return fail({ code: 'cloudinary_error', message: datos.error?.message ?? 'No se pudo subir la imagen.' });
    }
    return ok(datos.secure_url);
  } catch {
    return fail({ code: 'network_error', message: 'Error de red al subir la imagen.' });
  }
}

/**
 * Versión optimizada de una imagen de Cloudinary (formato y calidad
 * automáticos, ancho máximo). Otras URLs se devuelven tal cual.
 */
export function optimizarImagen(url: string | null | undefined, ancho: number): string {
  if (!url) return '';
  const marca = '/image/upload/';
  if (!url.startsWith('https://res.cloudinary.com/') || !url.includes(marca)) return url;
  return url.replace(marca, `${marca}f_auto,q_auto,c_limit,w_${ancho}/`);
}
