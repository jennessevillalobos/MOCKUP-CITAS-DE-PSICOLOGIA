// Datos de demostración del Constructor de cursos, tomados del contenido de
// ejemplo del mockup PsiqueAmor_20_ConstructorCursos.html — el curso "Manejo
// de la ansiedad" ya existente en CURSOS_META (instructorCoursesData.ts).

export type ReglaDesbloqueo = 'secuencial' | 'evaluacion' | 'pago';

export interface MaterialClase {
  nombre: string;
  tipo: 'pdf' | 'audio';
  tamano: string;
}

export interface LeccionBuilder {
  id: string;
  tipo: 'clase';
  titulo: string;
  duracion: string;
  contenido: string;
  reglaDesbloqueo: ReglaDesbloqueo;
  vistaPrevia: boolean;
  materiales: MaterialClase[];
}

export type TipoPregunta = 'multiple' | 'vf' | 'abierta';

export interface OpcionPregunta {
  id: string;
  texto: string;
  correcta: boolean;
}

export interface PreguntaEvaluacion {
  id: string;
  tipo: TipoPregunta;
  enunciado: string;
  puntaje: number;
  // Opciones de respuesta — presentes en 'multiple' y 'vf' (esta última
  // siempre con exactamente 2: Verdadero/Falso). Vacío en 'abierta'.
  opciones: OpcionPregunta[];
}

export interface EvaluacionBuilder {
  id: string;
  tipo: 'evaluacion';
  // Conteo de preguntas — se mantiene como resumen rápido para el árbol del
  // Constructor incluso si `preguntasDetalle` aún no se ha completado.
  preguntas: number;
  // Contenido real de la evaluación y su configuración, editados desde la
  // página "Evaluaciones" del panel del instructor (no desde el
  // Constructor). Ambos opcionales: una evaluación recién creada desde el
  // Constructor solo tiene `preguntas` (el conteo) hasta que el profesional
  // entra a "Evaluaciones" y la completa.
  tituloEval?: string;
  intentos?: number;
  notaMinimaPct?: number;
  tiempoLimiteMin?: number;
  barajar?: boolean;
  mostrarRetroalimentacion?: boolean;
  desbloqueaSiguiente?: boolean;
  preguntasDetalle?: PreguntaEvaluacion[];
}

export type ItemModulo = LeccionBuilder | EvaluacionBuilder;

export interface ModuloBuilder {
  id: string;
  titulo: string;
  items: ItemModulo[];
}

// La info editable del curso (título/descripción/precio/estado/etc.) y el
// árbol de módulos por curso ahora viven en `instructorCoursesData.ts` +
// `InstructorCoursesContext.tsx`, para que "Mis cursos" y el Constructor
// compartan el mismo estado en vez de que el Constructor tenga un único
// curso fijo. Este archivo conserva los tipos y el árbol original de
// "Manejo de la ansiedad" (reutilizado desde `instructorCoursesData.ts`).
export const MODULOS_DEMO: ModuloBuilder[] = [
  {
    id: 'm1',
    titulo: 'Módulo 1 · Entender la ansiedad',
    items: [
      {
        id: 'l1', tipo: 'clase', titulo: '¿Qué es la ansiedad?', duracion: '08:20',
        contenido: 'La ansiedad es una respuesta natural del cuerpo ante una amenaza percibida. En esta clase exploraremos qué es, cómo se manifiesta y por qué no es tu enemiga…',
        reglaDesbloqueo: 'secuencial', vistaPrevia: true,
        materiales: [
          { nombre: 'Guia_mindfulness.pdf', tipo: 'pdf', tamano: '1.2 MB' },
          { nombre: 'Audio_respiracion.mp3', tipo: 'audio', tamano: '8:30' },
        ],
      },
      {
        id: 'l2', tipo: 'clase', titulo: 'El ciclo de la ansiedad', duracion: '10:05',
        contenido: 'Analizamos el ciclo pensamiento-sensación-conducta que mantiene la ansiedad activa, y cómo interrumpirlo.',
        reglaDesbloqueo: 'secuencial', vistaPrevia: false, materiales: [],
      },
      {
        id: 'l3', tipo: 'clase', titulo: 'Mitos y realidades', duracion: '06:40',
        contenido: 'Desmontamos las ideas más comunes (y erróneas) sobre la ansiedad.',
        reglaDesbloqueo: 'secuencial', vistaPrevia: false, materiales: [],
      },
      {
        id: 'q1', tipo: 'evaluacion', preguntas: 3,
        tituloEval: 'Evaluación · Módulo 1',
        intentos: 3, notaMinimaPct: 70, tiempoLimiteMin: 10,
        barajar: true, mostrarRetroalimentacion: true, desbloqueaSiguiente: true,
        preguntasDetalle: [
          {
            id: 'q1-p1', tipo: 'multiple', enunciado: '¿Qué es la ansiedad?', puntaje: 2,
            opciones: [
              { id: 'q1-p1-a', texto: 'Una respuesta natural del cuerpo ante una amenaza.', correcta: true },
              { id: 'q1-p1-b', texto: 'Una enfermedad contagiosa.', correcta: false },
              { id: 'q1-p1-c', texto: 'Un rasgo permanente que no cambia.', correcta: false },
            ],
          },
          {
            id: 'q1-p2', tipo: 'vf', enunciado: 'La respiración diafragmática ayuda a reducir la ansiedad.', puntaje: 1,
            opciones: [
              { id: 'q1-p2-v', texto: 'Verdadero', correcta: true },
              { id: 'q1-p2-f', texto: 'Falso', correcta: false },
            ],
          },
          {
            id: 'q1-p3', tipo: 'abierta', enunciado: 'Describe una situación donde aplicarías una técnica de respiración.', puntaje: 2,
            opciones: [],
          },
        ],
      },
    ],
  },
  {
    id: 'm2',
    titulo: 'Módulo 2 · Técnicas para calmarte',
    items: [
      {
        id: 'l4', tipo: 'clase', titulo: 'Respiración diafragmática', duracion: '09:15',
        contenido: 'Aprende la técnica de respiración diafragmática paso a paso, con ejercicios guiados.',
        reglaDesbloqueo: 'evaluacion', vistaPrevia: false,
        materiales: [{ nombre: 'Audio_respiracion.mp3', tipo: 'audio', tamano: '8:30' }],
      },
      {
        id: 'l5', tipo: 'clase', titulo: 'Mindfulness básico', duracion: '11:30',
        contenido: 'Introducción a la práctica de mindfulness para reducir la reactividad ante el estrés.',
        reglaDesbloqueo: 'evaluacion', vistaPrevia: false, materiales: [],
      },
    ],
  },
  {
    id: 'm3',
    titulo: 'Módulo 3 · Hábitos y prevención',
    items: [
      {
        id: 'l6', tipo: 'clase', titulo: 'Rutinas de bienestar', duracion: '07:50',
        contenido: 'Construye hábitos diarios que previenen picos de ansiedad a largo plazo.',
        reglaDesbloqueo: 'pago', vistaPrevia: false, materiales: [],
      },
    ],
  },
];
