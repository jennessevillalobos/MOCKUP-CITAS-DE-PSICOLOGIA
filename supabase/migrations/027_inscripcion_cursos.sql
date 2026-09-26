-- Migración: inscripción a cursos (P4a).
-- Mismo modelo que las citas (022): el estudiante reporta una transferencia
-- por el precio del curso y la profesional la aprueba; al quedar pagado se
-- crea la inscripción activa. Los cursos gratis se inscriben directo.
-- Además cierra dos huecos: cualquiera podía insertarse una inscripción sin
-- pagar, y el contenido de las clases era de lectura pública.

-- ── 1. Inscripciones: solo vía funciones; una por estudiante y curso ──
DROP POLICY IF EXISTS "Usuarios se inscriben en cursos" ON public.inscripciones;
CREATE UNIQUE INDEX IF NOT EXISTS inscripciones_usuario_curso_uniq ON public.inscripciones (usuario_id, curso_id);

CREATE OR REPLACE FUNCTION public.tengo_acceso_curso(p_curso_id INT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.inscripciones
        WHERE curso_id = p_curso_id AND usuario_id = (SELECT auth.uid()) AND estado = 'activa'
    );
$$;
REVOKE EXECUTE ON FUNCTION public.tengo_acceso_curso(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tengo_acceso_curso(INT) TO authenticated;

-- ── 2. Contenido de clases: vista previa, inscritos o la profesional ──
DROP POLICY IF EXISTS "Lectura publica de clases" ON public.clases;
CREATE POLICY "Vista previa e inscritos leen clases" ON public.clases FOR SELECT
    USING (
        estado = 'activo' AND (
            vista_previa
            OR EXISTS (SELECT 1 FROM public.modulos m WHERE m.id = clases.modulo_id AND public.tengo_acceso_curso(m.curso_id))
        )
    );

-- ── 3. La profesional ve órdenes, pagos y comprobantes de sus cursos ──
CREATE POLICY "Profesionales ven ordenes de sus cursos" ON public.ordenes FOR SELECT TO authenticated
    USING (tipo_producto = 'curso' AND producto_id ~ '^[0-9]+$' AND public.es_mi_curso(producto_id::int));
CREATE POLICY "Profesionales ven pagos de sus cursos" ON public.pagos FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ordenes o
        WHERE o.id = pagos.orden_id AND o.tipo_producto = 'curso' AND o.producto_id ~ '^[0-9]+$'
          AND public.es_mi_curso(o.producto_id::int)
    ));
CREATE POLICY "Profesionales ven comprobantes de sus cursos" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'comprobantes' AND EXISTS (
        SELECT 1 FROM public.pagos p
        JOIN public.ordenes o ON o.id = p.orden_id AND o.tipo_producto = 'curso' AND o.producto_id ~ '^[0-9]+$'
        WHERE p.comprobante_url = storage.objects.name AND public.es_mi_curso(o.producto_id::int)
    ));

-- ── 4. Estado de inscripción del usuario en un curso (página pública) ──
CREATE OR REPLACE FUNCTION public.estado_inscripcion(p_slug TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_curso RECORD; v_uid UUID := (SELECT auth.uid()); v_aprobado INT := 0; v_revision INT := 0;
BEGIN
    SELECT id, precio, moneda, nombre INTO v_curso FROM public.cursos WHERE slug = p_slug AND estado = 'publicado';
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF v_uid IS NOT NULL THEN
        SELECT COALESCE(sum(p.monto) FILTER (WHERE p.estado = 'aprobado'), 0),
               COALESCE(sum(p.monto) FILTER (WHERE p.estado = 'pendiente'), 0)
          INTO v_aprobado, v_revision
          FROM public.pagos p JOIN public.ordenes o ON o.id = p.orden_id
         WHERE o.tipo_producto = 'curso' AND o.producto_id = v_curso.id::text AND o.usuario_id = v_uid;
    END IF;
    RETURN jsonb_build_object(
        'cursoId', v_curso.id,
        'nombre', v_curso.nombre,
        'precio', COALESCE(v_curso.precio, 0),
        'moneda', COALESCE(v_curso.moneda, 'USD'),
        'inscrito', v_uid IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.inscripciones WHERE curso_id = v_curso.id AND usuario_id = v_uid AND estado = 'activa'),
        'pagado', v_aprobado,
        'enRevision', v_revision
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.estado_inscripcion(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estado_inscripcion(TEXT) TO anon, authenticated;

-- ── 5. Inscripción directa a un curso gratis ──
CREATE OR REPLACE FUNCTION public.inscribirse_curso_gratis(p_curso_id INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_curso RECORD; v_uid UUID := (SELECT auth.uid());
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    SELECT * INTO v_curso FROM public.cursos WHERE id = p_curso_id AND estado = 'publicado';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El curso no está disponible.' USING ERRCODE = 'check_violation';
    END IF;
    IF COALESCE(v_curso.precio, 0) > 0 THEN
        RAISE EXCEPTION 'Este curso requiere pago.' USING ERRCODE = 'check_violation';
    END IF;
    INSERT INTO public.inscripciones (usuario_id, curso_id, tipo_acceso, estado)
    VALUES (v_uid, p_curso_id, 'completo', 'activa')
    ON CONFLICT (usuario_id, curso_id) DO UPDATE SET estado = 'activa';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.inscribirse_curso_gratis(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inscribirse_curso_gratis(INT) TO authenticated;

-- ── 6. El estudiante reporta la transferencia del curso ──
CREATE OR REPLACE FUNCTION public.reportar_pago_curso(p_curso_id INT, p_monto INT, p_referencia TEXT, p_comprobante TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_curso RECORD; v_uid UUID := (SELECT auth.uid()); v_orden UUID; v_pago UUID; v_cubierto INT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para pagar.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    SELECT * INTO v_curso FROM public.cursos WHERE id = p_curso_id AND estado = 'publicado';
    IF NOT FOUND OR COALESCE(v_curso.precio, 0) <= 0 THEN
        RAISE EXCEPTION 'Este curso no admite pagos.' USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM public.inscripciones WHERE curso_id = p_curso_id AND usuario_id = v_uid AND estado = 'activa') THEN
        RAISE EXCEPTION 'Ya estás inscrito en este curso.' USING ERRCODE = 'check_violation';
    END IF;
    IF p_comprobante IS NOT NULL AND split_part(p_comprobante, '/', 1) <> v_uid::text THEN
        RAISE EXCEPTION 'Comprobante inválido.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT id INTO v_orden FROM public.ordenes
     WHERE tipo_producto = 'curso' AND producto_id = p_curso_id::text AND usuario_id = v_uid AND estado = 'pendiente'
     ORDER BY fecha_creacion LIMIT 1;
    IF v_orden IS NULL THEN
        INSERT INTO public.ordenes (usuario_id, concepto, tipo_producto, producto_id, monto, moneda)
        VALUES (v_uid, 'Curso: ' || v_curso.nombre, 'curso', p_curso_id::text, v_curso.precio, COALESCE(v_curso.moneda, 'USD'))
        RETURNING id INTO v_orden;
    END IF;

    -- Lo aprobado y lo que sigue en revisión cuentan contra el precio.
    SELECT COALESCE(sum(monto), 0) INTO v_cubierto FROM public.pagos
     WHERE orden_id = v_orden AND estado IN ('aprobado', 'pendiente');
    IF p_monto IS NULL OR p_monto <= 0 OR p_monto > v_curso.precio - v_cubierto THEN
        RAISE EXCEPTION 'El monto debe ser mayor a 0 y no superar el saldo del curso.' USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.pagos (orden_id, usuario_id, monto, moneda, metodo, referencia, comprobante_url, estado)
    VALUES (v_orden, v_uid, p_monto, COALESCE(v_curso.moneda, 'USD'), 'transferencia', NULLIF(trim(p_referencia), ''), p_comprobante, 'pendiente')
    RETURNING id INTO v_pago;
    RETURN v_pago;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reportar_pago_curso(INT, INT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reportar_pago_curso(INT, INT, TEXT, TEXT) TO authenticated;

-- ── 7. revisar_pago: citas (igual que 025) y cursos ──
CREATE OR REPLACE FUNCTION public.revisar_pago(p_pago_id UUID, p_aprobar BOOLEAN, p_motivo TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pago RECORD; v_orden RECORD; v_cita RECORD; v_abonado INT; v_saldo INT; v_aprobado INT;
        v_motivo TEXT := NULLIF(left(btrim(p_motivo), 300), '');
BEGIN
    SELECT p.* INTO v_pago FROM public.pagos p WHERE p.id = p_pago_id;
    IF NOT FOUND OR v_pago.estado <> 'pendiente' THEN
        RAISE EXCEPTION 'El pago no existe o ya fue revisado.' USING ERRCODE = 'check_violation';
    END IF;
    SELECT o.* INTO v_orden FROM public.ordenes o WHERE o.id = v_pago.orden_id;

    -- Pago de un curso
    IF v_orden.tipo_producto = 'curso' THEN
        IF v_orden.producto_id !~ '^[0-9]+$' OR NOT EXISTS (
            SELECT 1 FROM public.cursos c WHERE c.id = v_orden.producto_id::int AND c.profesional_id = public.mi_profesional_id()
        ) THEN
            RAISE EXCEPTION 'No tienes permiso para revisar este pago.' USING ERRCODE = 'insufficient_privilege';
        END IF;
        IF NOT p_aprobar THEN
            UPDATE public.pagos SET estado = 'rechazado', motivo_rechazo = v_motivo WHERE id = p_pago_id;
            RETURN;
        END IF;
        UPDATE public.pagos SET estado = 'aprobado' WHERE id = p_pago_id;
        SELECT COALESCE(sum(monto), 0) INTO v_aprobado FROM public.pagos WHERE orden_id = v_orden.id AND estado = 'aprobado';
        IF v_aprobado >= v_orden.monto THEN
            UPDATE public.ordenes SET estado = 'pagado' WHERE id = v_orden.id;
            INSERT INTO public.inscripciones (usuario_id, curso_id, tipo_acceso, estado)
            VALUES (v_orden.usuario_id, v_orden.producto_id::int, 'completo', 'activa')
            ON CONFLICT (usuario_id, curso_id) DO UPDATE SET estado = 'activa';
        END IF;
        RETURN;
    END IF;

    -- Pago de una cita
    SELECT c.* INTO v_cita FROM public.citas c WHERE v_orden.tipo_producto = 'cita' AND c.id::text = v_orden.producto_id;
    IF NOT FOUND OR v_cita.profesional_id IS DISTINCT FROM public.mi_profesional_id() THEN
        RAISE EXCEPTION 'No tienes permiso para revisar este pago.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NOT p_aprobar THEN
        UPDATE public.pagos SET estado = 'rechazado', motivo_rechazo = v_motivo WHERE id = p_pago_id;
        INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_nuevos, motivo)
        VALUES (v_cita.id, (SELECT auth.uid()), 'pago_rechazado', jsonb_build_object('pago_id', p_pago_id, 'monto', v_pago.monto), v_motivo);
        RETURN;
    END IF;

    v_abonado := COALESCE(v_cita.monto_abonado, 0) + v_pago.monto;
    v_saldo := GREATEST(0, v_cita.precio_total - v_abonado);
    UPDATE public.pagos SET estado = 'aprobado' WHERE id = p_pago_id;
    UPDATE public.citas SET monto_abonado = v_abonado, saldo_pendiente = v_saldo,
        estado = CASE WHEN v_cita.estado IN ('pendiente_pago', 'parcialmente_pagada')
                      THEN CASE WHEN v_saldo = 0 THEN 'confirmada' ELSE 'parcialmente_pagada' END
                      ELSE v_cita.estado END
     WHERE id = v_cita.id;
    IF v_saldo = 0 THEN
        UPDATE public.ordenes SET estado = 'pagado' WHERE id = v_pago.orden_id;
    END IF;
    INSERT INTO public.historial_citas (cita_id, usuario_id, accion, datos_anteriores, datos_nuevos, motivo)
    VALUES (v_cita.id, (SELECT auth.uid()), CASE WHEN v_saldo = 0 THEN 'confirmada' ELSE 'pago_registrado' END,
            jsonb_build_object('monto_abonado', v_cita.monto_abonado, 'estado', v_cita.estado),
            jsonb_build_object('monto_abonado', v_abonado, 'saldo_pendiente', v_saldo, 'pago_id', p_pago_id), v_motivo);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revisar_pago(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revisar_pago(UUID, BOOLEAN, TEXT) TO authenticated;

-- ── 8. Transferencias por revisar: citas y cursos ──
-- Pasa a SECURITY DEFINER para devolver el nombre del estudiante (usuarios
-- no es legible entre usuarios); filtra por mi_profesional_id().
DROP FUNCTION IF EXISTS public.pagos_en_revision_profesional();
CREATE FUNCTION public.pagos_en_revision_profesional()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(x.fila ORDER BY x.fecha), '[]'::jsonb) FROM (
        SELECT p.fecha, jsonb_build_object(
            'id', p.id, 'tipo', 'cita', 'citaId', c.id, 'cursoId', NULL,
            'monto', p.monto, 'moneda', p.moneda, 'referencia', p.referencia, 'comprobante', p.comprobante_url, 'fecha', p.fecha,
            'alumno', public.nombre_usuario(p.usuario_id),
            'concepto', COALESCE(s.nombre, 'Cita') || ' · ' || to_char(c.fecha, 'DD/MM/YYYY') || ' ' || to_char(c.hora, 'HH24:MI')
        ) AS fila
        FROM public.pagos p
        JOIN public.ordenes o ON o.id = p.orden_id AND o.tipo_producto = 'cita'
        JOIN public.citas c ON c.id::text = o.producto_id
        LEFT JOIN public.servicios s ON s.id = c.servicio_id
        WHERE p.estado = 'pendiente' AND p.metodo = 'transferencia' AND c.profesional_id = public.mi_profesional_id()
        UNION ALL
        SELECT p.fecha, jsonb_build_object(
            'id', p.id, 'tipo', 'curso', 'citaId', NULL, 'cursoId', cu.id,
            'monto', p.monto, 'moneda', p.moneda, 'referencia', p.referencia, 'comprobante', p.comprobante_url, 'fecha', p.fecha,
            'alumno', public.nombre_usuario(p.usuario_id),
            'concepto', 'Curso: ' || cu.nombre
        )
        FROM public.pagos p
        JOIN public.ordenes o ON o.id = p.orden_id AND o.tipo_producto = 'curso' AND o.producto_id ~ '^[0-9]+$'
        JOIN public.cursos cu ON cu.id = o.producto_id::int
        WHERE p.estado = 'pendiente' AND p.metodo = 'transferencia' AND cu.profesional_id = public.mi_profesional_id()
    ) x;
$$;
REVOKE EXECUTE ON FUNCTION public.pagos_en_revision_profesional() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagos_en_revision_profesional() TO authenticated;

-- ── 9. Mis cursos (Aula Virtual) con progreso ──
CREATE OR REPLACE FUNCTION public.mis_cursos_estudiante()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'cursoId', c.id, 'slug', c.slug, 'nombre', c.nombre, 'imagen', c.imagen,
        'profesional', public.nombre_usuario(public.usuario_de_profesional(c.profesional_id)),
        'inscritoEn', i.fecha_inicio,
        'totalClases', t.total, 'completadas', t.completadas,
        'porcentaje', CASE WHEN t.total > 0 THEN round(100.0 * t.completadas / t.total) ELSE 0 END
    ) ORDER BY i.fecha_inicio DESC), '[]'::jsonb)
    FROM public.inscripciones i
    JOIN public.cursos c ON c.id = i.curso_id
    CROSS JOIN LATERAL (
        SELECT count(cl.id)::int AS total,
               count(cl.id) FILTER (WHERE EXISTS (
                   SELECT 1 FROM public.progreso pr WHERE pr.clase_id = cl.id AND pr.usuario_id = i.usuario_id AND pr.completado
               ))::int AS completadas
        FROM public.modulos m JOIN public.clases cl ON cl.modulo_id = m.id AND cl.estado = 'activo'
        WHERE m.curso_id = c.id
    ) t
    WHERE i.usuario_id = (SELECT auth.uid()) AND i.estado = 'activa';
$$;
REVOKE EXECUTE ON FUNCTION public.mis_cursos_estudiante() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_cursos_estudiante() TO authenticated;

-- ── 10. Notificaciones de pagos (023/025) también para cursos ──
CREATE OR REPLACE FUNCTION public.notif_pagos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prof INT; v_monto TEXT; v_tipo TEXT; v_link_alumno TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.estado = OLD.estado THEN RETURN NEW; END IF;
    SELECT o.tipo_producto,
           CASE o.tipo_producto
               WHEN 'cita' THEN (SELECT ci.profesional_id FROM public.citas ci WHERE ci.id::text = o.producto_id)
               WHEN 'curso' THEN (SELECT cu.profesional_id FROM public.cursos cu WHERE o.producto_id ~ '^[0-9]+$' AND cu.id = o.producto_id::int)
           END
      INTO v_tipo, v_prof
      FROM public.ordenes o WHERE o.id = NEW.orden_id;
    v_link_alumno := CASE WHEN v_tipo = 'curso' THEN '/aula-virtual' ELSE '/portal-paciente' END;
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
            v_link_alumno, NULL);
        IF NEW.metodo IN ('stripe', 'paypal') AND v_prof IS NOT NULL THEN
            PERFORM public.notificar(public.usuario_de_profesional(v_prof), 'pago',
                'Pago recibido de ' || public.nombre_usuario(NEW.usuario_id) || ' por ' || v_monto || '.',
                'Payment received from ' || public.nombre_usuario(NEW.usuario_id) || ' for ' || v_monto || '.',
                '/instructor/citas', NULL);
        END IF;
    ELSIF NEW.estado = 'rechazado' AND NEW.metodo = 'transferencia' THEN
        PERFORM public.notificar(NEW.usuario_id, 'pago',
            'Tu pago de ' || v_monto || ' fue rechazado.'
                || COALESCE(' Motivo: ' || NEW.motivo_rechazo || '.', ' Revisa los datos de la transferencia o contacta a tu profesional.'),
            'Your ' || v_monto || ' payment was rejected.'
                || COALESCE(' Reason: ' || NEW.motivo_rechazo || '.', ' Check the transfer details or contact your professional.'),
            v_link_alumno, NULL);
    END IF;
    RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notif_pagos() FROM PUBLIC, anon, authenticated;

-- ── 11. Inscripción: avisa a la profesional y al estudiante (nunca al actor) ──
CREATE OR REPLACE FUNCTION public.notif_inscripciones()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prof INT; v_curso TEXT; v_actor UUID := (SELECT auth.uid()); v_usuario_prof UUID;
BEGIN
    IF TG_OP = 'UPDATE' AND (NEW.estado <> 'activa' OR OLD.estado = 'activa') THEN RETURN NEW; END IF;
    SELECT profesional_id, nombre INTO v_prof, v_curso FROM public.cursos WHERE id = NEW.curso_id;
    v_usuario_prof := public.usuario_de_profesional(v_prof);
    IF v_usuario_prof IS DISTINCT FROM v_actor THEN
        PERFORM public.notificar(v_usuario_prof, 'curso',
            public.nombre_usuario(NEW.usuario_id) || ' se inscribió en "' || v_curso || '".',
            public.nombre_usuario(NEW.usuario_id) || ' enrolled in "' || v_curso || '".',
            '/instructor/cursos', NULL);
    END IF;
    IF NEW.usuario_id IS DISTINCT FROM v_actor THEN
        PERFORM public.notificar(NEW.usuario_id, 'curso',
            'Ya tienes acceso al curso "' || v_curso || '".',
            'You now have access to the course "' || v_curso || '".',
            '/aula-virtual', NULL);
    END IF;
    RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notif_inscripciones() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notif_inscripciones ON public.inscripciones;
CREATE TRIGGER trg_notif_inscripciones AFTER INSERT OR UPDATE OF estado ON public.inscripciones
    FOR EACH ROW EXECUTE FUNCTION public.notif_inscripciones();
