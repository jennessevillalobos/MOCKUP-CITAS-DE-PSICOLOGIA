-- Migración: "Mi perfil" editable con sesión real
--
-- 1. `usuarios.preferencias` (JSONB): preferencias de notificación de "Mi perfil".
-- 2. Columnas editables: cada usuario solo cambia sus datos de perfil (no estado,
--    email ni fechas); el profesional solo su especialidad y descripción (no
--    estado, slug ni vínculo de cuenta).
-- 3. Bucket público `avatares`: cada usuario escribe solo en su carpeta <uid>/.

ALTER TABLE public.usuarios ADD COLUMN preferencias JSONB NOT NULL DEFAULT '{}'::jsonb;

REVOKE UPDATE ON public.usuarios FROM anon, authenticated;
GRANT UPDATE (nombre, telefono, foto, idioma, preferencias) ON public.usuarios TO authenticated;

REVOKE UPDATE ON public.profesionales FROM anon, authenticated;
GRANT UPDATE (especialidad, descripcion) ON public.profesionales TO authenticated;
CREATE POLICY "Profesionales actualizan su ficha" ON public.profesionales
    FOR UPDATE TO authenticated
    USING (usuario_id = (SELECT auth.uid()))
    WITH CHECK (usuario_id = (SELECT auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatares', 'avatares', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Usuarios suben su avatar" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Usuarios reemplazan su avatar" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Usuarios borran su avatar" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
-- Reemplazar (upsert) un archivo también requiere poder leer la fila del objeto.
CREATE POLICY "Usuarios leen su avatar" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
