-- 045 · Borra los 2 cursos de la semilla original que no existen en el sitio
-- (en COP, sin profesional, sin módulos, inscripciones ni órdenes). Pedido por
-- la usuaria el 2026-09-27. También se quitaron de supabase/seed.sql.
DELETE FROM public.cursos
WHERE slug IN ('autoestima-crecimiento', 'habilidades-comunicacion')
  AND profesional_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.modulos m WHERE m.curso_id = cursos.id)
  AND NOT EXISTS (SELECT 1 FROM public.inscripciones i WHERE i.curso_id = cursos.id);
