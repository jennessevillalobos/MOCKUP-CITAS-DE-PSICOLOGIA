// Módulo unificado para llamar a las Edge Functions de Supabase.
//
// Todas las funciones obtienen el token JWT de la sesión activa de Supabase y
// lo adjuntan en el header Authorization. Si Supabase no está configurado
// (modo demo) devuelven un error explícito `supabase_not_configured` para que
// las páginas conserven su comportamiento demo actual sin arrojar excepciones.
//
// URL base: {VITE_SUPABASE_URL}/functions/v1/{nombre-función}

import { getSupabaseClient, isSupabaseConfigured, SUPABASE_URL } from '@/lib/supabase/client';
import { ok, fail, type Result } from '@/lib/supabase/errors';

// ─── Tipos de entrada y salida de cada Edge Function ─────────────────────────

export interface GetAvailableSlotsInput {
  profesional_id: number;
  servicio_id: number;
  modalidad_id: number;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
}

export interface Slot {
  fecha: string;
  hora: string;
  duracion_minutos: number;
}

export interface GetAvailableSlotsOutput {
  slots: Slot[];
}

export interface BookAppointmentInput {
  servicio_id: number;
  profesional_id: number;
  lugar_id?: number;
  modalidad_id: number;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
}

export interface BookAppointmentOutput {
  cita_id: string;
  fecha: string;
  hora: string;
  duracion_minutos: number;
  precio: number;
  moneda: string | null;
  estado: string;
}

export interface CreateStripeSessionOutput {
  session_id: string;
  checkout_url: string;
  monto_a_cobrar: number;
  moneda: string | null;
  expira_en: string;
}

export interface CreatePaypalOrderOutput {
  orden_id: string;
  paypal_order_id: string;
  approval_url: string;
}

export interface CreateDownloadLinkOutput {
  download_url: string;
  vencimiento: string;
}

// ─── Utilidad interna: llamada genérica con JWT ───────────────────────────────

async function getSessionToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function callEdgeFunction<T>(
  functionName: string,
  body: unknown
): Promise<Result<T>> {
  if (!isSupabaseConfigured() || !SUPABASE_URL) {
    return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
  }

  const token = await getSessionToken();
  if (!token) {
    return fail<T>({ code: 'no_session', message: 'Debes iniciar sesión para continuar.' });
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return fail<T>({ code: 'network_error', message: 'Error de red al contactar el servidor.' });
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return fail<T>({ code: 'invalid_response', message: 'Respuesta inválida del servidor.', status: response.status });
  }

  if (!response.ok) {
    const err = json as { error?: string; message?: string };
    return fail<T>({
      code: err?.error ?? 'edge_function_error',
      message: err?.message ?? `Error ${response.status} del servidor.`,
      status: response.status,
    });
  }

  // Las Edge Functions de este proyecto devuelven { ok: true, data: T, requestId: string }
  const result = json as { ok: boolean; data: T };
  return ok(result.data ?? (json as T));
}

// ─── Funciones públicas (una por Edge Function relevante) ─────────────────────

/**
 * Obtiene los slots disponibles para un profesional en un rango de fechas.
 * Edge Function: `get-available-slots`
 */
export async function getAvailableSlots(
  input: GetAvailableSlotsInput
): Promise<Result<GetAvailableSlotsOutput>> {
  return callEdgeFunction<GetAvailableSlotsOutput>('get-available-slots', input);
}

/**
 * Reserva una cita creando la fila en `citas` y la `orden` asociada.
 * Edge Function: `book-appointment`
 */
export async function bookAppointment(
  input: BookAppointmentInput
): Promise<Result<BookAppointmentOutput>> {
  return callEdgeFunction<BookAppointmentOutput>('book-appointment', input);
}

/**
 * Crea una sesión de Stripe Checkout para una orden existente.
 * Edge Function: `create-stripe-session`
 *
 * @param ordenId - UUID de la orden en la tabla `ordenes`.
 * @param montoPersonalizado - Opcional. Si se pasa, permite pago parcial (abono).
 */
export async function createStripeSession(
  ordenId: string,
  montoPersonalizado?: number
): Promise<Result<CreateStripeSessionOutput>> {
  return callEdgeFunction<CreateStripeSessionOutput>('create-stripe-session', {
    orden_id: ordenId,
    monto_personalizado: montoPersonalizado,
  });
}

/**
 * Crea una orden de PayPal para una orden existente.
 * Edge Function: `create-paypal-order`
 */
export async function createPaypalOrder(
  ordenId: string
): Promise<Result<CreatePaypalOrderOutput>> {
  return callEdgeFunction<CreatePaypalOrderOutput>('create-paypal-order', { orden_id: ordenId });
}

/**
 * Genera un enlace de descarga firmado y con tiempo de vida para un producto digital.
 * Edge Function: `create-download-link`
 */
export async function createDownloadLink(
  compraId: number
): Promise<Result<CreateDownloadLinkOutput>> {
  return callEdgeFunction<CreateDownloadLinkOutput>('create-download-link', { compra_id: compraId });
}
