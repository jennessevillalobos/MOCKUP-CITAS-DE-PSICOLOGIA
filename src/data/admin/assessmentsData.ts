export type TipoEvaluacion = 'Mixta' | 'Opción múltiple';
export type EstadoEvaluacion = 'Publicada' | 'Borrador';

export interface EvaluacionRecord {
  id: string;
  nombre: string;
  curso: string;
  modulo: string;
  instructor: string;
  tipo: TipoEvaluacion;
  intentos: number;
  notaMinima: number;
  evaluados: number;
  aprobados: number;
  estado: EstadoEvaluacion;
}

export const demoEvaluaciones: EvaluacionRecord[] = [
  { id: 'ev1', nombre: 'Evaluación · Módulo 1', curso: 'Manejo de ansiedad', modulo: 'Entender la ansiedad', instructor: 'Dra. Valentina Ríos', tipo: 'Mixta', intentos: 3, notaMinima: 70, evaluados: 24, aprobados: 19, estado: 'Publicada' },
  { id: 'ev2', nombre: 'Evaluación final', curso: 'Comunicación en pareja', modulo: 'Cierre del curso', instructor: 'Lic. Sofía Herrera', tipo: 'Opción múltiple', intentos: 2, notaMinima: 80, evaluados: 12, aprobados: 8, estado: 'Publicada' },
  { id: 'ev3', nombre: 'Evaluación · Módulo 2', curso: 'Manejo de ansiedad', modulo: 'Técnicas para calmarte', instructor: 'Dra. Valentina Ríos', tipo: 'Mixta', intentos: 1, notaMinima: 70, evaluados: 0, aprobados: 0, estado: 'Borrador' },
  { id: 'ev4', nombre: 'Evaluación diagnóstica', curso: 'Liderazgo consciente', modulo: 'Introducción', instructor: 'Lic. Andrés Duarte', tipo: 'Opción múltiple', intentos: 2, notaMinima: 60, evaluados: 18, aprobados: 15, estado: 'Publicada' },
];

export interface PendienteCalificar {
  id: string;
  estudiante: string;
  curso: string;
  pregunta: string;
  fecha: string;
  evaluacionId: string;
}

export const demoPendientesCalificar: PendienteCalificar[] = [
  { id: 'p1', estudiante: 'Lucía González', curso: 'Manejo de ansiedad', pregunta: 'Describe una situación donde aplicarías una técnica de respiración.', fecha: '2026-08-15', evaluacionId: 'ev1' },
  { id: 'p2', estudiante: 'Marco Peña', curso: 'Comunicación en pareja', pregunta: '¿Qué cambio notaste en tu forma de comunicarte esta semana?', fecha: '2026-08-16', evaluacionId: 'ev2' },
  { id: 'p3', estudiante: 'Diana Cruz', curso: 'Manejo de ansiedad', pregunta: '¿Cuál fue el mayor reto al practicar la técnica de grounding?', fecha: '2026-08-17', evaluacionId: 'ev1' },
];
