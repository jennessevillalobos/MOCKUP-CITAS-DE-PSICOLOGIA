-- Migración: panel admin conectado — fase A1 (acceso real + Panel general).
-- El acceso al admin exige una sesión real de Supabase con el rol
-- `administrador` (tabla usuario_roles). Todas las funciones de esta fase
-- comprueban es_admin() y devuelven datos reales de la base.
-- La zona horaria del negocio es America/Caracas (sedes Caracas y Valencia).

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuario_roles ur JOIN public.roles r ON r.id = ur.rol_id
        WHERE ur.usuario_id = (SELECT auth.uid()) AND r.nombre = 'administrador'
    );
$$;
REVOKE EXECUTE ON FUNCTION public.es_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated;

-- ── Panel general ──
-- p_periodo: 'hoy' | '30d' | 'trimestre' | 'anio'. Montos en centavos.
CREATE OR REPLACE FUNCTION public.admin_panel_resumen(p_periodo TEXT DEFAULT '30d')
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_ahora TIMESTAMPTZ := now();
    v_hoy DATE := (now() AT TIME ZONE 'America/Caracas')::date;
    v_desde TIMESTAMPTZ; v_previo TIMESTAMPTZ;
    v_ingresos BIGINT; v_ingresos_prev BIGINT;
    v_nuevos INT; v_nuevos_prev INT;
    v_ventas INT; v_ventas_prev INT; v_ventas_monto BIGINT;
    v_citas_hoy INT; v_citas_online INT;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_desde := CASE p_periodo
        WHEN 'hoy' THEN (v_hoy::timestamp AT TIME ZONE 'America/Caracas')
        WHEN 'trimestre' THEN (date_trunc('quarter', v_hoy)::timestamp AT TIME ZONE 'America/Caracas')
        WHEN 'anio' THEN (date_trunc('year', v_hoy)::timestamp AT TIME ZONE 'America/Caracas')
        ELSE v_ahora - interval '30 days' END;
    v_previo := v_desde - (v_ahora - v_desde);

    SELECT COALESCE(sum(monto) FILTER (WHERE fecha >= v_desde), 0),
           COALESCE(sum(monto) FILTER (WHERE fecha >= v_previo AND fecha < v_desde), 0)
      INTO v_ingresos, v_ingresos_prev
      FROM public.pagos WHERE estado = 'aprobado' AND metodo <> 'reembolso' AND fecha >= v_previo;

    SELECT count(*) FILTER (WHERE fecha_creacion >= v_desde), count(*) FILTER (WHERE fecha_creacion >= v_previo AND fecha_creacion < v_desde)
      INTO v_nuevos, v_nuevos_prev FROM public.usuarios WHERE fecha_creacion >= v_previo;

    SELECT count(*) FILTER (WHERE p.fecha >= v_desde), count(*) FILTER (WHERE p.fecha >= v_previo AND p.fecha < v_desde),
           COALESCE(sum(p.monto) FILTER (WHERE p.fecha >= v_desde), 0)
      INTO v_ventas, v_ventas_prev, v_ventas_monto
      FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
     WHERE p.estado = 'aprobado' AND o.tipo_producto IN ('curso', 'producto_digital') AND p.fecha >= v_previo;

    SELECT count(*), count(*) FILTER (WHERE m.nombre ILIKE 'online%')
      INTO v_citas_hoy, v_citas_online
      FROM public.citas c LEFT JOIN public.modalidades m ON m.id = c.modalidad_id
     WHERE c.fecha = v_hoy AND c.estado <> 'cancelada';

    RETURN jsonb_build_object(
        'kpis', jsonb_build_object(
            'ingresos', v_ingresos, 'ingresosPrevio', v_ingresos_prev,
            'citasHoy', v_citas_hoy, 'citasHoyOnline', v_citas_online,
            'nuevosUsuarios', v_nuevos, 'nuevosUsuariosPrevio', v_nuevos_prev,
            'ventas', v_ventas, 'ventasPrevio', v_ventas_prev, 'ventasMonto', v_ventas_monto
        ),
        -- Últimos 8 meses: terapias (citas) y academia (cursos + productos).
        'ingresosPorMes', (
            SELECT jsonb_agg(jsonb_build_object('mes', to_char(mes, 'YYYY-MM'), 'terapias', terapias, 'academia', academia) ORDER BY mes)
            FROM (
                SELECT gs::date AS mes,
                       COALESCE((SELECT sum(p.monto) FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
                                  WHERE p.estado = 'aprobado' AND o.tipo_producto = 'cita'
                                    AND date_trunc('month', p.fecha AT TIME ZONE 'America/Caracas') = gs), 0) AS terapias,
                       COALESCE((SELECT sum(p.monto) FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
                                  WHERE p.estado = 'aprobado' AND o.tipo_producto IN ('curso', 'producto_digital')
                                    AND date_trunc('month', p.fecha AT TIME ZONE 'America/Caracas') = gs), 0) AS academia
                FROM generate_series(date_trunc('month', v_hoy) - interval '7 months', date_trunc('month', v_hoy), interval '1 month') gs
            ) x
        ),
        -- Reparto de ingresos del periodo por canal (montos; el % se calcula en el cliente).
        'canales', (
            SELECT jsonb_build_object(
                'terapias', COALESCE(sum(p.monto) FILTER (WHERE o.tipo_producto = 'cita'), 0),
                'cursos', COALESCE(sum(p.monto) FILTER (WHERE o.tipo_producto = 'curso'), 0),
                'productos', COALESCE(sum(p.monto) FILTER (WHERE o.tipo_producto = 'producto_digital'), 0))
            FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
            WHERE p.estado = 'aprobado' AND p.fecha >= v_desde
        ),
        'proximasCitas', COALESCE((
            SELECT jsonb_agg(fila ORDER BY fecha, hora) FROM (
                SELECT c.fecha, c.hora, jsonb_build_object(
                    'id', c.id, 'fecha', c.fecha, 'hora', to_char(c.hora, 'HH24:MI'),
                    'paciente', public.nombre_usuario(c.usuario_id),
                    'servicio', s.nombre,
                    'profesional', public.nombre_usuario(public.usuario_de_profesional(c.profesional_id)),
                    'lugar', COALESCE(l.nombre, m.nombre), 'estado', c.estado
                ) AS fila
                FROM public.citas c
                LEFT JOIN public.servicios s ON s.id = c.servicio_id
                LEFT JOIN public.modalidades m ON m.id = c.modalidad_id
                LEFT JOIN public.lugares l ON l.id = c.lugar_id
                WHERE c.fecha >= v_hoy AND c.estado NOT IN ('cancelada', 'completada', 'no_asistio')
                ORDER BY c.fecha, c.hora LIMIT 5
            ) x), '[]'::jsonb),
        'ventasRecientes', COALESCE((
            SELECT jsonb_agg(fila ORDER BY fecha DESC) FROM (
                SELECT p.fecha, jsonb_build_object(
                    'concepto', o.concepto, 'tipo', o.tipo_producto, 'quien', public.nombre_usuario(p.usuario_id),
                    'fecha', p.fecha, 'monto', p.monto
                ) AS fila
                FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
                WHERE p.estado = 'aprobado' ORDER BY p.fecha DESC LIMIT 5
            ) x), '[]'::jsonb),
        'pagosPorVerificar', COALESCE((
            SELECT jsonb_agg(fila ORDER BY fecha) FROM (
                SELECT p.fecha, jsonb_build_object(
                    'id', p.id, 'nombre', public.nombre_usuario(p.usuario_id), 'concepto', o.concepto,
                    'metodo', p.metodo, 'monto', p.monto, 'fecha', p.fecha
                ) AS fila
                FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
                WHERE p.estado = 'pendiente' ORDER BY p.fecha LIMIT 8
            ) x), '[]'::jsonb),
        -- Citas activas con saldo por cobrar (hoy no existe un sistema de cuotas).
        'saldosPendientes', COALESCE((
            SELECT jsonb_agg(fila ORDER BY fecha) FROM (
                SELECT c.fecha, jsonb_build_object(
                    'citaId', c.id, 'nombre', public.nombre_usuario(c.usuario_id), 'servicio', s.nombre,
                    'fecha', c.fecha, 'saldo', c.saldo_pendiente,
                    'enRevision', COALESCE((SELECT sum(p.monto) FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
                                            WHERE o.producto_id = c.id::text AND p.estado = 'pendiente'), 0)
                ) AS fila
                FROM public.citas c LEFT JOIN public.servicios s ON s.id = c.servicio_id
                WHERE c.saldo_pendiente > 0 AND c.estado IN ('pendiente_pago', 'parcialmente_pagada')
                ORDER BY c.fecha LIMIT 8
            ) x), '[]'::jsonb)
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_panel_resumen(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_panel_resumen(TEXT) TO authenticated;

-- ── "Notificar": recordatorio de saldo al paciente ──
CREATE OR REPLACE FUNCTION public.admin_recordar_saldo(p_cita_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cita RECORD; v_monto TEXT;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    SELECT * INTO v_cita FROM public.citas WHERE id = p_cita_id AND saldo_pendiente > 0 AND estado IN ('pendiente_pago', 'parcialmente_pagada');
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esa cita no tiene saldo pendiente.' USING ERRCODE = 'check_violation';
    END IF;
    v_monto := trim_scale(v_cita.saldo_pendiente / 100.0)::text || ' ' || COALESCE(v_cita.moneda, 'USD');
    PERFORM public.notificar(v_cita.usuario_id, 'pago',
        'Tienes un saldo pendiente de ' || v_monto || ' de tu cita del ' || to_char(v_cita.fecha, 'DD/MM') || '. Puedes pagarlo desde Mis pagos.',
        'You have a pending balance of ' || v_monto || ' for your ' || to_char(v_cita.fecha, 'MM/DD') || ' appointment. You can pay it from My payments.',
        '/portal-paciente', NULL);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_recordar_saldo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recordar_saldo(UUID) TO authenticated;
