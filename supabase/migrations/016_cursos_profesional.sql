-- Migración: "Mis cursos" y Constructor del profesional con sesión real
--
-- 1. Dueño del curso (`cursos.profesional_id`) y campos del Constructor que
--    faltaban (categoría, nivel, idioma; en clases: duración, regla de
--    desbloqueo, vista previa, materiales; en evaluaciones: título, orden,
--    barajar, retroalimentación, desbloqueo; preguntas abiertas y puntaje).
-- 2. `clave` en módulos/clases/evaluaciones/preguntas/opciones: el id estable
--    que usa el Constructor, para guardar el árbol sin reemplazar filas (así
--    no se pierde el progreso de los estudiantes al editar).
-- 3. RLS: el profesional gestiona sus cursos y todo su contenido.
-- 4. Funciones para leer (`mis_cursos_profesional`) y guardar
--    (`guardar_estructura_curso`) el árbol en el mismo formato JSON del frontend.

-- ── 1. Dueño del curso y campos del Constructor ──
ALTER TABLE public.cursos
    ADD COLUMN profesional_id INT REFERENCES public.profesionales(id) ON DELETE SET NULL,
    ADD COLUMN categoria TEXT,
    ADD COLUMN nivel TEXT,
    ADD COLUMN idioma TEXT,
    ADD COLUMN modalidad_pago TEXT,
    ADD COLUMN actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX idx_cursos_profesional ON public.cursos (profesional_id);

INSERT INTO public.monedas (codigo, nombre, simbolo, es_principal, estado)
VALUES ('MXN', 'Peso mexicano', '$', false, 'activo') ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE public.modulos ADD COLUMN clave TEXT;
ALTER TABLE public.clases
    ADD COLUMN clave TEXT,
    ADD COLUMN duracion_texto TEXT,
    ADD COLUMN regla_desbloqueo TEXT NOT NULL DEFAULT 'secuencial' CHECK (regla_desbloqueo IN ('secuencial', 'evaluacion', 'pago')),
    ADD COLUMN vista_previa BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN materiales JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.evaluaciones
    ADD COLUMN clave TEXT,
    ADD COLUMN titulo TEXT,
    ADD COLUMN orden INT NOT NULL DEFAULT 0,
    ADD COLUMN num_preguntas INT NOT NULL DEFAULT 0,
    ADD COLUMN barajar BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN mostrar_retroalimentacion BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN desbloquea_siguiente BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN detalle_editado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.preguntas DROP CONSTRAINT IF EXISTS preguntas_tipo_check;
ALTER TABLE public.preguntas
    ADD CONSTRAINT preguntas_tipo_check CHECK (tipo IN ('opcion_multiple', 'verdadero_falso', 'abierta')),
    ADD COLUMN clave TEXT,
    ADD COLUMN puntaje NUMERIC(6, 2) NOT NULL DEFAULT 1;
ALTER TABLE public.opciones ADD COLUMN clave TEXT;

-- ── 2. Claves estables ──
UPDATE public.modulos SET clave = 'db-m' || id WHERE clave IS NULL;
UPDATE public.clases SET clave = 'db-c' || id WHERE clave IS NULL;
UPDATE public.evaluaciones SET clave = 'db-e' || id WHERE clave IS NULL;
UPDATE public.preguntas SET clave = 'db-p' || id WHERE clave IS NULL;
UPDATE public.opciones SET clave = 'db-o' || id WHERE clave IS NULL;

ALTER TABLE public.modulos ALTER COLUMN clave SET NOT NULL, ADD CONSTRAINT modulos_curso_clave_key UNIQUE (curso_id, clave);
ALTER TABLE public.clases ALTER COLUMN clave SET NOT NULL, ADD CONSTRAINT clases_modulo_clave_key UNIQUE (modulo_id, clave);
ALTER TABLE public.evaluaciones ALTER COLUMN clave SET NOT NULL, ADD CONSTRAINT evaluaciones_modulo_clave_key UNIQUE (modulo_id, clave);
ALTER TABLE public.preguntas ALTER COLUMN clave SET NOT NULL, ADD CONSTRAINT preguntas_eval_clave_key UNIQUE (evaluacion_id, clave);
ALTER TABLE public.opciones ALTER COLUMN clave SET NOT NULL, ADD CONSTRAINT opciones_pregunta_clave_key UNIQUE (pregunta_id, clave);

-- ── 3. RLS ──
CREATE OR REPLACE FUNCTION public.es_mi_curso(p_curso_id INT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.cursos c JOIN public.profesionales p ON p.id = c.profesional_id
        WHERE c.id = p_curso_id AND p.usuario_id = (SELECT auth.uid())
    );
$$;

CREATE POLICY "Profesionales gestionan sus cursos" ON public.cursos FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = cursos.profesional_id AND p.usuario_id = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = cursos.profesional_id AND p.usuario_id = (SELECT auth.uid())));
CREATE POLICY "Profesionales gestionan sus modulos" ON public.modulos FOR ALL TO authenticated
    USING (public.es_mi_curso(curso_id)) WITH CHECK (public.es_mi_curso(curso_id));
CREATE POLICY "Profesionales gestionan sus clases" ON public.clases FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.modulos m WHERE m.id = clases.modulo_id AND public.es_mi_curso(m.curso_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.modulos m WHERE m.id = clases.modulo_id AND public.es_mi_curso(m.curso_id)));
CREATE POLICY "Profesionales gestionan sus evaluaciones" ON public.evaluaciones FOR ALL TO authenticated
    USING (public.es_mi_curso(curso_id)) WITH CHECK (public.es_mi_curso(curso_id));
CREATE POLICY "Profesionales gestionan sus preguntas" ON public.preguntas FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.evaluaciones e WHERE e.id = preguntas.evaluacion_id AND public.es_mi_curso(e.curso_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.evaluaciones e WHERE e.id = preguntas.evaluacion_id AND public.es_mi_curso(e.curso_id)));
CREATE POLICY "Profesionales gestionan sus opciones" ON public.opciones FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.preguntas q JOIN public.evaluaciones e ON e.id = q.evaluacion_id WHERE q.id = opciones.pregunta_id AND public.es_mi_curso(e.curso_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.preguntas q JOIN public.evaluaciones e ON e.id = q.evaluacion_id WHERE q.id = opciones.pregunta_id AND public.es_mi_curso(e.curso_id)));
CREATE POLICY "Profesionales ven inscripciones de sus cursos" ON public.inscripciones FOR SELECT TO authenticated
    USING (public.es_mi_curso(curso_id));

-- ── 4. Lectura y guardado del árbol ──
CREATE OR REPLACE FUNCTION public.estructura_curso(p_curso_id INT)
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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
    ), '[]'::jsonb)
    FROM public.modulos m WHERE m.curso_id = p_curso_id;
$$;

CREATE OR REPLACE FUNCTION public.mis_cursos_profesional()
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'key', c.slug,
        'info', jsonb_build_object(
            'titulo', c.nombre, 'descripcion', COALESCE(c.descripcion, ''),
            'categoria', COALESCE(c.categoria, 'Bienestar'), 'nivel', COALESCE(c.nivel, 'Principiante'),
            'idioma', COALESCE(c.idioma, 'Español'), 'precio', trim_scale(c.precio / 100.0)::text,
            'moneda', CASE c.moneda WHEN 'USD' THEN 'USD $' WHEN 'EUR' THEN 'EUR €' WHEN 'MXN' THEN 'MXN $' ELSE COALESCE(c.moneda, 'USD $') END,
            'imagen', COALESCE(c.imagen, ''), 'estado', CASE WHEN c.estado = 'publicado' THEN 'publicado' ELSE 'borrador' END
        ),
        'estudiantes', (SELECT count(*) FROM public.inscripciones i WHERE i.curso_id = c.id AND i.estado = 'activa'),
        'modulos', public.estructura_curso(c.id)
    ) ORDER BY c.id), '[]'::jsonb)
    FROM public.cursos c
    JOIN public.profesionales p ON p.id = c.profesional_id
    WHERE p.usuario_id = (SELECT auth.uid());
$$;

-- Inserta/actualiza por `clave` y borra lo que ya no está. Corre con los
-- permisos del usuario (RLS: solo su curso), todo en una transacción.
CREATE OR REPLACE FUNCTION public.guardar_estructura_curso(p_curso_id INT, p_modulos JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
    v_mod JSONB; v_item JSONB; v_preg JSONB; v_opc JSONB;
    v_mod_orden INT; v_item_orden INT; v_preg_orden INT; v_opc_orden INT;
    v_mod_id INT; v_clase_id INT; v_eval_id INT; v_preg_id INT; v_opc_id INT;
    v_mods INT[] := '{}'; v_clases INT[]; v_evals INT[]; v_pregs INT[]; v_opcs INT[];
BEGIN
    IF NOT public.es_mi_curso(p_curso_id) THEN
        RAISE EXCEPTION 'No tienes permiso para editar este curso.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    FOR v_mod, v_mod_orden IN SELECT value, ordinality FROM jsonb_array_elements(COALESCE(p_modulos, '[]'::jsonb)) WITH ORDINALITY LOOP
        INSERT INTO public.modulos (curso_id, clave, titulo, orden)
        VALUES (p_curso_id, v_mod->>'id', COALESCE(NULLIF(v_mod->>'titulo', ''), 'Módulo'), v_mod_orden)
        ON CONFLICT (curso_id, clave) DO UPDATE SET titulo = EXCLUDED.titulo, orden = EXCLUDED.orden
        RETURNING id INTO v_mod_id;
        v_mods := v_mods || v_mod_id;
        v_clases := '{}'; v_evals := '{}';

        FOR v_item, v_item_orden IN SELECT value, ordinality FROM jsonb_array_elements(COALESCE(v_mod->'items', '[]'::jsonb)) WITH ORDINALITY LOOP
            IF v_item->>'tipo' = 'clase' THEN
                INSERT INTO public.clases (modulo_id, clave, titulo, duracion_texto, texto_formativo, regla_desbloqueo, vista_previa, materiales, orden)
                VALUES (v_mod_id, v_item->>'id', COALESCE(NULLIF(v_item->>'titulo', ''), 'Clase'), v_item->>'duracion', v_item->>'contenido',
                        COALESCE(v_item->>'reglaDesbloqueo', 'secuencial'), COALESCE((v_item->>'vistaPrevia')::boolean, false),
                        COALESCE(v_item->'materiales', '[]'::jsonb), v_item_orden)
                ON CONFLICT (modulo_id, clave) DO UPDATE SET
                    titulo = EXCLUDED.titulo, duracion_texto = EXCLUDED.duracion_texto, texto_formativo = EXCLUDED.texto_formativo,
                    regla_desbloqueo = EXCLUDED.regla_desbloqueo, vista_previa = EXCLUDED.vista_previa,
                    materiales = EXCLUDED.materiales, orden = EXCLUDED.orden
                RETURNING id INTO v_clase_id;
                v_clases := v_clases || v_clase_id;
            ELSE
                INSERT INTO public.evaluaciones (curso_id, modulo_id, clave, tipo, titulo, orden, num_preguntas, intentos_max, nota_minima,
                        tiempo_limite_minutos, barajar, mostrar_retroalimentacion, desbloquea_siguiente, detalle_editado)
                VALUES (p_curso_id, v_mod_id, v_item->>'id', 'quiz', v_item->>'tituloEval', v_item_orden,
                        COALESCE((v_item->>'preguntas')::int, 0), COALESCE((v_item->>'intentos')::int, 3),
                        COALESCE((v_item->>'notaMinimaPct')::int, 70), NULLIF((v_item->>'tiempoLimiteMin')::int, 0),
                        COALESCE((v_item->>'barajar')::boolean, false), COALESCE((v_item->>'mostrarRetroalimentacion')::boolean, true),
                        COALESCE((v_item->>'desbloqueaSiguiente')::boolean, false), v_item ? 'preguntasDetalle')
                ON CONFLICT (modulo_id, clave) DO UPDATE SET
                    titulo = EXCLUDED.titulo, orden = EXCLUDED.orden, num_preguntas = EXCLUDED.num_preguntas,
                    intentos_max = EXCLUDED.intentos_max, nota_minima = EXCLUDED.nota_minima,
                    tiempo_limite_minutos = EXCLUDED.tiempo_limite_minutos, barajar = EXCLUDED.barajar,
                    mostrar_retroalimentacion = EXCLUDED.mostrar_retroalimentacion,
                    desbloquea_siguiente = EXCLUDED.desbloquea_siguiente, detalle_editado = EXCLUDED.detalle_editado
                RETURNING id INTO v_eval_id;
                v_evals := v_evals || v_eval_id;

                -- Preguntas: solo si la evaluación ya tiene contenido editado.
                IF v_item ? 'preguntasDetalle' THEN
                    v_pregs := '{}';
                    FOR v_preg, v_preg_orden IN SELECT value, ordinality FROM jsonb_array_elements(v_item->'preguntasDetalle') WITH ORDINALITY LOOP
                        INSERT INTO public.preguntas (evaluacion_id, clave, texto, tipo, puntaje, orden)
                        VALUES (v_eval_id, v_preg->>'id', COALESCE(v_preg->>'enunciado', ''),
                                CASE v_preg->>'tipo' WHEN 'multiple' THEN 'opcion_multiple' WHEN 'vf' THEN 'verdadero_falso' ELSE 'abierta' END,
                                COALESCE((v_preg->>'puntaje')::numeric, 1), v_preg_orden)
                        ON CONFLICT (evaluacion_id, clave) DO UPDATE SET
                            texto = EXCLUDED.texto, tipo = EXCLUDED.tipo, puntaje = EXCLUDED.puntaje, orden = EXCLUDED.orden
                        RETURNING id INTO v_preg_id;
                        v_pregs := v_pregs || v_preg_id;

                        v_opcs := '{}';
                        FOR v_opc, v_opc_orden IN SELECT value, ordinality FROM jsonb_array_elements(COALESCE(v_preg->'opciones', '[]'::jsonb)) WITH ORDINALITY LOOP
                            INSERT INTO public.opciones (pregunta_id, clave, texto, es_correcta, orden)
                            VALUES (v_preg_id, v_opc->>'id', COALESCE(v_opc->>'texto', ''), COALESCE((v_opc->>'correcta')::boolean, false), v_opc_orden)
                            ON CONFLICT (pregunta_id, clave) DO UPDATE SET
                                texto = EXCLUDED.texto, es_correcta = EXCLUDED.es_correcta, orden = EXCLUDED.orden
                            RETURNING id INTO v_opc_id;
                            v_opcs := v_opcs || v_opc_id;
                        END LOOP;
                        DELETE FROM public.opciones WHERE pregunta_id = v_preg_id AND NOT (id = ANY (v_opcs));
                    END LOOP;
                    DELETE FROM public.preguntas WHERE evaluacion_id = v_eval_id AND NOT (id = ANY (v_pregs));
                END IF;
            END IF;
        END LOOP;

        DELETE FROM public.clases WHERE modulo_id = v_mod_id AND NOT (id = ANY (v_clases));
        DELETE FROM public.evaluaciones WHERE modulo_id = v_mod_id AND NOT (id = ANY (v_evals));
    END LOOP;

    DELETE FROM public.modulos WHERE curso_id = p_curso_id AND NOT (id = ANY (v_mods));
    UPDATE public.cursos SET actualizado_en = NOW() WHERE id = p_curso_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guardar_estructura_curso(INT, JSONB), public.mis_cursos_profesional(), public.estructura_curso(INT), public.es_mi_curso(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_estructura_curso(INT, JSONB), public.mis_cursos_profesional(), public.estructura_curso(INT), public.es_mi_curso(INT) TO authenticated;
