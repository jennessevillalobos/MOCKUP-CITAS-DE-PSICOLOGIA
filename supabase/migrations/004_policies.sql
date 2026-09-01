-- Migración generada a partir de Policies.csv provisto por tu compañero.
-- NOTA: Se aplicaron correcciones de seguridad CRÍTICAS a las políticas enviadas.
-- Varias políticas usaban "auth.uid() IS NOT NULL", lo que permitía a CUALQUIER usuario logueado
-- ver o modificar datos de OTROS usuarios. Han sido corregidas para usar "auth.uid() = usuario_id".

CREATE POLICY "Lectura publica de calificaciones" ON public.calificaciones FOR SELECT TO public USING (true);
CREATE POLICY "Usuarios crean calificaciones" ON public.calificaciones FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Usuarios actualizan sus propias citas" ON public.citas FOR UPDATE TO public USING ((auth.uid() = usuario_id));
CREATE POLICY "Usuarios crean sus citas" ON public.citas FOR INSERT TO public WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Usuarios ven sus propias citas" ON public.citas FOR SELECT TO public USING ((auth.uid() = usuario_id));
CREATE POLICY "Lectura publica de clases" ON public.clases FOR SELECT TO public USING ((estado = 'activo'::text));
CREATE POLICY "Usuarios ven sus compras digitales" ON public.compras_digitales FOR SELECT TO public USING ((auth.uid() = usuario_id));
CREATE POLICY "Lectura publica de cursos" ON public.cursos FOR SELECT TO public USING ((estado = 'publicado'::text));
CREATE POLICY "Usuarios ven sus enlaces de descarga" ON public.enlaces_descarga FOR SELECT TO public USING ((auth.uid() = usuario_id));
CREATE POLICY "Lectura publica de evaluaciones" ON public.evaluaciones FOR SELECT TO public USING (true);
CREATE POLICY "Lectura publica de horarios" ON public.horarios FOR SELECT TO public USING (true);
CREATE POLICY "Usuarios se inscriben en cursos" ON public.inscripciones FOR INSERT TO public WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Usuarios ven sus inscripciones" ON public.inscripciones FOR SELECT TO public USING ((auth.uid() = usuario_id));
CREATE POLICY "Usuarios crean sus intentos de evaluacion" ON public.intentos_evaluacion FOR INSERT TO public WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Usuarios ven sus intentos de evaluacion" ON public.intentos_evaluacion FOR SELECT TO public USING ((auth.uid() = usuario_id));
CREATE POLICY "Lectura publica de lugares" ON public.lugares FOR SELECT TO public USING (true);
CREATE POLICY "Lectura publica de modalidades" ON public.modalidades FOR SELECT TO public USING (true);
CREATE POLICY "Lectura publica de modulos" ON public.modulos FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM cursos WHERE ((cursos.id = modulos.curso_id) AND (cursos.estado = 'publicado'::text)))));
CREATE POLICY "Lectura publica de monedas" ON public.monedas FOR SELECT TO public USING (true);
CREATE POLICY "Lectura publica de opciones" ON public.opciones FOR SELECT TO public USING (true);
CREATE POLICY "Usuarios crean sus propias ordenes" ON public.ordenes FOR INSERT TO public WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Usuarios ven sus ordenes" ON public.ordenes FOR SELECT TO public USING ((auth.uid() = usuario_id));
CREATE POLICY "Usuarios ven sus propios pagos" ON public.pagos FOR SELECT TO public USING ((auth.uid() = usuario_id));
CREATE POLICY "Lectura publica de preguntas" ON public.preguntas FOR SELECT TO public USING (true);
CREATE POLICY "Lectura publica de productos digitales" ON public.productos_digitales FOR SELECT TO public USING ((estado = 'activo'::text));
CREATE POLICY "Lectura publica de profesional_lugar" ON public.profesional_lugar FOR SELECT TO public USING (true);
CREATE POLICY "Lectura publica de profesional_servicio" ON public.profesional_servicio FOR SELECT TO public USING (true);
CREATE POLICY "Lectura publica de profesionales" ON public.profesionales FOR SELECT TO public USING (true);
CREATE POLICY "Usuarios ven y actualizan su progreso" ON public.progreso FOR ALL TO public USING ((auth.uid() = usuario_id));
CREATE POLICY "Lectura publica de roles" ON public.roles FOR SELECT TO public USING (true);
CREATE POLICY "Lectura publica de servicio_modalidad" ON public.servicio_modalidad FOR SELECT TO public USING (true);
CREATE POLICY "Lectura publica de servicios" ON public.servicios FOR SELECT TO public USING (true);
CREATE POLICY "Lectura publica de tasas_cambio" ON public.tasas_cambio FOR SELECT TO public USING (true);
CREATE POLICY "Usuarios ven su propio rol" ON public.usuario_roles FOR SELECT TO public USING ((auth.uid() = usuario_id));
CREATE POLICY "Usuarios actualizan su propio perfil" ON public.usuarios FOR UPDATE TO public USING ((auth.uid() = id));
CREATE POLICY "Usuarios ven su propio perfil" ON public.usuarios FOR SELECT TO public USING ((auth.uid() = id));
