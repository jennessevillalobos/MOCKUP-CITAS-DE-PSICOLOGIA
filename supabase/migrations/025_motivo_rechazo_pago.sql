-- Migración: el motivo con que la profesional rechaza una transferencia llega
-- al paciente (en la notificación y en su lista de pagos). Antes solo quedaba
-- en historial_citas, que el paciente no ve desde el portal.

ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT
    CHECK (motivo_rechazo IS NULL OR char_length(motivo_rechazo) <= 300);

-- revisar_pago: igual que en 022, pero guarda el motivo en el pago rechazado.
CREATE OR REPLACE FUNCTION public.revisar_pago(p_pago_id UUID, p_aprobar BOOLEAN, p_motivo TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pago RECORD; v_cita RECORD; v_abonado INT; v_saldo INT;
        v_motivo TEXT := NULLIF(left(btrim(p_motivo), 300), '');
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

-- notif_pagos: igual que en 023, pero el aviso de rechazo incluye el motivo.
CREATE OR REPLACE FUNCTION public.notif_pagos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prof INT; v_monto TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.estado = OLD.estado THEN RETURN NEW; END IF;
    SELECT ci.profesional_id INTO v_prof
      FROM public.ordenes o JOIN public.citas ci ON ci.id::text = o.producto_id
     WHERE o.id = NEW.orden_id AND o.tipo_producto = 'cita';
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
            '/portal-paciente', NULL);
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
            '/portal-paciente', NULL);
    END IF;
    RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notif_pagos() FROM PUBLIC, anon, authenticated;

-- mis_pagos_paciente: igual que en 023b, más el motivo del rechazo.
CREATE OR REPLACE FUNCTION public.mis_pagos_paciente()
RETURNS JSONB LANGUAGE sql STABLE SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'fecha', p.fecha,
        'monto', p.monto,
        'moneda', p.moneda,
        'metodo', p.metodo,
        'estado', p.estado,
        'referencia', p.referencia,
        'motivoRechazo', p.motivo_rechazo,
        'citaId', c.id,
        'concepto', COALESCE(s.nombre || ' · ' || to_char(c.fecha, 'DD/MM/YYYY') || ' ' || to_char(c.hora, 'HH24:MI'), o.concepto)
    ) ORDER BY p.fecha DESC), '[]'::jsonb)
    FROM public.pagos p
    LEFT JOIN public.ordenes o ON o.id = p.orden_id
    LEFT JOIN public.citas c ON o.tipo_producto = 'cita' AND c.id::text = o.producto_id
    LEFT JOIN public.servicios s ON s.id = c.servicio_id
    WHERE p.usuario_id = (SELECT auth.uid()) AND p.metodo <> 'reembolso';
$$;
