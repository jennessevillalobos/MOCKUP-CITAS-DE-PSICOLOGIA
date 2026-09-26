-- 040 · Panel admin A2: Usuarios.
-- Lista real de cuentas, roles combinables, activar / desactivar / bloquear
-- (con efecto real en el acceso) y contraseña temporal puesta por un
-- administrador (no hay SMTP propio para enviar correos de recuperación).
-- Todo pasa por funciones SECURITY DEFINER que exigen es_admin().

-- Un administrador desactivado o bloqueado deja de serlo a efectos del panel.
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuario_roles ur
        JOIN public.roles r ON r.id = ur.rol_id
        JOIN public.usuarios u ON u.id = ur.usuario_id
        WHERE ur.usuario_id = (SELECT auth.uid()) AND r.nombre = 'administrador' AND u.estado = 'activo'
    );
$$;

-- Registro de lo que hace un administrador sobre una cuenta.
CREATE TABLE IF NOT EXISTS public.auditoria_usuarios (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('rol', 'seguridad', 'cuenta')),
    texto TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_usuarios_usuario_idx ON public.auditoria_usuarios (usuario_id, creado_en DESC);
-- Sin políticas: solo se lee y escribe a través de las funciones de abajo.
ALTER TABLE public.auditoria_usuarios ENABLE ROW LEVEL SECURITY;

-- Lista de usuarios con roles y ficha de profesional vinculada.
CREATE OR REPLACE FUNCTION public.admin_listar_usuarios()
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
        SELECT json_agg(fila ORDER BY fila.creado DESC)
        FROM (
            SELECT
                u.id,
                COALESCE(NULLIF(u.nombre, ''), split_part(u.email, '@', 1)) AS nombre,
                u.email AS correo,
                u.telefono,
                u.estado,
                u.fecha_creacion AS creado,
                GREATEST(u.ultimo_acceso, au.last_sign_in_at) AS "ultimoAcceso",
                COALESCE((
                    SELECT array_agg(r.nombre ORDER BY r.id)
                    FROM public.usuario_roles ur JOIN public.roles r ON r.id = ur.rol_id
                    WHERE ur.usuario_id = u.id
                ), ARRAY[]::text[]) AS roles,
                (SELECT p.slug FROM public.profesionales p WHERE p.usuario_id = u.id LIMIT 1) AS profesional
            FROM public.usuarios u
            LEFT JOIN auth.users au ON au.id = u.id
        ) fila
    ), '[]'::json);
END;
$$;

-- Historial de una cuenta: creación, último acceso, citas, pagos,
-- inscripciones, compras y acciones de administradores.
CREATE OR REPLACE FUNCTION public.admin_actividad_usuario(p_usuario_id UUID)
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
        SELECT json_agg(a ORDER BY a.fecha DESC)
        FROM (
            SELECT * FROM (
                SELECT 'cuenta'::text AS tipo, 'Cuenta creada'::text AS texto, u.fecha_creacion AS fecha
                FROM public.usuarios u WHERE u.id = p_usuario_id
                UNION ALL
                SELECT 'sesion', 'Último inicio de sesión', au.last_sign_in_at
                FROM auth.users au WHERE au.id = p_usuario_id AND au.last_sign_in_at IS NOT NULL
                UNION ALL
                SELECT 'cita',
                       'Reservó cita: ' || COALESCE(s.nombre, 'Cita') || ' (' || to_char(c.fecha, 'DD/MM') || ', ' || c.estado || ')',
                       c.fecha_creacion
                FROM public.citas c LEFT JOIN public.servicios s ON s.id = c.servicio_id
                WHERE c.usuario_id = p_usuario_id
                UNION ALL
                SELECT 'compra',
                       'Pago ' || pg.estado || ': ' || COALESCE(o.concepto, 'Pago') || ' · ' || to_char(pg.monto / 100.0, 'FM999999990.00') || ' ' || pg.moneda,
                       pg.fecha
                FROM public.pagos pg LEFT JOIN public.ordenes o ON o.id = pg.orden_id
                WHERE pg.usuario_id = p_usuario_id
                UNION ALL
                SELECT 'compra', 'Inscrito en el curso: ' || cu.nombre, i.fecha_inicio
                FROM public.inscripciones i JOIN public.cursos cu ON cu.id = i.curso_id
                WHERE i.usuario_id = p_usuario_id
                UNION ALL
                SELECT 'compra', 'Compró: ' || pd.titulo, cd.fecha
                FROM public.compras_digitales cd JOIN public.productos_digitales pd ON pd.id = cd.producto_id
                WHERE cd.usuario_id = p_usuario_id
                UNION ALL
                SELECT au2.tipo, au2.texto || COALESCE(' (' || ad.nombre || ')', ''), au2.creado_en
                FROM public.auditoria_usuarios au2 LEFT JOIN public.usuarios ad ON ad.id = au2.admin_id
                WHERE au2.usuario_id = p_usuario_id
            ) t
            WHERE t.fecha IS NOT NULL
            ORDER BY t.fecha DESC
            LIMIT 40
        ) a
    ), '[]'::json);
END;
$$;

-- Reemplaza los roles de una cuenta (estudiante / instructor / administrador).
CREATE OR REPLACE FUNCTION public.admin_guardar_roles(p_usuario_id UUID, p_roles TEXT[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_antes TEXT[];
    v_nuevos TEXT[] := COALESCE(p_roles, ARRAY[]::text[]);
    v_agregados TEXT[];
    v_quitados TEXT[];
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
        RAISE EXCEPTION 'La cuenta no existe.';
    END IF;
    IF EXISTS (SELECT 1 FROM unnest(v_nuevos) r WHERE r NOT IN ('estudiante', 'instructor', 'administrador')) THEN
        RAISE EXCEPTION 'Rol no válido.';
    END IF;
    IF p_usuario_id = auth.uid() AND NOT ('administrador' = ANY (v_nuevos)) THEN
        RAISE EXCEPTION 'No puedes quitarte a ti misma el rol de administrador.';
    END IF;

    SELECT COALESCE(array_agg(r.nombre), ARRAY[]::text[]) INTO v_antes
    FROM public.usuario_roles ur JOIN public.roles r ON r.id = ur.rol_id
    WHERE ur.usuario_id = p_usuario_id;

    SELECT COALESCE(array_agg(x), ARRAY[]::text[]) INTO v_agregados FROM unnest(v_nuevos) x WHERE NOT (x = ANY (v_antes));
    SELECT COALESCE(array_agg(x), ARRAY[]::text[]) INTO v_quitados FROM unnest(v_antes) x WHERE NOT (x = ANY (v_nuevos));
    IF cardinality(v_agregados) = 0 AND cardinality(v_quitados) = 0 THEN
        RETURN;
    END IF;

    DELETE FROM public.usuario_roles ur
    USING public.roles r
    WHERE ur.rol_id = r.id AND ur.usuario_id = p_usuario_id AND r.nombre = ANY (v_quitados);

    INSERT INTO public.usuario_roles (usuario_id, rol_id)
    SELECT p_usuario_id, r.id FROM public.roles r WHERE r.nombre = ANY (v_agregados)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.auditoria_usuarios (usuario_id, admin_id, tipo, texto)
    VALUES (
        p_usuario_id, auth.uid(), 'rol',
        'Roles actualizados: ' || concat_ws(', ',
            NULLIF(array_to_string(ARRAY(SELECT '+ ' || x FROM unnest(v_agregados) x), ', '), ''),
            NULLIF(array_to_string(ARRAY(SELECT '− ' || x FROM unnest(v_quitados) x), ', '), ''))
    );
END;
$$;

-- Activa, desactiva o bloquea una cuenta. Desactivada o bloqueada no puede
-- iniciar sesión (banned_until en auth) y se cierran sus sesiones abiertas.
CREATE OR REPLACE FUNCTION public.admin_cambiar_estado(p_usuario_id UUID, p_estado TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_antes TEXT;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF p_estado NOT IN ('activo', 'inactivo', 'bloqueado') THEN
        RAISE EXCEPTION 'Estado no válido.';
    END IF;
    IF p_usuario_id = auth.uid() THEN
        RAISE EXCEPTION 'No puedes cambiar el estado de tu propia cuenta.';
    END IF;
    SELECT estado INTO v_antes FROM public.usuarios WHERE id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cuenta no existe.';
    END IF;
    IF v_antes = p_estado THEN
        RETURN;
    END IF;

    UPDATE public.usuarios SET estado = p_estado WHERE id = p_usuario_id;
    UPDATE auth.users
    SET banned_until = CASE WHEN p_estado = 'activo' THEN NULL ELSE now() + interval '100 years' END,
        updated_at = now()
    WHERE id = p_usuario_id;
    IF p_estado <> 'activo' THEN
        DELETE FROM auth.sessions WHERE user_id = p_usuario_id;
    END IF;

    INSERT INTO public.auditoria_usuarios (usuario_id, admin_id, tipo, texto)
    VALUES (p_usuario_id, auth.uid(), 'seguridad',
        CASE p_estado
            WHEN 'activo' THEN CASE v_antes WHEN 'bloqueado' THEN 'Cuenta desbloqueada' ELSE 'Cuenta activada' END
            WHEN 'inactivo' THEN 'Cuenta desactivada'
            ELSE 'Cuenta bloqueada'
        END);
END;
$$;

-- Contraseña temporal: la escribe el administrador y se la comunica a la
-- persona, que luego la cambia en "Mi perfil". Cierra sus sesiones abiertas.
CREATE OR REPLACE FUNCTION public.admin_clave_temporal(p_usuario_id UUID, p_clave TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF p_usuario_id = auth.uid() THEN
        RAISE EXCEPTION 'Cambia tu propia contraseña desde tu perfil.';
    END IF;
    IF p_clave IS NULL OR length(p_clave) < 8 THEN
        RAISE EXCEPTION 'La contraseña temporal debe tener al menos 8 caracteres.';
    END IF;
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_clave, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cuenta no existe.';
    END IF;
    DELETE FROM auth.sessions WHERE user_id = p_usuario_id;

    INSERT INTO public.auditoria_usuarios (usuario_id, admin_id, tipo, texto)
    VALUES (p_usuario_id, auth.uid(), 'seguridad', 'Contraseña temporal asignada');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_usuarios() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_actividad_usuario(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_guardar_roles(UUID, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_cambiar_estado(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_clave_temporal(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_usuarios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actividad_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_guardar_roles(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cambiar_estado(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clave_temporal(UUID, TEXT) TO authenticated;
