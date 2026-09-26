-- Migración: datos para la página "Progreso" del Aula Virtual.
-- mis_cursos_estudiante() (027) suma la última actividad por curso, y
-- mi_actividad_reciente() devuelve los momentos de actividad de los últimos
-- 90 días (clases completadas e intentos de evaluación) para que el
-- navegador calcule la racha con la zona horaria de la persona.

CREATE OR REPLACE FUNCTION public.mis_cursos_estudiante()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'cursoId', c.id, 'slug', c.slug, 'nombre', c.nombre, 'imagen', c.imagen,
        'profesional', public.nombre_usuario(public.usuario_de_profesional(c.profesional_id)),
        'inscritoEn', i.fecha_inicio,
        'totalClases', t.total, 'completadas', t.completadas,
        'porcentaje', CASE WHEN t.total > 0 THEN round(100.0 * t.completadas / t.total) ELSE 0 END,
        'ultimaActividad', t.ultima
    ) ORDER BY i.fecha_inicio DESC), '[]'::jsonb)
    FROM public.inscripciones i
    JOIN public.cursos c ON c.id = i.curso_id
    CROSS JOIN LATERAL (
        SELECT count(cl.id)::int AS total,
               count(cl.id) FILTER (WHERE EXISTS (
                   SELECT 1 FROM public.progreso pr WHERE pr.clase_id = cl.id AND pr.usuario_id = i.usuario_id AND pr.completado
               ))::int AS completadas,
               (SELECT max(pr.fecha_actualizacion) FROM public.progreso pr
                  JOIN public.clases cl2 ON cl2.id = pr.clase_id JOIN public.modulos m2 ON m2.id = cl2.modulo_id
                 WHERE m2.curso_id = c.id AND pr.usuario_id = i.usuario_id) AS ultima
        FROM public.modulos m JOIN public.clases cl ON cl.modulo_id = m.id AND cl.estado = 'activo'
        WHERE m.curso_id = c.id
    ) t
    WHERE i.usuario_id = (SELECT auth.uid()) AND i.estado = 'activa';
$$;
REVOKE EXECUTE ON FUNCTION public.mis_cursos_estudiante() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_cursos_estudiante() TO authenticated;

CREATE OR REPLACE FUNCTION public.mi_actividad_reciente()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(x.momento ORDER BY x.momento DESC), '[]'::jsonb) FROM (
        SELECT fecha_actualizacion AS momento FROM public.progreso
         WHERE usuario_id = (SELECT auth.uid()) AND completado AND fecha_actualizacion > now() - interval '90 days'
        UNION ALL
        SELECT fecha FROM public.intentos_evaluacion
         WHERE usuario_id = (SELECT auth.uid()) AND fecha > now() - interval '90 days'
    ) x;
$$;
REVOKE EXECUTE ON FUNCTION public.mi_actividad_reciente() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_actividad_reciente() TO authenticated;
