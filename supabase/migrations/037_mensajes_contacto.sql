-- Migración: mensajes del formulario de contacto (Home y /contacto).
-- Los guarda la Edge Function `send-contact` (service role) y los reenvía por
-- correo con Resend. Se guardan siempre, aunque el correo falle, para no
-- perder ningún mensaje. Nadie los lee desde el navegador por ahora (se
-- consultan en Supabase; el panel admin todavía es demo).

CREATE TABLE IF NOT EXISTS public.mensajes_contacto (
    id BIGSERIAL PRIMARY KEY,
    nombre TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 120),
    correo TEXT NOT NULL CHECK (char_length(correo) <= 200),
    telefono TEXT CHECK (telefono IS NULL OR char_length(telefono) <= 40),
    asunto TEXT CHECK (asunto IS NULL OR char_length(asunto) <= 200),
    mensaje TEXT NOT NULL CHECK (char_length(mensaje) BETWEEN 5 AND 5000),
    origen TEXT NOT NULL DEFAULT 'contacto' CHECK (origen IN ('home', 'contacto')),
    idioma TEXT NOT NULL DEFAULT 'es' CHECK (idioma IN ('es', 'en')),
    -- Resultado del envío por correo (Resend).
    correo_enviado BOOLEAN NOT NULL DEFAULT FALSE,
    correo_id TEXT,
    correo_error TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mensajes_contacto_correo_fecha ON public.mensajes_contacto (lower(correo), creado_en DESC);

-- RLS activo y sin políticas: solo el service role (Edge Function) accede.
ALTER TABLE public.mensajes_contacto ENABLE ROW LEVEL SECURITY;
