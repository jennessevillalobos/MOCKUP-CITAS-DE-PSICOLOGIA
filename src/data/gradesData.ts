// Contenido de demostración para la página de Calificaciones del Aula
// Virtual, basado en PsiqueAmor_33_Calificaciones.html. Reutiliza los
// mismos cursos/instructores de `aulaVirtualData.ts` para mantener
// consistencia con el resto del sitio.
export type EstadoCalificacion = 'aprobada' | 'pendiente' | 'reprobada';

export interface Calificacion {
  curso: { es: string; en: string };
  evaluacion: { es: string; en: string };
  nota: number | null;
  notaMax: number;
  estado: EstadoCalificacion;
  fecha: { es: string; en: string } | null;
  certificado: boolean;
}

export const CALIFICACIONES: Calificacion[] = [
  {
    curso: { es: 'Manejo de la ansiedad', en: 'Managing anxiety' },
    evaluacion: { es: 'Evaluación Módulo 1', en: 'Module 1 quiz' },
    nota: 4,
    notaMax: 5,
    estado: 'aprobada',
    fecha: { es: '2 ago 2026', en: 'Aug 2, 2026' },
    certificado: true,
  },
  {
    curso: { es: 'Manejo de la ansiedad', en: 'Managing anxiety' },
    evaluacion: { es: 'Evaluación Módulo 2', en: 'Module 2 quiz' },
    nota: null,
    notaMax: 5,
    estado: 'pendiente',
    fecha: null,
    certificado: false,
  },
  {
    curso: { es: 'Inteligencia emocional', en: 'Emotional intelligence' },
    evaluacion: { es: 'Evaluación Módulo 1', en: 'Module 1 quiz' },
    nota: 4,
    notaMax: 5,
    estado: 'aprobada',
    fecha: { es: '15 jul 2026', en: 'Jul 15, 2026' },
    certificado: true,
  },
  {
    curso: { es: 'Crianza consciente', en: 'Mindful parenting' },
    evaluacion: { es: 'Evaluación final', en: 'Final assessment' },
    nota: 9,
    notaMax: 10,
    estado: 'aprobada',
    fecha: { es: '20 jun 2026', en: 'Jun 20, 2026' },
    certificado: true,
  },
];
