-- 043 · Panel admin A4: Agenda / Citas.
-- El admin ve las citas de todas las profesionales, cambia su estado
-- (completada / no asistió / cancelada, respetando validar_transicion_estado_cita),
-- las reprograma y crea citas para pacientes con cuenta, con las mismas
-- validaciones de horario que la reserva del sitio (_shared/reserva.ts).

-- ¿La franja está libre? Devuelve NULL si sí, o el motivo si no.
-- Misma lógica que validarReserva: horario de atención, excepciones y choques.
CREATE OR REPLACE FUNCTION public.motivo_franja_ocupada(
    p_profesional_id INT, p_fecha DATE, p_hora TIME, p_duracion INT, p_excluir UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_ini INT := extract(hour FROM p_hora)::int * 60 + extract(minute FROM p_hora)::int;
    v_fin INT := v_ini + p_duracion;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.horarios h
        WHERE h.profesional_id = p_profesional_id AND h.dia_semana = extract(dow FROM p_fecha)::int
          AND v_ini >= extract(hour FROM h.hora_inicio)::int * 60 + extract(minute FROM h.hora_inicio)::int
          AND v_fin <= extract(hour FROM h.hora_fin)::int * 60 + extract(minute FROM h.hora_fin)::int
    ) THEN
        RETURN 'La profesional no atiende ese día y horario.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.excepciones_horario e
        WHERE e.profesional_id = p_profesional_id AND e.fecha = p_fecha
          AND (e.tipo = 'vacacion' OR e.hora_inicio IS NULL OR e.hora_fin IS NULL
               OR (v_ini < extract(hour FROM e.hora_fin)::int * 60 + extract(minute FROM e.hora_fin)::int
                   AND v_fin > extract(hour FROM e.hora_inicio)::int * 60 + extract(minute FROM e.hora_inicio)::int))
    ) THEN
        RETURN 'La profesional tiene bloqueado ese horario.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.citas c
        WHERE c.profesional_id = p_profesional_id AND c.fecha = p_fecha
          AND c.estado IN ('pendiente_pago', 'parcialmente_pagada', 'confirmada', 'reprogramada')
          AND (p_excluir IS NULL OR c.id <> p_excluir)
          AND v_ini < extract(hour FROM c.hora)::int * 60 + extract(minute FROM c.hora)::int + c.duracion_minutos
          AND v_fin > extract(hour FROM c.hora)::int * 60 + extract(minute FROM c.hora)::int
    ) THEN
        RETURN 'Ese horario ya está ocupado por otra cita.';
    END IF;
    RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.motivo_franja_ocupada(INT, DATE, TIME, INT, UUID) FROM PUBLIC, anon, authenticated;

-- Citas de todas las profesionales + catálogo para el formulario.
CREATE OR REPLACE FUNCTION public.admin_agenda()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    RETURN json_build_object(
        'citas', COALESCE((
            SELECT json_agg(json_build_object(
                'id', c.id,
                'fecha', c.fecha,
                'hora', to_char(c.hora, 'HH24:MI'),
                'duracion', c.duracion_minutos,
                'paciente', COALESCE(NULLIF(u.nombre, ''), u.email),
                'correo', u.email,
                'servicio', s.nombre,
                'servicioId', c.servicio_id,
                'profesional', pp.nombre,
                'profesionalId', c.profesional_id,
                'modalidad', m.nombre,
                'lugar', l.nombre,
                'lugarId', c.lugar_id,
                'estado', c.estado,
                'precio', c.precio_total,
                'saldo', c.saldo_pendiente,
                'notas', c.observaciones
            ) ORDER BY c.fecha, c.hora)
            FROM public.citas c
            LEFT JOIN public.usuarios u ON u.id = c.usuario_id
            LEFT JOIN public.servicios s ON s.id = c.servicio_id
            LEFT JOIN public.profesionales_publicos pp ON pp.id = c.profesional_id
            LEFT JOIN public.modalidades m ON m.id = c.modalidad_id
            LEFT JOIN public.lugares l ON l.id = c.lugar_id
        ), '[]'::json),
        'profesionales', COALESCE((SELECT json_agg(json_build_object('id', id, 'nombre', nombre) ORDER BY nombre) FROM public.profesionales_publicos), '[]'::json),
        'servicios', COALESCE((SELECT json_agg(json_build_object('id', id, 'nombre', nombre) ORDER BY nombre) FROM public.servicios WHERE estado = 'activo'), '[]'::json),
        'lugares', COALESCE((SELECT json_agg(json_build_object('id', id, 'nombre', nombre) ORDER BY nombre) FROM public.lugares WHERE estado = 'activo'), '[]'::json),
        'modalidades', COALESCE((SELECT json_agg(json_build_object('id', id, 'nombre', nombre) ORDER BY id) FROM public.modalidades), '[]'::json),
        'tarifas', COALESCE((SELECT json_agg(json_build_object('servicioId', servicio_id, 'modalidadId', modalidad_id, 'duracion', duracion_minutos, 'precio', precio)) FROM public.servicio_modalidad), '[]'::json),
        'ofrece', COALESCE((SELECT json_agg(json_build_object('profesionalId', profesional_id, 'servicioId', servicio_id)) FROM public.profesional_servicio), '[]'::json)
    );
END;
$$;

-- Cambio de estado y/o reprogramación hecha por el admin.
CREATE OR REPLACE FUNCTION public.admin_actualizar_cita(
    p_cita_id UUID, p_estado TEXT DEFAULT NULL, p_fecha DATE DEFAULT NULL, p_hora TIME DEFAULT NULL, p_motivo TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_cita RECORD;
    v_motivo TEXT := NULLIF(left(btrim(p_motivo), 300), '');
    v_error TEXT;
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    SELECT * INTO v_cita FROM public.citas WHERE id = p_cita_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cita no existe.';
    END IF;

    IF p_fecha IS NOT NULL OR p_hora IS NOT NULL THEN
        IF v_cita.estado IN ('cancelada', 'completada', 'no_asistio') THEN
            RAISE EXCEPTION 'Una cita cancelada, completada o no asistida no se puede reprogramar.';
        END IF;
        IF COALESCE(p_fecha, v_cita.fecha) < (now() AT TIME ZONE 'America/Caracas')::date THEN
            RAISE EXCEPTION 'No se puede mover una cita a una fecha pasada.';
        END IF;
        v_error := public.motivo_franja_ocupada(v_cita.profesional_id, COALESCE(p_fecha, v_cita.fecha),
                                                COALESCE(p_hora, v_cita.hora), v_cita.duracion_minutos, v_cita.id);
        IF v_error IS NOT NULL THEN
            RAISE EXCEPTION '%', v_error;
        END IF;
        UPDATE public.citas SET fecha = COALESCE(p_fecha, fecha), hora = COALESCE(p_hora, hora) WHERE id = p_cita_id;
        INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_anteriores, datos_nuevos, motivo)
        VALUES (p_cita_id, auth.uid(), 'reprogramada',
                jsonb_build_object('fecha', v_cita.fecha, 'hora', v_cita.hora),
                jsonb_build_object('fecha', COALESCE(p_fecha, v_cita.fecha), 'hora', COALESCE(p_hora, v_cita.hora)),
                COALESCE(v_motivo, 'Reprogramada por la administración'));
    END IF;

    IF p_estado IS NOT NULL AND p_estado IS DISTINCT FROM v_cita.estado THEN
        IF p_estado NOT IN ('completada', 'no_asistio', 'cancelada') THEN
            RAISE EXCEPTION 'Estado no válido.';
        END IF;
        UPDATE public.citas SET estado = p_estado WHERE id = p_cita_id;  -- valida la transición el trigger
        -- historial_citas no tiene acción para "no asistió": solo se registran cancelar y completar.
        IF p_estado IN ('cancelada', 'completada') THEN
            INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_anteriores, datos_nuevos, motivo)
            VALUES (p_cita_id, auth.uid(), p_estado,
                    jsonb_build_object('estado', v_cita.estado), jsonb_build_object('estado', p_estado),
                    COALESCE(v_motivo, 'Cambio hecho por la administración'));
        END IF;
    END IF;
END;
$$;

-- Nueva cita para un paciente con cuenta (por correo). Queda pendiente de
-- pago, con su orden, igual que una reserva del sitio.
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
    INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_nuevos, motivo)
    VALUES (v_cita, auth.uid(), 'creada', jsonb_build_object('fecha', p_fecha, 'hora', p_hora), 'Agendada por la administración');
    RETURN v_cita;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_agenda() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_actualizar_cita(UUID, TEXT, DATE, TIME, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_crear_cita(TEXT, INT, INT, INT, INT, DATE, TIME) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_agenda() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_cita(UUID, TEXT, DATE, TIME, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_crear_cita(TEXT, INT, INT, INT, INT, DATE, TIME) TO authenticated;

-- Avisos de citas (019/021): si quien actúa es un administrador, el texto lo
-- dice (antes a la profesional le llegaba "<paciente> reprogramó su cita").
CREATE OR REPLACE FUNCTION public.notif_citas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_fecha TEXT := to_char(NEW.fecha, 'DD/MM') || ' ' || to_char(NEW.hora, 'HH24:MI');
    v_actor UUID := (SELECT auth.uid());
    v_prof UUID := public.usuario_de_profesional(NEW.profesional_id);
    v_pac UUID := NEW.usuario_id;
    v_prof_nombre TEXT := public.nombre_usuario(public.usuario_de_profesional(NEW.profesional_id));
    v_admin BOOLEAN := v_actor IS NOT NULL AND v_actor IS DISTINCT FROM v_prof AND v_actor IS DISTINCT FROM v_pac
                       AND EXISTS (SELECT 1 FROM public.usuario_roles ur JOIN public.roles r ON r.id = ur.rol_id
                                   WHERE ur.usuario_id = v_actor AND r.nombre = 'administrador');
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF v_actor IS DISTINCT FROM v_prof THEN
            IF v_admin THEN
                PERFORM public.notificar(v_prof, 'cita',
                    'La administración agendó una cita de ' || public.nombre_usuario(v_pac) || ' para el ' || v_fecha || '.',
                    'The administration booked an appointment for ' || public.nombre_usuario(v_pac) || ' on ' || v_fecha || '.',
                    '/instructor/citas', 'notifReservas');
                PERFORM public.notificar(v_pac, 'cita',
                    'Te agendamos una cita con ' || v_prof_nombre || ' para el ' || v_fecha || '. Puedes pagarla desde tu portal.',
                    'We booked you an appointment with ' || v_prof_nombre || ' on ' || v_fecha || '. You can pay for it from your portal.',
                    '/portal-paciente', 'notifCitas');
            ELSE
                PERFORM public.notificar(v_prof, 'cita',
                    public.nombre_usuario(v_pac) || ' agendó una cita para el ' || v_fecha || '.',
                    public.nombre_usuario(v_pac) || ' booked an appointment for ' || v_fecha || '.',
                    '/instructor/citas', 'notifReservas');
            END IF;
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
                CASE WHEN v_admin THEN 'La administración movió la cita de ' || public.nombre_usuario(v_pac)
                     ELSE public.nombre_usuario(v_pac) || ' reprogramó su cita' END
                    || ' del ' || to_char(OLD.fecha, 'DD/MM') || ' ' || to_char(OLD.hora, 'HH24:MI') || ' al ' || v_fecha || '.',
                CASE WHEN v_admin THEN 'The administration moved ' || public.nombre_usuario(v_pac) || '''s appointment'
                     ELSE public.nombre_usuario(v_pac) || ' rescheduled their appointment' END
                    || ' from ' || to_char(OLD.fecha, 'DD/MM') || ' ' || to_char(OLD.hora, 'HH24:MI') || ' to ' || v_fecha || '.',
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
$function$;
