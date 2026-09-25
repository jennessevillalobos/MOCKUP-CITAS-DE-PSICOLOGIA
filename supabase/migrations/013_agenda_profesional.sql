-- Migración: agenda del profesional editable desde "Agenda / Disponibilidad"
--
-- 1. Bloqueos: un rango de días se guarda como una fila por día que comparten
--    `grupo_id` (así se muestra como un solo bloqueo); `motivo` es el texto que
--    ve el profesional. Las Edge Functions siguen leyendo `fecha`/`tipo`/horas.
-- 2. RLS: cada profesional gestiona su propio horario y sus bloqueos, vinculado
--    por profesionales.usuario_id = auth.uid(). Las Edge Functions leen con service_role.

ALTER TABLE public.excepciones_horario ADD COLUMN motivo TEXT;
ALTER TABLE public.excepciones_horario ADD COLUMN grupo_id UUID;
CREATE INDEX idx_excepciones_horario_grupo ON public.excepciones_horario (grupo_id);

CREATE POLICY "Profesionales gestionan su horario" ON public.horarios
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = horarios.profesional_id AND p.usuario_id = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = horarios.profesional_id AND p.usuario_id = (SELECT auth.uid())));

CREATE POLICY "Profesionales gestionan sus excepciones" ON public.excepciones_horario
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = excepciones_horario.profesional_id AND p.usuario_id = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = excepciones_horario.profesional_id AND p.usuario_id = (SELECT auth.uid())));
