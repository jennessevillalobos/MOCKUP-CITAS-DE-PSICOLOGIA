-- 042 · Ajuste del reembolso del admin (041): un reembolso PARCIAL no quita
-- el acceso a cursos ni productos, y en una cita no se cambia el estado
-- (validar_transicion_estado_cita no permite confirmada → pendiente_pago).

-- Reembolso de un pago aprobado (decidido con la usuaria). El dinero se
-- devuelve por fuera; aquí se registra y se ajusta: en una cita se descuenta
-- lo abonado y vuelve a quedar saldo (su estado no cambia: si hace falta se
-- cancela con el flujo normal); en un curso o producto, SOLO un reembolso
-- total quita el acceso (y solo si lo cobrado neto ya no cubre el precio).
CREATE OR REPLACE FUNCTION public.admin_reembolsar_pago(p_pago_id UUID, p_monto INT, p_motivo TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_pago RECORD; v_orden RECORD; v_cita RECORD;
    v_ya INT; v_disponible INT; v_neto INT; v_abonado INT; v_saldo INT;
    v_motivo TEXT := NULLIF(left(btrim(p_motivo), 300), '');
    v_monto_txt TEXT;
    v_total BOOLEAN;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF v_motivo IS NULL THEN
        RAISE EXCEPTION 'Indica el motivo del reembolso.';
    END IF;
    SELECT * INTO v_pago FROM public.pagos WHERE id = p_pago_id FOR UPDATE;
    IF NOT FOUND OR v_pago.estado <> 'aprobado' THEN
        RAISE EXCEPTION 'Solo se reembolsan pagos aprobados.';
    END IF;
    SELECT COALESCE(sum(monto), 0) INTO v_ya FROM public.reembolsos WHERE pago_id = p_pago_id AND estado = 'completado';
    v_disponible := v_pago.monto - v_ya;
    IF p_monto IS NULL OR p_monto <= 0 OR p_monto > v_disponible THEN
        RAISE EXCEPTION 'El monto del reembolso debe estar entre 0,01 y %.', trim_scale(v_disponible / 100.0);
    END IF;

    v_total := p_monto = v_disponible;
    INSERT INTO public.reembolsos (pago_id, monto, motivo, estado) VALUES (p_pago_id, p_monto, v_motivo, 'completado');
    IF v_total THEN
        UPDATE public.pagos SET estado = 'reembolsado' WHERE id = p_pago_id;
    END IF;

    SELECT * INTO v_orden FROM public.ordenes WHERE id = v_pago.orden_id;
    -- Neto cobrado en la orden: pagos aprobados/reembolsados menos reembolsos.
    SELECT COALESCE(sum(p.monto), 0) - COALESCE((
               SELECT sum(r.monto) FROM public.reembolsos r JOIN public.pagos p2 ON p2.id = r.pago_id
                WHERE p2.orden_id = v_orden.id AND r.estado = 'completado'), 0)
      INTO v_neto
      FROM public.pagos p WHERE p.orden_id = v_orden.id AND p.estado IN ('aprobado', 'reembolsado');

    IF v_orden.tipo_producto = 'cita' THEN
        SELECT * INTO v_cita FROM public.citas WHERE id::text = v_orden.producto_id;
        IF FOUND THEN
            v_abonado := GREATEST(0, COALESCE(v_cita.monto_abonado, 0) - p_monto);
            v_saldo := GREATEST(0, v_cita.precio_total - v_abonado);
            UPDATE public.citas SET monto_abonado = v_abonado, saldo_pendiente = v_saldo WHERE id = v_cita.id;
            INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_anteriores, datos_nuevos, motivo)
            VALUES (v_cita.id, auth.uid(), 'reembolso_emitido',
                    jsonb_build_object('monto_abonado', v_cita.monto_abonado, 'estado', v_cita.estado),
                    jsonb_build_object('monto_abonado', v_abonado, 'saldo_pendiente', v_saldo, 'reembolso', p_monto), v_motivo);
        END IF;
    ELSIF v_total AND v_orden.tipo_producto IN ('curso', 'producto_digital') AND v_orden.producto_id ~ '^[0-9]+$' AND v_neto < v_orden.monto THEN
        IF v_orden.tipo_producto = 'curso' THEN
            UPDATE public.inscripciones SET estado = 'suspendida'
             WHERE usuario_id = v_orden.usuario_id AND curso_id = v_orden.producto_id::int;
        ELSE
            DELETE FROM public.compras_digitales WHERE usuario_id = v_orden.usuario_id AND producto_id = v_orden.producto_id::int;
        END IF;
        DELETE FROM public.derechos_acceso
         WHERE usuario_id = v_orden.usuario_id AND tipo_recurso = v_orden.tipo_producto AND recurso_id = v_orden.producto_id::int;
    END IF;

    -- La orden refleja el cobro neto: sin nada cobrado queda reembolsada; en una
    -- cita con saldo, pendiente; en curso/producto solo cambia con reembolso total.
    UPDATE public.ordenes
       SET estado = CASE
               WHEN v_neto <= 0 THEN 'reembolsado'
               WHEN v_neto < monto AND (tipo_producto = 'cita' OR v_total) THEN 'pendiente'
               ELSE estado END
     WHERE id = v_orden.id;

    v_monto_txt := trim_scale(p_monto / 100.0)::text || ' ' || COALESCE(v_pago.moneda, '');
    PERFORM public.notificar(v_orden.usuario_id, 'pago',
        'Se registró un reembolso de ' || v_monto_txt || ' por ' || COALESCE(v_orden.concepto, 'tu pago') || '. Motivo: ' || v_motivo || '.',
        'A refund of ' || v_monto_txt || ' was issued for ' || COALESCE(v_orden.concepto, 'your payment') || '. Reason: ' || v_motivo || '.',
        CASE v_orden.tipo_producto WHEN 'curso' THEN '/aula-virtual/pagos' WHEN 'producto_digital' THEN '/aula-virtual/biblioteca' ELSE '/portal-paciente' END,
        NULL);
END;
$$;
