-- Migración: "Pagos y cuotas" del Aula Virtual (P5b).
-- Decidido con la usuaria: por ahora sin sistema de cuotas; la página muestra
-- por curso lo pagado, lo que está en revisión y lo que falta, con el
-- historial de transferencias de cada orden de curso.

CREATE OR REPLACE FUNCTION public.mis_pagos_cursos()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'cursoId', c.id, 'slug', c.slug, 'curso', c.nombre, 'moneda', o.moneda,
        'precio', o.monto,
        'pagado', t.pagado, 'enRevision', t.en_revision,
        'saldo', GREATEST(0, o.monto - t.pagado - t.en_revision),
        'inscrito', EXISTS (SELECT 1 FROM public.inscripciones i WHERE i.curso_id = c.id AND i.usuario_id = o.usuario_id AND i.estado = 'activa'),
        'pagos', t.pagos
    ) ORDER BY o.fecha_creacion DESC), '[]'::jsonb)
    FROM public.ordenes o
    JOIN public.cursos c ON o.producto_id ~ '^[0-9]+$' AND c.id = o.producto_id::int
    CROSS JOIN LATERAL (
        SELECT COALESCE(sum(p.monto) FILTER (WHERE p.estado = 'aprobado'), 0)::int AS pagado,
               COALESCE(sum(p.monto) FILTER (WHERE p.estado = 'pendiente'), 0)::int AS en_revision,
               COALESCE(jsonb_agg(jsonb_build_object(
                   'id', p.id, 'fecha', p.fecha, 'monto', p.monto, 'estado', p.estado, 'metodo', p.metodo,
                   'referencia', p.referencia, 'motivoRechazo', p.motivo_rechazo
               ) ORDER BY p.fecha DESC) FILTER (WHERE p.id IS NOT NULL), '[]'::jsonb) AS pagos
        FROM public.pagos p WHERE p.orden_id = o.id AND p.metodo <> 'reembolso'
    ) t
    WHERE o.tipo_producto = 'curso' AND o.usuario_id = (SELECT auth.uid()) AND o.estado <> 'cancelado';
$$;
REVOKE EXECUTE ON FUNCTION public.mis_pagos_cursos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_pagos_cursos() TO authenticated;
