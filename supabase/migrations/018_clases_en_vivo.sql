-- Migración: clases en vivo del panel del profesional
--
-- 1. `clases_en_vivo`: el profesional programa, edita, inicia, finaliza y
--    cancela sus clases; los demás profesionales las ven como "de un colega";
--    los estudiantes inscritos (clase de curso) y los pacientes invitados
--    (por correo) ven las suyas.
-- 2. `recordatorios_clase`: "Recordarme" en clases de colegas.
-- 3. `clases_en_vivo_panel()`: clases visibles en el formato del panel.

CREATE TABLE public.clases_en_vivo (
    id BIGSERIAL PRIMARY KEY,
    profesional_id INT NOT NULL REFERENCES public.profesionales(id) ON DELETE CASCADE,
    curso_id INT REFERENCES public.cursos(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL CHECK (length(trim(titulo)) > 0),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    duracion_min INT NOT NULL DEFAULT 60 CHECK (duracion_min > 0),
    enlace TEXT,
    destinatario_tipo TEXT NOT NULL DEFAULT 'curso' CHECK (destinatario_tipo IN ('curso', 'pacientes')),
    pacientes_correos TEXT[] NOT NULL DEFAULT '{}',
    grabar BOOLEAN NOT NULL DEFAULT false,
    recordatorio BOOLEAN NOT NULL DEFAULT true,
    estado TEXT NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'vivo', 'finalizada', 'cancelada')),
    conectados INT,
    asistieron INT,
    grabacion_url TEXT,
    grabacion_duracion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_clases_en_vivo_prof_fecha ON public.clases_en_vivo (profesional_id, fecha);
ALTER TABLE public.clases_en_vivo ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.mi_profesional_id()
RETURNS INT LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT id FROM public.profesionales WHERE usuario_id = (SELECT auth.uid()) LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.mi_profesional_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_profesional_id() TO authenticated;

CREATE POLICY "Profesionales gestionan sus clases en vivo" ON public.clases_en_vivo FOR ALL TO authenticated
    USING (profesional_id = public.mi_profesional_id()) WITH CHECK (profesional_id = public.mi_profesional_id());
CREATE POLICY "Profesionales ven clases de colegas" ON public.clases_en_vivo FOR SELECT TO authenticated
    USING (public.mi_profesional_id() IS NOT NULL);
-- El correo sale del JWT: authenticated no puede leer auth.users.
CREATE POLICY "Invitados ven sus clases en vivo" ON public.clases_en_vivo FOR SELECT TO authenticated
    USING (
        (destinatario_tipo = 'curso' AND EXISTS (SELECT 1 FROM public.inscripciones i WHERE i.curso_id = clases_en_vivo.curso_id AND i.usuario_id = (SELECT auth.uid()) AND i.estado = 'activa'))
        OR (destinatario_tipo = 'pacientes' AND ((SELECT auth.jwt()) ->> 'email') = ANY (pacientes_correos))
    );

CREATE TABLE public.recordatorios_clase (
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    clase_id BIGINT NOT NULL REFERENCES public.clases_en_vivo(id) ON DELETE CASCADE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (usuario_id, clase_id)
);
ALTER TABLE public.recordatorios_clase ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gestionan sus recordatorios" ON public.recordatorios_clase FOR ALL TO authenticated
    USING (usuario_id = (SELECT auth.uid())) WITH CHECK (usuario_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.clases_en_vivo_panel()
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cv.id::text,
        'titulo', cv.titulo,
        'instructor', COALESCE(pp.nombre, 'Profesional'),
        'esPropia', cv.profesional_id = public.mi_profesional_id(),
        'cursoKey', c.slug,
        'cursoTitulo', c.nombre,
        'fechaISO', cv.fecha,
        'hora', to_char(cv.hora, 'HH24:MI'),
        'duracionMin', cv.duracion_min,
        'enlace', COALESCE(cv.enlace, ''),
        'destinatario', jsonb_build_object('tipo', cv.destinatario_tipo, 'pacientesCorreos', to_jsonb(cv.pacientes_correos)),
        'grabar', cv.grabar,
        'recordatorio', cv.recordatorio,
        'estado', cv.estado,
        'conectados', cv.conectados,
        'asistieron', cv.asistieron,
        'grabacionImagen', cv.grabacion_url,
        'grabacionDuracion', cv.grabacion_duracion,
        'recordarme', EXISTS (SELECT 1 FROM public.recordatorios_clase r WHERE r.clase_id = cv.id AND r.usuario_id = (SELECT auth.uid()))
    ) ORDER BY cv.fecha, cv.hora), '[]'::jsonb)
    FROM public.clases_en_vivo cv
    LEFT JOIN public.profesionales_publicos pp ON pp.id = cv.profesional_id
    LEFT JOIN public.cursos c ON c.id = cv.curso_id;
$$;
REVOKE EXECUTE ON FUNCTION public.clases_en_vivo_panel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clases_en_vivo_panel() TO authenticated;
