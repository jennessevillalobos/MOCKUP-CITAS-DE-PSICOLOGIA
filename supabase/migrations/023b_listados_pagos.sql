-- Pagos del paciente con sesión, con el concepto legible (servicio y fecha de la cita).
CREATE OR REPLACE FUNCTION public.mis_pagos_paciente()
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'fecha', p.fecha,
        'monto', p.monto,
        'moneda', p.moneda,
        'metodo', p.metodo,
        'estado', p.estado,
        'referencia', p.referencia,
        'citaId', c.id,
        'concepto', COALESCE(s.nombre || ' · ' || to_char(c.fecha, 'DD/MM/YYYY') || ' ' || to_char(c.hora, 'HH24:MI'), o.concepto)
    ) ORDER BY p.fecha DESC), '[]'::jsonb)
    FROM public.pagos p
    LEFT JOIN public.ordenes o ON o.id = p.orden_id
    LEFT JOIN public.citas c ON o.tipo_producto = 'cita' AND c.id::text = o.producto_id
    LEFT JOIN public.servicios s ON s.id = c.servicio_id
    WHERE p.usuario_id = (SELECT auth.uid()) AND p.metodo <> 'reembolso';
$$;

-- Transferencias en revisión de las citas de la profesional con sesión.
CREATE OR REPLACE FUNCTION public.pagos_en_revision_profesional()
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'citaId', c.id,
        'monto', p.monto,
        'moneda', p.moneda,
        'referencia', p.referencia,
        'comprobante', p.comprobante_url,
        'fecha', p.fecha
    ) ORDER BY p.fecha), '[]'::jsonb)
    FROM public.pagos p
    JOIN public.ordenes o ON o.id = p.orden_id AND o.tipo_producto = 'cita'
    JOIN public.citas c ON c.id::text = o.producto_id
    WHERE p.estado = 'pendiente' AND p.metodo = 'transferencia' AND c.profesional_id = public.mi_profesional_id();
$$;

REVOKE EXECUTE ON FUNCTION public.mis_pagos_paciente(), public.pagos_en_revision_profesional() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_pagos_paciente(), public.pagos_en_revision_profesional() TO authenticated;
