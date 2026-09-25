-- Migración: calificación de evaluaciones desde el panel del profesional
--
-- 1. Intentos con estado (pendiente/calificado), número de intento y nota
--    pendiente, y `respuestas_intento` con cada respuesta, su puntaje y la
--    retroalimentación del profesional.
-- 2. Seguridad: los intentos solo los crea la Edge Function submit-evaluation
--    (antes un estudiante podía insertar su propio intento con cualquier nota)
--    y las respuestas correctas (opciones.es_correcta) dejan de ser públicas.
-- 3. RLS: el profesional ve y califica los intentos de sus cursos y ve el
--    nombre/correo de sus estudiantes.
-- 4. Funciones: intentos_mis_cursos, calificar_respuesta, publicar_calificacion.

-- ── 1. Intentos con estado y respuestas individuales ──
ALTER TABLE public.intentos_evaluacion
    ADD COLUMN estado TEXT NOT NULL DEFAULT 'calificado' CHECK (estado IN ('pendiente', 'calificado')),
    ADD COLUMN numero_intento INT NOT NULL DEFAULT 1;
ALTER TABLE public.intentos_evaluacion ALTER COLUMN nota DROP NOT NULL;

CREATE TABLE public.respuestas_intento (
    id BIGSERIAL PRIMARY KEY,
    intento_id INT NOT NULL REFERENCES public.intentos_evaluacion(id) ON DELETE CASCADE,
    pregunta_id INT NOT NULL REFERENCES public.preguntas(id) ON DELETE CASCADE,
    opcion_id INT REFERENCES public.opciones(id) ON DELETE SET NULL,
    texto TEXT,
    puntaje_obtenido NUMERIC(6, 2),
    retroalimentacion TEXT,
    UNIQUE (intento_id, pregunta_id)
);
CREATE INDEX idx_respuestas_intento_intento ON public.respuestas_intento (intento_id);
ALTER TABLE public.respuestas_intento ENABLE ROW LEVEL SECURITY;

-- ── 2. Seguridad ──
DROP POLICY "Usuarios crean sus intentos de evaluacion" ON public.intentos_evaluacion;
REVOKE INSERT, UPDATE, DELETE ON public.intentos_evaluacion FROM anon, authenticated;
GRANT UPDATE (nota, aprobado, estado) ON public.intentos_evaluacion TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.respuestas_intento FROM anon, authenticated;
GRANT UPDATE (puntaje_obtenido, retroalimentacion) ON public.respuestas_intento TO authenticated;

REVOKE SELECT ON public.opciones FROM anon, authenticated;
GRANT SELECT (id, pregunta_id, texto, orden, clave) ON public.opciones TO anon, authenticated;

-- estructura_curso incluye es_correcta: corre como su dueño y solo para el dueño del curso.
CREATE OR REPLACE FUNCTION public.estructura_curso(p_curso_id INT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
    IF NOT public.es_mi_curso(p_curso_id) THEN
        RAISE EXCEPTION 'No tienes permiso para ver este curso.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', m.clave,
                'titulo', m.titulo,
                'items', COALESCE((
                    SELECT jsonb_agg(it.item ORDER BY it.orden)
                    FROM (
                        SELECT c.orden, jsonb_build_object(
                            'id', c.clave, 'tipo', 'clase', 'titulo', c.titulo,
                            'duracion', COALESCE(c.duracion_texto, ''), 'contenido', COALESCE(c.texto_formativo, ''),
                            'reglaDesbloqueo', c.regla_desbloqueo, 'vistaPrevia', c.vista_previa, 'materiales', c.materiales
                        ) AS item
                        FROM public.clases c WHERE c.modulo_id = m.id
                        UNION ALL
                        SELECT e.orden, jsonb_build_object('id', e.clave, 'tipo', 'evaluacion', 'preguntas', e.num_preguntas)
                            || CASE WHEN e.detalle_editado THEN jsonb_build_object(
                                'tituloEval', COALESCE(e.titulo, ''), 'intentos', e.intentos_max, 'notaMinimaPct', e.nota_minima,
                                'tiempoLimiteMin', COALESCE(e.tiempo_limite_minutos, 0), 'barajar', e.barajar,
                                'mostrarRetroalimentacion', e.mostrar_retroalimentacion, 'desbloqueaSiguiente', e.desbloquea_siguiente,
                                'preguntasDetalle', COALESCE((
                                    SELECT jsonb_agg(jsonb_build_object(
                                        'id', q.clave,
                                        'tipo', CASE q.tipo WHEN 'opcion_multiple' THEN 'multiple' WHEN 'verdadero_falso' THEN 'vf' ELSE 'abierta' END,
                                        'enunciado', q.texto, 'puntaje', q.puntaje,
                                        'opciones', COALESCE((
                                            SELECT jsonb_agg(jsonb_build_object('id', o.clave, 'texto', o.texto, 'correcta', o.es_correcta) ORDER BY o.orden)
                                            FROM public.opciones o WHERE o.pregunta_id = q.id
                                        ), '[]'::jsonb)
                                    ) ORDER BY q.orden)
                                    FROM public.preguntas q WHERE q.evaluacion_id = e.id
                                ), '[]'::jsonb)
                            ) ELSE '{}'::jsonb END
                        FROM public.evaluaciones e WHERE e.modulo_id = m.id
                    ) it
                ), '[]'::jsonb)
            ) ORDER BY m.orden
        ), '[]'::jsonb) INTO v
        FROM public.modulos m WHERE m.curso_id = p_curso_id;
    RETURN v;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.estructura_curso(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estructura_curso(INT) TO authenticated;

-- guardar_estructura_curso escribe es_correcta: también corre como su dueño
-- (ya verifica es_mi_curso() al inicio y solo toca filas de ese curso).
ALTER FUNCTION public.guardar_estructura_curso(INT, JSONB) SECURITY DEFINER;

-- ── 3. RLS: el profesional ve y califica los intentos de sus cursos ──
CREATE OR REPLACE FUNCTION public.es_mi_evaluacion(p_evaluacion_id INT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.evaluaciones e WHERE e.id = p_evaluacion_id AND public.es_mi_curso(e.curso_id));
$$;
REVOKE EXECUTE ON FUNCTION public.es_mi_evaluacion(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_mi_evaluacion(INT) TO authenticated;

CREATE POLICY "Profesionales ven intentos de sus cursos" ON public.intentos_evaluacion FOR SELECT TO authenticated
    USING (public.es_mi_evaluacion(evaluacion_id));
CREATE POLICY "Profesionales califican intentos de sus cursos" ON public.intentos_evaluacion FOR UPDATE TO authenticated
    USING (public.es_mi_evaluacion(evaluacion_id)) WITH CHECK (public.es_mi_evaluacion(evaluacion_id));

CREATE POLICY "Estudiantes ven sus respuestas" ON public.respuestas_intento FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.intentos_evaluacion i WHERE i.id = respuestas_intento.intento_id AND i.usuario_id = (SELECT auth.uid())));
CREATE POLICY "Profesionales ven respuestas de sus cursos" ON public.respuestas_intento FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.intentos_evaluacion i WHERE i.id = respuestas_intento.intento_id AND public.es_mi_evaluacion(i.evaluacion_id)));
CREATE POLICY "Profesionales califican respuestas de sus cursos" ON public.respuestas_intento FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.intentos_evaluacion i WHERE i.id = respuestas_intento.intento_id AND public.es_mi_evaluacion(i.evaluacion_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.intentos_evaluacion i WHERE i.id = respuestas_intento.intento_id AND public.es_mi_evaluacion(i.evaluacion_id)));

CREATE POLICY "Profesionales ven a sus estudiantes" ON public.usuarios FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.inscripciones ins WHERE ins.usuario_id = usuarios.id AND public.es_mi_curso(ins.curso_id))
        OR EXISTS (SELECT 1 FROM public.intentos_evaluacion i WHERE i.usuario_id = usuarios.id AND public.es_mi_evaluacion(i.evaluacion_id))
    );

-- ── 4. Funciones del panel ──
CREATE OR REPLACE FUNCTION public.intentos_mis_cursos()
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', i.id::text,
        'cursoKey', c.slug,
        'moduloId', m.clave,
        'evaluacionId', e.clave,
        'estudiante', COALESCE(u.nombre, u.email, 'Estudiante'),
        'correo', COALESCE(u.email, ''),
        'numeroIntento', i.numero_intento,
        'fecha', i.fecha,
        'estado', i.estado,
        'notaFinalPct', i.nota,
        'respuestas', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'preguntaId', q.clave,
                'tipo', CASE q.tipo WHEN 'opcion_multiple' THEN 'multiple' WHEN 'verdadero_falso' THEN 'vf' ELSE 'abierta' END,
                'opcionElegidaId', o.clave,
                'textoRespuesta', r.texto,
                'puntajeObtenido', r.puntaje_obtenido,
                'retroalimentacion', r.retroalimentacion
            ) ORDER BY q.orden)
            FROM public.respuestas_intento r
            JOIN public.preguntas q ON q.id = r.pregunta_id
            LEFT JOIN public.opciones o ON o.id = r.opcion_id
            WHERE r.intento_id = i.id
        ), '[]'::jsonb)
    ) ORDER BY i.fecha DESC), '[]'::jsonb)
    FROM public.intentos_evaluacion i
    JOIN public.evaluaciones e ON e.id = i.evaluacion_id
    JOIN public.modulos m ON m.id = e.modulo_id
    JOIN public.cursos c ON c.id = e.curso_id
    LEFT JOIN public.usuarios u ON u.id = i.usuario_id
    WHERE public.es_mi_curso(c.id);
$$;

CREATE OR REPLACE FUNCTION public.calificar_respuesta(p_intento_id INT, p_pregunta_clave TEXT, p_puntaje NUMERIC, p_retroalimentacion TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n INT;
BEGIN
    UPDATE public.respuestas_intento r
       SET puntaje_obtenido = GREATEST(0, LEAST(p_puntaje, q.puntaje)), retroalimentacion = NULLIF(trim(p_retroalimentacion), '')
      FROM public.preguntas q
     WHERE r.pregunta_id = q.id AND r.intento_id = p_intento_id AND q.clave = p_pregunta_clave;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN
        RAISE EXCEPTION 'No se encontró la respuesta o no tienes permiso para calificarla.' USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$;

-- aprobado según la nota mínima; el trigger de desbloqueo (010) se dispara al cambiar `aprobado`.
CREATE OR REPLACE FUNCTION public.publicar_calificacion(p_intento_id INT, p_nota INT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n INT;
BEGIN
    UPDATE public.intentos_evaluacion i
       SET nota = GREATEST(0, LEAST(p_nota, 100)), aprobado = GREATEST(0, LEAST(p_nota, 100)) >= e.nota_minima, estado = 'calificado'
      FROM public.evaluaciones e
     WHERE e.id = i.evaluacion_id AND i.id = p_intento_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN
        RAISE EXCEPTION 'No se encontró el intento o no tienes permiso para calificarlo.' USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.intentos_mis_cursos(), public.calificar_respuesta(INT, TEXT, NUMERIC, TEXT), public.publicar_calificacion(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.intentos_mis_cursos(), public.calificar_respuesta(INT, TEXT, NUMERIC, TEXT), public.publicar_calificacion(INT, INT) TO authenticated;
