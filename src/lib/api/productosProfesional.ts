import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';

// "Mis productos" de la profesional (migraciones 034–035): subir, reemplazar
// o quitar el archivo de cada producto digital en el bucket privado
// `productos/<clave>/…` y decidir si los compradores pueden descargarlo.

export interface ProductoProfesional {
  id: number;
  clave: string;
  titulo: string;
  tipo: 'video' | 'libro_pdf';
  categoria: string | null;
  precio: number;
  moneda: string;
  estado: 'activo' | 'inactivo';
  archivo: string | null;
  descargaPermitida: boolean;
  ventas: number;
  pagosEnRevision: number;
}

// Límite del bucket (y del plan gratuito de Supabase): 50 MB por archivo.
export const TAMANO_MAXIMO_MB = 50;

export const FORMATOS_POR_TIPO: Record<ProductoProfesional['tipo'], string> = {
  libro_pdf: '.pdf,.epub,application/pdf,application/epub+zip',
  video: '.mp4,.webm,.mp3,video/mp4,video/webm,audio/mpeg',
};

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

export async function cargarMisProductos(): Promise<Result<ProductoProfesional[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('mis_productos_profesional');
  if (error) return fail(toServiceError(error));
  return ok(((data ?? []) as ProductoProfesional[]).map((p) => ({ ...p, precio: p.precio / 100 })));
}

// Nombre de archivo seguro para Storage (sin acentos, espacios ni símbolos).
function nombreSeguro(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  const base = (punto > 0 ? nombre.slice(0, punto) : nombre)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'archivo';
  const extension = punto > 0 ? nombre.slice(punto + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return extension ? `${base}.${extension}` : base;
}

// Sube el archivo, lo asocia al producto y borra el anterior (si había otro).
export async function subirArchivoProducto(producto: ProductoProfesional, archivo: File): Promise<Result<string>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
    return fail({ code: 'too_large', message: `El archivo supera ${TAMANO_MAXIMO_MB} MB.` });
  }
  const ruta = `${producto.clave}/${nombreSeguro(archivo.name)}`;
  const { error: subida } = await supabase.storage.from('productos').upload(ruta, archivo, { upsert: true, contentType: archivo.type || undefined });
  if (subida) {
    const mensaje = /mime|type/i.test(subida.message) ? 'Formato no permitido (usa PDF o EPUB para libros; MP4, WebM o MP3 para videos).'
      : /size|exceed/i.test(subida.message) ? `El archivo supera ${TAMANO_MAXIMO_MB} MB.` : subida.message;
    return fail({ code: 'storage_error', message: mensaje });
  }

  const { error } = await supabase.rpc('asignar_archivo_producto', { p_producto_id: producto.id, p_ruta: ruta });
  if (error) return fail(toServiceError(error));

  if (producto.archivo && producto.archivo !== ruta) {
    await supabase.storage.from('productos').remove([producto.archivo]);
  }
  return ok(ruta);
}

// Quita el archivo del producto (los compradores verán "Archivo disponible pronto").
export async function quitarArchivoProducto(producto: ProductoProfesional): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.rpc('asignar_archivo_producto', { p_producto_id: producto.id, p_ruta: null });
  if (error) return fail(toServiceError(error));
  if (producto.archivo) await supabase.storage.from('productos').remove([producto.archivo]);
  return ok(null);
}

export async function cambiarDescargaProducto(productoId: number, permitida: boolean): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.rpc('cambiar_descarga_producto', { p_producto_id: productoId, p_permitida: permitida });
  if (error) return fail(toServiceError(error));
  return ok(null);
}
