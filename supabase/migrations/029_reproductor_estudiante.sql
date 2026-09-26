-- Migración: reproductor de clases del estudiante (P4b).
-- El servidor arma el temario del curso con el estado de cada clase
-- (completada / bloqueada) según las reglas del Constructor:
--   secuencial  → al completar la clase anterior
--   evaluacion  → al aprobar la evaluación (con "desbloquea siguiente") más
--                 reciente del curso; si no hay ninguna antes, como secuencial
--   pago        → requiere el pago al día (inscripción de acceso completo)
--   vista previa → siempre abierta
-- Una evaluación se habilita al completar las clases previas de su módulo.
-- Marcar una clase como completada pasa por completar_clase(), que respeta
-- esos bloqueos; las notas personales por clase van en notas_clase.

-- ── 1. Progreso: solo lectura directa; se escribe vía completar_clase() ──
DROP POLICY IF EXISTS "Usuarios ven y actualizan su progreso" ON public.progreso;
CREATE POLICY "Usuarios ven su progreso" ON public.progreso FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = usuario_id);

-- ── 2. Notas personales del estudiante por clase ──
CREATE TABLE IF NOT EXISTS public.notas_clase (
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    clase_id INT NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
    texto TEXT NOT NULL DEFAULT '' CHECK (char_length(texto) <= 5000),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, clase_id)
);
ALTER TABLE public.notas_clase ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estudiantes gestionan sus notas de clase" ON public.notas_clase FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = usuario_id)
    WITH CHECK ((SELECT auth.uid()) = usuario_id);

-- ── 3. Temario del curso para el estudiante inscrito ──
CREATE OR REPLACE FUNCTION public.curso_estudiante(p_slug TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_uid UUID := (SELECT auth.uid());
    v_curso RECORD; m RECORD; it RECORD;
    v_pago_al_dia BOOLEAN;
    v_prev_completada BOOLEAN := TRUE;   -- clase anterior completada
    v_ult_eval_aprobada BOOLEAN := NULL; -- última evaluación "desbloquea siguiente" (NULL = ninguna aún)
    v_modulo_completo BOOLEAN;
    v_completado BOOLEAN; v_bloqueado BOOLEAN; v_motivo TEXT;
    v_aprobado BOOLEAN; v_mejor INT; v_usados INT;
    v_items JSONB; v_modulos JSONB := '[]'::jsonb;
    v_total INT := 0; v_hechas INT := 0;
BEGIN
    SELECT c.* INTO v_curso FROM public.cursos c WHERE c.slug = p_slug;
    IF NOT FOUND OR NOT public.tengo_acceso_curso(v_curso.id) THEN
        RAISE EXCEPTION 'No estás inscrito en este curso.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    v_pago_al_dia := EXISTS (
        SELECT 1 FROM public.inscripciones
        WHERE curso_id = v_curso.id AND usuario_id = v_uid AND estado = 'activa' AND tipo_acceso = 'completo'
    );

    FOR m IN SELECT * FROM public.modulos WHERE curso_id = v_curso.id ORDER BY orden, id LOOP
        v_items := '[]'::jsonb;
        v_modulo_completo := TRUE;
        FOR it IN
            SELECT 'clase' AS tipo, c.id, c.orden, 0 AS sub FROM public.clases c WHERE c.modulo_id = m.id AND c.estado = 'activo'
            UNION ALL
            SELECT 'evaluacion', e.id, e.orden, 1 FROM public.evaluaciones e WHERE e.modulo_id = m.id
            ORDER BY 3, 4, 2
        LOOP
            IF it.tipo = 'clase' THEN
                SELECT EXISTS (SELECT 1 FROM public.progreso WHERE usuario_id = v_uid AND clase_id = it.id AND completado)
                  INTO v_completado;
                SELECT CASE
                         WHEN c.vista_previa THEN NULL
                         WHEN c.regla_desbloqueo = 'pago' AND NOT v_pago_al_dia THEN 'pago'
                         WHEN c.regla_desbloqueo = 'evaluacion' AND v_ult_eval_aprobada IS NOT NULL AND NOT v_ult_eval_aprobada THEN 'evaluacion'
                         WHEN c.regla_desbloqueo = 'evaluacion' AND v_ult_eval_aprobada IS NULL AND NOT v_prev_completada THEN 'secuencial'
                         WHEN c.regla_desbloqueo = 'secuencial' AND NOT v_prev_completada THEN 'secuencial'
                       END
                  INTO v_motivo FROM public.clases c WHERE c.id = it.id;
                v_bloqueado := v_motivo IS NOT NULL AND NOT v_completado;
                v_items := v_items || (
                    SELECT jsonb_build_object(
                        'tipo', 'clase', 'id', c.id, 'titulo', c.titulo, 'duracion', COALESCE(c.duracion_texto, ''),
                        'completado', v_completado, 'bloqueado', v_bloqueado, 'motivoBloqueo', CASE WHEN v_bloqueado THEN v_motivo END,
                        -- El contenido solo viaja si la clase está abierta.
                        'contenido', CASE WHEN v_bloqueado THEN NULL ELSE COALESCE(c.texto_formativo, '') END,
                        'video', CASE WHEN v_bloqueado THEN NULL ELSE c.video_url END,
                        'materiales', CASE WHEN v_bloqueado THEN '[]'::jsonb ELSE COALESCE(c.materiales, '[]'::jsonb) END,
                        'nota', COALESCE((SELECT n.texto FROM public.notas_clase n WHERE n.usuario_id = v_uid AND n.clase_id = c.id), '')
                    ) FROM public.clases c WHERE c.id = it.id
                );
                v_total := v_total + 1;
                IF v_completado THEN v_hechas := v_hechas + 1; ELSE v_modulo_completo := FALSE; END IF;
                v_prev_completada := v_completado;
            ELSE
                SELECT COALESCE(bool_or(i.aprobado), FALSE), max(i.nota), count(*)::int
                  INTO v_aprobado, v_mejor, v_usados
                  FROM public.intentos_evaluacion i WHERE i.evaluacion_id = it.id AND i.usuario_id = v_uid;
                v_items := v_items || (
                    SELECT jsonb_build_object(
                        'tipo', 'evaluacion', 'id', e.id, 'titulo', COALESCE(NULLIF(e.titulo, ''), 'Evaluación'),
                        'preguntas', (SELECT count(*) FROM public.preguntas q WHERE q.evaluacion_id = e.id),
                        'notaMinima', e.nota_minima, 'intentosMax', e.intentos_max, 'intentosUsados', v_usados,
                        'aprobado', v_aprobado, 'mejorNota', v_mejor,
                        'bloqueado', NOT v_modulo_completo, 'motivoBloqueo', CASE WHEN NOT v_modulo_completo THEN 'clases' END
                    ) FROM public.evaluaciones e WHERE e.id = it.id
                );
                IF (SELECT desbloquea_siguiente FROM public.evaluaciones WHERE id = it.id) THEN
                    v_ult_eval_aprobada := v_aprobado;
                END IF;
            END IF;
        END LOOP;
        v_modulos := v_modulos || jsonb_build_object('id', m.id, 'titulo', m.titulo, 'items', v_items);
    END LOOP;

    RETURN jsonb_build_object(
        'curso', jsonb_build_object(
            'id', v_curso.id, 'slug', v_curso.slug, 'nombre', v_curso.nombre, 'imagen', v_curso.imagen,
            'profesional', public.nombre_usuario(public.usuario_de_profesional(v_curso.profesional_id))
        ),
        'modulos', v_modulos,
        'totalClases', v_total, 'completadas', v_hechas,
        'porcentaje', CASE WHEN v_total > 0 THEN round(100.0 * v_hechas / v_total) ELSE 0 END
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.curso_estudiante(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.curso_estudiante(TEXT) TO authenticated;

-- ── 4. Marcar una clase como completada (respeta los bloqueos) ──
CREATE OR REPLACE FUNCTION public.completar_clase(p_clase_id INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := (SELECT auth.uid()); v_slug TEXT; v_item JSONB;
BEGIN
    SELECT cu.slug INTO v_slug
      FROM public.clases c JOIN public.modulos m ON m.id = c.modulo_id JOIN public.cursos cu ON cu.id = m.curso_id
     WHERE c.id = p_clase_id AND c.estado = 'activo';
    IF v_slug IS NULL THEN
        RAISE EXCEPTION 'La clase no existe.' USING ERRCODE = 'check_violation';
    END IF;
    -- curso_estudiante() valida la inscripción y calcula el bloqueo.
    SELECT i INTO v_item
      FROM jsonb_array_elements(public.curso_estudiante(v_slug) -> 'modulos') mo,
           jsonb_array_elements(mo -> 'items') i
     WHERE i ->> 'tipo' = 'clase' AND (i ->> 'id')::int = p_clase_id;
    IF v_item IS NULL OR (v_item ->> 'bloqueado')::boolean THEN
        RAISE EXCEPTION 'Esta clase todavía está bloqueada.' USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.progreso (usuario_id, clase_id, segundo_actual, porcentaje, completado, fecha_actualizacion)
    VALUES (v_uid, p_clase_id, 0, 100, TRUE, now())
    ON CONFLICT (usuario_id, clase_id) DO UPDATE SET porcentaje = 100, completado = TRUE, fecha_actualizacion = now();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.completar_clase(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.completar_clase(INT) TO authenticated;
