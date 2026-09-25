-- Migración: notificaciones reales del panel del profesional
--
-- `notificaciones` por usuario, generadas por triggers ante eventos reales:
-- reserva/cancelación de cita, intento pendiente de calificar, inscripción en
-- un curso, pago aprobado de una cita, reseña, y clase de un colega que empieza
-- en vivo (para quien pidió "Recordarme"). Respeta las preferencias de
-- "Mi perfil" (usuarios.preferencias). El usuario solo las lee y las marca.

CREATE TABLE public.notificaciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('cita', 'evaluacion', 'curso', 'vivo', 'reseña', 'pago')),
    texto_es TEXT NOT NULL,
    texto_en TEXT NOT NULL,
    link TEXT NOT NULL DEFAULT '/instructor',
    leida BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notificaciones_usuario_fecha ON public.notificaciones (usuario_id, creado_en DESC);
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus notificaciones" ON public.notificaciones FOR SELECT TO authenticated
    USING (usuario_id = (SELECT auth.uid()));
CREATE POLICY "Usuarios marcan sus notificaciones" ON public.notificaciones FOR UPDATE TO authenticated
    USING (usuario_id = (SELECT auth.uid())) WITH CHECK (usuario_id = (SELECT auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.notificaciones FROM anon, authenticated;
GRANT UPDATE (leida) ON public.notificaciones TO authenticated;

-- ── Generación automática (triggers) ──
CREATE OR REPLACE FUNCTION public.notificar(p_usuario UUID, p_tipo TEXT, p_es TEXT, p_en TEXT, p_link TEXT, p_preferencia TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_usuario IS NULL THEN RETURN; END IF;
    -- Respeta la preferencia de "Mi perfil" si se indica (por defecto activada).
    IF p_preferencia IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.usuarios WHERE id = p_usuario AND (preferencias ->> p_preferencia)::boolean IS FALSE
    ) THEN RETURN; END IF;
    INSERT INTO public.notificaciones (usuario_id, tipo, texto_es, texto_en, link) VALUES (p_usuario, p_tipo, p_es, p_en, p_link);
END;
$$;

CREATE OR REPLACE FUNCTION public.nombre_usuario(p_usuario UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(NULLIF(nombre, ''), split_part(email, '@', 1), 'Alguien') FROM public.usuarios WHERE id = p_usuario;
$$;

CREATE OR REPLACE FUNCTION public.usuario_de_profesional(p_profesional INT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT usuario_id FROM public.profesionales WHERE id = p_profesional;
$$;

-- Citas: nueva reserva y cancelación.
CREATE OR REPLACE FUNCTION public.notif_citas()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fecha TEXT := to_char(NEW.fecha, 'DD/MM') || ' ' || to_char(NEW.hora, 'HH24:MI');
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.notificar(public.usuario_de_profesional(NEW.profesional_id), 'cita',
            public.nombre_usuario(NEW.usuario_id) || ' agendó una cita para el ' || v_fecha || '.',
            public.nombre_usuario(NEW.usuario_id) || ' booked an appointment for ' || v_fecha || '.',
            '/instructor/citas', 'notifReservas');
    ELSIF NEW.estado = 'cancelada' AND OLD.estado <> 'cancelada' THEN
        PERFORM public.notificar(public.usuario_de_profesional(NEW.profesional_id), 'cita',
            'Se canceló la cita de ' || public.nombre_usuario(NEW.usuario_id) || ' del ' || v_fecha || '.',
            public.nombre_usuario(NEW.usuario_id) || '''s appointment on ' || v_fecha || ' was cancelled.',
            '/instructor/citas', 'notifCitas');
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notif_citas AFTER INSERT OR UPDATE OF estado ON public.citas
    FOR EACH ROW EXECUTE FUNCTION public.notif_citas();

-- Evaluaciones: intento con preguntas abiertas pendiente de calificar.
CREATE OR REPLACE FUNCTION public.notif_intentos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prof INT; v_titulo TEXT;
BEGIN
    IF NEW.estado <> 'pendiente' THEN RETURN NEW; END IF;
    SELECT c.profesional_id, COALESCE(NULLIF(e.titulo, ''), 'una evaluación de ' || c.nombre)
      INTO v_prof, v_titulo
      FROM public.evaluaciones e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = NEW.evaluacion_id;
    PERFORM public.notificar(public.usuario_de_profesional(v_prof), 'evaluacion',
        public.nombre_usuario(NEW.usuario_id) || ' envió un intento de "' || v_titulo || '" pendiente de calificar.',
        public.nombre_usuario(NEW.usuario_id) || ' submitted an attempt for "' || v_titulo || '" pending grading.',
        '/instructor/evaluaciones', 'notifMensajes');
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notif_intentos AFTER INSERT ON public.intentos_evaluacion
    FOR EACH ROW EXECUTE FUNCTION public.notif_intentos();

-- Cursos: nueva inscripción.
CREATE OR REPLACE FUNCTION public.notif_inscripciones()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prof INT; v_curso TEXT;
BEGIN
    SELECT profesional_id, nombre INTO v_prof, v_curso FROM public.cursos WHERE id = NEW.curso_id;
    PERFORM public.notificar(public.usuario_de_profesional(v_prof), 'curso',
        public.nombre_usuario(NEW.usuario_id) || ' se inscribió en "' || v_curso || '".',
        public.nombre_usuario(NEW.usuario_id) || ' enrolled in "' || v_curso || '".',
        '/instructor/cursos', NULL);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notif_inscripciones AFTER INSERT ON public.inscripciones
    FOR EACH ROW EXECUTE FUNCTION public.notif_inscripciones();

-- Pagos aprobados de una cita.
CREATE OR REPLACE FUNCTION public.notif_pagos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prof INT; v_monto TEXT;
BEGIN
    IF NEW.estado <> 'aprobado' OR (TG_OP = 'UPDATE' AND OLD.estado = 'aprobado') THEN RETURN NEW; END IF;
    SELECT ci.profesional_id INTO v_prof
      FROM public.ordenes o JOIN public.citas ci ON ci.id::text = o.producto_id
     WHERE o.id = NEW.orden_id AND o.tipo_producto = 'cita';
    IF v_prof IS NULL THEN RETURN NEW; END IF;
    v_monto := trim_scale(NEW.monto / 100.0)::text || ' ' || COALESCE(NEW.moneda, '');
    PERFORM public.notificar(public.usuario_de_profesional(v_prof), 'pago',
        'Pago recibido de ' || public.nombre_usuario(NEW.usuario_id) || ' por ' || v_monto || '.',
        'Payment received from ' || public.nombre_usuario(NEW.usuario_id) || ' for ' || v_monto || '.',
        '/instructor/citas', NULL);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notif_pagos AFTER INSERT OR UPDATE OF estado ON public.pagos
    FOR EACH ROW EXECUTE FUNCTION public.notif_pagos();

-- Reseñas de pacientes.
CREATE OR REPLACE FUNCTION public.notif_calificaciones()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.notificar(public.usuario_de_profesional(NEW.profesional_id), 'reseña',
        public.nombre_usuario(NEW.usuario_id) || ' te calificó con ' || COALESCE(NEW.nota_profesional, 0) || ' estrellas.',
        public.nombre_usuario(NEW.usuario_id) || ' rated you ' || COALESCE(NEW.nota_profesional, 0) || ' stars.',
        '/instructor', NULL);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notif_calificaciones AFTER INSERT ON public.calificaciones
    FOR EACH ROW EXECUTE FUNCTION public.notif_calificaciones();

-- Clase de un colega que empieza en vivo: avisa a quienes pidieron "Recordarme".
CREATE OR REPLACE FUNCTION public.notif_clases_vivo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_instructor TEXT;
BEGIN
    IF NEW.estado <> 'vivo' OR OLD.estado = 'vivo' THEN RETURN NEW; END IF;
    v_instructor := public.nombre_usuario(public.usuario_de_profesional(NEW.profesional_id));
    FOR r IN SELECT usuario_id FROM public.recordatorios_clase WHERE clase_id = NEW.id LOOP
        PERFORM public.notificar(r.usuario_id, 'vivo',
            v_instructor || ' empezó en vivo "' || NEW.titulo || '".',
            v_instructor || ' is now live: "' || NEW.titulo || '".',
            '/instructor/vivo', NULL);
    END LOOP;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notif_clases_vivo AFTER UPDATE OF estado ON public.clases_en_vivo
    FOR EACH ROW EXECUTE FUNCTION public.notif_clases_vivo();

-- Funciones internas: no invocables desde la API.
REVOKE EXECUTE ON FUNCTION
    public.notificar(UUID, TEXT, TEXT, TEXT, TEXT, TEXT), public.nombre_usuario(UUID), public.usuario_de_profesional(INT),
    public.notif_citas(), public.notif_intentos(), public.notif_inscripciones(), public.notif_pagos(),
    public.notif_calificaciones(), public.notif_clases_vivo()
FROM PUBLIC, anon, authenticated;
