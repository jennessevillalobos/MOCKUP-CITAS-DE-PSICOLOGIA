// Datos de demostración de la bandeja de calificación y el reporte de
// "Evaluaciones" del panel del instructor, adaptado del mockup
// PsiqueAmor_21_GestionEvaluaciones.html — este mockup ya está pensado desde
// la perspectiva del profesional (enlaza de vuelta a
// PsiqueAmor_19_Instructor.html), así que se reutiliza casi tal cual.
//
// Los intentos aquí apuntan a la evaluación real "q1" del módulo "m1" del
// curso "manejo-ansiedad" (ver `courseBuilderData.ts` → `MODULOS_DEMO`),
// para que el Editor (que vive en el árbol de módulos del Constructor) y la
// Bandeja/Reporte (que viven aquí) hablen exactamente de la misma
// evaluación en vez de datos paralelos inventados.
import type { TipoPregunta } from '@/data/courseBuilderData';

export interface RespuestaIntento {
  preguntaId: string;
  tipo: TipoPregunta;
  // 'multiple' / 'vf': la opción que eligió el estudiante.
  opcionElegidaId?: string;
  // 'abierta': el texto que escribió el estudiante.
  textoRespuesta?: string;
  // Puntaje obtenido en esta pregunta — presente de inmediato para
  // multiple/vf (auto-calificadas al enviar); ausente en 'abierta' hasta
  // que el profesional la califica manualmente.
  puntajeObtenido?: number;
  // Retroalimentación puntual del profesional para esta pregunta (solo
  // aplica a 'abierta').
  retroalimentacion?: string;
}

export interface IntentoEvaluacion {
  id: string;
  cursoKey: string;
  moduloId: string;
  evaluacionId: string;
  estudiante: string;
  correo: string;
  numeroIntento: number;
  enviadoHace: { es: string; en: string };
  estado: 'pendiente' | 'calificado';
  respuestas: RespuestaIntento[];
  notaFinalPct?: number; // se calcula al publicar la calificación
}

export const INTENTOS_DEMO: IntentoEvaluacion[] = [
  {
    id: 'int1',
    cursoKey: 'manejo-ansiedad',
    moduloId: 'm1',
    evaluacionId: 'q1',
    estudiante: 'María G.',
    correo: 'maria.g@correo.com',
    numeroIntento: 1,
    enviadoHace: { es: 'hace 1 h', en: '1h ago' },
    estado: 'pendiente',
    respuestas: [
      { preguntaId: 'q1-p1', tipo: 'multiple', opcionElegidaId: 'q1-p1-a', puntajeObtenido: 2 },
      { preguntaId: 'q1-p2', tipo: 'vf', opcionElegidaId: 'q1-p2-v', puntajeObtenido: 1 },
      {
        preguntaId: 'q1-p3', tipo: 'abierta',
        textoRespuesta: 'Cuando siento que me abruma el trabajo, hago 5 respiraciones profundas antes de una reunión importante y me ayuda a concentrarme.',
      },
    ],
  },
  {
    id: 'int2',
    cursoKey: 'manejo-ansiedad',
    moduloId: 'm1',
    evaluacionId: 'q1',
    estudiante: 'Luis T.',
    correo: 'luis.t@correo.com',
    numeroIntento: 1,
    enviadoHace: { es: 'hace 3 h', en: '3h ago' },
    estado: 'pendiente',
    respuestas: [
      { preguntaId: 'q1-p1', tipo: 'multiple', opcionElegidaId: 'q1-p1-b', puntajeObtenido: 0 },
      { preguntaId: 'q1-p2', tipo: 'vf', opcionElegidaId: 'q1-p2-v', puntajeObtenido: 1 },
      {
        preguntaId: 'q1-p3', tipo: 'abierta',
        textoRespuesta: 'Antes de hablar en público, practico respiración profunda para calmar los nervios.',
      },
    ],
  },
  {
    id: 'int3',
    cursoKey: 'manejo-ansiedad',
    moduloId: 'm1',
    evaluacionId: 'q1',
    estudiante: 'Andrés P.',
    correo: 'andres.p@correo.com',
    numeroIntento: 1,
    enviadoHace: { es: 'hace 2 días', en: '2 days ago' },
    estado: 'calificado',
    notaFinalPct: 90,
    respuestas: [
      { preguntaId: 'q1-p1', tipo: 'multiple', opcionElegidaId: 'q1-p1-a', puntajeObtenido: 2 },
      { preguntaId: 'q1-p2', tipo: 'vf', opcionElegidaId: 'q1-p2-v', puntajeObtenido: 1 },
      {
        preguntaId: 'q1-p3', tipo: 'abierta',
        textoRespuesta: 'Antes de una entrevista importante, me tomo dos minutos para respirar lento y bajar el ritmo cardíaco.',
        puntajeObtenido: 1.5,
        retroalimentacion: 'Buen ejemplo, aunque podrías profundizar un poco más en cómo lo aplicas paso a paso.',
      },
    ],
  },
];
