-- Migración: los avisos de cursos al estudiante (evaluación calificada y clase
-- en vivo programada) respetan la preferencia "Novedades de cursos"
-- (`usuarios.preferencias.notifCursos`) de "Mi perfil" del paciente.
-- Cuerpos iguales a 023 salvo el último argumento de notificar().

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
            '/aula-virtual/calificaciones', 'notifCursos');
    END IF;
    RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notif_intentos() FROM PUBLIC, anon, authenticated;

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
            '/aula-virtual/vivo', 'notifCursos');
    END LOOP;
    RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notif_clase_programada() FROM PUBLIC, anon, authenticated;
