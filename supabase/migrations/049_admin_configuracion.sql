-- 049 · Panel admin A7: Configuración.
-- - Datos de contacto del sitio editables por el admin (decidido con la
--   usuaria): tabla pública `configuracion_sitio`; el sitio los lee de aquí y
--   usa src/config/contact.ts solo como respaldo.
-- - Auditoría real: acciones de administradores sobre cuentas, historial de
--   citas, reembolsos y cuentas nuevas.
-- - Sesiones abiertas del propio admin, con opción de cerrar las de otros
--   dispositivos.

CREATE TABLE IF NOT EXISTS public.configuracion_sitio (
    clave TEXT PRIMARY KEY,
    valor JSONB NOT NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);
ALTER TABLE public.configuracion_sitio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica de configuracion" ON public.configuracion_sitio;
CREATE POLICY "Lectura publica de configuracion" ON public.configuracion_sitio FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.configuracion_sitio TO anon, authenticated;

-- Valores actuales del sitio (src/config/contact.ts) como punto de partida.
INSERT INTO public.configuracion_sitio (clave, valor) VALUES ('contacto', jsonb_build_object(
    'whatsapp', 'https://wa.me/0000000000',
    'phone', '+00 000 000 0000',
    'email', 'hola@psiqueamor.com',
    'location', 'Atención online y presencial',
    'hours', 'Lun — Vie · 9:00 — 19:00',
    'instagram', 'https://www.instagram.com/?hl=es',
    'linkedin', 'https://www.linkedin.com/',
    'youtube', 'https://www.youtube.com/'
)) ON CONFLICT (clave) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_guardar_contacto(p_valor JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_limpio JSONB := '{}'::jsonb;
    k TEXT;
    v TEXT;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    FOREACH k IN ARRAY ARRAY['whatsapp', 'phone', 'email', 'location', 'hours', 'instagram', 'linkedin', 'youtube'] LOOP
        v := NULLIF(btrim(COALESCE(p_valor ->> k, '')), '');
        IF v IS NULL THEN
            RAISE EXCEPTION 'Completa todos los campos de contacto.';
        END IF;
        IF length(v) > 200 THEN
            RAISE EXCEPTION 'Un campo de contacto es demasiado largo.';
        END IF;
        IF k IN ('whatsapp', 'instagram', 'linkedin', 'youtube') AND v !~* '^https?://' THEN
            RAISE EXCEPTION 'El enlace de % debe empezar con https://', k;
        END IF;
        IF k = 'email' AND v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
            RAISE EXCEPTION 'El correo de contacto no es válido.';
        END IF;
        v_limpio := v_limpio || jsonb_build_object(k, v);
    END LOOP;
    INSERT INTO public.configuracion_sitio (clave, valor, actualizado_en, actualizado_por)
    VALUES ('contacto', v_limpio, now(), auth.uid())
    ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = now(), actualizado_por = auth.uid();
END;
$$;

-- Registro de auditoría (últimos 300 eventos).
CREATE OR REPLACE FUNCTION public.admin_auditoria()
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
        SELECT json_agg(e ORDER BY e.fecha DESC)
        FROM (
            SELECT * FROM (
                SELECT a.creado_en AS fecha,
                       COALESCE(public.nombre_usuario(a.admin_id), 'Administración') AS usuario,
                       CASE a.tipo WHEN 'rol' THEN 'Cambió roles' WHEN 'seguridad' THEN 'Cambio de seguridad en una cuenta' ELSE 'Cambio en una cuenta' END AS accion,
                       public.nombre_usuario(a.usuario_id) || ' · ' || a.texto AS detalle,
                       CASE a.tipo WHEN 'rol' THEN 'Edición' ELSE 'Seguridad' END AS tipo
                FROM public.auditoria_usuarios a
                UNION ALL
                SELECT h.creado_en,
                       COALESCE(public.nombre_usuario(h.usuario_id), 'Sistema'),
                       CASE h.accion
                           WHEN 'creada' THEN 'Agendó una cita' WHEN 'confirmada' THEN 'Confirmó una cita'
                           WHEN 'reprogramada' THEN 'Reprogramó una cita' WHEN 'cancelada' THEN 'Canceló una cita'
                           WHEN 'completada' THEN 'Completó una cita' WHEN 'pago_registrado' THEN 'Registró un pago de cita'
                           WHEN 'pago_rechazado' THEN 'Rechazó un pago de cita' WHEN 'reembolso_emitido' THEN 'Registró un reembolso'
                           ELSE h.accion END,
                       COALESCE((SELECT public.nombre_usuario(c.usuario_id) || ' · ' || to_char(c.fecha, 'DD/MM') || ' ' || to_char(c.hora, 'HH24:MI')
                                 FROM public.citas c WHERE c.id = h.cita_id), 'Cita')
                           || COALESCE(' · ' || h.motivo, ''),
                       CASE h.accion WHEN 'creada' THEN 'Creación' WHEN 'cancelada' THEN 'Eliminación' ELSE 'Edición' END
                FROM public.historial_citas h
                UNION ALL
                SELECT r.fecha, 'Administración', 'Registró un reembolso',
                       COALESCE(o.concepto, 'Pago') || ' · ' || trim_scale(r.monto / 100.0)::text || ' ' || COALESCE(p.moneda, '') || COALESCE(' · ' || r.motivo, ''),
                       'Edición'
                FROM public.reembolsos r JOIN public.pagos p ON p.id = r.pago_id LEFT JOIN public.ordenes o ON o.id = p.orden_id
                WHERE o.tipo_producto IS DISTINCT FROM 'cita'  -- las de citas ya salen en su historial
                UNION ALL
                SELECT u.fecha_creacion, COALESCE(NULLIF(u.nombre, ''), u.email), 'Creó su cuenta', u.email, 'Creación'
                FROM public.usuarios u
            ) t
            ORDER BY t.fecha DESC
            LIMIT 300
        ) e
    ), '[]'::json);
END;
$$;

-- Sesiones abiertas del admin que consulta.
CREATE OR REPLACE FUNCTION public.admin_mis_sesiones()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_actual TEXT := current_setting('request.jwt.claims', true)::jsonb ->> 'session_id';
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    RETURN COALESCE((
        SELECT json_agg(json_build_object(
            'id', s.id, 'dispositivo', s.user_agent, 'ip', host(s.ip),
            'creada', s.created_at, 'actividad', COALESCE(s.refreshed_at AT TIME ZONE 'UTC', s.updated_at, s.created_at),
            'actual', s.id::text = v_actual
        ) ORDER BY COALESCE(s.refreshed_at AT TIME ZONE 'UTC', s.updated_at, s.created_at) DESC)
        FROM auth.sessions s
        WHERE s.user_id = auth.uid() AND (s.not_after IS NULL OR s.not_after > now())
    ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cerrar_sesion(p_sesion_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF p_sesion_id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'session_id' THEN
        RAISE EXCEPTION 'Esta es tu sesión actual: usa "Cerrar sesión".';
    END IF;
    DELETE FROM auth.sessions WHERE id = p_sesion_id AND user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La sesión no existe o ya se cerró.';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_guardar_contacto(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_auditoria() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_mis_sesiones() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_cerrar_sesion(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_guardar_contacto(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_auditoria() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mis_sesiones() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cerrar_sesion(UUID) TO authenticated;
