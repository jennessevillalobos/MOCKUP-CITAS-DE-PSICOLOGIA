-- 056 · Al enlazar una ficha a otra cuenta, el admin indica el nombre público
-- (por defecto el que ya muestra la ficha). Antes quedaba el nombre de la
-- cuenta nueva, p. ej. el que la persona escribió al registrarse.

DROP FUNCTION IF EXISTS public.admin_enlazar_profesional(INT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_enlazar_profesional(p_id INT, p_correo TEXT, p_nombre TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_ficha RECORD;
    v_nueva RECORD;
    v_anterior RECORD;
    v_nombre TEXT := NULLIF(btrim(COALESCE(p_nombre, '')), '');
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    SELECT * INTO v_ficha FROM public.profesionales WHERE id = p_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La ficha no existe.';
    END IF;
    SELECT id, nombre, foto, estado INTO v_nueva FROM public.usuarios WHERE lower(email) = lower(btrim(p_correo));
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay ninguna cuenta con ese correo. La profesional debe registrarse primero en "Crear cuenta".';
    END IF;
    IF v_nueva.id = v_ficha.usuario_id THEN
        RAISE EXCEPTION 'La ficha ya está enlazada a esa cuenta.';
    END IF;
    IF v_nueva.estado <> 'activo' THEN
        RAISE EXCEPTION 'Esa cuenta no está activa.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profesionales WHERE usuario_id = v_nueva.id) THEN
        RAISE EXCEPTION 'Esa cuenta ya tiene otra ficha de profesional.';
    END IF;
    SELECT id, nombre, foto INTO v_anterior FROM public.usuarios WHERE id = v_ficha.usuario_id;

    UPDATE public.profesionales SET usuario_id = v_nueva.id WHERE id = p_id;
    -- Nombre público: el que indica el admin (por defecto el de la ficha); la
    -- foto anterior se conserva si la cuenta nueva no tiene.
    IF length(COALESCE(v_nombre, '')) > 120 THEN
        RAISE EXCEPTION 'El nombre es demasiado largo.';
    END IF;
    UPDATE public.usuarios
       SET nombre = COALESCE(v_nombre, NULLIF(btrim(nombre), ''), v_anterior.nombre),
           foto = COALESCE(foto, v_anterior.foto)
     WHERE id = v_nueva.id;

    INSERT INTO public.usuario_roles (usuario_id, rol_id)
    SELECT v_nueva.id, r.id FROM public.roles r WHERE r.nombre = 'instructor'
    ON CONFLICT DO NOTHING;
    IF v_anterior.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profesionales WHERE usuario_id = v_anterior.id) THEN
        DELETE FROM public.usuario_roles ur USING public.roles r
         WHERE ur.rol_id = r.id AND r.nombre = 'instructor' AND ur.usuario_id = v_anterior.id;
    END IF;

    INSERT INTO public.auditoria_usuarios (usuario_id, admin_id, tipo, texto)
    VALUES (v_nueva.id, auth.uid(), 'rol', 'Enlazada a la ficha de profesional "' || v_ficha.slug || '" · + instructor');
    IF v_anterior.id IS NOT NULL THEN
        INSERT INTO public.auditoria_usuarios (usuario_id, admin_id, tipo, texto)
        VALUES (v_anterior.id, auth.uid(), 'rol', 'La ficha "' || v_ficha.slug || '" pasó a otra cuenta');
    END IF;

    INSERT INTO public.notificaciones (usuario_id, tipo, texto_es, texto_en, link)
    VALUES (v_nueva.id, 'mensaje',
            'Tu panel de profesional ya está activo. Revisa tu horario en Agenda/Disponibilidad.',
            'Your professional panel is now active. Check your hours in Schedule/Availability.',
            '/instructor/agenda');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_enlazar_profesional(INT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_enlazar_profesional(INT, TEXT, TEXT) TO authenticated;
