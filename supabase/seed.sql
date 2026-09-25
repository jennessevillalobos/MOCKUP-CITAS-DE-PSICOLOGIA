-- Seed para desarrollo local. Solo usar en el ambiente `dev` de Supabase.
-- Antes de ejecutar, validá que las migraciones 001-019 ya están aplicadas.

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

-- ── Lugares (mismas sedes que SEDES en src/data/contactPageData.ts) ──
-- `slug` = key de la sede en el frontend (migración 012).
INSERT INTO public.lugares (id, slug, nombre, direccion, ciudad, contacto, estado) VALUES
  (1, 'caracas',  'Sede Caracas',  'Av. Principal, Torre A, Piso 5', 'Caracas',  NULL, 'activo'),
  (2, 'valencia', 'Sede Valencia', 'C.C. Bienestar, Local 12',       'Valencia', NULL, 'activo')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, nombre = EXCLUDED.nombre, direccion = EXCLUDED.direccion,
  ciudad = EXCLUDED.ciudad, contacto = EXCLUDED.contacto, estado = EXCLUDED.estado;
SELECT setval('public.lugares_id_seq', (SELECT MAX(id) FROM public.lugares));

-- ── Servicios (mismos 9 que SERVICIOS_PUBLICOS en src/data/servicesPageData.ts) ──
-- `slug` = key del servicio en el frontend.
INSERT INTO public.servicios (id, nombre, categoria, descripcion, slug, estado) VALUES
  (1, 'Terapia individual',        'individual',  'Sesiones personalizadas para ansiedad, estrés y crecimiento personal.',          'individual',   'activo'),
  (2, 'Terapia de pareja',         'pareja',      'Herramientas para mejorar la comunicación y reconstruir vínculos.',             'pareja',       'activo'),
  (3, 'Terapia infantil',          'infantil',    'Apoyo emocional para niñas y niños con enfoque lúdico y cálido.',              'infantil',     'activo'),
  (4, 'Orientación vocacional',    'orientacion', 'Descubre tu camino profesional con evaluación y acompañamiento.',              'orientacion',  'activo'),
  (5, 'Terapia familiar',          'pareja',      'Sesiones con el sistema familiar para resolver conflictos y fortalecer lazos.', 'familiar',     'activo'),
  (6, 'Manejo de ansiedad',        'individual',  'Programa enfocado en técnicas para reducir la ansiedad y el estrés.',          'ansiedad',     'activo'),
  (7, 'Acompañamiento en duelo',   'individual',  'Espacio seguro para transitar la pérdida a tu ritmo.',                          'duelo',        'activo'),
  (8, 'Evaluación psicológica',    'orientacion', 'Valoración inicial con informe y plan de trabajo personalizado.',              'evaluacion',   'activo'),
  (9, 'Terapia para adolescentes', 'infantil',    'Acompañamiento para adolescentes en etapas de cambio.',                         'adolescentes', 'activo')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre, categoria = EXCLUDED.categoria, descripcion = EXCLUDED.descripcion,
  slug = EXCLUDED.slug, estado = EXCLUDED.estado;
SELECT setval('public.servicios_id_seq', (SELECT MAX(id) FROM public.servicios));

-- ── Servicio / modalidad: precio (centavos USD) y duración del frontend ──
-- El wizard /agendar deja elegir Online o Presencial para cualquier servicio,
-- así que cada servicio tiene ambas modalidades (presencial y virtual).
DELETE FROM public.servicio_modalidad;
INSERT INTO public.servicio_modalidad (servicio_id, modalidad_id, duracion_minutos, precio, moneda)
SELECT s.id, m.id, v.duracion, v.precio, 'USD'
FROM (VALUES
  ('individual',   50,  5000),
  ('pareja',       75,  8500),
  ('infantil',     45,  5500),
  ('orientacion',  60,  5000),
  ('familiar',     90, 11000),
  ('ansiedad',     60,  6500),
  ('duelo',        60,  6000),
  ('evaluacion',   50,  4500),
  ('adolescentes', 50,  5800)
) AS v(slug, duracion, precio)
JOIN public.servicios s ON s.slug = v.slug
CROSS JOIN public.modalidades m
WHERE m.nombre IN ('presencial', 'virtual');

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

-- ── Profesionales (mismos 6 que PROFESIONALES_PUBLICOS en src/data/professionalsPageData.ts) ──
-- Cada profesional tiene una cuenta en auth.users sin contraseña (se asigna con
-- "Recuperar contraseña" o desde el dashboard). El trigger on_auth_user_created
-- crea su fila en public.usuarios con el nombre de raw_user_meta_data.full_name.
-- Correos @psiqueamor.test: dominio reservado que no envía correo real; cambiarlos
-- por los reales antes de producción.
WITH datos(id, nombre, email) AS (VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'Laura Méndez',     'laura.mendez@psiqueamor.test'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'Valentina Ríos',   'valentina.rios@psiqueamor.test'),
  ('a1000000-0000-4000-8000-000000000003'::uuid, 'Sofía Herrera',    'sofia.herrera@psiqueamor.test'),
  ('a1000000-0000-4000-8000-000000000004'::uuid, 'Dra. Ana Rivas',   'ana.rivas@psiqueamor.test'),
  ('a1000000-0000-4000-8000-000000000005'::uuid, 'Lic. Carlos Mora', 'carlos.mora@psiqueamor.test'),
  ('a1000000-0000-4000-8000-000000000006'::uuid, 'Dra. Lucía Peña',  'lucia.pena@psiqueamor.test')
),
nuevos_auth AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  SELECT '00000000-0000-0000-0000-000000000000', d.id, 'authenticated', 'authenticated', d.email, NOW(),
         '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', d.nombre), NOW(), NOW(),
         '', '', '', ''
  FROM datos d
  ON CONFLICT (id) DO NOTHING
  RETURNING id, email
)
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT n.id::text, n.id, jsonb_build_object('sub', n.id::text, 'email', n.email, 'email_verified', true), 'email', NOW(), NOW(), NOW()
FROM nuevos_auth n;

UPDATE public.usuarios u SET nombre = d.nombre, foto = d.foto
FROM (VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'Laura Méndez',     'https://images.pexels.com/photos/4098357/pexels-photo-4098357.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'Valentina Ríos',   'https://images.pexels.com/photos/36439572/pexels-photo-36439572.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800'),
  ('a1000000-0000-4000-8000-000000000003'::uuid, 'Sofía Herrera',    'https://images.pexels.com/photos/3958409/pexels-photo-3958409.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800'),
  ('a1000000-0000-4000-8000-000000000004'::uuid, 'Dra. Ana Rivas',   'https://images.pexels.com/photos/7579108/pexels-photo-7579108.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800'),
  ('a1000000-0000-4000-8000-000000000005'::uuid, 'Lic. Carlos Mora', 'https://images.pexels.com/photos/15960478/pexels-photo-15960478.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800'),
  ('a1000000-0000-4000-8000-000000000006'::uuid, 'Dra. Lucía Peña',  'https://images.pexels.com/photos/7579119/pexels-photo-7579119.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800')
) AS d(id, nombre, foto)
WHERE u.id = d.id;

INSERT INTO public.profesionales (id, usuario_id, slug, especialidad, descripcion, estado) VALUES
  (1, 'a1000000-0000-4000-8000-000000000001', 'laura-mendez',   'Psicología clínica',  'Un espacio para comprenderte con calma.',                        'activo'),
  (2, 'a1000000-0000-4000-8000-000000000002', 'valentina-rios', 'Parejas y vínculos',  'Conversaciones que abren nuevas posibilidades.',                 'activo'),
  (3, 'a1000000-0000-4000-8000-000000000003', 'sofia-herrera',  'Bienestar emocional', 'Herramientas para volver a ti.',                                 'activo'),
  (4, 'a1000000-0000-4000-8000-000000000004', 'ana-rivas',      'Ansiedad y estrés',   'Herramientas prácticas para manejar la ansiedad del día a día.', 'activo'),
  (5, 'a1000000-0000-4000-8000-000000000005', 'carlos-mora',    'Terapia de pareja',   'Acompañamiento para fortalecer la comunicación en pareja.',      'activo'),
  (6, 'a1000000-0000-4000-8000-000000000006', 'lucia-pena',     'Terapia infantil',    'Un enfoque cálido y lúdico para el bienestar de niñas y niños.', 'activo')
ON CONFLICT (id) DO UPDATE SET
  usuario_id = EXCLUDED.usuario_id, slug = EXCLUDED.slug, especialidad = EXCLUDED.especialidad,
  descripcion = EXCLUDED.descripcion, estado = EXCLUDED.estado;
SELECT setval('public.profesionales_id_seq', (SELECT MAX(id) FROM public.profesionales));

INSERT INTO public.usuario_roles (usuario_id, rol_id)
SELECT p.usuario_id, r.id FROM public.profesionales p CROSS JOIN public.roles r
WHERE p.usuario_id IS NOT NULL AND r.nombre = 'instructor'
ON CONFLICT DO NOTHING;

-- El wizard /agendar ofrece a todos los profesionales para cualquier servicio y sede.
INSERT INTO public.profesional_servicio (profesional_id, servicio_id)
SELECT p.id, s.id FROM public.profesionales p CROSS JOIN public.servicios s
ON CONFLICT DO NOTHING;

INSERT INTO public.profesional_lugar (profesional_id, lugar_id)
SELECT p.id, l.id FROM public.profesionales p CROSS JOIN public.lugares l
ON CONFLICT DO NOTHING;

-- ── Horarios: el HORARIO_SEMANAL_DEMO del panel del profesional ──
-- Lunes a viernes 09:00–17:00, sábado 09:00–13:00 (dia_semana: 0 = domingo).
DELETE FROM public.horarios WHERE profesional_id IN (SELECT id FROM public.profesionales);
INSERT INTO public.horarios (profesional_id, dia_semana, hora_inicio, hora_fin)
SELECT p.id, d.dia, d.inicio, d.fin
FROM public.profesionales p
CROSS JOIN (VALUES
  (1, TIME '09:00', TIME '17:00'),
  (2, TIME '09:00', TIME '17:00'),
  (3, TIME '09:00', TIME '17:00'),
  (4, TIME '09:00', TIME '17:00'),
  (5, TIME '09:00', TIME '17:00'),
  (6, TIME '09:00', TIME '13:00')
) AS d(dia, inicio, fin);

-- ── Cursos de Dra. Ana Rivas (mismos 3 que CURSOS_INFO_DEMO en src/data/instructorCoursesData.ts) ──
-- Precios en centavos. El contenido (módulos, clases y evaluaciones) se carga
-- con public.guardar_estructura_curso(<id>, <MODULOS_POR_CURSO[slug]>) desde
-- una sesión de la profesional, ya que la función corre con su RLS.
UPDATE public.cursos SET profesional_id = 4, nombre = 'Manejo de la ansiedad',
  descripcion = 'Aprende a reconocer, entender y calmar la ansiedad con técnicas prácticas basadas en evidencia.',
  categoria = 'Bienestar', nivel = 'Principiante', idioma = 'Español', precio = 4900, moneda = 'USD', estado = 'publicado',
  imagen = 'https://images.pexels.com/photos/8715971/pexels-photo-8715971.jpeg?auto=compress&cs=tinysrgb&h=600&w=800'
WHERE slug = 'manejo-ansiedad';

INSERT INTO public.cursos (profesional_id, nombre, slug, descripcion, categoria, nivel, idioma, precio, moneda, imagen, estado) VALUES
 (4, 'Superar la ansiedad social', 'ansiedad-social', 'Estrategias prácticas para sentirte más cómodo en situaciones sociales, paso a paso.',
  'Bienestar', 'Intermedio', 'Español', 5500, 'USD', 'https://images.pexels.com/photos/6567345/pexels-photo-6567345.jpeg?auto=compress&cs=tinysrgb&h=600&w=800', 'publicado'),
 (4, 'Afrontar el duelo', 'afrontar-duelo', 'Un espacio para procesar la pérdida a tu propio ritmo, con acompañamiento profesional.',
  'Bienestar', 'Principiante', 'Español', 4500, 'USD', NULL, 'borrador')
ON CONFLICT (slug) DO NOTHING;

-- ── Clases en vivo de colegas (mismas que CLASES_VIVO_DEMO en src/data/clasesVivoInstructorData.ts) ──
INSERT INTO public.clases_en_vivo (profesional_id, titulo, fecha, hora, duracion_min, enlace, destinatario_tipo, grabar, recordatorio, estado) VALUES
 (5, 'Q&A: Inteligencia emocional', CURRENT_DATE + 3, '17:00', 60, 'https://zoom.us/j/1102938', 'curso', false, false, 'programada'),
 (6, 'Charla: Crianza y límites', CURRENT_DATE + 5, '19:00', 45, 'https://meet.google.com/xyz-uvwx-rst', 'curso', false, false, 'programada');
