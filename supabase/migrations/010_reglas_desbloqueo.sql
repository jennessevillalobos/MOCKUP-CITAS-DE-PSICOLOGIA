-- Migración: Motor de Reglas de Desbloqueo y Derechos de Acceso (BE-041 a BE-047)
-- Unifica el acceso a cursos, módulos, clases, y productos digitales basados
-- en el cumplimiento de condiciones.

-- 1. Tabla de Reglas de Desbloqueo (BE-041)
CREATE TABLE public.reglas_desbloqueo (
    id SERIAL PRIMARY KEY,
    tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('curso', 'modulo', 'clase', 'producto_digital', 'evaluacion')),
    recurso_id INT NOT NULL, -- El ID del curso/modulo/etc.
    condicion_tipo TEXT NOT NULL CHECK (condicion_tipo IN ('pago_aprobado', 'fecha_especifica', 'modulo_previo_completado', 'clase_previa_completada', 'evaluacion_aprobada')),
    condicion_valor TEXT NOT NULL, -- ej: ID del modulo previo, o fecha '2026-10-01'
    es_estricta BOOLEAN DEFAULT true, -- Si es true, el acceso se niega si no se cumple
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Derechos de Acceso (Entidad que se le otorga al usuario cuando cumple)
-- Sirve como cache de acceso para consultas rápidas sin evaluar reglas cada vez.
CREATE TABLE public.derechos_acceso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('curso', 'modulo', 'clase', 'producto_digital', 'evaluacion')),
    recurso_id INT NOT NULL,
    otorgado_por TEXT CHECK (otorgado_por IN ('sistema', 'admin', 'instructor')), -- BE-046
    fecha_otorgamiento TIMESTAMPTZ DEFAULT NOW(),
    fecha_expiracion TIMESTAMPTZ, -- Nulo para acceso vitalicio
    UNIQUE(usuario_id, tipo_recurso, recurso_id)
);

CREATE INDEX idx_derechos_acceso_usuario ON public.derechos_acceso(usuario_id);

-- RLS
ALTER TABLE public.reglas_desbloqueo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.derechos_acceso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica de reglas_desbloqueo" ON public.reglas_desbloqueo FOR SELECT TO public USING (true);
CREATE POLICY "Usuarios ven sus derechos de acceso" ON public.derechos_acceso FOR SELECT TO public USING (auth.uid() = usuario_id);

-- 3. Funciones y Triggers para otorgar derechos automáticamente

-- BE-042: Crear derecho de acceso al aprobar un pago
CREATE OR REPLACE FUNCTION public.otorgar_acceso_por_pago()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo_producto TEXT;
    v_producto_id TEXT;
    v_usuario_id UUID;
BEGIN
    IF NEW.estado = 'pagado' AND OLD.estado != 'pagado' THEN
        SELECT tipo_producto, producto_id, usuario_id 
        INTO v_tipo_producto, v_producto_id, v_usuario_id
        FROM public.ordenes WHERE id = NEW.id;

        IF v_tipo_producto IN ('curso', 'producto_digital') THEN
            INSERT INTO public.derechos_acceso (usuario_id, tipo_recurso, recurso_id, otorgado_por)
            VALUES (v_usuario_id, v_tipo_producto, v_producto_id::int, 'sistema')
            ON CONFLICT (usuario_id, tipo_recurso, recurso_id) DO NOTHING;
            
            -- BE-057: Si es curso, crear inscripción automáticamente
            IF v_tipo_producto = 'curso' THEN
                INSERT INTO public.inscripciones (usuario_id, curso_id, tipo_acceso, estado)
                VALUES (v_usuario_id, v_producto_id::int, 'completo', 'activa')
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_otorgar_acceso_por_pago
    AFTER UPDATE OF estado ON public.ordenes
    FOR EACH ROW
    EXECUTE FUNCTION public.otorgar_acceso_por_pago();

-- BE-043: Crear derecho de acceso al completar clase previa (Cascada de progreso)
CREATE OR REPLACE FUNCTION public.evaluar_desbloqueo_por_progreso()
RETURNS TRIGGER AS $$
DECLARE
    regla RECORD;
BEGIN
    -- Si la clase acaba de ser marcada como completada
    IF NEW.completado = TRUE AND (OLD.completado IS NULL OR OLD.completado = FALSE) THEN
        
        -- Buscar si hay alguna regla que dependa de que ESTA clase se complete
        FOR regla IN 
            SELECT tipo_recurso, recurso_id 
            FROM public.reglas_desbloqueo 
            WHERE condicion_tipo = 'clase_previa_completada' 
              AND condicion_valor = NEW.clase_id::text
        LOOP
            -- Otorgar derecho al recurso subsecuente
            INSERT INTO public.derechos_acceso (usuario_id, tipo_recurso, recurso_id, otorgado_por)
            VALUES (NEW.usuario_id, regla.tipo_recurso, regla.recurso_id, 'sistema')
            ON CONFLICT DO NOTHING;
        END LOOP;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_evaluar_desbloqueo_por_progreso
    AFTER UPDATE OF completado ON public.progreso
    FOR EACH ROW
    EXECUTE FUNCTION public.evaluar_desbloqueo_por_progreso();

-- BE-044 / BE-056: Crear derecho de acceso al aprobar evaluación
CREATE OR REPLACE FUNCTION public.evaluar_desbloqueo_por_evaluacion()
RETURNS TRIGGER AS $$
DECLARE
    regla RECORD;
BEGIN
    -- Si la evaluación fue aprobada
    IF NEW.aprobado = TRUE AND (OLD.aprobado IS NULL OR OLD.aprobado = FALSE) THEN
        
        -- Buscar si hay alguna regla que dependa de que ESTA evaluación se apruebe
        FOR regla IN 
            SELECT tipo_recurso, recurso_id 
            FROM public.reglas_desbloqueo 
            WHERE condicion_tipo = 'evaluacion_aprobada' 
              AND condicion_valor = NEW.evaluacion_id::text
        LOOP
            -- Otorgar derecho al recurso subsecuente
            INSERT INTO public.derechos_acceso (usuario_id, tipo_recurso, recurso_id, otorgado_por)
            VALUES (NEW.usuario_id, regla.tipo_recurso, regla.recurso_id, 'sistema')
            ON CONFLICT DO NOTHING;
        END LOOP;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_evaluar_desbloqueo_por_evaluacion
    AFTER INSERT OR UPDATE OF aprobado ON public.intentos_evaluacion
    FOR EACH ROW
    EXECUTE FUNCTION public.evaluar_desbloqueo_por_evaluacion();
