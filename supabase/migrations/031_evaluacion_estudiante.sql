-- Migración: evaluación del lado del estudiante (P4c).
-- evaluacion_estudiante() devuelve la evaluación, sus preguntas y opciones
-- (sin indicar cuál es la correcta) y el historial de intentos del usuario.
-- Valida la inscripción; si la evaluación está bloqueada (faltan clases de
-- su módulo, según curso_estudiante() de 029) no envía las preguntas.

CREATE OR REPLACE FUNCTION public.evaluacion_estudiante(p_evaluacion_id INT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_uid UUID := (SELECT auth.uid());
    v_eval RECORD; v_curso RECORD; v_item JSONB; v_modulo_num INT; v_modulo_titulo TEXT; v_bloqueado BOOLEAN;
BEGIN
    SELECT * INTO v_eval FROM public.evaluaciones WHERE id = p_evaluacion_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La evaluación no existe.' USING ERRCODE = 'check_violation';
    END IF;
    SELECT * INTO v_curso FROM public.cursos WHERE id = v_eval.curso_id;
    IF NOT public.tengo_acceso_curso(v_curso.id) THEN
        RAISE EXCEPTION 'No estás inscrito en este curso.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT i INTO v_item
      FROM jsonb_array_elements(public.curso_estudiante(v_curso.slug) -> 'modulos') mo,
           jsonb_array_elements(mo -> 'items') i
     WHERE i ->> 'tipo' = 'evaluacion' AND (i ->> 'id')::int = p_evaluacion_id;
    v_bloqueado := COALESCE((v_item ->> 'bloqueado')::boolean, TRUE);

    SELECT m.titulo, (SELECT count(*) FROM public.modulos m2 WHERE m2.curso_id = m.curso_id AND (m2.orden, m2.id) <= (m.orden, m.id))::int
      INTO v_modulo_titulo, v_modulo_num
      FROM public.modulos m WHERE m.id = v_eval.modulo_id;

    RETURN jsonb_build_object(
        'id', v_eval.id,
        'titulo', COALESCE(NULLIF(v_eval.titulo, ''), 'Evaluación'),
        'curso', jsonb_build_object('id', v_curso.id, 'slug', v_curso.slug, 'nombre', v_curso.nombre),
        'moduloTitulo', v_modulo_titulo, 'moduloNumero', v_modulo_num,
        'tiempoLimiteMin', COALESCE(v_eval.tiempo_limite_minutos, 0),
        'notaMinima', v_eval.nota_minima,
        'intentosMax', v_eval.intentos_max,
        'barajar', COALESCE(v_eval.barajar, FALSE),
        'mostrarRetroalimentacion', COALESCE(v_eval.mostrar_retroalimentacion, FALSE),
        'desbloqueaSiguiente', COALESCE(v_eval.desbloquea_siguiente, FALSE),
        'bloqueado', v_bloqueado,
        'preguntas', CASE WHEN v_bloqueado THEN '[]'::jsonb ELSE COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', q.id,
                'tipo', CASE q.tipo WHEN 'opcion_multiple' THEN 'opcion' WHEN 'verdadero_falso' THEN 'vf' ELSE 'abierta' END,
                'texto', q.texto, 'puntaje', q.puntaje,
                'opciones', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object('id', o.id, 'texto', o.texto) ORDER BY o.orden, o.id)
                    FROM public.opciones o WHERE o.pregunta_id = q.id
                ), '[]'::jsonb)
            ) ORDER BY q.orden, q.id)
            FROM public.preguntas q WHERE q.evaluacion_id = v_eval.id
        ), '[]'::jsonb) END,
        'intentos', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'numero', i.numero_intento, 'fecha', i.fecha, 'nota', i.nota, 'aprobado', i.aprobado, 'estado', i.estado
            ) ORDER BY i.numero_intento)
            FROM public.intentos_evaluacion i WHERE i.evaluacion_id = v_eval.id AND i.usuario_id = v_uid
        ), '[]'::jsonb)
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.evaluacion_estudiante(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluacion_estudiante(INT) TO authenticated;
