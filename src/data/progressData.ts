// Datos adicionales para la página de Progreso del Aula Virtual, basados en
// PsiqueAmor_34_Progreso.html. El avance/lecciones de cada curso ya vive en
// `aulaVirtualData.ts` (CURSOS_INSCRITOS) — aquí solo se agrega la "última
// actividad" por curso y la racha activa, que el mockup calcula a partir de
// localStorage y que aquí se deja como demo estático.
export interface ActividadCurso {
  key: string; // coincide con CursoInscrito.key en aulaVirtualData.ts
  ultimaActividad: { es: string; en: string };
}

export const ACTIVIDAD_CURSOS: ActividadCurso[] = [
  { key: 'manejo-ansiedad', ultimaActividad: { es: 'Ayer', en: 'Yesterday' } },
  { key: 'inteligencia-emocional', ultimaActividad: { es: 'Hace 3 días', en: '3 days ago' } },
  { key: 'crianza-consciente', ultimaActividad: { es: 'Hace 9 días', en: '9 days ago' } },
];

export const RACHA_DIAS = 3;
