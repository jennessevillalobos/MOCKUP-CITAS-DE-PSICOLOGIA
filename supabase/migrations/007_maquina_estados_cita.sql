-- Migración: Máquina de estados de citas (BE-006)
-- Define qué transiciones de estado son válidas mediante un trigger de PostgreSQL.
-- Esto protege la integridad de los datos incluso si la lógica del frontend falla.

-- ──────────────────────────────────────
-- Función que valida transiciones de estado
-- ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validar_transicion_estado_cita()
RETURNS TRIGGER AS $$
DECLARE
    transiciones_validas TEXT[][] := ARRAY[
        -- {estado_anterior, estado_nuevo}
        ARRAY['pendiente_pago',       'parcialmente_pagada'],
        ARRAY['pendiente_pago',       'confirmada'],
        ARRAY['pendiente_pago',       'cancelada'],
        ARRAY['parcialmente_pagada',  'confirmada'],
        ARRAY['parcialmente_pagada',  'cancelada'],
        ARRAY['confirmada',           'completada'],
        ARRAY['confirmada',           'cancelada'],
        ARRAY['confirmada',           'reprogramada']
    ];
    par TEXT[];
    es_valida BOOLEAN := FALSE;
BEGIN
    -- Si el estado no cambió, no hay nada que validar
    IF OLD.estado = NEW.estado THEN
        RETURN NEW;
    END IF;

    -- Verificar si la transición está permitida
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
$$ LANGUAGE plpgsql;

-- Aplicar el trigger BEFORE UPDATE para bloquear transiciones inválidas antes de escribirlas
CREATE TRIGGER trg_validar_estado_cita
    BEFORE UPDATE OF estado ON public.citas
    FOR EACH ROW
    EXECUTE FUNCTION public.validar_transicion_estado_cita();

-- ──────────────────────────────────────
-- Trigger: marcar cita como completada automáticamente
-- (si el admin/profesional no lo hizo, se puede ejecutar como cron job separado)
-- ──────────────────────────────────────
-- Esta función puede ser llamada también manualmente por el admin.
-- Aquí queda preparada para un cron job de Supabase que corra cada hora.
CREATE OR REPLACE FUNCTION public.completar_citas_pasadas()
RETURNS void AS $$
BEGIN
    UPDATE public.citas
    SET estado = 'completada'
    WHERE estado = 'confirmada'
      AND (fecha + hora) < NOW() - INTERVAL '1 hour';
    -- Solo se marcan como completadas las que ya pasaron hace más de 1 hora
    -- para dar margen en caso de citas que empezaron un poco tarde.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
