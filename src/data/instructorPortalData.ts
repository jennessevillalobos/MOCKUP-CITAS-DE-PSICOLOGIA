// La lista de cursos de la instructora (con sus datos editables) ahora vive
// en `instructorCoursesData.ts` (CURSOS_META) + `InstructorCoursesContext`,
// reconciliada con la página pública de Cursos como fuente de verdad.

export interface ActividadInstructor {
  quien: string;
  texto: { es: string; en: string };
  tiempo: { es: string; en: string };
  tipo: 'inscripcion' | 'calificar' | 'reseña' | 'completado';
}

export const ACTIVIDAD_INSTRUCTOR: ActividadInstructor[] = [
  { quien: 'Jorge L.', texto: { es: 'se inscribió en "Manejo de la ansiedad".', en: 'enrolled in "Managing anxiety".' }, tiempo: { es: 'Hace 20 min', en: '20 min ago' }, tipo: 'inscripcion' },
  { quien: 'María G.', texto: { es: 'envió una respuesta abierta para calificar.', en: 'submitted an open answer to grade.' }, tiempo: { es: 'Hace 1 h', en: '1h ago' }, tipo: 'calificar' },
  { quien: 'Carla R.', texto: { es: 'dejó una reseña de 5★ en "Superar la ansiedad social".', en: 'left a 5★ review on "Overcoming social anxiety".' }, tiempo: { es: 'Hace 3 h', en: '3h ago' }, tipo: 'reseña' },
  { quien: 'Andrés P.', texto: { es: 'completó el curso "Manejo de la ansiedad".', en: 'completed "Managing anxiety".' }, tiempo: { es: 'Ayer', en: 'Yesterday' }, tipo: 'completado' },
];

// "Por calificar" (bandeja de calificación) ahora vive en
// `evaluacionesInstructorData.ts` + `InstructorGradingContext`.

// Las clases en vivo (propias y de colegas) ahora viven en
// `clasesVivoInstructorData.ts` + `InstructorLiveClassesContext`.
