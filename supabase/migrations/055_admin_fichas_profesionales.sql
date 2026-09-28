-- 055 · Fichas de profesionales desde el admin (2026-09-28, decidido con la
-- usuaria): la profesional se registra en el sitio (queda como paciente) y la
-- administración crea su ficha enlazada a esa cuenta; con eso recibe el rol
-- 'instructor' y su panel. También se puede enlazar una ficha existente a otra
-- cuenta (las 5 fichas iniciales usan cuentas internas @psiqueamor.test).
--
-- Textos bilingües en `profesionales.perfil` (JSONB): especialidad_en,
-- descripcion_en, modalidad_es/en, bio_es/en, experiencia_es/en,
-- enfoques_es/en (listas) y formacion (lista). `especialidad` y `descripcion`
-- siguen siendo el texto en español.

ALTER TABLE public.profesionales ADD COLUMN IF NOT EXISTS perfil JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Textos en inglés y modalidad de las 6 fichas actuales (los del catálogo del sitio).
UPDATE public.profesionales p SET perfil = v.perfil
FROM (VALUES
  ('laura-mendez',   '{"especialidad_en":"Clinical psychology","descripcion_en":"A space to understand yourself, calmly.","modalidad_es":"Online y presencial","modalidad_en":"Online and in-person"}'::jsonb),
  ('valentina-rios', '{"especialidad_en":"Couples & bonds","descripcion_en":"Conversations that open new possibilities.","modalidad_es":"Online","modalidad_en":"Online"}'::jsonb),
  ('sofia-herrera',  '{"especialidad_en":"Emotional wellbeing","descripcion_en":"Tools to return to yourself.","modalidad_es":"Presencial","modalidad_en":"In-person"}'::jsonb),
  ('ana-rivas',      '{"especialidad_en":"Anxiety & stress","descripcion_en":"Practical tools to manage everyday anxiety.","modalidad_es":"Online","modalidad_en":"Online"}'::jsonb),
  ('carlos-mora',    '{"especialidad_en":"Couples therapy","descripcion_en":"Support to strengthen communication as a couple.","modalidad_es":"Online","modalidad_en":"Online"}'::jsonb),
  ('lucia-pena',     '{"especialidad_en":"Child therapy","descripcion_en":"A warm, playful approach to children''s wellbeing.","modalidad_es":"Presencial","modalidad_en":"In-person"}'::jsonb)
) AS v(slug, perfil)
WHERE p.slug = v.slug AND p.perfil = '{}'::jsonb;

-- Vista pública: se agregan (al final) el perfil y los servicios / sedes que ofrece.
CREATE OR REPLACE VIEW public.profesionales_publicos AS
SELECT p.id,
       p.slug,
       p.especialidad,
       p.descripcion,
       u.nombre,
       u.foto,
       p.perfil,
       COALESCE((SELECT array_agg(s.slug ORDER BY s.id) FROM public.profesional_servicio ps
                 JOIN public.servicios s ON s.id = ps.servicio_id WHERE ps.profesional_id = p.id), ARRAY[]::text[]) AS servicios,
       COALESCE((SELECT array_agg(l.slug ORDER BY l.id) FROM public.profesional_lugar pl
                 JOIN public.lugares l ON l.id = pl.lugar_id WHERE pl.profesional_id = p.id), ARRAY[]::text[]) AS sedes
FROM public.profesionales p
LEFT JOIN public.usuarios u ON u.id = p.usuario_id
WHERE p.estado = 'activo';

-- La profesional puede editar su ficha (política de 004), pero no cambiar a
-- quién pertenece, su dirección pública ni si está activa: eso es del admin.
CREATE OR REPLACE FUNCTION public.proteger_ficha_profesional()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF (SELECT auth.uid()) IS NOT NULL AND NOT public.es_admin()
       AND (NEW.usuario_id IS DISTINCT FROM OLD.usuario_id OR NEW.slug IS DISTINCT FROM OLD.slug OR NEW.estado IS DISTINCT FROM OLD.estado) THEN
        RAISE EXCEPTION 'Solo la administración puede cambiar la cuenta, la dirección o el estado de la ficha.';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_proteger_ficha_profesional ON public.profesionales;
CREATE TRIGGER trg_proteger_ficha_profesional BEFORE UPDATE ON public.profesionales
    FOR EACH ROW EXECUTE FUNCTION public.proteger_ficha_profesional();

-- Perfil limpio a partir de lo que manda el formulario (solo claves conocidas).
CREATE OR REPLACE FUNCTION public.perfil_profesional_limpio(p_datos JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
    SELECT jsonb_strip_nulls(jsonb_build_object(
        'especialidad_en', NULLIF(btrim(p_datos ->> 'especialidad_en'), ''),
        'descripcion_en',  NULLIF(btrim(p_datos ->> 'descripcion_en'), ''),
        'modalidad_es',    NULLIF(btrim(p_datos ->> 'modalidad_es'), ''),
        'modalidad_en',    NULLIF(btrim(p_datos ->> 'modalidad_en'), ''),
        'bio_es',          NULLIF(btrim(p_datos ->> 'bio_es'), ''),
        'bio_en',          NULLIF(btrim(p_datos ->> 'bio_en'), ''),
        'experiencia_es',  NULLIF(btrim(p_datos ->> 'experiencia_es'), ''),
        'experiencia_en',  NULLIF(btrim(p_datos ->> 'experiencia_en'), ''),
        'enfoques_es',     (SELECT jsonb_agg(btrim(x)) FROM jsonb_array_elements_text(COALESCE(p_datos -> 'enfoques_es', '[]')) x WHERE btrim(x) <> ''),
        'enfoques_en',     (SELECT jsonb_agg(btrim(x)) FROM jsonb_array_elements_text(COALESCE(p_datos -> 'enfoques_en', '[]')) x WHERE btrim(x) <> ''),
        'formacion',       (SELECT jsonb_agg(btrim(x)) FROM jsonb_array_elements_text(COALESCE(p_datos -> 'formacion', '[]')) x WHERE btrim(x) <> '')
    ));
$$;

-- Servicios y sedes de una ficha (reemplaza los anteriores).
CREATE OR REPLACE FUNCTION public.guardar_servicios_sedes_profesional(p_id INT, p_datos JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_servicios INT[] := ARRAY(SELECT (x)::int FROM jsonb_array_elements_text(COALESCE(p_datos -> 'servicios', '[]')) x);
    v_sedes INT[] := ARRAY(SELECT (x)::int FROM jsonb_array_elements_text(COALESCE(p_datos -> 'sedes', '[]')) x);
BEGIN
    IF cardinality(v_servicios) = 0 THEN
        RAISE EXCEPTION 'Elige al menos un servicio.';
    END IF;
    DELETE FROM public.profesional_servicio WHERE profesional_id = p_id;
    INSERT INTO public.profesional_servicio (profesional_id, servicio_id)
    SELECT p_id, s.id FROM public.servicios s WHERE s.id = ANY (v_servicios);
    DELETE FROM public.profesional_lugar WHERE profesional_id = p_id;
    INSERT INTO public.profesional_lugar (profesional_id, lugar_id)
    SELECT p_id, l.id FROM public.lugares l WHERE l.id = ANY (v_sedes);
END;
$$;
REVOKE ALL ON FUNCTION public.guardar_servicios_sedes_profesional(INT, JSONB) FROM PUBLIC, anon, authenticated;

-- Listado para el admin: todas las fichas (activas e inactivas) y el catálogo.
CREATE OR REPLACE FUNCTION public.admin_profesionales()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    RETURN json_build_object(
        'fichas', COALESCE((
            SELECT json_agg(f ORDER BY f.id) FROM (
                SELECT p.id, p.slug, p.especialidad, p.descripcion, p.estado, p.perfil,
                       u.nombre, u.email AS correo, u.foto,
                       (u.email ILIKE '%@psiqueamor.test') AS "cuentaInterna",
                       COALESCE((SELECT array_agg(ps.servicio_id ORDER BY ps.servicio_id) FROM public.profesional_servicio ps WHERE ps.profesional_id = p.id), ARRAY[]::int[]) AS servicios,
                       COALESCE((SELECT array_agg(pl.lugar_id ORDER BY pl.lugar_id) FROM public.profesional_lugar pl WHERE pl.profesional_id = p.id), ARRAY[]::int[]) AS sedes,
                       (SELECT count(*) FROM public.citas c WHERE c.profesional_id = p.id) AS citas,
                       (SELECT count(*) FROM public.cursos c WHERE c.profesional_id = p.id) AS cursos,
                       EXISTS (SELECT 1 FROM public.horarios h WHERE h.profesional_id = p.id) AS "tieneHorario"
                FROM public.profesionales p
                LEFT JOIN public.usuarios u ON u.id = p.usuario_id
            ) f
        ), '[]'::json),
        'servicios', COALESCE((SELECT json_agg(json_build_object('id', s.id, 'slug', s.slug, 'nombre', s.nombre) ORDER BY s.id) FROM public.servicios s WHERE s.estado = 'activo'), '[]'::json),
        'sedes', COALESCE((SELECT json_agg(json_build_object('id', l.id, 'slug', l.slug, 'nombre', l.nombre) ORDER BY l.id) FROM public.lugares l WHERE l.estado = 'activo'), '[]'::json)
    );
END;
$$;

-- Dirección pública (slug) a partir del nombre: sin tildes ni títulos, única.
CREATE OR REPLACE FUNCTION public.slug_profesional(p_nombre TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    v_base TEXT;
    v_slug TEXT;
    v_n INT := 1;
BEGIN
    v_base := lower(translate(COALESCE(p_nombre, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));
    v_base := regexp_replace(v_base, '^(dra?|lic|licda|psic|mg|msc)\.?\s+', '');
    v_base := btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-');
    IF v_base = '' THEN v_base := 'profesional'; END IF;
    v_slug := v_base;
    WHILE EXISTS (SELECT 1 FROM public.profesionales WHERE slug = v_slug) LOOP
        v_n := v_n + 1;
        v_slug := v_base || '-' || v_n;
    END LOOP;
    RETURN v_slug;
END;
$$;
REVOKE ALL ON FUNCTION public.slug_profesional(TEXT) FROM PUBLIC, anon, authenticated;

-- Crea la ficha de una cuenta ya registrada y le da el rol 'instructor'.
-- Horario inicial L–V 9–17 y sábado 9–13 (lo ajusta ella en Agenda/Disponibilidad).
CREATE OR REPLACE FUNCTION public.admin_crear_profesional(p_correo TEXT, p_datos JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_usuario RECORD;
    v_nombre TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'nombre', '')), '');
    v_especialidad TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'especialidad', '')), '');
    v_descripcion TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'descripcion', '')), '');
    v_id INT;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    SELECT id, nombre, estado INTO v_usuario FROM public.usuarios WHERE lower(email) = lower(btrim(p_correo));
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay ninguna cuenta con ese correo. La profesional debe registrarse primero en "Crear cuenta".';
    END IF;
    IF v_usuario.estado <> 'activo' THEN
        RAISE EXCEPTION 'Esa cuenta no está activa.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profesionales WHERE usuario_id = v_usuario.id) THEN
        RAISE EXCEPTION 'Esa cuenta ya tiene una ficha de profesional.';
    END IF;
    IF v_especialidad IS NULL OR v_descripcion IS NULL THEN
        RAISE EXCEPTION 'Completa la especialidad y la descripción en español.';
    END IF;
    IF length(v_especialidad) > 80 OR length(v_descripcion) > 300 OR length(COALESCE(v_nombre, '')) > 120 THEN
        RAISE EXCEPTION 'Un texto es demasiado largo.';
    END IF;

    -- El nombre público es el de la cuenta; si el admin lo escribe (p. ej. con "Dra."), se actualiza.
    IF v_nombre IS NOT NULL THEN
        UPDATE public.usuarios SET nombre = v_nombre WHERE id = v_usuario.id;
    ELSIF COALESCE(btrim(v_usuario.nombre), '') = '' THEN
        RAISE EXCEPTION 'Escribe el nombre público de la profesional.';
    END IF;

    INSERT INTO public.profesionales (usuario_id, especialidad, descripcion, estado, slug, perfil)
    VALUES (v_usuario.id, v_especialidad, v_descripcion, 'activo',
            public.slug_profesional(COALESCE(v_nombre, v_usuario.nombre)), public.perfil_profesional_limpio(p_datos))
    RETURNING id INTO v_id;

    PERFORM public.guardar_servicios_sedes_profesional(v_id, p_datos);

    INSERT INTO public.horarios (profesional_id, dia_semana, hora_inicio, hora_fin)
    SELECT v_id, d, '09:00', CASE WHEN d = 6 THEN '13:00'::time ELSE '17:00'::time END
    FROM generate_series(1, 6) d;

    INSERT INTO public.usuario_roles (usuario_id, rol_id)
    SELECT v_usuario.id, r.id FROM public.roles r WHERE r.nombre = 'instructor'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.auditoria_usuarios (usuario_id, admin_id, tipo, texto)
    VALUES (v_usuario.id, auth.uid(), 'rol', 'Ficha de profesional creada (' || v_especialidad || ') · + instructor');

    INSERT INTO public.notificaciones (usuario_id, tipo, texto_es, texto_en, link)
    VALUES (v_usuario.id, 'mensaje',
            'Tu panel de profesional ya está activo. Revisa tu horario en Agenda/Disponibilidad.',
            'Your professional panel is now active. Check your hours in Schedule/Availability.',
            '/instructor/agenda');
    RETURN v_id;
END;
$$;

-- Edita una ficha: nombre público, textos, estado, servicios y sedes.
CREATE OR REPLACE FUNCTION public.admin_actualizar_profesional(p_id INT, p_datos JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_ficha RECORD;
    v_nombre TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'nombre', '')), '');
    v_especialidad TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'especialidad', '')), '');
    v_descripcion TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'descripcion', '')), '');
    v_estado TEXT := COALESCE(p_datos ->> 'estado', 'activo');
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    SELECT * INTO v_ficha FROM public.profesionales WHERE id = p_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La ficha no existe.';
    END IF;
    IF v_especialidad IS NULL OR v_descripcion IS NULL OR v_nombre IS NULL THEN
        RAISE EXCEPTION 'Completa el nombre, la especialidad y la descripción en español.';
    END IF;
    IF length(v_especialidad) > 80 OR length(v_descripcion) > 300 OR length(v_nombre) > 120 THEN
        RAISE EXCEPTION 'Un texto es demasiado largo.';
    END IF;
    IF v_estado NOT IN ('activo', 'inactivo') THEN
        RAISE EXCEPTION 'Estado no válido.';
    END IF;

    UPDATE public.usuarios SET nombre = v_nombre WHERE id = v_ficha.usuario_id;
    UPDATE public.profesionales
       SET especialidad = v_especialidad, descripcion = v_descripcion, estado = v_estado,
           perfil = public.perfil_profesional_limpio(p_datos)
     WHERE id = p_id;
    PERFORM public.guardar_servicios_sedes_profesional(p_id, p_datos);

    IF v_estado IS DISTINCT FROM v_ficha.estado THEN
        INSERT INTO public.auditoria_usuarios (usuario_id, admin_id, tipo, texto)
        VALUES (v_ficha.usuario_id, auth.uid(), 'cuenta',
                CASE WHEN v_estado = 'activo' THEN 'Ficha de profesional publicada' ELSE 'Ficha de profesional oculta del sitio' END);
    END IF;
END;
$$;

-- Pasa una ficha (con su agenda, citas, cursos y productos) a otra cuenta ya
-- registrada. La cuenta anterior pierde el rol 'instructor' si ya no tiene ficha.
CREATE OR REPLACE FUNCTION public.admin_enlazar_profesional(p_id INT, p_correo TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_ficha RECORD;
    v_nueva RECORD;
    v_anterior RECORD;
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
    -- Conserva el nombre y la foto públicos si la cuenta nueva no los tiene.
    UPDATE public.usuarios
       SET nombre = COALESCE(NULLIF(btrim(nombre), ''), v_anterior.nombre),
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

REVOKE ALL ON FUNCTION public.admin_profesionales() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_crear_profesional(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_actualizar_profesional(INT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_enlazar_profesional(INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_profesionales() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_crear_profesional(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_profesional(INT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_enlazar_profesional(INT, TEXT) TO authenticated;
