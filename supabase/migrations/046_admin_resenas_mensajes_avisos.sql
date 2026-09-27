-- 046 · Panel admin A6: Reseñas, Mensajes de contacto y avisos para admins.
-- - Moderación de reseñas (calificaciones, 036): aprobar / ocultar / eliminar.
-- - Mensajes del formulario de contacto (037) con estado de seguimiento.
-- - Los administradores reciben notificaciones (campana y centro del admin)
--   cuando llega un mensaje de contacto, una reseña por moderar o una
--   transferencia por revisar.

ALTER TABLE public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
ALTER TABLE public.notificaciones ADD CONSTRAINT notificaciones_tipo_check
    CHECK (tipo IN ('cita', 'evaluacion', 'curso', 'vivo', 'reseña', 'pago', 'mensaje'));

ALTER TABLE public.mensajes_contacto
    ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'nuevo'
        CHECK (estado IN ('nuevo', 'leido', 'respondido', 'archivado'));

-- Aviso a todos los administradores activos.
CREATE OR REPLACE FUNCTION public.notificar_admins(p_tipo TEXT, p_es TEXT, p_en TEXT, p_link TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    INSERT INTO public.notificaciones (usuario_id, tipo, texto_es, texto_en, link)
    SELECT ur.usuario_id, p_tipo, p_es, p_en, p_link
    FROM public.usuario_roles ur
    JOIN public.roles r ON r.id = ur.rol_id
    JOIN public.usuarios u ON u.id = ur.usuario_id
    WHERE r.nombre = 'administrador' AND u.estado = 'activo';
$$;
REVOKE ALL ON FUNCTION public.notificar_admins(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notif_admin_mensaje()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    PERFORM public.notificar_admins('mensaje',
        'Nuevo mensaje de contacto de ' || NEW.nombre || COALESCE(': "' || left(NEW.asunto, 80) || '"', '') || '.',
        'New contact message from ' || NEW.nombre || COALESCE(': "' || left(NEW.asunto, 80) || '"', '') || '.',
        '/admin/mensajes');
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notif_admin_mensaje ON public.mensajes_contacto;
CREATE TRIGGER trg_notif_admin_mensaje AFTER INSERT ON public.mensajes_contacto
    FOR EACH ROW EXECUTE FUNCTION public.notif_admin_mensaje();

CREATE OR REPLACE FUNCTION public.notif_admin_resena()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.estado = 'pendiente' THEN
        PERFORM public.notificar_admins('reseña',
            'Nueva reseña por moderar: ' || public.nombre_usuario(NEW.usuario_id) || ' calificó a '
                || COALESCE(public.nombre_usuario(public.usuario_de_profesional(NEW.profesional_id)), 'una profesional')
                || ' con ' || COALESCE(NEW.nota_profesional, 0) || ' estrellas.',
            'New review to moderate: ' || public.nombre_usuario(NEW.usuario_id) || ' rated '
                || COALESCE(public.nombre_usuario(public.usuario_de_profesional(NEW.profesional_id)), 'a professional')
                || ' ' || COALESCE(NEW.nota_profesional, 0) || ' stars.',
            '/admin/reseñas');
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notif_admin_resena ON public.calificaciones;
CREATE TRIGGER trg_notif_admin_resena AFTER INSERT ON public.calificaciones
    FOR EACH ROW EXECUTE FUNCTION public.notif_admin_resena();

CREATE OR REPLACE FUNCTION public.notif_admin_pago()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.estado = 'pendiente' AND NEW.metodo = 'transferencia' THEN
        PERFORM public.notificar_admins('pago',
            public.nombre_usuario(NEW.usuario_id) || ' reportó una transferencia de ' || trim_scale(NEW.monto / 100.0)::text || ' '
                || COALESCE(NEW.moneda, '') || ' por revisar.',
            public.nombre_usuario(NEW.usuario_id) || ' reported a ' || trim_scale(NEW.monto / 100.0)::text || ' '
                || COALESCE(NEW.moneda, '') || ' transfer to review.',
            '/admin/pagos');
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notif_admin_pago ON public.pagos;
CREATE TRIGGER trg_notif_admin_pago AFTER INSERT ON public.pagos
    FOR EACH ROW EXECUTE FUNCTION public.notif_admin_pago();

-- ── Reseñas ──
CREATE OR REPLACE FUNCTION public.admin_resenas()
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
        SELECT json_agg(json_build_object(
            'id', ca.id,
            'paciente', COALESCE(NULLIF(u.nombre, ''), u.email),
            'profesional', pp.nombre,
            'servicio', s.nombre,
            'notaProfesional', ca.nota_profesional,
            'notaServicio', ca.nota_servicio,
            'comentario', ca.comentario,
            'fecha', ca.fecha,
            'estado', ca.estado
        ) ORDER BY ca.fecha DESC)
        FROM public.calificaciones ca
        LEFT JOIN public.usuarios u ON u.id = ca.usuario_id
        LEFT JOIN public.profesionales_publicos pp ON pp.id = ca.profesional_id
        LEFT JOIN public.servicios s ON s.id = ca.servicio_id
    ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_moderar_resena(p_id INT, p_estado TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF p_estado NOT IN ('pendiente', 'aprobado', 'oculto') THEN
        RAISE EXCEPTION 'Estado no válido.';
    END IF;
    UPDATE public.calificaciones SET estado = p_estado WHERE id = p_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La reseña no existe.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_eliminar_resena(p_id INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    DELETE FROM public.calificaciones WHERE id = p_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La reseña no existe.';
    END IF;
END;
$$;

-- ── Mensajes de contacto ──
CREATE OR REPLACE FUNCTION public.admin_mensajes()
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
        SELECT json_agg(json_build_object(
            'id', m.id, 'nombre', m.nombre, 'correo', m.correo, 'telefono', m.telefono, 'asunto', m.asunto,
            'mensaje', m.mensaje, 'origen', m.origen, 'idioma', m.idioma, 'estado', m.estado,
            'correoEnviado', m.correo_enviado, 'correoError', m.correo_error, 'fecha', m.creado_en
        ) ORDER BY m.creado_en DESC)
        FROM public.mensajes_contacto m
    ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_estado_mensaje(p_id BIGINT, p_estado TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF p_estado NOT IN ('nuevo', 'leido', 'respondido', 'archivado') THEN
        RAISE EXCEPTION 'Estado no válido.';
    END IF;
    UPDATE public.mensajes_contacto SET estado = p_estado WHERE id = p_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El mensaje no existe.';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resenas() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_moderar_resena(INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_eliminar_resena(INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_mensajes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_estado_mensaje(BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resenas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderar_resena(INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_eliminar_resena(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mensajes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_estado_mensaje(BIGINT, TEXT) TO authenticated;
