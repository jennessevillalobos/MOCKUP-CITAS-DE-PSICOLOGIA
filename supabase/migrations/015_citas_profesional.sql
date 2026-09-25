-- Migración: "Mis citas" del profesional con sesión real
--
-- 1. Notas clínicas de la sesión (`notas_profesional`) y estado `no_asistio`.
-- 2. Transiciones: el profesional puede cerrar una sesión aunque el pago quede
--    pendiente (se cobra en consulta), marcar inasistencias, y una cita
--    reprogramada sigue su ciclo normal.
-- 3. Columnas editables por usuarios autenticados: estado, notas, fecha y hora
--    (precio, montos y vínculos solo vía Edge Functions). El paciente solo puede
--    cancelar su propia cita.
-- 4. El profesional ve y gestiona sus citas, y ve el contacto de sus pacientes.
-- 5. `notas_paciente`: notas generales del profesional sobre un paciente.

ALTER TABLE public.citas ADD COLUMN notas_profesional TEXT;
ALTER TABLE public.citas DROP CONSTRAINT IF EXISTS citas_estado_check;
ALTER TABLE public.citas ADD CONSTRAINT citas_estado_check CHECK (estado IN (
    'pendiente_pago', 'parcialmente_pagada', 'confirmada', 'completada', 'cancelada', 'reprogramada', 'no_asistio'
));

CREATE OR REPLACE FUNCTION public.validar_transicion_estado_cita()
RETURNS TRIGGER AS $$
DECLARE
    transiciones_validas TEXT[][] := ARRAY[
        ARRAY['pendiente_pago',      'parcialmente_pagada'],
        ARRAY['pendiente_pago',      'confirmada'],
        ARRAY['pendiente_pago',      'cancelada'],
        ARRAY['pendiente_pago',      'completada'],
        ARRAY['pendiente_pago',      'no_asistio'],
        ARRAY['parcialmente_pagada', 'confirmada'],
        ARRAY['parcialmente_pagada', 'cancelada'],
        ARRAY['parcialmente_pagada', 'completada'],
        ARRAY['parcialmente_pagada', 'no_asistio'],
        ARRAY['confirmada',          'completada'],
        ARRAY['confirmada',          'cancelada'],
        ARRAY['confirmada',          'reprogramada'],
        ARRAY['confirmada',          'no_asistio'],
        ARRAY['reprogramada',        'confirmada'],
        ARRAY['reprogramada',        'completada'],
        ARRAY['reprogramada',        'cancelada'],
        ARRAY['reprogramada',        'no_asistio']
    ];
    par TEXT[];
    es_valida BOOLEAN := FALSE;
BEGIN
    IF OLD.estado = NEW.estado THEN
        RETURN NEW;
    END IF;

    FOREACH par SLICE 1 IN ARRAY transiciones_validas LOOP
        IF par[1] = OLD.estado AND par[2] = NEW.estado THEN
            es_valida := TRUE;
            EXIT;
        END IF;
    END LOOP;

    IF NOT es_valida THEN
        RAISE EXCEPTION 'Transición de estado inválida: % → %. Transiciones permitidas definidas en validar_transicion_estado_cita.',
            OLD.estado, NEW.estado
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

REVOKE UPDATE ON public.citas FROM anon, authenticated;
GRANT UPDATE (estado, notas_profesional, fecha, hora) ON public.citas TO authenticated;

DROP POLICY "Usuarios actualizan sus propias citas" ON public.citas;
CREATE POLICY "Pacientes cancelan sus citas" ON public.citas
    FOR UPDATE TO authenticated
    USING (usuario_id = (SELECT auth.uid()))
    WITH CHECK (usuario_id = (SELECT auth.uid()) AND estado = 'cancelada');

CREATE POLICY "Profesionales ven sus citas" ON public.citas
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = citas.profesional_id AND p.usuario_id = (SELECT auth.uid())));
CREATE POLICY "Profesionales gestionan sus citas" ON public.citas
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = citas.profesional_id AND p.usuario_id = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = citas.profesional_id AND p.usuario_id = (SELECT auth.uid())));

CREATE POLICY "Profesionales ven a sus pacientes" ON public.usuarios
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.citas c
        JOIN public.profesionales p ON p.id = c.profesional_id
        WHERE c.usuario_id = usuarios.id AND p.usuario_id = (SELECT auth.uid())
    ));

CREATE TABLE public.notas_paciente (
    id BIGSERIAL PRIMARY KEY,
    profesional_id INT NOT NULL REFERENCES public.profesionales(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    texto TEXT NOT NULL CHECK (length(trim(texto)) > 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notas_paciente_prof_pac ON public.notas_paciente (profesional_id, paciente_id);
ALTER TABLE public.notas_paciente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profesionales gestionan sus notas de pacientes" ON public.notas_paciente
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = notas_paciente.profesional_id AND p.usuario_id = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profesionales p WHERE p.id = notas_paciente.profesional_id AND p.usuario_id = (SELECT auth.uid())));
