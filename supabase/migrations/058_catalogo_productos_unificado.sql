-- 058 · Un solo catálogo de libros y videos (2026-09-28, decidido con la
-- usuaria): la base (productos_digitales) manda sobre la Tienda y sobre
-- /recursos, que pasa a ser una vitrina de los mismos productos. Los títulos
-- que solo existían en /recursos se guardan como productos OCULTOS a nombre
-- de la Dra. Ana Rivas (profesional 4), para completarlos (precio, archivo)
-- y publicarlos después. "Vínculos sanos" ya existía (pd1).
--
-- - textos (JSONB): titulo_en, descripcion_en, duracion (videos, "20:00").
-- - actualizado_en: fecha que muestra la ficha del producto.
-- - admin_guardar_producto: editar título, descripción, categoría, precio y
--   tipo (solo si aún no tiene archivo).
-- - admin_actualizar_producto: ya no activa un producto sin archivo o sin precio.

ALTER TABLE public.productos_digitales ADD COLUMN IF NOT EXISTS textos JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.productos_digitales ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now();
GRANT SELECT (textos, actualizado_en) ON public.productos_digitales TO anon, authenticated;

UPDATE public.productos_digitales p SET textos = v.textos
FROM (VALUES
  ('pd1', '{"titulo_en":"Healthy bonds","descripcion_en":"Digital book on attachment and healthy relationships."}'::jsonb),
  ('pd2', '{"titulo_en":"Anxiety management guide","descripcion_en":"Practical PDF guide with breathing and grounding exercises."}'::jsonb),
  ('pd3', '{"titulo_en":"Guided meditations · Vol. 1","descripcion_en":"A series of guided video meditations of 10 to 20 minutes."}'::jsonb),
  ('pd4', '{"titulo_en":"Workshop: Emotional journal","descripcion_en":"Video recording of the workshop with a downloadable template."}'::jsonb),
  ('pd5', '{"titulo_en":"Couple communication guide","descripcion_en":"Draft guide on assertive communication as a couple."}'::jsonb)
) AS v(clave, textos)
WHERE p.clave = v.clave AND p.textos = '{}'::jsonb;

-- Títulos que venían de /recursos (sin archivo, ocultos). Precio en centavos;
-- los dos que el Home mostraba como destacados no tenían precio (0).
INSERT INTO public.productos_digitales (clave, slug, tipo, titulo, descripcion, precio, moneda, estado, categoria, profesional_id, descarga_permitida, textos)
VALUES
  ('pd6',  'autocuidado-limites', 'video',     'Autocuidado: aprende a poner límites', 'Pequeños límites pueden hacer más espacio para lo que importa.', 0,    'USD', 'inactivo', 'Autoconocimiento', 4, false,
   '{"titulo_en":"Self-care: learning to set boundaries","descripcion_en":"Small boundaries can make more room for what matters."}'),
  ('pd7',  'sanar-soltar',        'libro_pdf', 'Sanar para soltar', 'Una guía amable para cerrar ciclos y volver a empezar.', 0, 'USD', 'inactivo', 'Bienestar', 4, true,
   '{"titulo_en":"Healing to let go","descripcion_en":"A gentle guide to closing cycles and beginning again."}'),
  ('pd8',  'respira-calma',       'libro_pdf', 'Respira: guía para la calma', 'Libro digital con prácticas de respiración para recuperar la calma.', 1200, 'USD', 'inactivo', 'Bienestar', 4, true,
   '{"titulo_en":"Breathe: a guide to calm","descripcion_en":"Digital book with breathing practices to regain calm."}'),
  ('pd9',  'quererme-bien',       'libro_pdf', 'Quererme bien', 'Libro digital para fortalecer la autoestima y el autocuidado.', 1100, 'USD', 'inactivo', 'Autoconocimiento', 4, true,
   '{"titulo_en":"Loving myself","descripcion_en":"Digital book to strengthen self-esteem and self-care."}'),
  ('pd10', 'dormir-mejor-libro',  'libro_pdf', 'Aprende a dormir mejor', 'Libro digital con hábitos y rutinas para un mejor descanso.', 1000, 'USD', 'inactivo', 'Bienestar', 4, true,
   '{"titulo_en":"Sleep better","descripcion_en":"Digital book with habits and routines for better rest."}'),
  ('pd11', 'mindfulness-20',      'video',     'Mindfulness en 20 minutos', 'Práctica guiada de mindfulness para hacer en 20 minutos.', 900, 'USD', 'inactivo', 'Bienestar', 4, false,
   '{"titulo_en":"Mindfulness in 20 min","descripcion_en":"A guided mindfulness practice you can do in 20 minutes.","duracion":"20:00"}'),
  ('pd12', 'rutina-dormir',       'video',     'Rutina para dormir', 'Rutina guiada en video para preparar el cuerpo y la mente para dormir.', 800, 'USD', 'inactivo', 'Bienestar', 4, false,
   '{"titulo_en":"Sleep routine","descripcion_en":"A guided video routine to prepare body and mind for sleep.","duracion":"15:00"}'),
  ('pd13', 'respiracion-calma',   'video',     'Respiración para la calma', 'Ejercicios de respiración guiados para bajar la ansiedad.', 700, 'USD', 'inactivo', 'Bienestar', 4, false,
   '{"titulo_en":"Breathing for calm","descripcion_en":"Guided breathing exercises to ease anxiety.","duracion":"12:00"}'),
  ('pd14', 'estres-diario',       'video',     'Manejar el estrés diario', 'Herramientas prácticas en video para manejar el estrés del día a día.', 900, 'USD', 'inactivo', 'Bienestar', 4, false,
   '{"titulo_en":"Managing daily stress","descripcion_en":"Practical video tools to manage everyday stress.","duracion":"18:00"}')
ON CONFLICT (clave) DO NOTHING;

-- Activar exige archivo y precio (antes se podía vender algo sin archivo).
CREATE OR REPLACE FUNCTION public.admin_actualizar_producto(
    p_producto_id INT, p_activo BOOLEAN DEFAULT NULL, p_profesional_id INT DEFAULT NULL, p_descarga BOOLEAN DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_producto RECORD;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    SELECT * INTO v_producto FROM public.productos_digitales WHERE id = p_producto_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto no existe.';
    END IF;
    IF p_profesional_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profesionales WHERE id = p_profesional_id) THEN
        RAISE EXCEPTION 'La profesional no existe.';
    END IF;
    IF p_activo IS TRUE AND v_producto.estado <> 'activo' THEN
        IF v_producto.archivo_url IS NULL THEN
            RAISE EXCEPTION 'Antes de activarlo, la profesional responsable debe subir el archivo en "Mis productos".';
        END IF;
        IF v_producto.precio <= 0 THEN
            RAISE EXCEPTION 'Ponle un precio antes de activarlo (botón Editar).';
        END IF;
    END IF;
    UPDATE public.productos_digitales
       SET estado = CASE WHEN p_activo IS NULL THEN estado WHEN p_activo THEN 'activo' ELSE 'inactivo' END,
           profesional_id = COALESCE(p_profesional_id, profesional_id),
           descarga_permitida = COALESCE(p_descarga, descarga_permitida),
           actualizado_en = now()
     WHERE id = p_producto_id;
END;
$$;

-- Datos del producto para el formulario del admin (incluye los ocultos).
CREATE OR REPLACE FUNCTION public.admin_producto(p_producto_id INT)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    RETURN (SELECT json_build_object(
        'id', p.id, 'clave', p.clave, 'tipo', p.tipo, 'titulo', p.titulo, 'descripcion', p.descripcion,
        'categoria', p.categoria, 'precio', p.precio, 'textos', p.textos, 'tieneArchivo', p.archivo_url IS NOT NULL
    ) FROM public.productos_digitales p WHERE p.id = p_producto_id);
END;
$$;

-- Editar título, descripción (ES/EN), categoría, precio (USD) y tipo.
CREATE OR REPLACE FUNCTION public.admin_guardar_producto(p_producto_id INT, p_datos JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_producto RECORD;
    v_titulo TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'titulo', '')), '');
    v_descripcion TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'descripcion', '')), '');
    v_categoria TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'categoria', '')), '');
    v_tipo TEXT := COALESCE(p_datos ->> 'tipo', '');
    v_duracion TEXT := NULLIF(btrim(COALESCE(p_datos ->> 'duracion', '')), '');
    v_precio NUMERIC;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    SELECT * INTO v_producto FROM public.productos_digitales WHERE id = p_producto_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto no existe.';
    END IF;
    BEGIN
        v_precio := (p_datos ->> 'precio')::numeric;
    EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'El precio debe ser un número.';
    END;
    IF v_titulo IS NULL OR v_descripcion IS NULL THEN
        RAISE EXCEPTION 'Completa el título y la descripción en español.';
    END IF;
    IF length(v_titulo) > 120 OR length(v_descripcion) > 1000 OR length(COALESCE(v_categoria, '')) > 60 THEN
        RAISE EXCEPTION 'Un texto es demasiado largo.';
    END IF;
    IF v_precio IS NULL OR v_precio < 0 OR v_precio > 1000 THEN
        RAISE EXCEPTION 'Revisa el precio.';
    END IF;
    IF v_precio = 0 AND v_producto.estado = 'activo' THEN
        RAISE EXCEPTION 'Un producto activo necesita precio.';
    END IF;
    IF v_tipo NOT IN ('video', 'libro_pdf') THEN
        RAISE EXCEPTION 'Tipo no válido.';
    END IF;
    IF v_tipo <> v_producto.tipo AND v_producto.archivo_url IS NOT NULL THEN
        RAISE EXCEPTION 'No se puede cambiar el tipo de un producto que ya tiene archivo.';
    END IF;
    IF v_duracion IS NOT NULL AND v_duracion !~ '^\d{1,3}:\d{2}$' THEN
        RAISE EXCEPTION 'La duración va como minutos:segundos, p. ej. 20:00.';
    END IF;

    UPDATE public.productos_digitales
       SET titulo = v_titulo, descripcion = v_descripcion, categoria = v_categoria, tipo = v_tipo,
           precio = round(v_precio * 100),
           textos = jsonb_strip_nulls(jsonb_build_object(
               'titulo_en', NULLIF(btrim(p_datos ->> 'titulo_en'), ''),
               'descripcion_en', NULLIF(btrim(p_datos ->> 'descripcion_en'), ''),
               'duracion', CASE WHEN v_tipo = 'video' THEN v_duracion END)),
           actualizado_en = now()
     WHERE id = p_producto_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_producto(INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_guardar_producto(INT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_producto(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_guardar_producto(INT, JSONB) TO authenticated;
