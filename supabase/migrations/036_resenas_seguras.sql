-- Migración: reglas seguras para las reseñas (`calificaciones`).
-- Antes cualquier usuario con sesión podía crear una reseña a nombre de otro
-- y sobre cualquier cita, y la lectura pública mostraba también las
-- pendientes de moderación y las ocultas.
-- Ahora: solo el paciente de una cita completada, una reseña por cita, que
-- entra como 'pendiente'; el público solo ve las aprobadas; el autor y la
-- profesional reseñada ven las suyas.

CREATE UNIQUE INDEX IF NOT EXISTS calificaciones_cita_uniq ON public.calificaciones (cita_id);

DROP POLICY IF EXISTS "Usuarios crean calificaciones" ON public.calificaciones;
CREATE POLICY "Pacientes resenan sus citas completadas" ON public.calificaciones FOR INSERT TO authenticated
    WITH CHECK (
        usuario_id = (SELECT auth.uid())
        AND estado = 'pendiente'
        AND EXISTS (
            SELECT 1 FROM public.citas c
            WHERE c.id = calificaciones.cita_id
              AND c.usuario_id = (SELECT auth.uid())
              AND c.estado = 'completada'
              AND c.profesional_id = calificaciones.profesional_id
              AND (calificaciones.servicio_id IS NULL OR c.servicio_id = calificaciones.servicio_id)
        )
    );

DROP POLICY IF EXISTS "Lectura publica de calificaciones" ON public.calificaciones;
CREATE POLICY "Lectura publica de resenas aprobadas" ON public.calificaciones FOR SELECT
    USING (estado = 'aprobado');
CREATE POLICY "Autores y profesionales ven sus resenas" ON public.calificaciones FOR SELECT TO authenticated
    USING (usuario_id = (SELECT auth.uid()) OR profesional_id = public.mi_profesional_id());
