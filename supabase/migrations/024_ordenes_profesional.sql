-- Migración: la profesional ve las órdenes de sus propias citas.
-- Sin esto, `ordenes` solo era visible para su dueño (el paciente), y todo lo
-- que la profesional necesita para revisar transferencias (022/023b) se unía
-- a través de `ordenes` y quedaba vacío: pagos_en_revision_profesional(), la
-- política "Profesionales ven pagos de sus citas" y la del bucket `comprobantes`.

CREATE POLICY "Profesionales ven ordenes de sus citas" ON public.ordenes
    FOR SELECT TO authenticated
    USING (
        tipo_producto = 'cita'
        AND EXISTS (
            SELECT 1 FROM public.citas c
            WHERE c.id::text = ordenes.producto_id
              AND c.profesional_id = public.mi_profesional_id()
        )
    );
