-- ── 1. Comprobantes de transferencia: bucket privado ──
-- El paciente sube a su carpeta <uid>/; la profesional de la cita lo puede ver.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('comprobantes', 'comprobantes', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Pacientes suben sus comprobantes" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Pacientes ven sus comprobantes" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Profesionales ven comprobantes de sus citas" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'comprobantes' AND EXISTS (
        SELECT 1 FROM public.pagos p
        JOIN public.ordenes o ON o.id = p.orden_id AND o.tipo_producto = 'cita'
        JOIN public.citas c ON c.id::text = o.producto_id
        WHERE p.comprobante_url = storage.objects.name AND c.profesional_id = public.mi_profesional_id()
    ));

-- ── 2. El profesional ve los pagos de sus citas ──
CREATE POLICY "Profesionales ven pagos de sus citas" ON public.pagos FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ordenes o JOIN public.citas c ON c.id::text = o.producto_id
        WHERE o.id = pagos.orden_id AND o.tipo_producto = 'cita' AND c.profesional_id = public.mi_profesional_id()
    ));

-- ── 3. El paciente reporta una transferencia de su cita ──
CREATE OR REPLACE FUNCTION public.reportar_pago_transferencia(p_cita_id UUID, p_monto INT, p_referencia TEXT, p_comprobante TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cita RECORD; v_orden UUID; v_pago UUID; v_en_revision INT;
BEGIN
    SELECT * INTO v_cita FROM public.citas WHERE id = p_cita_id AND usuario_id = (SELECT auth.uid());
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró la cita.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF v_cita.estado NOT IN ('pendiente_pago', 'parcialmente_pagada') THEN
        RAISE EXCEPTION 'Esta cita no tiene pagos pendientes.' USING ERRCODE = 'check_violation';
    END IF;
    -- Lo ya reportado y aún en revisión cuenta contra el saldo.
    SELECT COALESCE(sum(p.monto), 0) INTO v_en_revision
      FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
     WHERE o.producto_id = p_cita_id::text AND p.estado = 'pendiente' AND p.metodo = 'transferencia';
    IF p_monto IS NULL OR p_monto <= 0 OR p_monto > v_cita.saldo_pendiente - v_en_revision THEN
        RAISE EXCEPTION 'El monto debe ser mayor a 0 y no superar el saldo pendiente.' USING ERRCODE = 'check_violation';
    END IF;
    IF p_comprobante IS NOT NULL AND split_part(p_comprobante, '/', 1) <> (SELECT auth.uid())::text THEN
        RAISE EXCEPTION 'Comprobante inválido.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT id INTO v_orden FROM public.ordenes WHERE tipo_producto = 'cita' AND producto_id = p_cita_id::text ORDER BY fecha_creacion LIMIT 1;
    IF v_orden IS NULL THEN
        INSERT INTO public.ordenes (usuario_id, concepto, tipo_producto, producto_id, monto, moneda)
        VALUES (v_cita.usuario_id, 'Cita psicológica', 'cita', p_cita_id::text, v_cita.precio_total, v_cita.moneda)
        RETURNING id INTO v_orden;
    END IF;

    INSERT INTO public.pagos (orden_id, usuario_id, monto, moneda, metodo, referencia, comprobante_url, estado)
    VALUES (v_orden, v_cita.usuario_id, p_monto, v_cita.moneda, 'transferencia', NULLIF(trim(p_referencia), ''), p_comprobante, 'pendiente')
    RETURNING id INTO v_pago;
    RETURN v_pago;
END;
$$;

-- ── 4. La profesional aprueba o rechaza el pago ──
CREATE OR REPLACE FUNCTION public.revisar_pago(p_pago_id UUID, p_aprobar BOOLEAN, p_motivo TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pago RECORD; v_cita RECORD; v_abonado INT; v_saldo INT;
BEGIN
    SELECT p.* INTO v_pago FROM public.pagos p WHERE p.id = p_pago_id;
    IF NOT FOUND OR v_pago.estado <> 'pendiente' THEN
        RAISE EXCEPTION 'El pago no existe o ya fue revisado.' USING ERRCODE = 'check_violation';
    END IF;
    SELECT c.* INTO v_cita FROM public.citas c JOIN public.ordenes o ON c.id::text = o.producto_id AND o.tipo_producto = 'cita'
     WHERE o.id = v_pago.orden_id;
    IF NOT FOUND OR v_cita.profesional_id IS DISTINCT FROM public.mi_profesional_id() THEN
        RAISE EXCEPTION 'No tienes permiso para revisar este pago.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NOT p_aprobar THEN
        UPDATE public.pagos SET estado = 'rechazado' WHERE id = p_pago_id;
        INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_nuevos, motivo)
        VALUES (v_cita.id, (SELECT auth.uid()), 'pago_rechazado', jsonb_build_object('pago_id', p_pago_id, 'monto', v_pago.monto), p_motivo);
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
            jsonb_build_object('monto_abonado', v_abonado, 'saldo_pendiente', v_saldo, 'pago_id', p_pago_id), p_motivo);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reportar_pago_transferencia(UUID, INT, TEXT, TEXT), public.revisar_pago(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reportar_pago_transferencia(UUID, INT, TEXT, TEXT), public.revisar_pago(UUID, BOOLEAN, TEXT) TO authenticated;
