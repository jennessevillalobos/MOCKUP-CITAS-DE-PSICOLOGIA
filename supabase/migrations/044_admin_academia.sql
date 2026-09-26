-- 044 · Panel admin A5: Cursos, Evaluaciones, Clases en vivo y Productos.
-- Supervisión: el contenido lo crea cada profesional (Constructor, Mis
-- productos, Clases en vivo); el admin ve todo, publica / pasa a borrador,
-- reasigna cursos y productos a otra profesional, suspende o reactiva
-- inscripciones, activa o desactiva productos y edita o cancela clases en vivo.

-- Todo lo de la academia en una llamada.
CREATE OR REPLACE FUNCTION public.admin_academia()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    RETURN json_build_object(
        'profesionales', COALESCE((SELECT json_agg(json_build_object('id', id, 'nombre', nombre) ORDER BY nombre) FROM public.profesionales_publicos), '[]'::json),
        'cursos', COALESCE((
            SELECT json_agg(json_build_object(
                'id', c.id, 'nombre', c.nombre, 'slug', c.slug, 'descripcion', c.descripcion, 'categoria', c.categoria,
                'precio', c.precio, 'moneda', c.moneda, 'estado', c.estado,
                'profesional', pp.nombre, 'profesionalId', c.profesional_id,
                'inscritos', (SELECT count(*) FROM public.inscripciones i WHERE i.curso_id = c.id AND i.estado = 'activa'),
                'modulos', (SELECT count(*) FROM public.modulos m WHERE m.curso_id = c.id),
                'clases', (SELECT count(*) FROM public.clases cl JOIN public.modulos m ON m.id = cl.modulo_id WHERE m.curso_id = c.id AND cl.estado = 'activo'),
                'reglas', (SELECT json_object_agg(r.regla, r.n) FROM (
                              SELECT cl.regla_desbloqueo AS regla, count(*) AS n
                              FROM public.clases cl JOIN public.modulos m ON m.id = cl.modulo_id
                              WHERE m.curso_id = c.id AND cl.estado = 'activo' GROUP BY 1) r)
            ) ORDER BY c.nombre)
            FROM public.cursos c LEFT JOIN public.profesionales_publicos pp ON pp.id = c.profesional_id
        ), '[]'::json),
        'inscripciones', COALESCE((
            SELECT json_agg(json_build_object(
                'id', i.id, 'cursoId', i.curso_id, 'curso', c.nombre,
                'estudiante', COALESCE(NULLIF(u.nombre, ''), u.email), 'correo', u.email,
                'fecha', i.fecha_inicio, 'estado', i.estado,
                'progreso', COALESCE((SELECT round(pc.porcentaje_curso) FROM public.progreso_cursos pc
                                      WHERE pc.curso_id = i.curso_id AND pc.usuario_id = i.usuario_id), 0)
            ) ORDER BY i.fecha_inicio DESC)
            FROM public.inscripciones i
            JOIN public.cursos c ON c.id = i.curso_id
            LEFT JOIN public.usuarios u ON u.id = i.usuario_id
        ), '[]'::json),
        'evaluaciones', COALESCE((
            SELECT json_agg(json_build_object(
                'id', e.id, 'titulo', COALESCE(e.titulo, 'Evaluación'), 'tipo', e.tipo,
                'curso', c.nombre, 'cursoEstado', c.estado, 'modulo', m.titulo, 'profesional', pp.nombre,
                'intentosMax', e.intentos_max, 'notaMinima', e.nota_minima,
                'preguntas', (SELECT count(*) FROM public.preguntas p WHERE p.evaluacion_id = e.id),
                'intentos', (SELECT count(*) FROM public.intentos_evaluacion ie WHERE ie.evaluacion_id = e.id),
                'evaluados', (SELECT count(DISTINCT ie.usuario_id) FROM public.intentos_evaluacion ie WHERE ie.evaluacion_id = e.id AND ie.estado = 'calificado'),
                'aprobados', (SELECT count(DISTINCT ie.usuario_id) FROM public.intentos_evaluacion ie WHERE ie.evaluacion_id = e.id AND ie.aprobado),
                'intentosMes', (SELECT count(*) FROM public.intentos_evaluacion ie WHERE ie.evaluacion_id = e.id
                                 AND ie.fecha >= date_trunc('month', now() AT TIME ZONE 'America/Caracas'))
            ) ORDER BY c.nombre, m.orden, e.orden)
            FROM public.evaluaciones e
            JOIN public.cursos c ON c.id = e.curso_id
            LEFT JOIN public.modulos m ON m.id = e.modulo_id
            LEFT JOIN public.profesionales_publicos pp ON pp.id = c.profesional_id
        ), '[]'::json),
        'pendientes', COALESCE((
            SELECT json_agg(json_build_object(
                'id', ie.id, 'estudiante', COALESCE(NULLIF(u.nombre, ''), u.email), 'curso', c.nombre,
                'evaluacion', COALESCE(e.titulo, 'Evaluación'), 'profesional', pp.nombre, 'fecha', ie.fecha
            ) ORDER BY ie.fecha)
            FROM public.intentos_evaluacion ie
            JOIN public.evaluaciones e ON e.id = ie.evaluacion_id
            JOIN public.cursos c ON c.id = e.curso_id
            LEFT JOIN public.profesionales_publicos pp ON pp.id = c.profesional_id
            LEFT JOIN public.usuarios u ON u.id = ie.usuario_id
            WHERE ie.estado = 'pendiente'
        ), '[]'::json),
        'clasesVivo', COALESCE((
            SELECT json_agg(json_build_object(
                'id', v.id, 'titulo', v.titulo, 'curso', c.nombre, 'profesional', pp.nombre,
                'fecha', v.fecha, 'hora', to_char(v.hora, 'HH24:MI'), 'duracion', v.duracion_min, 'enlace', v.enlace,
                'destinatario', v.destinatario_tipo, 'invitados', COALESCE(cardinality(v.pacientes_correos), 0),
                'inscritos', CASE WHEN v.curso_id IS NULL THEN COALESCE(cardinality(v.pacientes_correos), 0)
                                  ELSE (SELECT count(*) FROM public.inscripciones i WHERE i.curso_id = v.curso_id AND i.estado = 'activa') END,
                'grabar', v.grabar, 'recordatorio', v.recordatorio, 'estado', v.estado,
                'grabacion', v.grabacion_url, 'asistieron', v.asistieron
            ) ORDER BY v.fecha DESC, v.hora DESC)
            FROM public.clases_en_vivo v
            LEFT JOIN public.cursos c ON c.id = v.curso_id
            LEFT JOIN public.profesionales_publicos pp ON pp.id = v.profesional_id
        ), '[]'::json),
        'productos', COALESCE((
            SELECT json_agg(json_build_object(
                'id', p.id, 'clave', p.clave, 'titulo', p.titulo, 'tipo', p.tipo, 'categoria', p.categoria,
                'precio', p.precio, 'moneda', p.moneda, 'estado', p.estado, 'descripcion', p.descripcion,
                'profesional', pp.nombre, 'profesionalId', p.profesional_id,
                'tieneArchivo', p.archivo_url IS NOT NULL, 'descarga', p.descarga_permitida,
                'ventas', (SELECT count(*) FROM public.compras_digitales cd WHERE cd.producto_id = p.id),
                'ventasMes', (SELECT count(*) FROM public.compras_digitales cd WHERE cd.producto_id = p.id
                               AND cd.fecha >= date_trunc('month', now() AT TIME ZONE 'America/Caracas'))
            ) ORDER BY p.clave)
            FROM public.productos_digitales p LEFT JOIN public.profesionales_publicos pp ON pp.id = p.profesional_id
        ), '[]'::json)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_estado_curso(p_curso_id INT, p_estado TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF p_estado NOT IN ('borrador', 'publicado', 'archivado') THEN
        RAISE EXCEPTION 'Estado no válido.';
    END IF;
    UPDATE public.cursos SET estado = p_estado, actualizado_en = now() WHERE id = p_curso_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El curso no existe.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reasignar_curso(p_curso_id INT, p_profesional_id INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profesionales WHERE id = p_profesional_id) THEN
        RAISE EXCEPTION 'La profesional no existe.';
    END IF;
    UPDATE public.cursos SET profesional_id = p_profesional_id, actualizado_en = now() WHERE id = p_curso_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El curso no existe.';
    END IF;
END;
$$;

-- Suspender / reactivar el acceso de una inscripción (no toca pagos).
CREATE OR REPLACE FUNCTION public.admin_acceso_inscripcion(p_inscripcion_id INT, p_activa BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_ins RECORD;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    UPDATE public.inscripciones SET estado = CASE WHEN p_activa THEN 'activa' ELSE 'suspendida' END
     WHERE id = p_inscripcion_id AND estado IN ('activa', 'suspendida')
    RETURNING * INTO v_ins;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La inscripción no existe o ya finalizó.';
    END IF;
    PERFORM public.notificar(v_ins.usuario_id, 'curso',
        CASE WHEN p_activa THEN 'Se reactivó tu acceso al curso "' ELSE 'Se suspendió tu acceso al curso "' END
            || (SELECT nombre FROM public.cursos WHERE id = v_ins.curso_id) || '".'
            || CASE WHEN p_activa THEN '' ELSE ' Escríbenos si crees que es un error.' END,
        CASE WHEN p_activa THEN 'Your access to the course "' ELSE 'Your access to the course "' END
            || (SELECT nombre FROM public.cursos WHERE id = v_ins.curso_id) || '"'
            || CASE WHEN p_activa THEN ' was reactivated.' ELSE ' was suspended. Contact us if you think this is a mistake.' END,
        '/aula-virtual', NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_actualizar_producto(
    p_producto_id INT, p_activo BOOLEAN DEFAULT NULL, p_profesional_id INT DEFAULT NULL, p_descarga BOOLEAN DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF p_profesional_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profesionales WHERE id = p_profesional_id) THEN
        RAISE EXCEPTION 'La profesional no existe.';
    END IF;
    UPDATE public.productos_digitales
       SET estado = CASE WHEN p_activo IS NULL THEN estado WHEN p_activo THEN 'activo' ELSE 'inactivo' END,
           profesional_id = COALESCE(p_profesional_id, profesional_id),
           descarga_permitida = COALESCE(p_descarga, descarga_permitida)
     WHERE id = p_producto_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto no existe.';
    END IF;
END;
$$;

-- Editar o cancelar una clase en vivo programada.
CREATE OR REPLACE FUNCTION public.admin_actualizar_clase_vivo(
    p_clase_id BIGINT, p_titulo TEXT DEFAULT NULL, p_fecha DATE DEFAULT NULL, p_hora TIME DEFAULT NULL,
    p_duracion INT DEFAULT NULL, p_enlace TEXT DEFAULT NULL, p_cancelar BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_clase RECORD;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    SELECT * INTO v_clase FROM public.clases_en_vivo WHERE id = p_clase_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La clase no existe.';
    END IF;
    IF v_clase.estado <> 'programada' THEN
        RAISE EXCEPTION 'Solo se pueden editar o cancelar clases programadas.';
    END IF;
    IF p_cancelar THEN
        UPDATE public.clases_en_vivo SET estado = 'cancelada' WHERE id = p_clase_id;
        -- Aviso a la profesional y a quienes pidieron recordatorio.
        PERFORM public.notificar(public.usuario_de_profesional(v_clase.profesional_id), 'vivo',
            'La administración canceló tu clase en vivo "' || v_clase.titulo || '" del ' || to_char(v_clase.fecha, 'DD/MM') || '.',
            'The administration cancelled your live class "' || v_clase.titulo || '" on ' || to_char(v_clase.fecha, 'DD/MM') || '.',
            '/instructor/vivo', NULL);
        PERFORM public.notificar(rc.usuario_id, 'vivo',
            'Se canceló la clase en vivo "' || v_clase.titulo || '" del ' || to_char(v_clase.fecha, 'DD/MM') || '.',
            'The live class "' || v_clase.titulo || '" on ' || to_char(v_clase.fecha, 'DD/MM') || ' was cancelled.',
            '/aula-virtual/vivo', NULL)
        FROM public.recordatorios_clase rc WHERE rc.clase_id = p_clase_id;
        RETURN;
    END IF;
    IF p_titulo IS NOT NULL AND length(btrim(p_titulo)) = 0 THEN
        RAISE EXCEPTION 'El título no puede quedar vacío.';
    END IF;
    IF p_duracion IS NOT NULL AND p_duracion <= 0 THEN
        RAISE EXCEPTION 'La duración debe ser mayor que 0.';
    END IF;
    IF p_fecha IS NOT NULL AND p_fecha < (now() AT TIME ZONE 'America/Caracas')::date THEN
        RAISE EXCEPTION 'No se puede mover una clase a una fecha pasada.';
    END IF;
    UPDATE public.clases_en_vivo
       SET titulo = COALESCE(left(btrim(p_titulo), 150), titulo),
           fecha = COALESCE(p_fecha, fecha),
           hora = COALESCE(p_hora, hora),
           duracion_min = COALESCE(p_duracion, duracion_min),
           enlace = CASE WHEN p_enlace IS NULL THEN enlace ELSE NULLIF(btrim(p_enlace), '') END
     WHERE id = p_clase_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_academia() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_estado_curso(INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reasignar_curso(INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_acceso_inscripcion(INT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_actualizar_producto(INT, BOOLEAN, INT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_actualizar_clase_vivo(BIGINT, TEXT, DATE, TIME, INT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_academia() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_estado_curso(INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reasignar_curso(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_acceso_inscripcion(INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_producto(INT, BOOLEAN, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_clase_vivo(BIGINT, TEXT, DATE, TIME, INT, TEXT, BOOLEAN) TO authenticated;
