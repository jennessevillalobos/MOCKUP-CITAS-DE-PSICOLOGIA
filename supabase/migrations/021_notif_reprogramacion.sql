-- Migración: la profesional también recibe un aviso cuando el paciente
-- reprograma su cita (el trigger de 019 solo reaccionaba a cambios de estado).

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
    ELSIF (NEW.fecha, NEW.hora) IS DISTINCT FROM (OLD.fecha, OLD.hora) AND NEW.estado <> 'cancelada' THEN
        PERFORM public.notificar(public.usuario_de_profesional(NEW.profesional_id), 'cita',
            public.nombre_usuario(NEW.usuario_id) || ' reprogramó su cita del ' || to_char(OLD.fecha, 'DD/MM') || ' ' || to_char(OLD.hora, 'HH24:MI') || ' al ' || v_fecha || '.',
            public.nombre_usuario(NEW.usuario_id) || ' rescheduled their appointment from ' || to_char(OLD.fecha, 'DD/MM') || ' ' || to_char(OLD.hora, 'HH24:MI') || ' to ' || v_fecha || '.',
            '/instructor/citas', 'notifCitas');
    END IF;
    RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notif_citas() FROM PUBLIC, anon, authenticated;

DROP TRIGGER trg_notif_citas ON public.citas;
CREATE TRIGGER trg_notif_citas AFTER INSERT OR UPDATE OF estado, fecha, hora ON public.citas
    FOR EACH ROW EXECUTE FUNCTION public.notif_citas();
