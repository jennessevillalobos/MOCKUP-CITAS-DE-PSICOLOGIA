// Edge Function: save-progress
//
// Guarda el progreso de una clase desde el servidor. Valida que el
// usuario esté inscrito al curso correspondiente antes de persistir.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface ProgressInput {
  clase_id: number;
  segundo_actual: number;
  porcentaje: number;
  completado: boolean;
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
  const body = await readJson<ProgressInput>(req);
  if (!body || body.clase_id === undefined || body.segundo_actual === undefined || body.porcentaje === undefined) {
    return jsonError('invalid_payload', 'Faltan campos obligatorios (clase_id, segundo_actual, porcentaje).', 422, requestId);
  }

  if (body.porcentaje < 0 || body.porcentaje > 100) return jsonError('invalid_percentage', 'El porcentaje debe estar entre 0 y 100.', 422, requestId);

  const serviceClient = createServiceClient();

  // ── 3. Validar que el usuario está inscrito al curso de esa clase ──
  const { data: clase, error: claseErr } = await serviceClient
    .from('clases')
    .select('modulo_id, modulos(curso_id)')
    .eq('id', body.clase_id)
    .maybeSingle();

  if (claseErr || !clase) return jsonError('class_not_found', 'Clase no encontrada.', 404, requestId);

  const cursoId = (clase as { modulos?: { curso_id?: number } | null }).modulos?.curso_id;

  const { data: inscripcion, error: inscErr } = await serviceClient
    .from('inscripciones')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('curso_id', cursoId ?? 0)
    .eq('estado', 'activa')
    .maybeSingle();

  if (inscErr || !inscripcion) return jsonError('not_enrolled', 'No estás inscrito a este curso.', 403, requestId);

  // ── 4. Guardar progreso ──
  const { data: progreso, error: progErr } = await serviceClient
    .from('progreso')
    .upsert(
      {
        usuario_id: usuarioId,
        clase_id: body.clase_id,
        segundo_actual: body.segundo_actual,
        porcentaje: body.porcentaje,
        completado: body.completado ?? false,
      },
      { onConflict: 'usuario_id,clase_id' }
    )
    .select()
    .single();

  if (progErr) return jsonError('save_error', 'No se pudo guardar el progreso.', 500, requestId);

  return jsonOk({
    clase_id: body.clase_id,
    porcentaje: body.porcentaje,
    completado: body.completado,
    guardado: true,
  }, 200, requestId);
});