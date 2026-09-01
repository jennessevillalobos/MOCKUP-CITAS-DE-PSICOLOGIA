-- Migración: Triggers para cálculo automático de progreso (BE-050, BE-051, BE-052)
-- Cuando se inserta o actualiza progreso en una clase, se re-calcula el estado
-- de la clase, el progreso del módulo y del curso.

-- 1. Función para validar completitud de clase (BE-050)
-- Si el progreso supera el 90%, se marca como completada automáticamente.
CREATE OR REPLACE FUNCTION public.validar_completitud_clase()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.porcentaje >= 90 THEN
        NEW.completado := TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_completitud_clase
    BEFORE INSERT OR UPDATE OF porcentaje ON public.progreso
    FOR EACH ROW
    EXECUTE FUNCTION public.validar_completitud_clase();


-- 2. Función para actualizar progreso a nivel módulo y curso (BE-051, BE-052)
-- NOTA: Para no saturar el trigger, en lugar de recalcular para todos, 
-- se puede usar una vista materializada, o simplemente consultas en el frontend.
-- Pero para cumplir con el requerimiento de "Calcular progreso general",
-- crearemos vistas que agregan los datos en tiempo real.

CREATE OR REPLACE VIEW public.progreso_modulos AS
SELECT 
    m.curso_id,
    c.modulo_id,
    p.usuario_id,
    COUNT(c.id) AS total_clases,
    SUM(CASE WHEN p.completado THEN 1 ELSE 0 END) AS clases_completadas,
    CASE 
        WHEN COUNT(c.id) = 0 THEN 0 
        ELSE ROUND((SUM(CASE WHEN p.completado THEN 1 ELSE 0 END)::NUMERIC / COUNT(c.id)::NUMERIC) * 100, 2)
    END AS porcentaje_modulo
FROM 
    public.clases c
JOIN 
    public.modulos m ON c.modulo_id = m.id
LEFT JOIN 
    public.progreso p ON c.id = p.clase_id
WHERE p.usuario_id IS NOT NULL
GROUP BY 
    m.curso_id, c.modulo_id, p.usuario_id;


CREATE OR REPLACE VIEW public.progreso_cursos AS
SELECT 
    c.curso_id,
    c.usuario_id,
    SUM(c.clases_completadas) AS total_clases_completadas,
    SUM(c.total_clases) AS total_clases_curso,
    CASE 
        WHEN SUM(c.total_clases) = 0 THEN 0 
        ELSE ROUND((SUM(c.clases_completadas)::NUMERIC / SUM(c.total_clases)::NUMERIC) * 100, 2)
    END AS porcentaje_curso
FROM 
    public.progreso_modulos c
GROUP BY 
    c.curso_id, c.usuario_id;
