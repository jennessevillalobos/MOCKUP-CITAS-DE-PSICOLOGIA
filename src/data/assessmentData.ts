// Contenido de demostración para la página de Evaluación del Aula Virtual,
// basado en PsiqueAmor_15_Evaluacion.html. Reutiliza el curso "Manejo de la
// ansiedad" ya presente en `aulaVirtualData.ts` / `lessonPlayerData.ts` para
// mantener consistencia con el resto del sitio.
export const EVALUACION_INFO = {
  curso: { es: 'Manejo de la ansiedad', en: 'Managing anxiety' },
  modulo: 1,
  tituloModulo: { es: 'Entender la ansiedad', en: 'Understanding anxiety' },
  preguntasTotal: 5,
  tiempoMin: 10,
  notaAprobar: 70,
  intentosMax: 3,
  intentosUsados: 2,
};

export type TipoPregunta = 'opcion' | 'vf' | 'abierta';

export interface OpcionPregunta {
  es: string;
  en: string;
}

export interface Pregunta {
  tipo: TipoPregunta;
  etiqueta: { es: string; en: string };
  enunciado: { es: string; en: string };
  opciones?: OpcionPregunta[];
  ayuda?: { es: string; en: string };
}

export const PREGUNTAS: Pregunta[] = [
  {
    tipo: 'opcion',
    etiqueta: { es: 'Opción múltiple', en: 'Multiple choice' },
    enunciado: { es: '¿Qué es la ansiedad?', en: 'What is anxiety?' },
    opciones: [
      { es: 'Una respuesta natural del cuerpo ante una amenaza percibida.', en: 'A natural body response to a perceived threat.' },
      { es: 'Una enfermedad contagiosa.', en: 'A contagious disease.' },
      { es: 'Un rasgo permanente que no cambia.', en: 'A permanent trait that never changes.' },
    ],
  },
  {
    tipo: 'vf',
    etiqueta: { es: 'Verdadero / Falso', en: 'True / False' },
    enunciado: { es: 'La respiración diafragmática ayuda a reducir la ansiedad.', en: 'Diaphragmatic breathing helps reduce anxiety.' },
    opciones: [
      { es: 'Verdadero', en: 'True' },
      { es: 'Falso', en: 'False' },
    ],
  },
  {
    tipo: 'opcion',
    etiqueta: { es: 'Opción múltiple', en: 'Multiple choice' },
    enunciado: { es: '¿Cuál es una técnica de calma?', en: 'Which is a calming technique?' },
    opciones: [
      { es: 'Evitar siempre lo que da miedo.', en: 'Always avoid what scares you.' },
      { es: 'Relajación muscular progresiva.', en: 'Progressive muscle relaxation.' },
      { es: 'Dormir menos horas.', en: 'Sleep fewer hours.' },
    ],
  },
  {
    tipo: 'opcion',
    etiqueta: { es: 'Opción múltiple', en: 'Multiple choice' },
    enunciado: { es: 'El ciclo de la ansiedad se alimenta principalmente de…', en: 'The anxiety cycle is mainly fueled by…' },
    opciones: [
      { es: 'La evitación y los pensamientos catastróficos.', en: 'Avoidance and catastrophic thoughts.' },
      { es: 'Hacer ejercicio.', en: 'Exercising.' },
      { es: 'Hablar con un profesional.', en: 'Talking to a professional.' },
    ],
  },
  {
    tipo: 'abierta',
    etiqueta: { es: 'Respuesta abierta', en: 'Open answer' },
    enunciado: { es: 'Describe una situación en la que aplicarías una técnica de respiración.', en: "Describe a situation where you'd use a breathing technique." },
    ayuda: { es: 'Esta respuesta será revisada por el instructor.', en: 'This answer will be reviewed by the instructor.' },
  },
];

export type EstadoFeedback = 'correcta' | 'incorrecta' | 'revision';

export interface FeedbackItem {
  pregunta: { es: string; en: string };
  estado: EstadoFeedback;
  detalle: { es: string; en: string };
}

export const RESULTADO_DEMO = {
  porcentaje: 80,
  correctas: 4,
  total: 5,
  intentoActual: 2,
  intentosMax: 3,
  minutosUsados: 8,
  aprobado: true,
  feedback: [
    {
      pregunta: { es: 'P1 · ¿Qué es la ansiedad?', en: 'Q1 · What is anxiety?' },
      estado: 'correcta',
      detalle: { es: 'Correcta. Es una respuesta natural del cuerpo.', en: "Correct. It's a natural body response." },
    },
    {
      pregunta: { es: 'P4 · El ciclo de la ansiedad', en: 'Q4 · The anxiety cycle' },
      estado: 'incorrecta',
      detalle: { es: 'Incorrecta. La respuesta correcta era "evitación y pensamientos catastróficos".', en: 'Incorrect. The right answer was "avoidance and catastrophic thoughts".' },
    },
    {
      pregunta: { es: 'P5 · Respuesta abierta', en: 'Q5 · Open answer' },
      estado: 'revision',
      detalle: { es: 'En revisión por el instructor.', en: 'Under review by the instructor.' },
    },
  ] as FeedbackItem[],
};

export type EstadoIntento = 'aprobado' | 'reprobado';

export interface IntentoHistorial {
  numero: number;
  fecha: { es: string; en: string };
  puntaje: number;
  estado: EstadoIntento;
}

export const HISTORIAL_INTENTOS: IntentoHistorial[] = [
  { numero: 2, fecha: { es: '2 ago 2026 · 14:20', en: 'Aug 2, 2026 · 2:20 PM' }, puntaje: 80, estado: 'aprobado' },
  { numero: 1, fecha: { es: '1 ago 2026 · 19:05', en: 'Aug 1, 2026 · 7:05 PM' }, puntaje: 60, estado: 'reprobado' },
];
