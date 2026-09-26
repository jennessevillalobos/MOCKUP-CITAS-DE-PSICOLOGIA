import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';

// Pagos por transferencia con aprobación de la profesional (migración 022):
// el paciente reporta la transferencia (con comprobante opcional en el bucket
// privado `comprobantes/<uid>/`) y la profesional la aprueba o rechaza.
// Montos de la base en centavos; esta capa trabaja en unidades (USD).

export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'pendiente_reembolso' | 'reembolsado';

export interface PagoPaciente {
  id: string;
  fecha: string;
  monto: number;
  moneda: string;
  metodo: string;
  estado: EstadoPago;
  referencia: string | null;
  // Motivo que escribió la profesional al rechazar (migración 025).
  motivoRechazo: string | null;
  citaId: string | null;
  concepto: string;
}

export interface PagoEnRevision {
  id: string;
  citaId: string;
  monto: number;
  moneda: string;
  referencia: string | null;
  comprobante: string | null;
  fecha: string;
}

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

export async function cargarMisPagos(): Promise<Result<PagoPaciente[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('mis_pagos_paciente');
  if (error) return fail(toServiceError(error));
  return ok(((data ?? []) as PagoPaciente[]).map((p) => ({ ...p, monto: p.monto / 100 })));
}

// Sube el comprobante (si hay) y registra la transferencia en revisión.
export async function reportarTransferencia(citaId: string, montoUsd: number, referencia: string, archivo: File | null): Promise<Result<string>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data: sesion } = await supabase.auth.getSession();
  const userId = sesion.session?.user.id;
  if (!userId) return fail({ code: 'no_session', message: 'Debes iniciar sesión para pagar.' });

  let comprobante: string | null = null;
  if (archivo) {
    const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
    comprobante = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: subida } = await supabase.storage.from('comprobantes').upload(comprobante, archivo, { contentType: archivo.type });
    if (subida) {
      return fail({ code: 'storage_error', message: /size|exceed/i.test(subida.message) ? 'El comprobante supera 5 MB.' : 'No se pudo subir el comprobante (usa PDF, JPG o PNG).' });
    }
  }

  const { data, error } = await supabase.rpc('reportar_pago_transferencia', {
    p_cita_id: citaId,
    p_monto: Math.round(montoUsd * 100),
    p_referencia: referencia,
    p_comprobante: comprobante,
  });
  if (error) return fail(toServiceError(error));
  return ok(data as string);
}

// Orden de pago de una cita (para Stripe/PayPal, que cobran sobre una orden).
export async function ordenDeCita(citaId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return null;
  const { data } = await supabase
    .from('ordenes')
    .select('id')
    .eq('tipo_producto', 'cita')
    .eq('producto_id', citaId)
    .order('fecha_creacion')
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function cargarPagosEnRevision(): Promise<Result<PagoEnRevision[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('pagos_en_revision_profesional');
  if (error) return fail(toServiceError(error));
  return ok(((data ?? []) as PagoEnRevision[]).map((p) => ({ ...p, monto: p.monto / 100 })));
}

export async function revisarPago(pagoId: string, aprobar: boolean, motivo?: string): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.rpc('revisar_pago', { p_pago_id: pagoId, p_aprobar: aprobar, p_motivo: motivo ?? null });
  if (error) return fail(toServiceError(error));
  return ok(null);
}

// Enlace temporal (5 min) para ver un comprobante.
export async function urlComprobante(ruta: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return null;
  const { data } = await supabase.storage.from('comprobantes').createSignedUrl(ruta, 300);
  return data?.signedUrl ?? null;
}
