// Contenido de demostración para la página de Clase (reproductor) del Aula
// Virtual, basado en PsiqueAmor_14_Reproductor.html. Reutiliza el curso e
// imagen ya presentes en `coursesPageData.ts` / `aulaVirtualData.ts`
// ("Manejo de la ansiedad") para mantener consistencia con el resto del
// sitio.
export const LECCION_ACTUAL = {
  curso: { es: 'Manejo de la ansiedad', en: 'Managing anxiety' },
  modulo: 2,
  claseNumero: 5,
  titulo: { es: 'Clase 5 · Mindfulness básico', en: 'Lesson 5 · Basic mindfulness' },
  instructor: 'Dra. Ana Rivas',
  duracion: '12:00',
  progresoCurso: 62,
  thumbnail: 'https://images.pexels.com/photos/8715971/pexels-photo-8715971.jpeg?auto=compress&cs=tinysrgb&h=720&w=1280',
};

export interface PuntoClave {
  es: string;
  en: string;
}

export const CONTENIDO_CLASE = {
  intro: {
    es: 'En esta clase aprenderás los fundamentos del mindfulness y cómo aplicarlo para reducir la ansiedad en tu día a día. El mindfulness es la práctica de prestar atención plena al momento presente, sin juzgar.',
    en: "In this lesson you'll learn the fundamentals of mindfulness and how to use it to reduce anxiety in daily life. Mindfulness is the practice of paying full attention to the present moment, without judgment.",
  },
  puntosClave: [
    { es: 'Qué es y qué no es el mindfulness.', en: "What mindfulness is and isn't." },
    { es: 'Ejercicio de anclaje en la respiración (guiado).', en: 'Breath-anchoring exercise (guided).' },
    { es: 'Cómo integrar 5 minutos de práctica diaria.', en: 'How to fit in 5 minutes of daily practice.' },
  ] as PuntoClave[],
  tip: {
    es: 'Practica el ejercicio guiado en un lugar tranquilo, con audífonos, y repítelo durante la semana.',
    en: 'Do the guided exercise in a quiet place, with headphones, and repeat it during the week.',
  },
};

export interface MaterialClase {
  tipo: 'pdf' | 'audio' | 'doc';
  titulo: { es: string; en: string };
  detalle: string;
}

export const MATERIALES_CLASE: MaterialClase[] = [
  { tipo: 'pdf', titulo: { es: 'Guía de mindfulness (PDF)', en: 'Mindfulness guide (PDF)' }, detalle: '1.2 MB' },
  { tipo: 'audio', titulo: { es: 'Audio guiado — respiración', en: 'Guided audio — breathing' }, detalle: '8:30 min · MP3' },
  { tipo: 'doc', titulo: { es: 'Hoja de práctica semanal', en: 'Weekly practice sheet' }, detalle: '340 KB' },
];

export type EstadoLeccion = 'completada' | 'actual' | 'bloqueada';

export interface LeccionTemario {
  titulo: { es: string; en: string };
  estado: EstadoLeccion;
  duracion?: string;
}

export interface ModuloTemario {
  titulo: { es: string; en: string };
  estado: 'completado' | 'en-curso' | 'bloqueado';
  lecciones: LeccionTemario[];
  avisoDesbloqueo?: { es: string; en: string };
}

export const TEMARIO: ModuloTemario[] = [
  {
    titulo: { es: 'Módulo 1 · Entender la ansiedad', en: 'Module 1 · Understanding anxiety' },
    estado: 'completado',
    lecciones: [
      { titulo: { es: '¿Qué es la ansiedad?', en: 'What is anxiety?' }, estado: 'completada' },
      { titulo: { es: 'El ciclo de la ansiedad', en: 'The anxiety cycle' }, estado: 'completada' },
      { titulo: { es: 'Mitos y realidades', en: 'Myths and facts' }, estado: 'completada' },
      { titulo: { es: 'Evaluación del módulo', en: 'Module quiz' }, estado: 'completada' },
    ],
  },
  {
    titulo: { es: 'Módulo 2 · Técnicas para calmarte', en: 'Module 2 · Calming techniques' },
    estado: 'en-curso',
    lecciones: [
      { titulo: { es: 'Respiración diafragmática', en: 'Diaphragmatic breathing' }, estado: 'completada' },
      { titulo: { es: 'Relajación muscular', en: 'Muscle relaxation' }, estado: 'completada' },
      { titulo: { es: 'Mindfulness básico', en: 'Basic mindfulness' }, estado: 'actual', duracion: '12:00' },
      { titulo: { es: 'Meditación guiada', en: 'Guided meditation' }, estado: 'bloqueada', duracion: '10:30' },
      { titulo: { es: 'Evaluación del módulo', en: 'Module quiz' }, estado: 'bloqueada' },
    ],
  },
  {
    titulo: { es: 'Módulo 3 · Hábitos y prevención', en: 'Module 3 · Habits & prevention' },
    estado: 'bloqueado',
    lecciones: [
      { titulo: { es: 'Rutinas de bienestar', en: 'Wellbeing routines' }, estado: 'bloqueada' },
      { titulo: { es: 'Plan personal anti-ansiedad', en: 'Personal anti-anxiety plan' }, estado: 'bloqueada' },
    ],
    avisoDesbloqueo: { es: 'Completa el Módulo 2 para desbloquear.', en: 'Complete Module 2 to unlock.' },
  },
];
