import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import { subirComprobante } from '@/lib/api/pagos';

// Tienda y Biblioteca del estudiante (migración 034): compra de productos
// digitales por transferencia (la aprueba la profesional dueña del producto)
// y descarga de los archivos del bucket privado `productos`.
// Montos de la base en centavos; esta capa trabaja en unidades (USD).

export interface EstadoCompraProducto {
  productoId: number;
  titulo: string;
  precio: number;
  moneda: string;
  comprado: boolean;
  pagado: number;
  enRevision: number;
}

export interface ItemBiblioteca {
  compraId: number;
  fecha: string;
  productoId: number;
  clave: string;
  titulo: string;
  descripcion: string | null;
  tipo: 'video' | 'libro_pdf';
  categoria: string | null;
  portada: string | null;
  descargaPermitida: boolean;
  // Ruta en el bucket `productos`; null si aún no se subió el archivo.
  archivo: string | null;
  autora: string | null;
  monto: number | null;
}

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

// `clave` = id del producto en el sitio (pd1…). null si no está a la venta.
export async function estadoCompraProducto(clave: string): Promise<Result<EstadoCompraProducto | null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('estado_compra_producto', { p_clave: clave });
  if (error) return fail(toServiceError(error));
  if (!data) return ok(null);
  const e = data as EstadoCompraProducto;
  return ok({ ...e, precio: e.precio / 100, pagado: e.pagado / 100, enRevision: e.enRevision / 100 });
}

export async function reportarPagoProducto(productoId: number, montoUsd: number, referencia: string, archivo: File | null): Promise<Result<string>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const subida = await subirComprobante(archivo);
  if (subida.error) return fail(subida.error);

  const { data, error } = await supabase.rpc('reportar_pago_producto', {
    p_producto_id: productoId,
    p_monto: Math.round(montoUsd * 100),
    p_referencia: referencia,
    p_comprobante: subida.data,
  });
  if (error) return fail(toServiceError(error));
  return ok(data as string);
}

export async function cargarMiBiblioteca(): Promise<Result<ItemBiblioteca[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('mi_biblioteca');
  if (error) return fail(toServiceError(error));
  return ok(((data ?? []) as ItemBiblioteca[]).map((i) => ({ ...i, monto: i.monto === null ? null : i.monto / 100 })));
}

// Enlace temporal (10 min) al archivo de un producto comprado. Con
// `descargar`, el navegador lo guarda en vez de abrirlo.
export async function urlArchivoProducto(ruta: string, descargar: boolean): Promise<Result<string>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const nombre = ruta.split('/').pop() || 'archivo';
  const { data, error } = await supabase.storage.from('productos').createSignedUrl(ruta, 600, descargar ? { download: nombre } : undefined);
  if (error || !data) return fail({ code: 'storage_error', message: 'No se pudo abrir el archivo. Intenta de nuevo en unos minutos.' });
  return ok(data.signedUrl);
}
