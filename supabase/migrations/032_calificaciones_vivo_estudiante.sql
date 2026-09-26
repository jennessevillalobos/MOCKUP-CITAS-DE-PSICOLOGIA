-- Migración: Calificaciones y Clases en vivo del Aula Virtual (P5a).

-- ── 1. Calificaciones: una fila por evaluación de los cursos inscritos ──
-- estado: aprobada (algún intento aprobado), pendiente (sin intentos o con
-- un intento en revisión) o reprobada; nota = mejor nota calificada (%).
CREATE OR REPLACE FUNCTION public.mis_calificaciones()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'evaluacionId', e.id,
        'evaluacion', COALESCE(NULLIF(e.titulo, ''), 'Evaluación'),
        'cursoSlug', c.slug, 'curso', c.nombre,
        'nota', a.mejor,
        'estado', CASE WHEN a.aprobada THEN 'aprobada'
                       WHEN a.intentos = 0 OR a.en_revision THEN 'pendiente'
                       ELSE 'reprobada' END,
        'fecha', a.fecha
    ) ORDER BY c.nombre, m.orden, e.orden), '[]'::jsonb)
    FROM public.inscripciones i
    JOIN public.cursos c ON c.id = i.curso_id
    JOIN public.evaluaciones e ON e.curso_id = c.id
    LEFT JOIN public.modulos m ON m.id = e.modulo_id
    CROSS JOIN LATERAL (
        SELECT count(*)::int AS intentos,
               COALESCE(bool_or(it.aprobado), FALSE) AS aprobada,
               COALESCE(bool_or(it.estado = 'pendiente'), FALSE) AS en_revision,
               max(it.nota) FILTER (WHERE it.estado = 'calificado') AS mejor,
               max(it.fecha) AS fecha
        FROM public.intentos_evaluacion it
        WHERE it.evaluacion_id = e.id AND it.usuario_id = i.usuario_id
    ) a
    WHERE i.usuario_id = (SELECT auth.uid()) AND i.estado = 'activa';
$$;
REVOKE EXECUTE ON FUNCTION public.mis_calificaciones() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_calificaciones() TO authenticated;

-- ── 2. Clases en vivo visibles para el estudiante ──
-- Mismo criterio que la política "Invitados ven sus clases en vivo" (018):
-- clases de sus cursos activos o invitaciones a su correo. Añade nombres y
-- si activó el recordatorio.
CREATE OR REPLACE FUNCTION public.mis_clases_vivo()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', v.id, 'titulo', v.titulo, 'fecha', v.fecha, 'hora', to_char(v.hora, 'HH24:MI'),
        'duracionMin', v.duracion_min, 'enlace', v.enlace, 'estado', v.estado,
        'curso', cu.nombre,
        'profesional', public.nombre_usuario(public.usuario_de_profesional(v.profesional_id)),
        'grabacionUrl', v.grabacion_url, 'grabacionDuracion', v.grabacion_duracion,
        'recordatorio', EXISTS (SELECT 1 FROM public.recordatorios_clase r WHERE r.clase_id = v.id AND r.usuario_id = (SELECT auth.uid()))
    ) ORDER BY v.fecha, v.hora), '[]'::jsonb)
    FROM public.clases_en_vivo v
    LEFT JOIN public.cursos cu ON cu.id = v.curso_id
    WHERE v.estado <> 'cancelada' AND (
        (v.destinatario_tipo = 'curso' AND EXISTS (
            SELECT 1 FROM public.inscripciones i
            WHERE i.curso_id = v.curso_id AND i.usuario_id = (SELECT auth.uid()) AND i.estado = 'activa'))
        OR (v.destinatario_tipo = 'pacientes' AND lower((SELECT auth.jwt()) ->> 'email') = ANY (SELECT lower(x) FROM unnest(v.pacientes_correos) x))
    );
$$;
REVOKE EXECUTE ON FUNCTION public.mis_clases_vivo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_clases_vivo() TO authenticated;
