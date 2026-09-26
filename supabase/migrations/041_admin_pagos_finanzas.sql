-- 041 · Panel admin A3: Pagos y Finanzas.
-- El admin (además de la profesional dueña) aprueba o rechaza transferencias,
-- ve comprobantes, registra reembolsos (con ajuste de acceso) y abonos
-- manuales, y administra monedas y tasas de cambio.

-- revisar_pago: igual que en la 034, pero también la puede usar un administrador.
CREATE OR REPLACE FUNCTION public.revisar_pago(p_pago_id uuid, p_aprobar boolean, p_motivo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_pago RECORD; v_orden RECORD; v_cita RECORD; v_abonado INT; v_saldo INT; v_aprobado INT;
        v_motivo TEXT := NULLIF(left(btrim(p_motivo), 300), '');
        v_admin BOOLEAN := public.es_admin();
BEGIN
    SELECT p.* INTO v_pago FROM public.pagos p WHERE p.id = p_pago_id;
    IF NOT FOUND OR v_pago.estado <> 'pendiente' THEN
        RAISE EXCEPTION 'El pago no existe o ya fue revisado.' USING ERRCODE = 'check_violation';
    END IF;
    SELECT o.* INTO v_orden FROM public.ordenes o WHERE o.id = v_pago.orden_id;

    -- Pago de un curso o de un producto digital
    IF v_orden.tipo_producto IN ('curso', 'producto_digital') THEN
        IF v_orden.producto_id !~ '^[0-9]+$' OR NOT (
            v_admin
            OR (v_orden.tipo_producto = 'curso' AND EXISTS (
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
    IF NOT FOUND OR NOT (v_admin OR v_cita.profesional_id IS NOT DISTINCT FROM public.mi_profesional_id()) THEN
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
$function$;

-- El admin puede ver cualquier comprobante (bucket privado).
DROP POLICY IF EXISTS "Administradores ven comprobantes" ON storage.objects;
CREATE POLICY "Administradores ven comprobantes" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'comprobantes' AND public.es_admin());

-- Todos los pagos con cliente, concepto, profesional responsable y reembolsos.
CREATE OR REPLACE FUNCTION public.admin_listar_pagos()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    RETURN COALESCE((
        SELECT json_agg(f ORDER BY f.fecha DESC)
        FROM (
            SELECT
                p.id,
                p.orden_id AS "ordenId",
                COALESCE(NULLIF(u.nombre, ''), u.email) AS cliente,
                u.email AS correo,
                COALESCE(o.concepto, 'Pago') AS concepto,
                o.tipo_producto AS tipo,
                p.metodo,
                p.monto,
                p.moneda,
                p.fecha,
                p.estado,
                p.referencia,
                p.comprobante_url AS comprobante,
                p.motivo_rechazo AS "motivoRechazo",
                (SELECT COALESCE(sum(r.monto), 0) FROM public.reembolsos r WHERE r.pago_id = p.id AND r.estado = 'completado') AS reembolsado,
                (SELECT json_agg(json_build_object('monto', r.monto, 'motivo', r.motivo, 'fecha', r.fecha) ORDER BY r.fecha)
                   FROM public.reembolsos r WHERE r.pago_id = p.id AND r.estado = 'completado') AS reembolsos,
                (SELECT COALESCE(NULLIF(pu.nombre, ''), pu.email)
                   FROM public.profesionales pr JOIN public.usuarios pu ON pu.id = pr.usuario_id
                  WHERE pr.id = CASE o.tipo_producto
                        WHEN 'cita' THEN (SELECT ci.profesional_id FROM public.citas ci WHERE ci.id::text = o.producto_id)
                        WHEN 'curso' THEN (SELECT cu.profesional_id FROM public.cursos cu WHERE o.producto_id ~ '^[0-9]+$' AND cu.id = o.producto_id::int)
                        WHEN 'producto_digital' THEN (SELECT pd.profesional_id FROM public.productos_digitales pd WHERE o.producto_id ~ '^[0-9]+$' AND pd.id = o.producto_id::int)
                    END) AS profesional
            FROM public.pagos p
            LEFT JOIN public.ordenes o ON o.id = p.orden_id
            LEFT JOIN public.usuarios u ON u.id = COALESCE(p.usuario_id, o.usuario_id)
            WHERE p.metodo <> 'reembolso'
        ) f
    ), '[]'::json);
END;
$$;

-- Reembolso de un pago aprobado. El dinero se devuelve por fuera; aquí se
-- registra y se ajusta: en una cita se descuenta lo abonado; en un curso o
-- producto, si lo pagado neto ya no cubre el precio, se quita el acceso.
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

    INSERT INTO public.reembolsos (pago_id, monto, motivo, estado) VALUES (p_pago_id, p_monto, v_motivo, 'completado');
    IF p_monto = v_disponible THEN
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
            UPDATE public.citas SET monto_abonado = v_abonado, saldo_pendiente = v_saldo,
                estado = CASE WHEN v_cita.estado IN ('confirmada', 'parcialmente_pagada') AND v_saldo > 0
                              THEN CASE WHEN v_abonado = 0 THEN 'pendiente_pago' ELSE 'parcialmente_pagada' END
                              ELSE v_cita.estado END
             WHERE id = v_cita.id;
            INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_anteriores, datos_nuevos, motivo)
            VALUES (v_cita.id, auth.uid(), 'reembolso_emitido',
                    jsonb_build_object('monto_abonado', v_cita.monto_abonado, 'estado', v_cita.estado),
                    jsonb_build_object('monto_abonado', v_abonado, 'saldo_pendiente', v_saldo, 'reembolso', p_monto), v_motivo);
        END IF;
    ELSIF v_orden.tipo_producto IN ('curso', 'producto_digital') AND v_orden.producto_id ~ '^[0-9]+$' AND v_neto < v_orden.monto THEN
        IF v_orden.tipo_producto = 'curso' THEN
            UPDATE public.inscripciones SET estado = 'suspendida'
             WHERE usuario_id = v_orden.usuario_id AND curso_id = v_orden.producto_id::int;
        ELSE
            DELETE FROM public.compras_digitales WHERE usuario_id = v_orden.usuario_id AND producto_id = v_orden.producto_id::int;
        END IF;
        DELETE FROM public.derechos_acceso
         WHERE usuario_id = v_orden.usuario_id AND tipo_recurso = v_orden.tipo_producto AND recurso_id = v_orden.producto_id::int;
    END IF;

    UPDATE public.ordenes
       SET estado = CASE WHEN v_neto <= 0 THEN 'reembolsado' WHEN v_neto < monto THEN 'pendiente' ELSE estado END
     WHERE id = v_orden.id;

    v_monto_txt := trim_scale(p_monto / 100.0)::text || ' ' || COALESCE(v_pago.moneda, '');
    PERFORM public.notificar(v_orden.usuario_id, 'pago',
        'Se registró un reembolso de ' || v_monto_txt || ' por ' || COALESCE(v_orden.concepto, 'tu pago') || '. Motivo: ' || v_motivo || '.',
        'A refund of ' || v_monto_txt || ' was issued for ' || COALESCE(v_orden.concepto, 'your payment') || '. Reason: ' || v_motivo || '.',
        CASE v_orden.tipo_producto WHEN 'curso' THEN '/aula-virtual/pagos' WHEN 'producto_digital' THEN '/aula-virtual/biblioteca' ELSE '/portal-paciente' END,
        NULL);
END;
$$;

-- Órdenes con sus abonos (pagos aprobados) y reembolsos.
CREATE OR REPLACE FUNCTION public.admin_listar_ordenes()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    RETURN COALESCE((
        SELECT json_agg(f ORDER BY f.fecha DESC)
        FROM (
            SELECT
                o.id,
                COALESCE(NULLIF(u.nombre, ''), u.email) AS cliente,
                o.concepto,
                o.tipo_producto AS tipo,
                o.monto AS total,
                o.moneda,
                o.estado,
                o.fecha_creacion AS fecha,
                (SELECT ci.saldo_pendiente FROM public.citas ci WHERE o.tipo_producto = 'cita' AND ci.id::text = o.producto_id) AS "saldoCita",
                COALESCE((
                    SELECT json_agg(json_build_object('id', p.id, 'monto', p.monto, 'moneda', p.moneda, 'metodo', p.metodo,
                                                      'fecha', p.fecha, 'estado', p.estado, 'referencia', p.referencia) ORDER BY p.fecha)
                    FROM public.pagos p WHERE p.orden_id = o.id
                ), '[]'::json) AS pagos,
                (SELECT COALESCE(sum(r.monto), 0) FROM public.reembolsos r JOIN public.pagos p ON p.id = r.pago_id
                  WHERE p.orden_id = o.id AND r.estado = 'completado') AS reembolsado
            FROM public.ordenes o
            LEFT JOIN public.usuarios u ON u.id = o.usuario_id
        ) f
    ), '[]'::json);
END;
$$;

-- Abono registrado por el admin (p. ej. efectivo): crea el pago y lo aprueba.
CREATE OR REPLACE FUNCTION public.admin_registrar_abono(p_orden_id UUID, p_monto INT, p_referencia TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_orden RECORD; v_pendiente INT; v_neto INT; v_pago_id UUID;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    SELECT * INTO v_orden FROM public.ordenes WHERE id = p_orden_id;
    IF NOT FOUND OR v_orden.estado NOT IN ('pendiente', 'reembolsado') THEN
        RAISE EXCEPTION 'Esta orden no tiene saldo pendiente.';
    END IF;
    IF v_orden.tipo_producto = 'cita' THEN
        SELECT saldo_pendiente INTO v_pendiente FROM public.citas WHERE id::text = v_orden.producto_id;
    ELSE
        SELECT COALESCE(sum(p.monto), 0) - COALESCE((
                   SELECT sum(r.monto) FROM public.reembolsos r JOIN public.pagos p2 ON p2.id = r.pago_id
                    WHERE p2.orden_id = v_orden.id AND r.estado = 'completado'), 0)
          INTO v_neto
          FROM public.pagos p WHERE p.orden_id = v_orden.id AND p.estado IN ('aprobado', 'reembolsado');
        v_pendiente := v_orden.monto - v_neto;
    END IF;
    IF p_monto IS NULL OR p_monto <= 0 OR p_monto > COALESCE(v_pendiente, 0) THEN
        RAISE EXCEPTION 'El abono debe estar entre 0,01 y %.', trim_scale(COALESCE(v_pendiente, 0) / 100.0);
    END IF;

    INSERT INTO public.pagos (orden_id, usuario_id, monto, moneda, metodo, referencia, estado)
    VALUES (p_orden_id, v_orden.usuario_id, p_monto, v_orden.moneda, 'manual',
            COALESCE(NULLIF(left(btrim(p_referencia), 120), ''), 'Registrado por administración'), 'pendiente')
    RETURNING id INTO v_pago_id;
    PERFORM public.revisar_pago(v_pago_id, true, NULL);
END;
$$;

-- Monedas y tasas (tasa = unidades de la moneda por 1 USD).
CREATE OR REPLACE FUNCTION public.admin_guardar_moneda(p_codigo TEXT, p_nombre TEXT, p_simbolo TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_codigo TEXT := upper(btrim(p_codigo));
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF v_codigo !~ '^[A-Z]{3}$' THEN
        RAISE EXCEPTION 'El código debe tener 3 letras (ISO 4217), por ejemplo VES.';
    END IF;
    IF NULLIF(btrim(p_nombre), '') IS NULL OR NULLIF(btrim(p_simbolo), '') IS NULL THEN
        RAISE EXCEPTION 'Indica el nombre y el símbolo.';
    END IF;
    INSERT INTO public.monedas (codigo, nombre, simbolo, es_principal, estado)
    VALUES (v_codigo, left(btrim(p_nombre), 60), left(btrim(p_simbolo), 8), false, 'activo')
    ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, simbolo = EXCLUDED.simbolo;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_estado_moneda(p_codigo TEXT, p_activa BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.monedas WHERE codigo = p_codigo AND es_principal) THEN
        RAISE EXCEPTION 'La moneda base no se puede desactivar.';
    END IF;
    UPDATE public.monedas SET estado = CASE WHEN p_activa THEN 'activo' ELSE 'inactivo' END WHERE codigo = p_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_registrar_tasa(p_codigo TEXT, p_tasa NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF p_tasa IS NULL OR p_tasa <= 0 THEN
        RAISE EXCEPTION 'La tasa debe ser mayor que 0.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.monedas WHERE codigo = p_codigo AND NOT es_principal) THEN
        RAISE EXCEPTION 'Moneda no válida.';
    END IF;
    INSERT INTO public.tasas_cambio (moneda_origen, moneda_destino, tasa)
    VALUES ((SELECT codigo FROM public.monedas WHERE es_principal LIMIT 1), p_codigo, round(p_tasa, 4));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_pagos() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reembolsar_pago(UUID, INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_listar_ordenes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_registrar_abono(UUID, INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_guardar_moneda(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_estado_moneda(TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_registrar_tasa(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_pagos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reembolsar_pago(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_ordenes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_registrar_abono(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_guardar_moneda(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_estado_moneda(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_registrar_tasa(TEXT, NUMERIC) TO authenticated;
