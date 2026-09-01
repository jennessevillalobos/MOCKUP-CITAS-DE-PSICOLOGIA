-- 1. Órdenes, Pagos y Reembolsos
CREATE TABLE public.ordenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    tipo_producto TEXT CHECK (tipo_producto IN ('cita', 'curso', 'producto_digital', 'cuota')),
    producto_id TEXT NOT NULL,
    monto INT NOT NULL,
    moneda TEXT REFERENCES public.monedas(codigo),
    tasa_aplicada NUMERIC(12, 4),
    monto_convertido INT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'cancelado', 'reembolsado')),
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID REFERENCES public.ordenes(id) ON DELETE CASCADE,
    monto INT NOT NULL,
    moneda TEXT REFERENCES public.monedas(codigo),
    metodo TEXT CHECK (metodo IN ('stripe', 'paypal', 'manual')),
    referencia TEXT,
    comprobante_url TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.reembolsos (
    id SERIAL PRIMARY KEY,
    pago_id UUID REFERENCES public.pagos(id) ON DELETE CASCADE,
    monto INT NOT NULL,
    motivo TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'fallido')),
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Cursos, Módulos y Clases (Aula Virtual)
CREATE TABLE public.cursos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    imagen TEXT,
    descripcion TEXT,
    precio INT NOT NULL,
    moneda TEXT REFERENCES public.monedas(codigo),
    fecha_inicio DATE,
    fecha_fin DATE,
    estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado', 'archivado'))
);

CREATE TABLE public.modulos (
    id SERIAL PRIMARY KEY,
    curso_id INT REFERENCES public.cursos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    orden INT DEFAULT 0,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

CREATE TABLE public.clases (
    id SERIAL PRIMARY KEY,
    modulo_id INT REFERENCES public.modulos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    texto_formativo TEXT,
    video_url TEXT,
    duracion_segundos INT DEFAULT 0,
    orden INT DEFAULT 0,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

-- 3. Evaluaciones e Intentos
CREATE TABLE public.evaluaciones (
    id SERIAL PRIMARY KEY,
    curso_id INT REFERENCES public.cursos(id) ON DELETE CASCADE,
    modulo_id INT REFERENCES public.modulos(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('quiz', 'examen_final')),
    tiempo_limite_minutos INT,
    nota_minima INT NOT NULL DEFAULT 70,
    intentos_max INT DEFAULT 3
);

CREATE TABLE public.preguntas (
    id SERIAL PRIMARY KEY,
    evaluacion_id INT REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('opcion_multiple', 'verdadero_falso')),
    orden INT DEFAULT 0
);

CREATE TABLE public.opciones (
    id SERIAL PRIMARY KEY,
    pregunta_id INT REFERENCES public.preguntas(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    es_correcta BOOLEAN DEFAULT false,
    orden INT DEFAULT 0
);

CREATE TABLE public.intentos_evaluacion (
    id SERIAL PRIMARY KEY,
    evaluacion_id INT REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nota INT NOT NULL,
    aprobado BOOLEAN DEFAULT false,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Inscripciones, Progreso y Derechos de Acceso
CREATE TABLE public.inscripciones (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    curso_id INT REFERENCES public.cursos(id) ON DELETE CASCADE,
    tipo_acceso TEXT CHECK (tipo_acceso IN ('completo', 'por_cuotas')),
    estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida', 'finalizada')),
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ
);

CREATE TABLE public.progreso (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    clase_id INT REFERENCES public.clases(id) ON DELETE CASCADE,
    segundo_actual INT DEFAULT 0,
    porcentaje NUMERIC(5,2) DEFAULT 0,
    completado BOOLEAN DEFAULT false,
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, clase_id)
);

-- 5. Productos Digitales
CREATE TABLE public.productos_digitales (
    id SERIAL PRIMARY KEY,
    tipo TEXT CHECK (tipo IN ('video', 'libro_pdf')),
    titulo TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    portada TEXT,
    descripcion TEXT,
    precio INT NOT NULL,
    moneda TEXT REFERENCES public.monedas(codigo),
    archivo_url TEXT,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

CREATE TABLE public.compras_digitales (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    producto_id INT REFERENCES public.productos_digitales(id) ON DELETE CASCADE,
    pago_id UUID REFERENCES public.pagos(id),
    fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.enlaces_descarga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id INT REFERENCES public.compras_digitales(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    vencimiento TIMESTAMPTZ NOT NULL,
    descargas_max INT DEFAULT 3,
    descargas_realizadas INT DEFAULT 0
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reembolsos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intentos_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos_digitales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_digitales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enlaces_descarga ENABLE ROW LEVEL SECURITY;