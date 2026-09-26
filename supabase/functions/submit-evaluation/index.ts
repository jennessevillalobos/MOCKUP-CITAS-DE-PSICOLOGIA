// Edge Function: submit-evaluation
//
// Recibe las respuestas de una evaluación, califica automáticamente las de
// opción múltiple y verdadero/falso según el puntaje de cada pregunta (BE-053),
// valida el máximo de intentos (BE-054) y el tiempo límite (BE-055), y guarda
// el intento con cada respuesta en public.respuestas_intento.
// Si la evaluación tiene preguntas abiertas, el intento queda "pendiente" hasta
// que el profesional las califica desde su panel.
// Además exige que la evaluación esté desbloqueada (clases previas de su
// módulo completadas; RPC evaluacion_estudiante, migración 031) y devuelve el
// recuento de correctas y, si la evaluación lo permite, qué preguntas acertó.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface SubmitEvaluationInput {
  evaluacion_id: number;
  respuestas: {
    pregunta_id: number;
    opcion_id?: number;
    texto?: string;
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
  if (!body?.evaluacion_id || !Array.isArray(body?.respuestas)) {
    return jsonError('invalid_payload', 'Faltan campos: evaluacion_id o respuestas.', 422, requestId);
  }

  const serviceClient = createServiceClient();

  // 2. Obtener datos de la evaluación
  const { data: evaluacion, error: evalErr } = await serviceClient
    .from('evaluaciones')
    .select('id, curso_id, nota_minima, intentos_max, tiempo_limite_minutos')
    .eq('id', body.evaluacion_id)
    .maybeSingle();

  if (evalErr || !evaluacion) return jsonError('not_found', 'Evaluación no encontrada.', 404, requestId);

  // 3. Solo estudiantes inscritos y con la evaluación desbloqueada. La RPC
  // corre con la sesión del estudiante: valida su inscripción y calcula el bloqueo.
  const { data: estado, error: estadoErr } = await userClient.rpc('evaluacion_estudiante', { p_evaluacion_id: body.evaluacion_id });
  if (estadoErr || !estado) return jsonError('not_enrolled', 'No estás inscrito en el curso de esta evaluación.', 403, requestId);
  if ((estado as { bloqueado?: boolean }).bloqueado) {
    return jsonError('locked', 'Completa las clases del módulo antes de presentar esta evaluación.', 403, requestId);
  }
  const mostrarRetro = !!(estado as { mostrarRetroalimentacion?: boolean }).mostrarRetroalimentacion;

  // 4. Validar intentos máximos (BE-054)
  const { count: intentosPrevios, error: intentosErr } = await serviceClient
    .from('intentos_evaluacion')
    .select('id', { count: 'exact', head: true })
    .eq('evaluacion_id', body.evaluacion_id)
    .eq('usuario_id', usuarioId);

  if (intentosErr) return jsonError('db_error', 'Error verificando intentos.', 500, requestId);

  if (evaluacion.intentos_max && (intentosPrevios ?? 0) >= evaluacion.intentos_max) {
    return jsonError('max_attempts_reached', 'Has superado el número máximo de intentos para esta evaluación.', 403, requestId);
  }

  // 5. Validar tiempo límite (BE-055)
  if (evaluacion.tiempo_limite_minutos && body.tiempo_tomado_minutos > evaluacion.tiempo_limite_minutos) {
    return jsonError('time_limit_exceeded', 'Has excedido el tiempo límite para esta evaluación.', 403, requestId);
  }

  // 6. Preguntas de la evaluación y sus opciones correctas
  const { data: preguntas, error: preguntasErr } = await serviceClient
    .from('preguntas')
    .select('id, tipo, puntaje, opciones(id, es_correcta)')
    .eq('evaluacion_id', body.evaluacion_id);

  if (preguntasErr || !preguntas || preguntas.length === 0) return jsonError('db_error', 'Error obteniendo preguntas.', 500, requestId);

  // Una respuesta por pregunta (la primera): repetir la misma respuesta correcta
  // ya no suma más puntos. Se ignoran preguntas que no son de esta evaluación.
  const respuestaPorPregunta = new Map<number, { opcion_id?: number; texto?: string }>();
  for (const r of body.respuestas) {
    if (!respuestaPorPregunta.has(r.pregunta_id)) respuestaPorPregunta.set(r.pregunta_id, r);
  }

  // 7. Calificación automática (BE-053), ponderada por el puntaje de cada pregunta
  let puntajeTotal = 0;
  let puntajeObtenido = 0;
  let hayAbiertas = false;
  let correctas = 0;
  let autocalificables = 0;
  const retro: { pregunta_id: number; estado: 'correcta' | 'incorrecta' | 'revision' }[] = [];
  const filasRespuesta = preguntas.map((q) => {
    const resp = respuestaPorPregunta.get(q.id);
    const puntaje = Number(q.puntaje ?? 1);
    puntajeTotal += puntaje;
    if (q.tipo === 'abierta') {
      hayAbiertas = true;
      retro.push({ pregunta_id: q.id, estado: 'revision' });
      return { pregunta_id: q.id, opcion_id: null, texto: resp?.texto?.trim() || null, puntaje_obtenido: null };
    }
    const opciones = (q.opciones ?? []) as { id: number; es_correcta: boolean }[];
    const opcionValida = opciones.find((o) => o.id === resp?.opcion_id);
    const obtenido = opcionValida?.es_correcta ? puntaje : 0;
    puntajeObtenido += obtenido;
    autocalificables += 1;
    if (opcionValida?.es_correcta) correctas += 1;
    retro.push({ pregunta_id: q.id, estado: opcionValida?.es_correcta ? 'correcta' : 'incorrecta' });
    return { pregunta_id: q.id, opcion_id: opcionValida?.id ?? null, texto: null, puntaje_obtenido: obtenido };
  });

  // Con preguntas abiertas la nota queda pendiente hasta que el profesional califica.
  const nota = hayAbiertas || puntajeTotal === 0 ? null : Math.round((puntajeObtenido / puntajeTotal) * 100);
  const aprobado = nota !== null && nota >= evaluacion.nota_minima;

  // 8. Guardar el intento y sus respuestas
  const { data: intento, error: insertErr } = await serviceClient
    .from('intentos_evaluacion')
    .insert({
      evaluacion_id: body.evaluacion_id,
      usuario_id: usuarioId,
      nota,
      aprobado,
      estado: hayAbiertas ? 'pendiente' : 'calificado',
      numero_intento: (intentosPrevios ?? 0) + 1,
    })
    .select()
    .single();

  if (insertErr) return jsonError('db_error', 'No se pudo guardar la evaluación.', 500, requestId);

  const { error: respErr } = await serviceClient
    .from('respuestas_intento')
    .insert(filasRespuesta.map((f) => ({ ...f, intento_id: intento.id })));

  if (respErr) {
    await serviceClient.from('intentos_evaluacion').delete().eq('id', intento.id);
    return jsonError('db_error', 'No se pudieron guardar las respuestas.', 500, requestId);
  }

  return jsonOk({
    intento_id: intento.id,
    estado: intento.estado,
    nota,
    aprobado,
    nota_minima: evaluacion.nota_minima,
    numero_intento: intento.numero_intento,
    intentos_max: evaluacion.intentos_max,
    correctas,
    autocalificables,
    // Solo si la profesional activó "mostrar retroalimentación".
    retroalimentacion: mostrarRetro ? retro : null,
    mensaje: hayAbiertas
      ? 'Respuestas enviadas. Tu profesional calificará las preguntas abiertas.'
      : aprobado ? '¡Felicidades, aprobaste la evaluación!' : 'No alcanzaste la nota mínima.',
  }, 200, requestId);
});
