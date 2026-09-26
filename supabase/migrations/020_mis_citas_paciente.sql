-- Migración: citas del paciente con sesión, con nombres legibles (servicio,
-- profesional, modalidad, sede) para el Portal Paciente. Corre con los permisos
-- del paciente: la RLS de citas limita a las suyas; servicios, modalidades,
-- lugares y profesionales_publicos son de lectura pública.

CREATE OR REPLACE FUNCTION public.mis_citas_paciente()
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'fecha', c.fecha,
        'hora', to_char(c.hora, 'HH24:MI'),
        'duracionMin', c.duracion_minutos,
        'estado', c.estado,
        'servicioId', c.servicio_id,
        'servicio', s.nombre,
        'profesionalId', c.profesional_id,
        'profesional', pp.nombre,
        'profesionalSlug', pp.slug,
        'modalidadId', c.modalidad_id,
        'modalidad', m.nombre,
        'lugar', CASE WHEN l.id IS NULL THEN NULL ELSE l.nombre || COALESCE(' — ' || l.direccion, '') END,
        'total', c.precio_total,
        'abonado', COALESCE(c.monto_abonado, 0),
        'moneda', c.moneda,
        'reprogramaciones', (SELECT count(*) FROM public.historial_citas h WHERE h.cita_id = c.id AND h.accion = 'reprogramada')
    ) ORDER BY c.fecha DESC, c.hora DESC), '[]'::jsonb)
    FROM public.citas c
    LEFT JOIN public.servicios s ON s.id = c.servicio_id
    LEFT JOIN public.profesionales_publicos pp ON pp.id = c.profesional_id
    LEFT JOIN public.modalidades m ON m.id = c.modalidad_id
    LEFT JOIN public.lugares l ON l.id = c.lugar_id
    WHERE c.usuario_id = (SELECT auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.mis_citas_paciente() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_citas_paciente() TO authenticated;
