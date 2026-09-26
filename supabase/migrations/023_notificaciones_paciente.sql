-- Notificaciones también para el paciente/estudiante. Regla general: no se
-- avisa a quien hizo el cambio (auth.uid()); en las Edge Functions (service
-- role) auth.uid() es NULL y se avisa a ambas partes.

-- ── Citas ──
CREATE OR REPLACE FUNCTION public.notif_citas()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_fecha TEXT := to_char(NEW.fecha, 'DD/MM') || ' ' || to_char(NEW.hora, 'HH24:MI');
    v_actor UUID := (SELECT auth.uid());
    v_prof UUID := public.usuario_de_profesional(NEW.profesional_id);
    v_pac UUID := NEW.usuario_id;
    v_prof_nombre TEXT := public.nombre_usuario(public.usuario_de_profesional(NEW.profesional_id));
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF v_actor IS DISTINCT FROM v_prof THEN
            PERFORM public.notificar(v_prof, 'cita',
                public.nombre_usuario(v_pac) || ' agendó una cita para el ' || v_fecha || '.',
                public.nombre_usuario(v_pac) || ' booked an appointment for ' || v_fecha || '.',
                '/instructor/citas', 'notifReservas');
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
        IF NEW.estado = 'cancelada' THEN
            IF v_actor IS DISTINCT FROM v_prof THEN
                PERFORM public.notificar(v_prof, 'cita',
                    'Se canceló la cita de ' || public.nombre_usuario(v_pac) || ' del ' || v_fecha || '.',
                    public.nombre_usuario(v_pac) || '''s appointment on ' || v_fecha || ' was cancelled.',
                    '/instructor/citas', 'notifCitas');
            END IF;
            IF v_actor IS DISTINCT FROM v_pac THEN
                PERFORM public.notificar(v_pac, 'cita',
                    'Tu cita del ' || v_fecha || ' con ' || v_prof_nombre || ' fue cancelada.',
                    'Your appointment on ' || v_fecha || ' with ' || v_prof_nombre || ' was cancelled.',
                    '/portal-paciente', 'notifCitas');
            END IF;
        ELSIF v_actor IS DISTINCT FROM v_pac THEN
            IF NEW.estado = 'confirmada' THEN
                PERFORM public.notificar(v_pac, 'cita',
                    'Tu cita del ' || v_fecha || ' con ' || v_prof_nombre || ' está confirmada.',
                    'Your appointment on ' || v_fecha || ' with ' || v_prof_nombre || ' is confirmed.',
                    '/portal-paciente', 'notifCitas');
            ELSIF NEW.estado = 'completada' THEN
                PERFORM public.notificar(v_pac, 'cita',
                    'Tu sesión del ' || v_fecha || ' con ' || v_prof_nombre || ' quedó registrada como realizada.',
                    'Your session on ' || v_fecha || ' with ' || v_prof_nombre || ' was marked as completed.',
                    '/portal-paciente', 'notifCitas');
            ELSIF NEW.estado = 'no_asistio' THEN
                PERFORM public.notificar(v_pac, 'cita',
                    'Tu cita del ' || v_fecha || ' con ' || v_prof_nombre || ' se marcó como no asistida.',
                    'Your appointment on ' || v_fecha || ' with ' || v_prof_nombre || ' was marked as missed.',
                    '/portal-paciente', 'notifCitas');
            END IF;
        END IF;
    ELSIF (NEW.fecha, NEW.hora) IS DISTINCT FROM (OLD.fecha, OLD.hora) THEN
        IF v_actor IS DISTINCT FROM v_prof THEN
            PERFORM public.notificar(v_prof, 'cita',
                public.nombre_usuario(v_pac) || ' reprogramó su cita del ' || to_char(OLD.fecha, 'DD/MM') || ' ' || to_char(OLD.hora, 'HH24:MI') || ' al ' || v_fecha || '.',
                public.nombre_usuario(v_pac) || ' rescheduled their appointment from ' || to_char(OLD.fecha, 'DD/MM') || ' ' || to_char(OLD.hora, 'HH24:MI') || ' to ' || v_fecha || '.',
                '/instructor/citas', 'notifCitas');
        END IF;
        IF v_actor IS DISTINCT FROM v_pac THEN
            PERFORM public.notificar(v_pac, 'cita',
                'Tu cita con ' || v_prof_nombre || ' se movió al ' || v_fecha || '.',
                'Your appointment with ' || v_prof_nombre || ' was moved to ' || v_fecha || '.',
                '/portal-paciente', 'notifCitas');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ── Pagos ──
CREATE OR REPLACE FUNCTION public.notif_pagos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prof INT; v_monto TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.estado = OLD.estado THEN RETURN NEW; END IF;
    SELECT ci.profesional_id INTO v_prof
      FROM public.ordenes o JOIN public.citas ci ON ci.id::text = o.producto_id
     WHERE o.id = NEW.orden_id AND o.tipo_producto = 'cita';
    v_monto := trim_scale(NEW.monto / 100.0)::text || ' ' || COALESCE(NEW.moneda, '');

    IF NEW.estado = 'pendiente' AND NEW.metodo = 'transferencia' AND TG_OP = 'INSERT' THEN
        PERFORM public.notificar(public.usuario_de_profesional(v_prof), 'pago',
            public.nombre_usuario(NEW.usuario_id) || ' reportó una transferencia de ' || v_monto || ' pendiente de revisión.',
            public.nombre_usuario(NEW.usuario_id) || ' reported a ' || v_monto || ' transfer pending review.',
            '/instructor/citas', NULL);
    ELSIF NEW.estado = 'aprobado' THEN
        PERFORM public.notificar(NEW.usuario_id, 'pago',
            'Tu pago de ' || v_monto || ' fue aprobado.',
            'Your ' || v_monto || ' payment was approved.',
            '/portal-paciente', NULL);
        IF NEW.metodo IN ('stripe', 'paypal') AND v_prof IS NOT NULL THEN
            PERFORM public.notificar(public.usuario_de_profesional(v_prof), 'pago',
                'Pago recibido de ' || public.nombre_usuario(NEW.usuario_id) || ' por ' || v_monto || '.',
                'Payment received from ' || public.nombre_usuario(NEW.usuario_id) || ' for ' || v_monto || '.',
                '/instructor/citas', NULL);
        END IF;
    ELSIF NEW.estado = 'rechazado' AND NEW.metodo = 'transferencia' THEN
        PERFORM public.notificar(NEW.usuario_id, 'pago',
            'Tu pago de ' || v_monto || ' fue rechazado. Revisa los datos de la transferencia o contacta a tu profesional.',
            'Your ' || v_monto || ' payment was rejected. Check the transfer details or contact your professional.',
            '/portal-paciente', NULL);
    END IF;
    RETURN NEW;
END;
$$;

-- ── Evaluación calificada ──
CREATE OR REPLACE FUNCTION public.notif_intentos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prof INT; v_titulo TEXT;
BEGIN
    SELECT c.profesional_id, COALESCE(NULLIF(e.titulo, ''), 'una evaluación de ' || c.nombre)
      INTO v_prof, v_titulo
      FROM public.evaluaciones e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = NEW.evaluacion_id;

    IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' THEN
        PERFORM public.notificar(public.usuario_de_profesional(v_prof), 'evaluacion',
            public.nombre_usuario(NEW.usuario_id) || ' envió un intento de "' || v_titulo || '" pendiente de calificar.',
            public.nombre_usuario(NEW.usuario_id) || ' submitted an attempt for "' || v_titulo || '" pending grading.',
            '/instructor/evaluaciones', 'notifMensajes');
    ELSIF TG_OP = 'UPDATE' AND OLD.estado = 'pendiente' AND NEW.estado = 'calificado' THEN
        PERFORM public.notificar(NEW.usuario_id, 'evaluacion',
            'Tu evaluación "' || v_titulo || '" fue calificada: ' || COALESCE(NEW.nota, 0) || '%' || CASE WHEN NEW.aprobado THEN ' (aprobada).' ELSE '.' END,
            'Your assessment "' || v_titulo || '" was graded: ' || COALESCE(NEW.nota, 0) || '%' || CASE WHEN NEW.aprobado THEN ' (passed).' ELSE '.' END,
            '/aula-virtual/calificaciones', NULL);
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER trg_notif_intentos ON public.intentos_evaluacion;
CREATE TRIGGER trg_notif_intentos AFTER INSERT OR UPDATE OF estado ON public.intentos_evaluacion
    FOR EACH ROW EXECUTE FUNCTION public.notif_intentos();

-- ── Clase en vivo programada: avisa a los invitados ──
CREATE OR REPLACE FUNCTION public.notif_clase_programada()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_instructor TEXT; v_fecha TEXT;
BEGIN
    v_instructor := public.nombre_usuario(public.usuario_de_profesional(NEW.profesional_id));
    v_fecha := to_char(NEW.fecha, 'DD/MM') || ' ' || to_char(NEW.hora, 'HH24:MI');
    FOR r IN
        SELECT i.usuario_id FROM public.inscripciones i
         WHERE NEW.destinatario_tipo = 'curso' AND i.curso_id = NEW.curso_id AND i.estado = 'activa'
        UNION
        SELECT u.id FROM public.usuarios u
         WHERE NEW.destinatario_tipo = 'pacientes' AND lower(u.email) = ANY (SELECT lower(x) FROM unnest(NEW.pacientes_correos) x)
    LOOP
        PERFORM public.notificar(r.usuario_id, 'vivo',
            v_instructor || ' programó la clase en vivo "' || NEW.titulo || '" para el ' || v_fecha || '.',
            v_instructor || ' scheduled the live class "' || NEW.titulo || '" for ' || v_fecha || '.',
            '/aula-virtual/vivo', NULL);
    END LOOP;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notif_clase_programada AFTER INSERT ON public.clases_en_vivo
    FOR EACH ROW EXECUTE FUNCTION public.notif_clase_programada();

REVOKE EXECUTE ON FUNCTION public.notif_citas(), public.notif_pagos(), public.notif_intentos(), public.notif_clase_programada()
FROM PUBLIC, anon, authenticated;
