// Edge Function: submit-evaluation
//
// Recibe las respuestas de una evaluación, calcula la calificación automáticamente
// (BE-053), valida que no se supere el máximo de intentos (BE-054) y el tiempo límite (BE-055).
// Inserta un nuevo registro en public.intentos_evaluacion.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface SubmitEvaluationInput {
  evaluacion_id: number;
  respuestas: {
    pregunta_id: number;
    opcion_id: number;
  }[];
  tiempo_tomado_minutos: number; // Reportado por el cliente, en un sistema real se valida contra el inicio de la sesión de examen.
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  // 1. Autenticar
  const userClient = createUserClient(req);
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return jsonError('unauthenticated', 'Debes iniciar sesión.', 401, requestId);
  const usuarioId = authData.user.id;

  const body = await readJson<SubmitEvaluationInput>(req);
  if (!body?.evaluacion_id || !body?.respuestas) {
    return jsonError('invalid_payload', 'Faltan campos: evaluacion_id o respuestas.', 422, requestId);
  }

  const serviceClient = createServiceClient();

  // 2. Obtener datos de la evaluación
  const { data: evaluacion, error: evalErr } = await serviceClient
    .from('evaluaciones')
    .select('id, nota_minima, intentos_max, tiempo_limite_minutos')
    .eq('id', body.evaluacion_id)
    .maybeSingle();

  if (evalErr || !evaluacion) return jsonError('not_found', 'Evaluación no encontrada.', 404, requestId);

  // 3. Validar intentos máximos (BE-054)
  const { count: intentosPrevios, error: intentosErr } = await serviceClient
    .from('intentos_evaluacion')
    .select('id', { count: 'exact', head: true })
    .eq('evaluacion_id', body.evaluacion_id)
    .eq('usuario_id', usuarioId);

  if (intentosErr) return jsonError('db_error', 'Error verificando intentos.', 500, requestId);

  if ((intentosPrevios ?? 0) >= evaluacion.intentos_max) {
    return jsonError('max_attempts_reached', 'Has superado el número máximo de intentos para esta evaluación.', 403, requestId);
  }

  // 4. Validar tiempo límite (BE-055)
  if (evaluacion.tiempo_limite_minutos && body.tiempo_tomado_minutos > evaluacion.tiempo_limite_minutos) {
    return jsonError('time_limit_exceeded', 'Has excedido el tiempo límite para esta evaluación.', 403, requestId);
  }

  // 5. Calificación automática (BE-053)
  // Obtener las respuestas correctas para esta evaluación
  const { data: opcionesCorrectas, error: opcionesErr } = await serviceClient
    .from('opciones')
    .select('id, pregunta_id')
    .eq('es_correcta', true)
    .in('pregunta_id', body.respuestas.map(r => r.pregunta_id));

  if (opcionesErr) return jsonError('db_error', 'Error verificando respuestas.', 500, requestId);

  // Obtener el total de preguntas de la evaluación para calcular la nota sobre 100
  const { count: totalPreguntas, error: totalPreguntasErr } = await serviceClient
    .from('preguntas')
    .select('id', { count: 'exact', head: true })
    .eq('evaluacion_id', body.evaluacion_id);

  if (totalPreguntasErr || !totalPreguntas) return jsonError('db_error', 'Error obteniendo preguntas.', 500, requestId);

  let correctas = 0;
  for (const resp of body.respuestas) {
    const esCorrecta = opcionesCorrectas?.some(
      o => o.pregunta_id === resp.pregunta_id && o.id === resp.opcion_id
    );
    if (esCorrecta) correctas++;
  }

  const nota = Math.round((correctas / totalPreguntas) * 100);
  const aprobado = nota >= evaluacion.nota_minima;

  // 6. Guardar el intento
  const { data: intento, error: insertErr } = await serviceClient
    .from('intentos_evaluacion')
    .insert({
      evaluacion_id: body.evaluacion_id,
      usuario_id: usuarioId,
      nota,
      aprobado
    })
    .select()
    .single();

  if (insertErr) return jsonError('db_error', 'No se pudo guardar la evaluación.', 500, requestId);

  return jsonOk({
    intento_id: intento.id,
    nota,
    aprobado,
    nota_minima: evaluacion.nota_minima,
    mensaje: aprobado ? '¡Felicidades, aprobaste la evaluación!' : 'No alcanzaste la nota mínima.',
  }, 200, requestId);
});
