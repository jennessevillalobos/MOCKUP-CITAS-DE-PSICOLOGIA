-- Seed para desarrollo local. Solo usar en el ambiente `dev` de Supabase.
-- Antes de ejecutar, validá que las migraciones 001-003 ya están aplicadas.

-- ── Monedas ──
INSERT INTO public.monedas (codigo, nombre, simbolo, es_principal, estado) VALUES
  ('USD', 'Dólar estadounidense', '$', true,  'activo'),
  ('COP', 'Peso colombiano',     'COL$', false, 'activo'),
  ('EUR', 'Euro',                '€',  false, 'activo')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.tasas_cambio (moneda_origen, moneda_destino, tasa, fecha) VALUES
  ('USD', 'COP', 4200.0000, NOW()),
  ('EUR', 'USD', 1.0800,    NOW())
ON CONFLICT DO NOTHING;

-- ── Modalidades ──
INSERT INTO public.modalidades (id, nombre) VALUES
  (1, 'presencial'),
  (2, 'virtual'),
  (3, 'domicilio')
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.modalidades_id_seq', (SELECT MAX(id) FROM public.modalidades));

-- ── Lugares ──
INSERT INTO public.lugares (id, nombre, direccion, ciudad, contacto, estado) VALUES
  (1, 'Consultorio Centro', 'Calle 50 #45-30', 'Bogotá', 'contacto@psiqueamor.com', 'activo'),
  (2, 'Sede Virtual',       NULL,               'Online', 'virtual@psiqueamor.com',  'activo')
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.lugares_id_seq', (SELECT MAX(id) FROM public.lugares));

-- ── Servicios ──
INSERT INTO public.servicios (id, nombre, categoria, descripcion, slug, estado) VALUES
  (1, 'Terapia Individual',       'Presencial', 'Sesión de terapia psicológica individual.', 'terapia-individual',       'activo'),
  (2, 'Terapia de Pareja',        'Pareja',     'Sesión de terapia para parejas.',            'terapia-pareja',           'activo'),
  (3, 'Orientación Vocacional',   'Adolescentes','Orientación profesional y académica.',      'orientacion-vocacional',   'activo'),
  (4, 'Terapia Infantil',         'Infantil',   'Terapia especializada para niños.',          'terapia-infantil',         'activo')
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.servicios_id_seq', (SELECT MAX(id) FROM public.servicios));

-- ── Servicio / modalidad con precios y duraciones ──
INSERT INTO public.servicio_modalidad (servicio_id, modalidad_id, duracion_minutos, precio, moneda) VALUES
  (1, 1, 50, 50000, 'COP'),
  (1, 2, 50, 45000, 'COP'),
  (1, 3, 60, 60000, 'COP'),
  (2, 1, 60, 70000, 'COP'),
  (2, 2, 60, 65000, 'COP'),
  (3, 1, 45, 40000, 'COP'),
  (3, 2, 45, 35000, 'COP'),
  (4, 1, 40, 45000, 'COP'),
  (4, 2, 40, 40000, 'COP')
ON CONFLICT (id) DO NOTHING;

-- ── Cursos ──
INSERT INTO public.cursos (id, nombre, slug, descripcion, precio, moneda, estado) VALUES
  (1, 'Manejo de la Ansiedad', 'manejo-ansiedad',  'Curso introductorio al manejo de la ansiedad.',  50000, 'COP', 'publicado'),
  (2, 'Autoestima y Crecimiento Personal', 'autoestima-crecimiento', 'Estrategias para fortalecer la autoestima.',  60000, 'COP', 'publicado'),
  (3, 'Habilidades de Comunicación', 'habilidades-comunicacion', 'Mejora tus relaciones con comunicación asertiva.', 55000, 'COP', 'borrador')
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.cursos_id_seq', (SELECT MAX(id) FROM public.cursos));

-- ── Módulos del curso 1 ──
INSERT INTO public.modulos (id, curso_id, titulo, descripcion, orden, estado) VALUES
  (1, 1, '¿Qué es la ansiedad?',  'Definición y tipos de ansiedad.',                 1, 'activo'),
  (2, 1, 'Técnicas de respiración','Ejercicios prácticos para reducir la ansiedad.', 2, 'activo'),
  (3, 1, 'Reestructuración cognitiva', 'Cómo identificar pensamientos irracionales.', 3, 'activo')
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.modulos_id_seq', (SELECT MAX(id) FROM public.modulos));

-- ── Clases de ejemplo ──
INSERT INTO public.clases (id, modulo_id, titulo, descripcion, video_url, duracion_segundos, orden, estado) VALUES
  (1, 1, 'Definición de ansiedad',  'Introducción al concepto.',                  'https://ejemplo.com/v1.mp4', 600,  1, 'activo'),
  (2, 1, 'Tipos de ansiedad',       'Ansiedad generalizada, social, de pánico.',  'https://ejemplo.com/v2.mp4', 720,  2, 'activo'),
  (3, 2, 'Respiración diafragmática','Ejercicio guiado paso a paso.',             'https://ejemplo.com/v3.mp4', 480,  1, 'activo')
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.clases_id_seq', (SELECT MAX(id) FROM public.clases));

-- ── Productos digitales ──
INSERT INTO public.productos_digitales (id, tipo, titulo, slug, descripcion, precio, moneda, estado) VALUES
  (1, 'video',    'Meditación guiada de 10 minutos', 'meditacion-10-min',    'Audio de meditación guiada.', 5000,  'COP', 'activo'),
  (2, 'libro_pdf','Guía práctica: manejo del estrés','guia-manejo-estres',   'PDF de 40 páginas con ejercicios.', 12000, 'COP', 'activo'),
  (3, 'video',    'Taller: técnicas de respiración','taller-respiracion',   'Video taller de 30 minutos.',        8000,  'COP', 'activo')
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.productos_digitales_id_seq', (SELECT MAX(id) FROM public.productos_digitales));
