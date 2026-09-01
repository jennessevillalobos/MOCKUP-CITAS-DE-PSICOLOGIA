-- 1. Tablas de Monedas y Tasas
CREATE TABLE public.monedas (
    codigo TEXT PRIMARY KEY, -- ej: 'USD', 'EUR', 'COP'
    nombre TEXT NOT NULL,
    simbolo TEXT NOT NULL,
    es_principal BOOLEAN DEFAULT false,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

CREATE TABLE public.tasas_cambio (
    id SERIAL PRIMARY KEY,
    moneda_origen TEXT REFERENCES public.monedas(codigo),
    moneda_destino TEXT REFERENCES public.monedas(codigo),
    tasa NUMERIC(12, 4) NOT NULL,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Lugares de Atención
CREATE TABLE public.lugares (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    direccion TEXT,
    ciudad TEXT,
    mapa_url TEXT,
    contacto TEXT,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

-- 3. Servicios y Modalidades
CREATE TABLE public.servicios (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    categoria TEXT,
    descripcion TEXT,
    slug TEXT UNIQUE NOT NULL,
    imagen TEXT,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

CREATE TABLE public.modalidades (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL CHECK (nombre IN ('presencial', 'virtual', 'domicilio'))
);

INSERT INTO public.modalidades (nombre) VALUES ('presencial'), ('virtual'), ('domicilio');

CREATE TABLE public.servicio_modalidad (
    id SERIAL PRIMARY KEY,
    servicio_id INT REFERENCES public.servicios(id) ON DELETE CASCADE,
    modalidad_id INT REFERENCES public.modalidades(id) ON DELETE CASCADE,
    duracion_minutos INT NOT NULL,
    precio INT NOT NULL, -- Guardado en unidad mínima (ej. centavos)
    moneda TEXT REFERENCES public.monedas(codigo)
);

-- 4. Profesionales
CREATE TABLE public.profesionales (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    especialidad TEXT,
    descripcion TEXT,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

CREATE TABLE public.profesional_servicio (
    profesional_id INT REFERENCES public.profesionales(id) ON DELETE CASCADE,
    servicio_id INT REFERENCES public.servicios(id) ON DELETE CASCADE,
    PRIMARY KEY (profesional_id, servicio_id)
);

CREATE TABLE public.profesional_lugar (
    profesional_id INT REFERENCES public.profesionales(id) ON DELETE CASCADE,
    lugar_id INT REFERENCES public.lugares(id) ON DELETE CASCADE,
    PRIMARY KEY (profesional_id, lugar_id)
);

-- 5. Horarios y Excepciones (Agenda)
CREATE TABLE public.horarios (
    id SERIAL PRIMARY KEY,
    profesional_id INT REFERENCES public.profesionales(id) ON DELETE CASCADE,
    dia_semana INT CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo, 6=Sábado
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    lugar_id INT REFERENCES public.lugares(id),
    modalidad_id INT REFERENCES public.modalidades(id)
);

CREATE TABLE public.excepciones_horario (
    id SERIAL PRIMARY KEY,
    profesional_id INT REFERENCES public.profesionales(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo TEXT CHECK (tipo IN ('bloqueo', 'vacacion', 'excepcional')),
    hora_inicio TIME,
    hora_fin TIME
);

-- 6. Citas e Historial
CREATE TABLE public.citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    servicio_id INT REFERENCES public.servicios(id),
    profesional_id INT REFERENCES public.profesionales(id),
    lugar_id INT REFERENCES public.lugares(id),
    modalidad_id INT REFERENCES public.modalidades(id),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    duracion_minutos INT NOT NULL,
    precio_total INT NOT NULL,
    moneda TEXT REFERENCES public.monedas(codigo),
    monto_abonado INT DEFAULT 0,
    saldo_pendiente INT NOT NULL,
    estado TEXT DEFAULT 'pendiente_pago' CHECK (estado IN ('pendiente_pago', 'parcialmente_pagada', 'confirmada', 'completada', 'cancelada', 'reprogramada')),
    observaciones TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.calificaciones (
    id SERIAL PRIMARY KEY,
    cita_id UUID REFERENCES public.citas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.usuarios(id),
    profesional_id INT REFERENCES public.profesionales(id),
    servicio_id INT REFERENCES public.servicios(id),
    nota_profesional INT CHECK (nota_profesional BETWEEN 1 AND 5),
    nota_servicio INT CHECK (nota_servicio BETWEEN 1 AND 5),
    comentario TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'oculto')),
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en todas las nuevas tablas
ALTER TABLE public.monedas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasas_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lugares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicio_modalidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesional_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesional_lugar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excepciones_horario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;