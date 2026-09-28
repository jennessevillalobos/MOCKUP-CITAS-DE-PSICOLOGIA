-- 054 · Toda cuenta nueva nace como paciente (rol 'estudiante'), venga del
-- registro del sitio, de una reserva sin sesión o de "Continuar con Google"
-- (2026-09-27). Antes el rol lo asignaba el navegador tras el registro y la
-- política de usuario_roles lo impedía, así que las cuentas quedaban sin rol.
-- Con Google el nombre llega en 'full_name' o 'name' y la foto en
-- 'avatar_url' / 'picture'. Las profesionales y administradoras se asignan
-- después desde el panel admin (Usuarios → roles).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, foto)
  VALUES (
    new.id,
    new.email,
    NULLIF(btrim(COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
    NULLIF(COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''), '')
  );
  INSERT INTO public.usuario_roles (usuario_id, rol_id)
  SELECT new.id, r.id FROM public.roles r WHERE r.nombre = 'estudiante'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Cuentas existentes sin ningún rol (registros anteriores del sitio).
INSERT INTO public.usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM public.usuarios u CROSS JOIN public.roles r
WHERE r.nombre = 'estudiante'
  AND NOT EXISTS (SELECT 1 FROM public.usuario_roles ur WHERE ur.usuario_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.profesionales p WHERE p.usuario_id = u.id)
ON CONFLICT DO NOTHING;
