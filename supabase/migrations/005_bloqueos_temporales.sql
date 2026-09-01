-- Migración: tabla de bloqueos temporales de horario
-- Usada para "congelar" un slot durante el proceso de pago (TTL: 15 minutos).
-- La función get-available-slots ya excluye automáticamente los bloqueos activos.

CREATE TABLE public.bloqueos_temporales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profesional_id INT REFERENCES public.profesionales(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    duracion_minutos INT NOT NULL,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    expira_en TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para acelerar las consultas de disponibilidad
CREATE INDEX idx_bloqueos_temporales_profesional_fecha
    ON public.bloqueos_temporales (profesional_id, fecha);

-- Índice para limpiar bloqueos expirados eficientemente
CREATE INDEX idx_bloqueos_temporales_expira_en
    ON public.bloqueos_temporales (expira_en);

-- Habilitar RLS
ALTER TABLE public.bloqueos_temporales ENABLE ROW LEVEL SECURITY;

-- Solo el service_role puede manipular bloqueos (Edge Functions).
-- Los usuarios no tienen acceso directo a esta tabla.
-- No se necesitan políticas para el rol "public" ya que todo pasa por Edge Functions.

-- Función para limpiar bloqueos expirados (llamada por las Edge Functions)
CREATE OR REPLACE FUNCTION public.limpiar_bloqueos_expirados()
RETURNS void AS $$
BEGIN
    DELETE FROM public.bloqueos_temporales WHERE expira_en < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
