-- Migración: Tienda y Biblioteca con compra por transferencia (P5b-2).
-- Decidido con la usuaria:
--   · El catálogo que manda es el del sitio (src/data/admin/digitalProductsData.ts):
--     se reemplazan los 3 productos de prueba (COP, sin archivo ni compras)
--     por los 5 del sitio, en USD, identificados por `clave` (pd1…pd5).
--   · Cada producto tiene una profesional (`profesional_id`) que aprueba sus
--     transferencias en "Transferencias por revisar", como citas y cursos.
--     Por ahora todos son de la Dra. Ana Rivas (única profesional con acceso).
--   · Archivos en el bucket privado `productos/<clave>/…`: los sube la
--     profesional dueña y solo los lee quien compró el producto.

-- ── 1. Catálogo ──
ALTER TABLE public.productos_digitales
    ADD COLUMN IF NOT EXISTS clave TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS categoria TEXT,
    ADD COLUMN IF NOT EXISTS profesional_id INT REFERENCES public.profesionales(id),
    ADD COLUMN IF NOT EXISTS descarga_permitida BOOLEAN NOT NULL DEFAULT TRUE;

DELETE FROM public.productos_digitales WHERE clave IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.compras_digitales c WHERE c.producto_id = productos_digitales.id);

INSERT INTO public.productos_digitales (clave, tipo, titulo, slug, descripcion, precio, moneda, estado, categoria, profesional_id, descarga_permitida) VALUES
    ('pd1', 'libro_pdf', 'Vínculos sanos', 'vinculos-sanos', 'Libro digital sobre apego y relaciones saludables.', 1400, 'USD', 'activo', 'Relaciones', 4, TRUE),
    ('pd2', 'libro_pdf', 'Guía de manejo de ansiedad', 'guia-manejo-ansiedad', 'Guía práctica en PDF con ejercicios de respiración y grounding.', 900, 'USD', 'activo', 'Bienestar', 4, TRUE),
    ('pd3', 'video', 'Meditaciones guiadas · Vol. 1', 'meditaciones-guiadas-vol-1', 'Serie de video-meditaciones guiadas de 10 a 20 minutos.', 1200, 'USD', 'activo', 'Bienestar', 4, FALSE),
    ('pd4', 'video', 'Taller: Diario emocional', 'taller-diario-emocional', 'Grabación del taller en video con plantilla descargable.', 600, 'USD', 'activo', 'Autoconocimiento', 4, FALSE),
    ('pd5', 'libro_pdf', 'Guía de comunicación en pareja', 'guia-comunicacion-pareja', 'Borrador de guía sobre comunicación asertiva en pareja.', 900, 'USD', 'inactivo', 'Relaciones', 4, TRUE)
ON CONFLICT (clave) DO NOTHING;

-- Una compra por persona y producto.
CREATE UNIQUE INDEX IF NOT EXISTS compras_digitales_usuario_producto_uniq ON public.compras_digitales (usuario_id, producto_id);

-- La profesional dueña ve sus productos aunque estén inactivos.
CREATE POLICY "Profesionales ven sus productos" ON public.productos_digitales FOR SELECT TO authenticated
    USING (profesional_id = public.mi_profesional_id());

-- ── 2. Archivos: bucket privado productos/<clave>/… ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('productos', 'productos', false, 52428800,
        ARRAY['application/pdf', 'application/epub+zip', 'video/mp4', 'video/webm', 'audio/mpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Profesionales suben archivos de sus productos" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'productos' AND EXISTS (
        SELECT 1 FROM public.productos_digitales p
        WHERE p.clave = (storage.foldername(name))[1] AND p.profesional_id = public.mi_profesional_id()));
CREATE POLICY "Profesionales actualizan archivos de sus productos" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'productos' AND EXISTS (
        SELECT 1 FROM public.productos_digitales p
        WHERE p.clave = (storage.foldername(name))[1] AND p.profesional_id = public.mi_profesional_id()));
CREATE POLICY "Profesionales y compradores leen archivos de productos" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'productos' AND EXISTS (
        SELECT 1 FROM public.productos_digitales p
        WHERE p.clave = (storage.foldername(name))[1]
          AND (p.profesional_id = public.mi_profesional_id()
               OR EXISTS (SELECT 1 FROM public.compras_digitales c WHERE c.producto_id = p.id AND c.usuario_id = (SELECT auth.uid())))));

-- ── 3. Órdenes, pagos y comprobantes de productos para su profesional ──
CREATE OR REPLACE FUNCTION public.es_mi_producto(p_producto_id INT)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.productos_digitales WHERE id = p_producto_id AND profesional_id = public.mi_profesional_id());
$$;

CREATE POLICY "Profesionales ven ordenes de sus productos" ON public.ordenes FOR SELECT TO authenticated
    USING (tipo_producto = 'producto_digital' AND producto_id ~ '^[0-9]+$' AND public.es_mi_producto(producto_id::int));
CREATE POLICY "Profesionales ven pagos de sus productos" ON public.pagos FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ordenes o
        WHERE o.id = pagos.orden_id AND o.tipo_producto = 'producto_digital' AND o.producto_id ~ '^[0-9]+$'
          AND public.es_mi_producto(o.producto_id::int)));
CREATE POLICY "Profesionales ven comprobantes de sus productos" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'comprobantes' AND EXISTS (
        SELECT 1 FROM public.pagos p
        JOIN public.ordenes o ON o.id = p.orden_id AND o.tipo_producto = 'producto_digital' AND o.producto_id ~ '^[0-9]+$'
        WHERE p.comprobante_url = storage.objects.name AND public.es_mi_producto(o.producto_id::int)));

-- ── 4. Estado de compra (Tienda) ──
CREATE OR REPLACE FUNCTION public.estado_compra_producto(p_clave TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prod RECORD; v_uid UUID := (SELECT auth.uid()); v_aprobado INT := 0; v_revision INT := 0;
BEGIN
    SELECT id, titulo, precio, moneda INTO v_prod FROM public.productos_digitales WHERE clave = p_clave AND estado = 'activo';
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF v_uid IS NOT NULL THEN
        SELECT COALESCE(sum(p.monto) FILTER (WHERE p.estado = 'aprobado'), 0),
               COALESCE(sum(p.monto) FILTER (WHERE p.estado = 'pendiente'), 0)
          INTO v_aprobado, v_revision
          FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
         WHERE o.tipo_producto = 'producto_digital' AND o.producto_id = v_prod.id::text AND o.usuario_id = v_uid;
    END IF;
    RETURN jsonb_build_object(
        'productoId', v_prod.id, 'titulo', v_prod.titulo,
        'precio', COALESCE(v_prod.precio, 0), 'moneda', COALESCE(v_prod.moneda, 'USD'),
        'comprado', v_uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.compras_digitales WHERE producto_id = v_prod.id AND usuario_id = v_uid),
        'pagado', v_aprobado, 'enRevision', v_revision
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.estado_compra_producto(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estado_compra_producto(TEXT) TO anon, authenticated;

-- ── 5. Reportar la transferencia de un producto ──
CREATE OR REPLACE FUNCTION public.reportar_pago_producto(p_producto_id INT, p_monto INT, p_referencia TEXT, p_comprobante TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prod RECORD; v_uid UUID := (SELECT auth.uid()); v_orden UUID; v_pago UUID; v_cubierto INT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para pagar.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    SELECT * INTO v_prod FROM public.productos_digitales WHERE id = p_producto_id AND estado = 'activo';
    IF NOT FOUND OR COALESCE(v_prod.precio, 0) <= 0 THEN
        RAISE EXCEPTION 'Este producto no admite pagos.' USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM public.compras_digitales WHERE producto_id = p_producto_id AND usuario_id = v_uid) THEN
        RAISE EXCEPTION 'Ya compraste este producto.' USING ERRCODE = 'check_violation';
    END IF;
    IF p_comprobante IS NOT NULL AND split_part(p_comprobante, '/', 1) <> v_uid::text THEN
        RAISE EXCEPTION 'Comprobante inválido.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT id INTO v_orden FROM public.ordenes
     WHERE tipo_producto = 'producto_digital' AND producto_id = p_producto_id::text AND usuario_id = v_uid AND estado = 'pendiente'
     ORDER BY fecha_creacion LIMIT 1;
    IF v_orden IS NULL THEN
        INSERT INTO public.ordenes (usuario_id, concepto, tipo_producto, producto_id, monto, moneda)
        VALUES (v_uid, 'Producto: ' || v_prod.titulo, 'producto_digital', p_producto_id::text, v_prod.precio, COALESCE(v_prod.moneda, 'USD'))
        RETURNING id INTO v_orden;
    END IF;

    SELECT COALESCE(sum(monto), 0) INTO v_cubierto FROM public.pagos WHERE orden_id = v_orden AND estado IN ('aprobado', 'pendiente');
    IF p_monto IS NULL OR p_monto <= 0 OR p_monto > v_prod.precio - v_cubierto THEN
        RAISE EXCEPTION 'El monto debe ser mayor a 0 y no superar el saldo del producto.' USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.pagos (orden_id, usuario_id, monto, moneda, metodo, referencia, comprobante_url, estado)
    VALUES (v_orden, v_uid, p_monto, COALESCE(v_prod.moneda, 'USD'), 'transferencia', NULLIF(trim(p_referencia), ''), p_comprobante, 'pendiente')
    RETURNING id INTO v_pago;
    RETURN v_pago;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reportar_pago_producto(INT, INT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reportar_pago_producto(INT, INT, TEXT, TEXT) TO authenticated;

-- ── 6. revisar_pago: citas (025), cursos (027) y productos ──
CREATE OR REPLACE FUNCTION public.revisar_pago(p_pago_id UUID, p_aprobar BOOLEAN, p_motivo TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pago RECORD; v_orden RECORD; v_cita RECORD; v_abonado INT; v_saldo INT; v_aprobado INT;
        v_motivo TEXT := NULLIF(left(btrim(p_motivo), 300), '');
BEGIN
    SELECT p.* INTO v_pago FROM public.pagos p WHERE p.id = p_pago_id;
    IF NOT FOUND OR v_pago.estado <> 'pendiente' THEN
        RAISE EXCEPTION 'El pago no existe o ya fue revisado.' USING ERRCODE = 'check_violation';
    END IF;
    SELECT o.* INTO v_orden FROM public.ordenes o WHERE o.id = v_pago.orden_id;

    -- Pago de un curso o de un producto digital
    IF v_orden.tipo_producto IN ('curso', 'producto_digital') THEN
        IF v_orden.producto_id !~ '^[0-9]+$' OR NOT (
            (v_orden.tipo_producto = 'curso' AND EXISTS (
                SELECT 1 FROM public.cursos c WHERE c.id = v_orden.producto_id::int AND c.profesional_id = public.mi_profesional_id()))
            OR (v_orden.tipo_producto = 'producto_digital' AND public.es_mi_producto(v_orden.producto_id::int))
        ) THEN
            RAISE EXCEPTION 'No tienes permiso para revisar este pago.' USING ERRCODE = 'insufficient_privilege';
        END IF;
        IF NOT p_aprobar THEN
            UPDATE public.pagos SET estado = 'rechazado', motivo_rechazo = v_motivo WHERE id = p_pago_id;
            RETURN;
        END IF;
        UPDATE public.pagos SET estado = 'aprobado' WHERE id = p_pago_id;
        SELECT COALESCE(sum(monto), 0) INTO v_aprobado FROM public.pagos WHERE orden_id = v_orden.id AND estado = 'aprobado';
        IF v_aprobado >= v_orden.monto THEN
            UPDATE public.ordenes SET estado = 'pagado' WHERE id = v_orden.id;
            IF v_orden.tipo_producto = 'curso' THEN
                INSERT INTO public.inscripciones (usuario_id, curso_id, tipo_acceso, estado)
                VALUES (v_orden.usuario_id, v_orden.producto_id::int, 'completo', 'activa')
                ON CONFLICT (usuario_id, curso_id) DO UPDATE SET estado = 'activa';
            ELSE
                INSERT INTO public.compras_digitales (usuario_id, producto_id, pago_id)
                VALUES (v_orden.usuario_id, v_orden.producto_id::int, p_pago_id)
                ON CONFLICT (usuario_id, producto_id) DO NOTHING;
            END IF;
        END IF;
        RETURN;
    END IF;

    -- Pago de una cita
    SELECT c.* INTO v_cita FROM public.citas c WHERE v_orden.tipo_producto = 'cita' AND c.id::text = v_orden.producto_id;
    IF NOT FOUND OR v_cita.profesional_id IS DISTINCT FROM public.mi_profesional_id() THEN
        RAISE EXCEPTION 'No tienes permiso para revisar este pago.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NOT p_aprobar THEN
        UPDATE public.pagos SET estado = 'rechazado', motivo_rechazo = v_motivo WHERE id = p_pago_id;
        INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_nuevos, motivo)
        VALUES (v_cita.id, (SELECT auth.uid()), 'pago_rechazado', jsonb_build_object('pago_id', p_pago_id, 'monto', v_pago.monto), v_motivo);
        RETURN;
    END IF;

    v_abonado := COALESCE(v_cita.monto_abonado, 0) + v_pago.monto;
    v_saldo := GREATEST(0, v_cita.precio_total - v_abonado);
    UPDATE public.pagos SET estado = 'aprobado' WHERE id = p_pago_id;
    UPDATE public.citas SET monto_abonado = v_abonado, saldo_pendiente = v_saldo,
        estado = CASE WHEN v_cita.estado IN ('pendiente_pago', 'parcialmente_pagada')
                      THEN CASE WHEN v_saldo = 0 THEN 'confirmada' ELSE 'parcialmente_pagada' END
                      ELSE v_cita.estado END
     WHERE id = v_cita.id;
    IF v_saldo = 0 THEN
        UPDATE public.ordenes SET estado = 'pagado' WHERE id = v_pago.orden_id;
    END IF;
    INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_anteriores, datos_nuevos, motivo)
    VALUES (v_cita.id, (SELECT auth.uid()), CASE WHEN v_saldo = 0 THEN 'confirmada' ELSE 'pago_registrado' END,
            jsonb_build_object('monto_abonado', v_cita.monto_abonado, 'estado', v_cita.estado),
            jsonb_build_object('monto_abonado', v_abonado, 'saldo_pendiente', v_saldo, 'pago_id', p_pago_id), v_motivo);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revisar_pago(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revisar_pago(UUID, BOOLEAN, TEXT) TO authenticated;

-- ── 7. Transferencias por revisar: citas, cursos y productos ──
CREATE OR REPLACE FUNCTION public.pagos_en_revision_profesional()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(x.fila ORDER BY x.fecha), '[]'::jsonb) FROM (
        SELECT p.fecha, jsonb_build_object(
            'id', p.id, 'tipo', 'cita', 'citaId', c.id, 'cursoId', NULL,
            'monto', p.monto, 'moneda', p.moneda, 'referencia', p.referencia, 'comprobante', p.comprobante_url, 'fecha', p.fecha,
            'alumno', public.nombre_usuario(p.usuario_id),
            'concepto', COALESCE(s.nombre, 'Cita') || ' · ' || to_char(c.fecha, 'DD/MM/YYYY') || ' ' || to_char(c.hora, 'HH24:MI')
        ) AS fila
        FROM public.pagos p
        JOIN public.ordenes o ON o.id = p.orden_id AND o.tipo_producto = 'cita'
        JOIN public.citas c ON c.id::text = o.producto_id
        LEFT JOIN public.servicios s ON s.id = c.servicio_id
        WHERE p.estado = 'pendiente' AND p.metodo = 'transferencia' AND c.profesional_id = public.mi_profesional_id()
        UNION ALL
        SELECT p.fecha, jsonb_build_object(
            'id', p.id, 'tipo', 'curso', 'citaId', NULL, 'cursoId', cu.id,
            'monto', p.monto, 'moneda', p.moneda, 'referencia', p.referencia, 'comprobante', p.comprobante_url, 'fecha', p.fecha,
            'alumno', public.nombre_usuario(p.usuario_id),
            'concepto', 'Curso: ' || cu.nombre
        )
        FROM public.pagos p
        JOIN public.ordenes o ON o.id = p.orden_id AND o.tipo_producto = 'curso' AND o.producto_id ~ '^[0-9]+$'
        JOIN public.cursos cu ON cu.id = o.producto_id::int
        WHERE p.estado = 'pendiente' AND p.metodo = 'transferencia' AND cu.profesional_id = public.mi_profesional_id()
        UNION ALL
        SELECT p.fecha, jsonb_build_object(
            'id', p.id, 'tipo', 'producto', 'citaId', NULL, 'cursoId', NULL,
            'monto', p.monto, 'moneda', p.moneda, 'referencia', p.referencia, 'comprobante', p.comprobante_url, 'fecha', p.fecha,
            'alumno', public.nombre_usuario(p.usuario_id),
            'concepto', 'Producto: ' || pd.titulo
        )
        FROM public.pagos p
        JOIN public.ordenes o ON o.id = p.orden_id AND o.tipo_producto = 'producto_digital' AND o.producto_id ~ '^[0-9]+$'
        JOIN public.productos_digitales pd ON pd.id = o.producto_id::int
        WHERE p.estado = 'pendiente' AND p.metodo = 'transferencia' AND pd.profesional_id = public.mi_profesional_id()
    ) x;
$$;
REVOKE EXECUTE ON FUNCTION public.pagos_en_revision_profesional() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagos_en_revision_profesional() TO authenticated;

-- ── 8. Biblioteca del estudiante ──
CREATE OR REPLACE FUNCTION public.mi_biblioteca()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'compraId', c.id, 'fecha', c.fecha,
        'productoId', p.id, 'clave', p.clave, 'titulo', p.titulo, 'descripcion', p.descripcion,
        'tipo', p.tipo, 'categoria', p.categoria, 'portada', p.portada,
        'descargaPermitida', p.descarga_permitida,
        'archivo', p.archivo_url,
        'autora', public.nombre_usuario(public.usuario_de_profesional(p.profesional_id)),
        'monto', (SELECT o.monto FROM public.pagos pg JOIN public.ordenes o ON o.id = pg.orden_id WHERE pg.id = c.pago_id)
    ) ORDER BY c.fecha DESC), '[]'::jsonb)
    FROM public.compras_digitales c
    JOIN public.productos_digitales p ON p.id = c.producto_id
    WHERE c.usuario_id = (SELECT auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.mi_biblioteca() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_biblioteca() TO authenticated;

-- ── 9. Notificaciones de pagos: también productos (link a la Biblioteca) ──
CREATE OR REPLACE FUNCTION public.notif_pagos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prof INT; v_monto TEXT; v_tipo TEXT; v_link_alumno TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.estado = OLD.estado THEN RETURN NEW; END IF;
    SELECT o.tipo_producto,
           CASE o.tipo_producto
               WHEN 'cita' THEN (SELECT ci.profesional_id FROM public.citas ci WHERE ci.id::text = o.producto_id)
               WHEN 'curso' THEN (SELECT cu.profesional_id FROM public.cursos cu WHERE o.producto_id ~ '^[0-9]+$' AND cu.id = o.producto_id::int)
               WHEN 'producto_digital' THEN (SELECT pd.profesional_id FROM public.productos_digitales pd WHERE o.producto_id ~ '^[0-9]+$' AND pd.id = o.producto_id::int)
           END
      INTO v_tipo, v_prof
      FROM public.ordenes o WHERE o.id = NEW.orden_id;
    v_link_alumno := CASE v_tipo WHEN 'curso' THEN '/aula-virtual' WHEN 'producto_digital' THEN '/aula-virtual/biblioteca' ELSE '/portal-paciente' END;
    v_monto := trim_scale(NEW.monto / 100.0)::text || ' ' || COALESCE(NEW.moneda, '');

    IF NEW.estado = 'pendiente' AND NEW.metodo = 'transferencia' AND TG_OP = 'INSERT' THEN
        PERFORM public.notificar(public.usuario_de_profesional(v_prof), 'pago',
            public.nombre_usuario(NEW.usuario_id) || ' reportó una transferencia de ' || v_monto || ' pendiente de revisión.',
            public.nombre_usuario(NEW.usuario_id) || ' reported a ' || v_monto || ' transfer pending review.',
            '/instructor/citas', NULL);
    ELSIF NEW.estado = 'aprobado' THEN
        PERFORM public.notificar(NEW.usuario_id, 'pago',
            'Tu pago de ' || v_monto || ' fue aprobado.',
            'Your ' || v_monto || ' payment was approved.',
            v_link_alumno, NULL);
        IF NEW.metodo IN ('stripe', 'paypal') AND v_prof IS NOT NULL THEN
            PERFORM public.notificar(public.usuario_de_profesional(v_prof), 'pago',
                'Pago recibido de ' || public.nombre_usuario(NEW.usuario_id) || ' por ' || v_monto || '.',
                'Payment received from ' || public.nombre_usuario(NEW.usuario_id) || ' for ' || v_monto || '.',
                '/instructor/citas', NULL);
        END IF;
    ELSIF NEW.estado = 'rechazado' AND NEW.metodo = 'transferencia' THEN
        PERFORM public.notificar(NEW.usuario_id, 'pago',
            'Tu pago de ' || v_monto || ' fue rechazado.'
                || COALESCE(' Motivo: ' || NEW.motivo_rechazo || '.', ' Revisa los datos de la transferencia o contacta a tu profesional.'),
            'Your ' || v_monto || ' payment was rejected.'
                || COALESCE(' Reason: ' || NEW.motivo_rechazo || '.', ' Check the transfer details or contact your professional.'),
            v_link_alumno, NULL);
    END IF;
    RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notif_pagos() FROM PUBLIC, anon, authenticated;
