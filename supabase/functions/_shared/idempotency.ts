// Helper de idempotencia para webhooks y operaciones financieras (BE-027).
//
// Garantiza que un mismo identificador (ej: ID de evento Stripe o PayPal)
// se procese UNA SOLA VEZ aunque el webhook llegue duplicado.
// Persiste las claves en la tabla `public.idempotencia` de Supabase.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface IdempotencyResult {
  alreadyProcessed: boolean;
  cachedResult?: unknown;
}

/**
 * Verifica si una clave ya fue procesada.
 * Si no existe, la inserta ANTES de ejecutar el efecto (estrategia "mark-first").
 * Esto previene duplicados incluso bajo condiciones de carrera en requests simultáneos.
 */
export async function checkAndMarkIdempotency(
  serviceClient: SupabaseClient,
  clave: string,
  resultado: unknown
): Promise<IdempotencyResult> {
  // Intentar insertar la clave. Si ya existe (conflicto en PK), la operación falla.
  const { error } = await serviceClient
    .from('idempotencia')
    .insert({ clave, resultado });

  if (error) {
    // Código 23505 = unique_violation (clave duplicada) → ya fue procesada
    if (error.code === '23505') {
      // Obtener el resultado cacheado para devolverlo
      const { data } = await serviceClient
        .from('idempotencia')
        .select('resultado')
        .eq('clave', clave)
        .maybeSingle();

      return { alreadyProcessed: true, cachedResult: data?.resultado };
    }
    // Otro error de BD — dejamos pasar para que la función principal lo maneje
    throw new Error(`Error en idempotencia: ${error.message}`);
  }

  return { alreadyProcessed: false };
}

/**
 * Limpia claves expiradas (llamar periódicamente, no en cada request).
 */
export async function limpiarIdempotenciaExpirada(serviceClient: SupabaseClient): Promise<void> {
  await serviceClient.rpc('limpiar_idempotencia_expirada');
}

