-- Migración: claves estables y perfil público de profesionales
--
-- 1. `slug` en profesionales y lugares: el frontend identifica servicios,
--    profesionales y sedes por su key (SERVICIOS_PUBLICOS, PROFESIONALES_PUBLICOS,
--    SEDES); con el slug el wizard /agendar resuelve los IDs reales en vez de
--    usar la posición en el array.
-- 2. Vista `profesionales_publicos`: el nombre y la foto de cada profesional viven
--    en `usuarios` (vinculado a su cuenta de auth), cuya RLS solo deja ver el perfil
--    propio. La vista corre con los permisos de su dueño y expone únicamente columnas
--    públicas (nunca email ni teléfono) de profesionales activos.

ALTER TABLE public.profesionales ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE public.lugares ADD COLUMN slug TEXT UNIQUE;

CREATE VIEW public.profesionales_publicos AS
SELECT
    p.id,
    p.slug,
    p.especialidad,
    p.descripcion,
    u.nombre,
    u.foto
FROM public.profesionales p
LEFT JOIN public.usuarios u ON u.id = p.usuario_id
WHERE p.estado = 'activo';

REVOKE ALL ON public.profesionales_publicos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profesionales_publicos TO anon, authenticated;
