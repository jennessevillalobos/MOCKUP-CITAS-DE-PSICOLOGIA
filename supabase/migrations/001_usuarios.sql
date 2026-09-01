-- 1. Crear tabla de usuarios/perfiles vinculada a auth.users
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT,
    telefono TEXT,
    foto TEXT,
    idioma TEXT DEFAULT 'es',
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'bloqueado')),
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    ultimo_acceso TIMESTAMPTZ
);

-- 2. Crear tabla de roles
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE CHECK (nombre IN ('estudiante', 'instructor', 'administrador'))
);

-- Insertar los 3 roles por defecto del sistema
INSERT INTO public.roles (nombre) VALUES ('estudiante'), ('instructor'), ('administrador');

-- 3. Crear tabla intermedia de usuario_roles
CREATE TABLE public.usuario_roles (
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    rol_id INT REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, rol_id)
);

-- 4. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_roles ENABLE ROW LEVEL SECURITY;

-- 5. Trigger para crear automáticamente la fila en public.usuarios al registrarse en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();