-- Migración: tabla de historial de cambios de citas (BE-019)
-- Registra cada modificación de una cita: reprogramaciones, cancelaciones y cambios de estado.

CREATE TABLE public.historial_citas (
    id SERIAL PRIMARY KEY,
    cita_id UUID REFERENCES public.citas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.usuarios(id),      -- Quién realizó el cambio
    accion TEXT NOT NULL CHECK (accion IN (
        'creada',
        'confirmada',
        'reprogramada',
        'cancelada',
        'completada',
        'pago_registrado',
        'pago_rechazado',
        'reembolso_emitido'
    )),
    datos_anteriores JSONB,                               -- Estado antes del cambio
    datos_nuevos JSONB,                                   -- Estado después del cambio
    motivo TEXT,                                          -- Razón del cambio (opcional)
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_historial_citas_cita_id ON public.historial_citas (cita_id);
CREATE INDEX idx_historial_citas_usuario_id ON public.historial_citas (usuario_id);

ALTER TABLE public.historial_citas ENABLE ROW LEVEL SECURITY;

-- El usuario puede ver el historial de SUS citas
CREATE POLICY "Usuarios ven historial de sus citas"
    ON public.historial_citas FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.citas
            WHERE citas.id = historial_citas.cita_id
              AND citas.usuario_id = auth.uid()
        )
    );
