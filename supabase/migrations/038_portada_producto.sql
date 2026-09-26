-- Migración: portada de los productos digitales (imagen pública en Cloudinary).
-- La sube la profesional dueña desde "Mis productos" (subida firmada por la
-- Edge Function `firmar-imagen`) y aquí solo se guarda la URL resultante.
-- NULL quita la portada.

CREATE OR REPLACE FUNCTION public.asignar_portada_producto(p_producto_id INT, p_url TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_url IS NOT NULL AND p_url !~ '^https://res\.cloudinary\.com/[a-z0-9_-]+/image/upload/' THEN
        RAISE EXCEPTION 'La portada debe ser una imagen subida a Cloudinary.' USING ERRCODE = 'check_violation';
    END IF;
    UPDATE public.productos_digitales SET portada = p_url
     WHERE id = p_producto_id AND profesional_id = public.mi_profesional_id();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes permiso para modificar este producto.' USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.asignar_portada_producto(INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asignar_portada_producto(INT, TEXT) TO authenticated;

-- "Mis productos" muestra la portada actual.
CREATE OR REPLACE FUNCTION public.mis_productos_profesional()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id, 'clave', p.clave, 'titulo', p.titulo, 'tipo', p.tipo, 'categoria', p.categoria,
        'precio', p.precio, 'moneda', p.moneda, 'estado', p.estado,
        'archivo', p.archivo_url, 'descargaPermitida', p.descarga_permitida, 'portada', p.portada,
        'ventas', (SELECT count(*) FROM public.compras_digitales c WHERE c.producto_id = p.id),
        'pagosEnRevision', (SELECT count(*) FROM public.pagos pg JOIN public.ordenes o ON o.id = pg.orden_id
                             WHERE o.tipo_producto = 'producto_digital' AND o.producto_id = p.id::text AND pg.estado = 'pendiente')
    ) ORDER BY p.clave), '[]'::jsonb)
    FROM public.productos_digitales p
    WHERE p.profesional_id = public.mi_profesional_id();
$$;
REVOKE EXECUTE ON FUNCTION public.mis_productos_profesional() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_productos_profesional() TO authenticated;
