-- 047 · Panel admin A7: Reportes con datos reales.
-- admin_reportes(desde, hasta) devuelve la serie diaria (zona America/Caracas)
-- desde el inicio del período anterior (misma duración) hasta `hasta`, y los
-- desgloses reales del período pedido. Montos en centavos. Los ingresos son
-- netos: pagos aprobados (o luego reembolsados) por fecha de pago, menos
-- reembolsos por fecha de reembolso.

CREATE OR REPLACE FUNCTION public.admin_reportes(p_desde DATE, p_hasta DATE)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_desde DATE := LEAST(p_desde, p_hasta);
    v_hasta DATE := GREATEST(p_desde, p_hasta);
    v_ini DATE;
    tz CONSTANT TEXT := 'America/Caracas';
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF v_hasta - v_desde > 800 THEN
        RAISE EXCEPTION 'El rango es demasiado largo (máximo ~2 años).';
    END IF;
    v_ini := v_desde - (v_hasta - v_desde) - 1;

    RETURN json_build_object(
        'dias', (
            WITH d AS (SELECT gs::date AS dia FROM generate_series(v_ini, v_hasta, interval '1 day') gs),
            cobros AS (  -- pagos cobrados (netos de reembolsos) por día y categoría
                SELECT (p.fecha AT TIME ZONE tz)::date AS dia, o.tipo_producto AS tipo, pd.tipo AS tipo_pd, p.monto
                FROM public.pagos p
                JOIN public.ordenes o ON o.id = p.orden_id
                LEFT JOIN public.productos_digitales pd ON o.tipo_producto = 'producto_digital' AND o.producto_id ~ '^[0-9]+$' AND pd.id = o.producto_id::int
                WHERE p.estado IN ('aprobado', 'reembolsado') AND p.metodo <> 'reembolso'
                UNION ALL
                SELECT (r.fecha AT TIME ZONE tz)::date, o.tipo_producto, pd.tipo, -r.monto
                FROM public.reembolsos r
                JOIN public.pagos p ON p.id = r.pago_id
                JOIN public.ordenes o ON o.id = p.orden_id
                LEFT JOIN public.productos_digitales pd ON o.tipo_producto = 'producto_digital' AND o.producto_id ~ '^[0-9]+$' AND pd.id = o.producto_id::int
                WHERE r.estado = 'completado'
            ),
            completados AS (  -- curso terminado: fecha de la última clase completada de quien llegó al 100 %
                SELECT (max(pr.fecha_actualizacion) AT TIME ZONE tz)::date AS dia
                FROM public.progreso_cursos pc
                JOIN public.modulos m ON m.curso_id = pc.curso_id
                JOIN public.clases cl ON cl.modulo_id = m.id
                JOIN public.progreso pr ON pr.clase_id = cl.id AND pr.usuario_id = pc.usuario_id AND pr.completado
                WHERE pc.porcentaje_curso >= 100
                GROUP BY pc.curso_id, pc.usuario_id
            )
            SELECT COALESCE(json_agg(json_build_object(
                'fecha', d.dia,
                'citasReal', (SELECT count(*) FROM public.citas c WHERE c.fecha = d.dia AND c.estado = 'completada'),
                'citasCancel', (SELECT count(*) FROM public.citas c WHERE c.fecha = d.dia AND c.estado = 'cancelada'),
                'citasNoShow', (SELECT count(*) FROM public.citas c WHERE c.fecha = d.dia AND c.estado = 'no_asistio'),
                'ingresosServicios', (SELECT COALESCE(sum(monto), 0) FROM cobros WHERE cobros.dia = d.dia AND tipo = 'cita'),
                'ingresosCursos', (SELECT COALESCE(sum(monto), 0) FROM cobros WHERE cobros.dia = d.dia AND tipo = 'curso'),
                'ingresosVideos', (SELECT COALESCE(sum(monto), 0) FROM cobros WHERE cobros.dia = d.dia AND tipo = 'producto_digital' AND tipo_pd = 'video'),
                'ingresosLibros', (SELECT COALESCE(sum(monto), 0) FROM cobros WHERE cobros.dia = d.dia AND tipo = 'producto_digital' AND tipo_pd IS DISTINCT FROM 'video'),
                'inscripciones', (SELECT count(*) FROM public.inscripciones i WHERE (i.fecha_inicio AT TIME ZONE tz)::date = d.dia),
                'cursosCompletados', (SELECT count(*) FROM completados WHERE completados.dia = d.dia),
                'evalTotal', (SELECT count(*) FROM public.intentos_evaluacion ie WHERE (ie.fecha AT TIME ZONE tz)::date = d.dia),
                'evalAprobadas', (SELECT count(*) FROM public.intentos_evaluacion ie WHERE (ie.fecha AT TIME ZONE tz)::date = d.dia AND ie.aprobado),
                'ventasCursosUnid', (SELECT count(*) FROM public.inscripciones i JOIN public.cursos cu ON cu.id = i.curso_id
                                     WHERE (i.fecha_inicio AT TIME ZONE tz)::date = d.dia AND cu.precio > 0),
                'ventasVideosUnid', (SELECT count(*) FROM public.compras_digitales cd JOIN public.productos_digitales pd ON pd.id = cd.producto_id
                                     WHERE (cd.fecha AT TIME ZONE tz)::date = d.dia AND pd.tipo = 'video'),
                'ventasLibrosUnid', (SELECT count(*) FROM public.compras_digitales cd JOIN public.productos_digitales pd ON pd.id = cd.producto_id
                                     WHERE (cd.fecha AT TIME ZONE tz)::date = d.dia AND pd.tipo <> 'video'),
                'comentarios', (SELECT count(*) FROM public.calificaciones ca WHERE (ca.fecha AT TIME ZONE tz)::date = d.dia),
                'sumaEstrellas', (SELECT COALESCE(sum(ca.nota_profesional), 0) FROM public.calificaciones ca WHERE (ca.fecha AT TIME ZONE tz)::date = d.dia),
                'dist', (SELECT json_build_array(
                            count(*) FILTER (WHERE ca.nota_profesional = 1), count(*) FILTER (WHERE ca.nota_profesional = 2),
                            count(*) FILTER (WHERE ca.nota_profesional = 3), count(*) FILTER (WHERE ca.nota_profesional = 4),
                            count(*) FILTER (WHERE ca.nota_profesional = 5))
                         FROM public.calificaciones ca WHERE (ca.fecha AT TIME ZONE tz)::date = d.dia)
            ) ORDER BY d.dia), '[]'::json)
            FROM d
        ),
        -- Ingresos netos del período por concepto.
        'finanzas', (
            WITH cobros AS (
                SELECT o.tipo_producto AS tipo, o.producto_id, p.monto
                FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
                WHERE p.estado IN ('aprobado', 'reembolsado') AND p.metodo <> 'reembolso'
                  AND (p.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta
                UNION ALL
                SELECT o.tipo_producto, o.producto_id, -r.monto
                FROM public.reembolsos r JOIN public.pagos p ON p.id = r.pago_id JOIN public.ordenes o ON o.id = p.orden_id
                WHERE r.estado = 'completado' AND (r.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta
            ),
            con_nombre AS (
                SELECT CASE c.tipo
                           WHEN 'cita' THEN COALESCE((SELECT s.nombre FROM public.citas ci JOIN public.servicios s ON s.id = ci.servicio_id WHERE ci.id::text = c.producto_id), 'Cita')
                           WHEN 'curso' THEN COALESCE((SELECT cu.nombre FROM public.cursos cu WHERE c.producto_id ~ '^[0-9]+$' AND cu.id = c.producto_id::int), 'Curso')
                           ELSE COALESCE((SELECT pd.titulo FROM public.productos_digitales pd WHERE c.producto_id ~ '^[0-9]+$' AND pd.id = c.producto_id::int), 'Producto')
                       END AS concepto,
                       CASE c.tipo
                           WHEN 'cita' THEN 'servicio'
                           WHEN 'curso' THEN 'curso'
                           ELSE CASE WHEN (SELECT pd.tipo FROM public.productos_digitales pd WHERE c.producto_id ~ '^[0-9]+$' AND pd.id = c.producto_id::int) = 'video' THEN 'video' ELSE 'libro' END
                       END AS categoria,
                       c.monto
                FROM cobros c
            )
            SELECT COALESCE(json_agg(json_build_object('concepto', concepto, 'categoria', categoria, 'monto', total) ORDER BY total DESC), '[]'::json)
            FROM (SELECT concepto, categoria, sum(monto) AS total FROM con_nombre GROUP BY 1, 2) x
        ),
        'citasPorProfesional', (
            SELECT COALESCE(json_agg(x ORDER BY x.realizadas DESC, x.profesional), '[]'::json)
            FROM (
                SELECT pp.nombre AS profesional,
                       count(*) FILTER (WHERE c.estado = 'completada') AS realizadas,
                       count(*) FILTER (WHERE c.estado = 'cancelada') AS canceladas,
                       count(*) FILTER (WHERE c.estado = 'no_asistio') AS noshow
                FROM public.citas c JOIN public.profesionales_publicos pp ON pp.id = c.profesional_id
                WHERE c.fecha BETWEEN v_desde AND v_hasta
                GROUP BY pp.nombre
            ) x
        ),
        'academiaPorCurso', (
            SELECT COALESCE(json_agg(x ORDER BY x.inscripciones DESC, x.curso), '[]'::json)
            FROM (
                SELECT cu.nombre AS curso,
                       (SELECT count(*) FROM public.inscripciones i WHERE i.curso_id = cu.id
                          AND (i.fecha_inicio AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta) AS inscripciones,
                       (SELECT count(*) FROM public.progreso_cursos pc WHERE pc.curso_id = cu.id AND pc.porcentaje_curso >= 100
                          AND EXISTS (SELECT 1 FROM public.inscripciones i WHERE i.curso_id = cu.id AND i.usuario_id = pc.usuario_id
                                        AND (i.fecha_inicio AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta)) AS completados,
                       (SELECT count(*) FROM public.intentos_evaluacion ie JOIN public.evaluaciones e ON e.id = ie.evaluacion_id
                          WHERE e.curso_id = cu.id AND (ie.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta) AS evaluaciones,
                       (SELECT count(*) FROM public.intentos_evaluacion ie JOIN public.evaluaciones e ON e.id = ie.evaluacion_id
                          WHERE e.curso_id = cu.id AND ie.aprobado AND (ie.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta) AS aprobadas
                FROM public.cursos cu
            ) x
        ),
        'ventas', (
            SELECT COALESCE(json_agg(x ORDER BY x.monto DESC, x.producto), '[]'::json)
            FROM (
                SELECT cu.nombre AS producto, 'curso' AS categoria,
                       (SELECT count(*) FROM public.inscripciones i WHERE i.curso_id = cu.id AND cu.precio > 0
                          AND (i.fecha_inicio AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta) AS unidades,
                       (SELECT COALESCE(sum(p.monto), 0) FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
                          WHERE o.tipo_producto = 'curso' AND o.producto_id = cu.id::text AND p.estado IN ('aprobado', 'reembolsado')
                            AND (p.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta)
                       - (SELECT COALESCE(sum(r.monto), 0) FROM public.reembolsos r JOIN public.pagos p ON p.id = r.pago_id JOIN public.ordenes o ON o.id = p.orden_id
                          WHERE o.tipo_producto = 'curso' AND o.producto_id = cu.id::text AND r.estado = 'completado'
                            AND (r.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta) AS monto
                FROM public.cursos cu
                UNION ALL
                SELECT pd.titulo, CASE WHEN pd.tipo = 'video' THEN 'video' ELSE 'libro' END,
                       (SELECT count(*) FROM public.compras_digitales cd WHERE cd.producto_id = pd.id
                          AND (cd.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta),
                       (SELECT COALESCE(sum(p.monto), 0) FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
                          WHERE o.tipo_producto = 'producto_digital' AND o.producto_id = pd.id::text AND p.estado IN ('aprobado', 'reembolsado')
                            AND (p.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta)
                       - (SELECT COALESCE(sum(r.monto), 0) FROM public.reembolsos r JOIN public.pagos p ON p.id = r.pago_id JOIN public.ordenes o ON o.id = p.orden_id
                          WHERE o.tipo_producto = 'producto_digital' AND o.producto_id = pd.id::text AND r.estado = 'completado'
                            AND (r.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta)
                FROM public.productos_digitales pd
            ) x
        ),
        'resenasPorServicio', (
            SELECT COALESCE(json_agg(x ORDER BY x.nombre), '[]'::json)
            FROM (
                SELECT s.nombre, round(avg(ca.nota_servicio)::numeric, 2) AS promedio, count(*) AS total
                FROM public.calificaciones ca JOIN public.servicios s ON s.id = ca.servicio_id
                WHERE (ca.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta
                GROUP BY s.nombre
            ) x
        ),
        'resenasPorProfesional', (
            SELECT COALESCE(json_agg(x ORDER BY x.nombre), '[]'::json)
            FROM (
                SELECT pp.nombre, round(avg(ca.nota_profesional)::numeric, 2) AS promedio, count(*) AS total
                FROM public.calificaciones ca JOIN public.profesionales_publicos pp ON pp.id = ca.profesional_id
                WHERE (ca.fecha AT TIME ZONE tz)::date BETWEEN v_desde AND v_hasta
                GROUP BY pp.nombre
            ) x
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reportes(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reportes(DATE, DATE) TO authenticated;
