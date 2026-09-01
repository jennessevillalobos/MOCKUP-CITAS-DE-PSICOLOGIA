-- Migración: ajustes al motor de pagos
-- Corrige restricciones del esquema base para acomodar todos los flujos
-- de pagos, reembolsos e idempotencia.

-- 1. Ampliar los métodos de pago para incluir 'transferencia' y 'credito'
ALTER TABLE public.pagos
    DROP CONSTRAINT IF EXISTS pagos_metodo_check;

ALTER TABLE public.pagos
    ADD CONSTRAINT pagos_metodo_check
    CHECK (metodo IN ('stripe', 'paypal', 'manual', 'transferencia', 'reembolso', 'credito'));

-- 2. Ampliar los estados de pago para incluir 'pendiente_reembolso'
ALTER TABLE public.pagos
    DROP CONSTRAINT IF EXISTS pagos_estado_check;

ALTER TABLE public.pagos
    ADD CONSTRAINT pagos_estado_check
    CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'pendiente_reembolso', 'reembolsado'));

-- 3. Agregar usuario_id a pagos (para vincular pagos a usuarios directamente)
ALTER TABLE public.pagos
    ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.usuarios(id);

-- 4. Tabla de idempotencia para webhooks y operaciones financieras (BE-027)
-- Garantiza que un mismo evento (ej: ID de evento Stripe) no se procese dos veces.
CREATE TABLE public.idempotencia (
    clave TEXT PRIMARY KEY,                      -- ej: 'stripe:evt_1ABC123' | 'paypal:PAYID-123'
    resultado JSONB,                             -- Respuesta guardada para devolver si se repite
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    expira_en TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_idempotencia_expira ON public.idempotencia (expira_en);

-- Limpiar claves de idempotencia expiradas
CREATE OR REPLACE FUNCTION public.limpiar_idempotencia_expirada()
RETURNS void AS $$
BEGIN
    DELETE FROM public.idempotencia WHERE expira_en < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS en idempotencia: solo service_role (Edge Functions) puede acceder
ALTER TABLE public.idempotencia ENABLE ROW LEVEL SECURITY;
-- Sin políticas para public → solo service_role bypasea RLS y puede usar esta tabla
