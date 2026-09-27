-- 052 · Toda cita nueva deja su fila 'creada' en historial_citas (QA final
-- 2026-09-27): las reservas del sitio (Edge Functions book-appointment y
-- book-appointment-guest) no la escribían, así que la Auditoría del admin no
-- mostraba "Agendó una cita". Un trigger la registra siempre; si la crea un
-- administrador (admin_crear_cita, 043) el motivo lo indica y se evita el
-- duplicado que esa función insertaba por su cuenta.

CREATE OR REPLACE FUNCTION public.historial_cita_creada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_actor UUID := (SELECT auth.uid());
BEGIN
    INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_nuevos, motivo)
    VALUES (NEW.id, COALESCE(v_actor, NEW.usuario_id), 'creada',
            jsonb_build_object('fecha', NEW.fecha, 'hora', NEW.hora),
            CASE WHEN v_actor IS NOT NULL AND v_actor IS DISTINCT FROM NEW.usuario_id AND public.es_admin()
                 THEN 'Agendada por la administración' END);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historial_cita_creada ON public.citas;
CREATE TRIGGER trg_historial_cita_creada AFTER INSERT ON public.citas
    FOR EACH ROW EXECUTE FUNCTION public.historial_cita_creada();

-- admin_crear_cita (043) sin su INSERT propio en historial_citas: ahora lo hace el trigger.
CREATE OR REPLACE FUNCTION public.admin_crear_cita(
    p_correo TEXT, p_servicio_id INT, p_profesional_id INT, p_modalidad_id INT, p_lugar_id INT,
    p_fecha DATE, p_hora TIME
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_usuario UUID;
    v_tarifa RECORD;
    v_error TEXT;
    v_cita UUID;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    SELECT id INTO v_usuario FROM public.usuarios WHERE lower(email) = lower(btrim(p_correo));
    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'No hay ninguna cuenta con ese correo. La persona puede reservar desde "Agendar una cita" y así se crea su cuenta.';
    END IF;
    SELECT duracion_minutos, precio, moneda INTO v_tarifa
    FROM public.servicio_modalidad WHERE servicio_id = p_servicio_id AND modalidad_id = p_modalidad_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese servicio no se ofrece en esa modalidad.';
    END IF;
    IF (SELECT nombre FROM public.modalidades WHERE id = p_modalidad_id) = 'presencial' AND p_lugar_id IS NULL THEN
        RAISE EXCEPTION 'Elige la sede para una cita presencial.';
    END IF;
    IF p_fecha < (now() AT TIME ZONE 'America/Caracas')::date THEN
        RAISE EXCEPTION 'No se puede agendar en una fecha pasada.';
    END IF;
    v_error := public.motivo_franja_ocupada(p_profesional_id, p_fecha, p_hora, v_tarifa.duracion_minutos, NULL);
    IF v_error IS NOT NULL THEN
        RAISE EXCEPTION '%', v_error;
    END IF;

    INSERT INTO public.citas (usuario_id, servicio_id, profesional_id, lugar_id, modalidad_id, fecha, hora,
                              duracion_minutos, precio_total, moneda, monto_abonado, saldo_pendiente, estado)
    VALUES (v_usuario, p_servicio_id, p_profesional_id,
            CASE WHEN (SELECT nombre FROM public.modalidades WHERE id = p_modalidad_id) = 'presencial' THEN p_lugar_id END,
            p_modalidad_id, p_fecha, p_hora, v_tarifa.duracion_minutos, v_tarifa.precio, v_tarifa.moneda, 0, v_tarifa.precio, 'pendiente_pago')
    RETURNING id INTO v_cita;
    INSERT INTO public.ordenes (usuario_id, concepto, tipo_producto, producto_id, monto, moneda)
    VALUES (v_usuario, 'Cita psicológica', 'cita', v_cita::text, v_tarifa.precio, v_tarifa.moneda);
    RETURN v_cita;
END;
$$;

-- Citas ya existentes sin fila 'creada' (p. ej. la reserva de la QA final).
INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_nuevos, creado_en)
SELECT c.id, c.usuario_id, 'creada', jsonb_build_object('fecha', c.fecha, 'hora', c.hora), c.fecha_creacion
FROM public.citas c
WHERE NOT EXISTS (SELECT 1 FROM public.historial_citas h WHERE h.cita_id = c.id AND h.accion = 'creada');
