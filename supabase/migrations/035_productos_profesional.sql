-- Migración: "Mis productos" del panel de la profesional.
-- La profesional dueña sube el archivo de cada producto al bucket privado
-- `productos/<clave>/…` (políticas de 034), lo asocia al producto y decide si
-- los compradores pueden descargarlo o solo verlo en la plataforma.

-- Reemplazar un archivo borra el anterior: la dueña puede borrar los suyos.
CREATE POLICY "Profesionales borran archivos de sus productos" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'productos' AND EXISTS (
        SELECT 1 FROM public.productos_digitales p
        WHERE p.clave = (storage.foldername(name))[1] AND p.profesional_id = public.mi_profesional_id()));

CREATE OR REPLACE FUNCTION public.mis_productos_profesional()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id, 'clave', p.clave, 'titulo', p.titulo, 'tipo', p.tipo, 'categoria', p.categoria,
        'precio', p.precio, 'moneda', p.moneda, 'estado', p.estado,
        'archivo', p.archivo_url, 'descargaPermitida', p.descarga_permitida,
        'ventas', (SELECT count(*) FROM public.compras_digitales c WHERE c.producto_id = p.id),
        'pagosEnRevision', (SELECT count(*) FROM public.pagos pg JOIN public.ordenes o ON o.id = pg.orden_id
                             WHERE o.tipo_producto = 'producto_digital' AND o.producto_id = p.id::text AND pg.estado = 'pendiente')
    ) ORDER BY p.clave), '[]'::jsonb)
    FROM public.productos_digitales p
    WHERE p.profesional_id = public.mi_profesional_id();
$$;
REVOKE EXECUTE ON FUNCTION public.mis_productos_profesional() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_productos_profesional() TO authenticated;

-- Asocia (o quita, con NULL) el archivo ya subido a productos/<clave>/…
CREATE OR REPLACE FUNCTION public.asignar_archivo_producto(p_producto_id INT, p_ruta TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_clave TEXT;
BEGIN
    SELECT clave INTO v_clave FROM public.productos_digitales
     WHERE id = p_producto_id AND profesional_id = public.mi_profesional_id();
    IF v_clave IS NULL THEN
        RAISE EXCEPTION 'No tienes permiso para modificar este producto.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_ruta IS NOT NULL AND (split_part(p_ruta, '/', 1) <> v_clave OR p_ruta NOT LIKE v_clave || '/_%'
        OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'productos' AND name = p_ruta)) THEN
        RAISE EXCEPTION 'El archivo no pertenece a este producto.' USING ERRCODE = 'check_violation';
    END IF;
    UPDATE public.productos_digitales SET archivo_url = p_ruta WHERE id = p_producto_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.asignar_archivo_producto(INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asignar_archivo_producto(INT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.cambiar_descarga_producto(p_producto_id INT, p_permitida BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.productos_digitales SET descarga_permitida = p_permitida
     WHERE id = p_producto_id AND profesional_id = public.mi_profesional_id();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes permiso para modificar este producto.' USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cambiar_descarga_producto(INT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_descarga_producto(INT, BOOLEAN) TO authenticated;
