// Edge Function: evaluate-unlock-rules
//
// Evalúa si un usuario puede acceder a un módulo o clase según las
// condiciones de desbloqueo: inscripción activa, cuotas pagadas,
// clases previas completadas, progreso y evaluaciones aprobadas.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createUserClient, createServiceClient } from '../_shared/auth.ts';

interface UnlockInput {
  tipo: 'clase' | 'modulo';
  referencia_id: number;
}

interface UnlockResult {
  desbloqueado: boolean;
  razon: string;
  condiciones: {
    inscripcion_activa: boolean;
    cuotas_pagadas: boolean;
    previas_completadas: boolean;
    evaluacion_aprobada: boolean;
  };
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
  const body = await readJson<UnlockInput>(req);
  if (!body?.referencia_id || !body?.tipo) {
    return jsonError('invalid_payload', 'Faltan campos (tipo, referencia_id).', 422, requestId);
  }
  if (body.tipo !== 'clase' && body.tipo !== 'modulo') {
    return jsonError('invalid_type', "El tipo debe ser 'clase' o 'modulo'.", 422, requestId);
  }

  const serviceClient = createServiceClient();
  const resultado: UnlockResult = {
    desbloqueado: false,
    razon: 'Evaluación pendiente.',
    condiciones: {
      inscripcion_activa: false,
      cuotas_pagadas: false,
      previas_completadas: false,
      evaluacion_aprobada: false,
    },
  };

  // ── 3. Determinar el curso al que pertenece ──
  let cursoId: number | null = null;

  if (body.tipo === 'clase') {
    const { data: clase } = await serviceClient
      .from('clases')
      .select('modulo_id, modulos(curso_id)')
      .eq('id', body.referencia_id)
      .maybeSingle();
    if (!clase) return jsonError('not_found', 'Clase no encontrada.', 404, requestId);
    cursoId = (clase as { modulos?: { curso_id?: number } | null }).modulos?.curso_id ?? null;
  } else {
    const { data: modulo } = await serviceClient
      .from('modulos')
      .select('curso_id')
      .eq('id', body.referencia_id)
      .maybeSingle();
    if (!modulo) return jsonError('not_found', 'Módulo no encontrado.', 404, requestId);
    cursoId = modulo.curso_id;
  }

  if (!cursoId) return jsonError('not_found', 'No se pudo determinar el curso.', 404, requestId);

  // ── 4. Verificar inscripción activa ──
  const { data: inscripcion } = await serviceClient
    .from('inscripciones')
    .select('estado')
    .eq('usuario_id', usuarioId)
    .eq('curso_id', cursoId)
    .eq('estado', 'activa')
    .maybeSingle();

  if (!inscripcion) {
    resultado.razon = 'No tienes una inscripción activa en este curso.';
    return jsonOk(resultado, 200, requestId);
  }
  resultado.condiciones.inscripcion_activa = true;

  // ── 5. Verificar que la orden de pago del curso esté pagada ──
  const { data: orden } = await serviceClient
    .from('ordenes')
    .select('estado')
    .eq('usuario_id', usuarioId)
    .eq('tipo_producto', 'curso')
    .eq('producto_id', String(cursoId))
    .eq('estado', 'pagado')
    .maybeSingle();

  if (orden) resultado.condiciones.cuotas_pagadas = true;

  // ── 6. Verificar clases previas ──
  if (body.tipo === 'clase') {
    const { data: targetClase } = await serviceClient
      .from('clases')
      .select('modulo_id, orden')
      .eq('id', body.referencia_id)
      .maybeSingle();

    if (targetClase) {
      const { data: previas } = await serviceClient
        .from('clases')
        .select('id, orden')
        .eq('modulo_id', targetClase.modulo_id ?? 0)
        .eq('estado', 'activo')
        .lt('orden', targetClase.orden ?? 0);

      if (!previas || previas.length === 0) {
        // No hay clases previas: se considera completado
        resultado.condiciones.previas_completadas = true;
      } else {
        const previasIds = previas.map((p) => p.id);
        const { data: completadas } = await serviceClient
          .from('progreso')
          .select('clase_id')
          .eq('usuario_id', usuarioId)
          .eq('completado', true)
          .in('clase_id', previasIds);

        resultado.condiciones.previas_completadas = (completadas ?? []).length === previasIds.length;
      }
    }
  } else {
    // Para módulos: verificar que todas las clases del módulo anterior estén completadas
    const { data: target } = await serviceClient
      .from('modulos')
      .select('orden')
      .eq('id', body.referencia_id)
      .maybeSingle();

    if (target && target.orden > 0) {
      const { data: modAnterior } = await serviceClient
        .from('modulos')
        .select('id')
        .eq('curso_id', cursoId)
        .eq('orden', target.orden - 1)
        .maybeSingle();

      if (modAnterior) {
        const { data: clasesAnteriores } = await serviceClient
          .from('clases')
          .select('id')
          .eq('modulo_id', modAnterior.id)
          .eq('estado', 'activo');

        if (clasesAnteriores && clasesAnteriores.length > 0) {
          const ids = clasesAnteriores.map((c) => c.id);
          const { data: completadas } = await serviceClient
            .from('progreso')
            .select('clase_id')
            .eq('usuario_id', usuarioId)
            .eq('completado', true)
            .in('clase_id', ids);

          resultado.condiciones.previas_completadas = (completadas ?? []).length === ids.length;
        } else {
          resultado.condiciones.previas_completadas = true;
        }
      }
    } else {
      resultado.condiciones.previas_completadas = true;
    }
  }

  // ── 7. Verificar evaluaciones ──
  const { data: evaluaciones } = await serviceClient
    .from('evaluaciones')
    .select('id')
    .eq('curso_id', cursoId);

  if (!evaluaciones || evaluaciones.length === 0) {
    resultado.condiciones.evaluacion_aprobada = true;
  } else {
    const evalIds = evaluaciones.map((e) => e.id);
    const { data: intentos } = await serviceClient
      .from('intentos_evaluacion')
      .select('evaluacion_id')
      .eq('usuario_id', usuarioId)
      .eq('aprobado', true)
      .in('evaluacion_id', evalIds);

    resultado.condiciones.evaluacion_aprobada = (intentos ?? []).length === evalIds.length;
  }

  // ── 8. Determinar desbloqueo final ──
  const todasCumplidas =
    resultado.condiciones.inscripcion_activa &&
    resultado.condiciones.cuotas_pagadas &&
    resultado.condiciones.previas_completadas &&
    resultado.condiciones.evaluacion_aprobada;

  if (todasCumplidas) {
    resultado.desbloqueado = true;
    resultado.razon = 'Todas las condiciones se cumplieron.';
  } else {
    const fallas: string[] = [];
    if (!resultado.condiciones.inscripcion_activa) fallas.push('inscripción');
    if (!resultado.condiciones.cuotas_pagadas) fallas.push('pago');
    if (!resultado.condiciones.previas_completadas) fallas.push('clases previas');
    if (!resultado.condiciones.evaluacion_aprobada) fallas.push('evaluación');
    resultado.razon = `Falta completar: ${fallas.join(', ')}.`;
  }

  return jsonOk(resultado, 200, requestId);
});