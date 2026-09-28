-- 057 · Servicios y sedes desde el admin (2026-09-28): la base pasa a mandar
-- sobre el catálogo del sitio (igual que las fichas de profesionales, 055).
-- - servicios.textos (JSONB): nombre_en, descripcion_en, modalidad_es/en.
--   Precio y duración siguen en servicio_modalidad (misma tarifa para
--   presencial y virtual, que son las modalidades que ofrece /agendar).
-- - lugares.direccion_en para la dirección en inglés.
-- - No se borran: se ocultan con `estado` (hay citas que los referencian).
-- - Un servicio o sede nuevo se asigna a todas las profesionales activas;
--   cada ficha se ajusta después en Admin → Profesionales.

ALTER TABLE public.servicios ADD COLUMN IF NOT EXISTS textos JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.lugares ADD COLUMN IF NOT EXISTS direccion_en TEXT;

UPDATE public.servicios s SET textos = v.textos
FROM (VALUES
  ('individual',   '{"nombre_en":"Individual therapy","descripcion_en":"Personalized sessions for anxiety, stress and personal growth.","modalidad_es":"En línea / Presencial","modalidad_en":"Online / In-person"}'::jsonb),
  ('pareja',       '{"nombre_en":"Couples therapy","descripcion_en":"Tools to improve communication and rebuild bonds.","modalidad_es":"Presencial","modalidad_en":"In-person"}'::jsonb),
  ('infantil',     '{"nombre_en":"Child therapy","descripcion_en":"Emotional support for children with a playful, warm approach.","modalidad_es":"Presencial","modalidad_en":"In-person"}'::jsonb),
  ('orientacion',  '{"nombre_en":"Career guidance","descripcion_en":"Discover your career path with assessment and guidance.","modalidad_es":"En línea","modalidad_en":"Online"}'::jsonb),
  ('familiar',     '{"nombre_en":"Family therapy","descripcion_en":"Sessions with the family system to resolve conflict and strengthen bonds.","modalidad_es":"Presencial","modalidad_en":"In-person"}'::jsonb),
  ('ansiedad',     '{"nombre_en":"Anxiety management","descripcion_en":"Program focused on techniques to reduce anxiety and stress.","modalidad_es":"En línea / Presencial","modalidad_en":"Online / In-person"}'::jsonb),
  ('duelo',        '{"nombre_en":"Grief support","descripcion_en":"A safe space to move through loss at your own pace.","modalidad_es":"En línea","modalidad_en":"Online"}'::jsonb),
  ('evaluacion',   '{"nombre_en":"Psychological assessment","descripcion_en":"Initial assessment with report and a personalized plan.","modalidad_es":"En línea","modalidad_en":"Online"}'::jsonb),
  ('adolescentes', '{"nombre_en":"Teen therapy","descripcion_en":"Support for teenagers through stages of change.","modalidad_es":"En línea / Presencial","modalidad_en":"Online / In-person"}'::jsonb)
) AS v(slug, textos)
WHERE s.slug = v.slug AND s.textos = '{}'::jsonb;

UPDATE public.lugares SET direccion_en = 'Av. Principal, Torre A, 5th floor' WHERE slug = 'caracas' AND direccion_en IS NULL;
UPDATE public.lugares SET direccion_en = 'C.C. Bienestar, Unit 12' WHERE slug = 'valencia' AND direccion_en IS NULL;

-- La vista pública de profesionales solo lista servicios y sedes activos.
CREATE OR REPLACE VIEW public.profesionales_publicos AS
SELECT p.id,
       p.slug,
       p.especialidad,
       p.descripcion,
       u.nombre,
       u.foto,
       p.perfil,
       COALESCE((SELECT array_agg(s.slug ORDER BY s.id) FROM public.profesional_servicio ps
                 JOIN public.servicios s ON s.id = ps.servicio_id
                 WHERE ps.profesional_id = p.id AND s.estado = 'activo'), ARRAY[]::text[]) AS servicios,
       COALESCE((SELECT array_agg(l.slug ORDER BY l.id) FROM public.profesional_lugar pl
                 JOIN public.lugares l ON l.id = pl.lugar_id
                 WHERE pl.profesional_id = p.id AND l.estado = 'activo'), ARRAY[]::text[]) AS sedes
FROM public.profesionales p
LEFT JOIN public.usuarios u ON u.id = p.usuario_id
WHERE p.estado = 'activo';

-- No se reserva un servicio o una sede ocultos (las Edge Functions de reserva
-- solo miran la tarifa y el horario).
CREATE OR REPLACE FUNCTION public.validar_catalogo_cita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.servicios WHERE id = NEW.servicio_id AND estado <> 'activo') THEN
        RAISE EXCEPTION 'Ese servicio ya no está disponible.';
    END IF;
    IF NEW.lugar_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.lugares WHERE id = NEW.lugar_id AND estado <> 'activo') THEN
        RAISE EXCEPTION 'Esa sede ya no está disponible.';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validar_catalogo_cita ON public.citas;
CREATE TRIGGER trg_validar_catalogo_cita BEFORE INSERT ON public.citas
    FOR EACH ROW EXECUTE FUNCTION public.validar_catalogo_cita();

-- Slug único a partir de un nombre, para servicios o sedes.
CREATE OR REPLACE FUNCTION public.slug_catalogo(p_nombre TEXT, p_tabla TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    v_base TEXT;
    v_slug TEXT;
    v_n INT := 1;
    v_existe BOOLEAN;
BEGIN
    v_base := lower(translate(COALESCE(p_nombre, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));
    v_base := btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-');
    IF v_base = '' THEN v_base := p_tabla; END IF;
    v_slug := v_base;
    LOOP
        IF p_tabla = 'servicios' THEN
            v_existe := EXISTS (SELECT 1 FROM public.servicios WHERE slug = v_slug);
        ELSE
            v_existe := EXISTS (SELECT 1 FROM public.lugares WHERE slug = v_slug);
        END IF;
        EXIT WHEN NOT v_existe;
        v_n := v_n + 1;
        v_slug := v_base || '-' || v_n;
    END LOOP;
    RETURN v_slug;
END;
$$;
REVOKE ALL ON FUNCTION public.slug_catalogo(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Catálogo para el admin: servicios (con tarifa) y sedes, activos e inactivos.
CREATE OR REPLACE FUNCTION public.admin_catalogo()
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
        'servicios', COALESCE((
            SELECT json_agg(x ORDER BY x.id) FROM (
                SELECT s.id, s.slug, s.nombre, s.categoria, s.descripcion, s.imagen, s.estado, s.textos,
                       (SELECT sm.duracion_minutos FROM public.servicio_modalidad sm WHERE sm.servicio_id = s.id ORDER BY sm.modalidad_id LIMIT 1) AS duracion,
                       (SELECT sm.precio FROM public.servicio_modalidad sm WHERE sm.servicio_id = s.id ORDER BY sm.modalidad_id LIMIT 1) AS precio,
                       (SELECT count(*) FROM public.profesional_servicio ps JOIN public.profesionales p ON p.id = ps.profesional_id
                         WHERE ps.servicio_id = s.id AND p.estado = 'activo') AS profesionales,
                       (SELECT count(*) FROM public.citas c WHERE c.servicio_id = s.id) AS citas
                FROM public.servicios s
            ) x
        ), '[]'::json),
        'sedes', COALESCE((
            SELECT json_agg(x ORDER BY x.id) FROM (
                SELECT l.id, l.slug, l.nombre, l.ciudad, l.direccion, l.direccion_en, l.mapa_url, l.contacto, l.estado,
                       (SELECT count(*) FROM public.profesional_lugar pl JOIN public.profesionales p ON p.id = pl.profesional_id
                         WHERE pl.lugar_id = l.id AND p.estado = 'activo') AS profesionales,
                       (SELECT count(*) FROM public.citas c WHERE c.lugar_id = l.id) AS citas
                FROM public.lugares l
            ) x
        ), '[]'::json)
    );
END;
$$;

-- Crea (p_id NULL) o edita un servicio. Precio en unidades (USD) → centavos.
CREATE OR REPLACE FUNCTION public.admin_guardar_servicio(p_id INT, p_datos JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_nombre TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'nombre', '')), '');
    v_descripcion TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'descripcion', '')), '');
    v_categoria TEXT := COALESCE(p_datos ->> 'categoria', 'individual');
    v_imagen TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'imagen', '')), '');
    v_estado TEXT := COALESCE(p_datos ->> 'estado', 'activo');
    v_duracion INT;
    v_precio NUMERIC;
    v_id INT := p_id;
    v_textos JSONB;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    BEGIN
        v_duracion := (p_datos ->> 'duracion')::int;
        v_precio := (p_datos ->> 'precio')::numeric;
    EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Duración y precio deben ser números.';
    END;
    IF v_nombre IS NULL OR v_descripcion IS NULL THEN
        RAISE EXCEPTION 'Completa el nombre y la descripción en español.';
    END IF;
    IF length(v_nombre) > 80 OR length(v_descripcion) > 400 THEN
        RAISE EXCEPTION 'Un texto es demasiado largo.';
    END IF;
    IF v_categoria NOT IN ('individual', 'pareja', 'infantil', 'orientacion') THEN
        RAISE EXCEPTION 'Categoría no válida.';
    END IF;
    IF v_duracion IS NULL OR v_duracion < 15 OR v_duracion > 240 THEN
        RAISE EXCEPTION 'La duración debe estar entre 15 y 240 minutos.';
    END IF;
    IF v_precio IS NULL OR v_precio < 0 OR v_precio > 10000 THEN
        RAISE EXCEPTION 'Revisa el precio.';
    END IF;
    IF v_imagen IS NOT NULL AND v_imagen !~* '^https://' THEN
        RAISE EXCEPTION 'La imagen debe ser un enlace https://';
    END IF;
    IF v_estado NOT IN ('activo', 'inactivo') THEN
        RAISE EXCEPTION 'Estado no válido.';
    END IF;
    v_textos := jsonb_strip_nulls(jsonb_build_object(
        'nombre_en', NULLIF(btrim(p_datos ->> 'nombre_en'), ''),
        'descripcion_en', NULLIF(btrim(p_datos ->> 'descripcion_en'), ''),
        'modalidad_es', NULLIF(btrim(p_datos ->> 'modalidad_es'), ''),
        'modalidad_en', NULLIF(btrim(p_datos ->> 'modalidad_en'), '')
    ));

    IF v_id IS NULL THEN
        INSERT INTO public.servicios (nombre, categoria, descripcion, slug, imagen, estado, textos)
        VALUES (v_nombre, v_categoria, v_descripcion, public.slug_catalogo(v_nombre, 'servicios'), v_imagen, v_estado, v_textos)
        RETURNING id INTO v_id;
        INSERT INTO public.profesional_servicio (profesional_id, servicio_id)
        SELECT p.id, v_id FROM public.profesionales p WHERE p.estado = 'activo'
        ON CONFLICT DO NOTHING;
    ELSE
        UPDATE public.servicios
           SET nombre = v_nombre, categoria = v_categoria, descripcion = v_descripcion,
               imagen = v_imagen, estado = v_estado, textos = v_textos
         WHERE id = v_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El servicio no existe.';
        END IF;
    END IF;

    -- Misma tarifa en presencial y virtual.
    INSERT INTO public.servicio_modalidad (servicio_id, modalidad_id, duracion_minutos, precio, moneda)
    SELECT v_id, m.id, v_duracion, round(v_precio * 100), 'USD'
    FROM public.modalidades m
    WHERE m.nombre IN ('presencial', 'virtual')
      AND NOT EXISTS (SELECT 1 FROM public.servicio_modalidad sm WHERE sm.servicio_id = v_id AND sm.modalidad_id = m.id);
    UPDATE public.servicio_modalidad sm
       SET duracion_minutos = v_duracion, precio = round(v_precio * 100)
      FROM public.modalidades m
     WHERE sm.servicio_id = v_id AND m.id = sm.modalidad_id AND m.nombre IN ('presencial', 'virtual');
    RETURN v_id;
END;
$$;

-- Crea (p_id NULL) o edita una sede.
CREATE OR REPLACE FUNCTION public.admin_guardar_sede(p_id INT, p_datos JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_nombre TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'nombre', '')), '');
    v_ciudad TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'ciudad', '')), '');
    v_direccion TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'direccion', '')), '');
    v_direccion_en TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'direccion_en', '')), '');
    v_mapa TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'mapa_url', '')), '');
    v_contacto TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'contacto', '')), '');
    v_estado TEXT := COALESCE(p_datos ->> 'estado', 'activo');
    v_id INT := p_id;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF v_nombre IS NULL OR v_direccion IS NULL THEN
        RAISE EXCEPTION 'Completa el nombre y la dirección.';
    END IF;
    IF length(v_nombre) > 80 OR length(v_direccion) > 200 OR length(COALESCE(v_direccion_en, '')) > 200
       OR length(COALESCE(v_ciudad, '')) > 80 OR length(COALESCE(v_contacto, '')) > 120 THEN
        RAISE EXCEPTION 'Un texto es demasiado largo.';
    END IF;
    IF v_mapa IS NOT NULL AND v_mapa !~* '^https://' THEN
        RAISE EXCEPTION 'El enlace del mapa debe empezar con https://';
    END IF;
    IF v_estado NOT IN ('activo', 'inactivo') THEN
        RAISE EXCEPTION 'Estado no válido.';
    END IF;

    IF v_id IS NULL THEN
        INSERT INTO public.lugares (nombre, direccion, direccion_en, ciudad, mapa_url, contacto, estado, slug)
        VALUES (v_nombre, v_direccion, v_direccion_en, v_ciudad, v_mapa, v_contacto, v_estado, public.slug_catalogo(v_nombre, 'lugares'))
        RETURNING id INTO v_id;
        INSERT INTO public.profesional_lugar (profesional_id, lugar_id)
        SELECT p.id, v_id FROM public.profesionales p WHERE p.estado = 'activo'
        ON CONFLICT DO NOTHING;
    ELSE
        UPDATE public.lugares
           SET nombre = v_nombre, direccion = v_direccion, direccion_en = v_direccion_en, ciudad = v_ciudad,
               mapa_url = v_mapa, contacto = v_contacto, estado = v_estado
         WHERE id = v_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'La sede no existe.';
        END IF;
    END IF;
    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_catalogo() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_guardar_servicio(INT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_guardar_sede(INT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_catalogo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_guardar_servicio(INT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_guardar_sede(INT, JSONB) TO authenticated;
