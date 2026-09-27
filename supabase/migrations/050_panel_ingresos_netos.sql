-- 050 · Panel general (039) alineado con Reportes (047/048):
-- - Ingresos NETOS: pagos cobrados (aprobados o luego reembolsados) en su
--   fecha, menos reembolsos en la fecha del reembolso. Antes un reembolso
--   parcial no se restaba y uno total hacía desaparecer el ingreso original.
--   Aplica a los KPI de ingresos y monto de ventas, ingresos por mes y canales.
-- - "Citas de hoy en línea": la modalidad se llama 'virtual' (antes buscaba
--   'online%' y siempre daba 0).
-- - "Saldos por cobrar" incluye citas confirmadas o reprogramadas que vuelven
--   a tener saldo (p. ej. tras un reembolso).

-- Movimientos de dinero: + cobro en su fecha, − reembolso en la suya (montos en centavos).
CREATE OR REPLACE FUNCTION public.movimientos_dinero()
RETURNS TABLE (fecha TIMESTAMPTZ, tipo TEXT, monto BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT p.fecha, o.tipo_producto, p.monto::bigint
      FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
     WHERE p.estado IN ('aprobado', 'reembolsado') AND p.metodo <> 'reembolso'
    UNION ALL
    SELECT r.fecha, o.tipo_producto, -r.monto::bigint
      FROM public.reembolsos r JOIN public.pagos p ON p.id = r.pago_id JOIN public.ordenes o ON o.id = p.orden_id
     WHERE r.estado = 'completado';
$$;
REVOKE ALL ON FUNCTION public.movimientos_dinero() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_panel_resumen(p_periodo text DEFAULT '30d'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      FROM public.movimientos_dinero() WHERE fecha >= v_previo;

    SELECT count(*) FILTER (WHERE fecha_creacion >= v_desde), count(*) FILTER (WHERE fecha_creacion >= v_previo AND fecha_creacion < v_desde)
      INTO v_nuevos, v_nuevos_prev FROM public.usuarios WHERE fecha_creacion >= v_previo;

    -- Ventas: pagos de cursos y productos que siguen vigentes (sin reembolso total).
    SELECT count(*) FILTER (WHERE p.fecha >= v_desde), count(*) FILTER (WHERE p.fecha >= v_previo AND p.fecha < v_desde)
      INTO v_ventas, v_ventas_prev
      FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
     WHERE p.estado = 'aprobado' AND o.tipo_producto IN ('curso', 'producto_digital') AND p.fecha >= v_previo;
    SELECT COALESCE(sum(monto), 0) INTO v_ventas_monto
      FROM public.movimientos_dinero() WHERE tipo IN ('curso', 'producto_digital') AND fecha >= v_desde;

    SELECT count(*), count(*) FILTER (WHERE m.nombre IN ('virtual', 'online'))
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
        -- Últimos 8 meses: terapias (citas) y academia (cursos + productos), netos.
        'ingresosPorMes', (
            SELECT jsonb_agg(jsonb_build_object('mes', to_char(mes, 'YYYY-MM'), 'terapias', terapias, 'academia', academia) ORDER BY mes)
            FROM (
                SELECT gs::date AS mes,
                       COALESCE((SELECT sum(mv.monto) FROM public.movimientos_dinero() mv
                                  WHERE mv.tipo = 'cita' AND date_trunc('month', mv.fecha AT TIME ZONE 'America/Caracas') = gs), 0) AS terapias,
                       COALESCE((SELECT sum(mv.monto) FROM public.movimientos_dinero() mv
                                  WHERE mv.tipo IN ('curso', 'producto_digital') AND date_trunc('month', mv.fecha AT TIME ZONE 'America/Caracas') = gs), 0) AS academia
                FROM generate_series(date_trunc('month', v_hoy) - interval '7 months', date_trunc('month', v_hoy), interval '1 month') gs
            ) x
        ),
        -- Reparto de ingresos netos del periodo por canal (el % se calcula en el cliente).
        'canales', (
            SELECT jsonb_build_object(
                'terapias', COALESCE(sum(monto) FILTER (WHERE tipo = 'cita'), 0),
                'cursos', COALESCE(sum(monto) FILTER (WHERE tipo = 'curso'), 0),
                'productos', COALESCE(sum(monto) FILTER (WHERE tipo = 'producto_digital'), 0))
            FROM public.movimientos_dinero() WHERE fecha >= v_desde
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
                    'fecha', p.fecha,
                    'monto', p.monto - COALESCE((SELECT sum(r.monto) FROM public.reembolsos r WHERE r.pago_id = p.id AND r.estado = 'completado'), 0)
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
                WHERE c.saldo_pendiente > 0 AND c.estado IN ('pendiente_pago', 'parcialmente_pagada', 'confirmada', 'reprogramada')
                ORDER BY c.fecha LIMIT 8
            ) x), '[]'::jsonb)
    );
END;
$function$;
