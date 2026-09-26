-- Migración: las clases de vista previa solo son públicas si su curso está
-- publicado (con 027 se veían también las de cursos en borrador).

DROP POLICY IF EXISTS "Vista previa e inscritos leen clases" ON public.clases;
CREATE POLICY "Vista previa e inscritos leen clases" ON public.clases FOR SELECT
    USING (
        estado = 'activo' AND EXISTS (
            SELECT 1 FROM public.modulos m JOIN public.cursos c ON c.id = m.curso_id
            WHERE m.id = clases.modulo_id
              AND ((clases.vista_previa AND c.estado = 'publicado') OR public.tengo_acceso_curso(c.id))
        )
    );
