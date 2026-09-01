// Cursos en los que el paciente demo está inscrito, dentro de su Aula
// Virtual. Reutiliza las mismas imágenes/instructores/lecciones que
// `coursesPageData.ts` (mismos cursos del catálogo público) para no elegir
// fotos de stock nuevas y evitar el riesgo de duplicados ya conocido en
// este proyecto.
export interface CursoInscrito {
  key: string;
  title: { es: string; en: string };
  instructor: string;
  leccionActual: number;
  totalLecciones: number;
  progreso: number; // 0-100
  completado: boolean;
  image: string;
}

export const CURSOS_INSCRITOS: CursoInscrito[] = [
  {
    key: 'manejo-ansiedad',
    title: { es: 'Manejo de la ansiedad', en: 'Managing anxiety' },
    instructor: 'Dra. Ana Rivas',
    leccionActual: 8,
    totalLecciones: 12,
    progreso: 62,
    completado: false,
    image: 'https://images.pexels.com/photos/8715971/pexels-photo-8715971.jpeg?auto=compress&cs=tinysrgb&h=600&w=900',
  },
  {
    key: 'inteligencia-emocional',
    title: { es: 'Inteligencia emocional', en: 'Emotional intelligence' },
    instructor: 'Lic. Carlos Mora',
    leccionActual: 3,
    totalLecciones: 8,
    progreso: 30,
    completado: false,
    image: 'https://images.pexels.com/photos/13849252/pexels-photo-13849252.jpeg?auto=compress&cs=tinysrgb&h=600&w=900',
  },
  {
    key: 'crianza-consciente',
    title: { es: 'Crianza consciente', en: 'Mindful parenting' },
    instructor: 'Dra. Lucía Peña',
    leccionActual: 10,
    totalLecciones: 10,
    progreso: 100,
    completado: true,
    image: 'https://images.pexels.com/photos/9127682/pexels-photo-9127682.jpeg?auto=compress&cs=tinysrgb&h=600&w=900',
  },
];

export interface ClaseEnVivoAula {
  dia: { es: string; en: string };
  titulo: { es: string; en: string };
  hora: string;
  profesional: string;
  esHoy: boolean;
}

export const CLASES_EN_VIVO_AULA: ClaseEnVivoAula[] = [
  { dia: { es: '05 AGO', en: 'AUG 05' }, titulo: { es: 'Taller: Respiración y calma', en: 'Workshop: Breathing & calm' }, hora: '18:00', profesional: 'Dra. Ana Rivas', esHoy: true },
  { dia: { es: '12 AGO', en: 'AUG 12' }, titulo: { es: 'Q&A: Inteligencia emocional', en: 'Q&A: Emotional intelligence' }, hora: '17:00', profesional: 'Lic. Carlos Mora', esHoy: false },
];

export interface CuotaPendiente {
  curso: { es: string; en: string };
  monto: number;
  cuotaActual: number;
  cuotaTotal: number;
  vence: { es: string; en: string };
}

export const CUOTA_PENDIENTE: CuotaPendiente = {
  curso: { es: 'Manejo de la ansiedad', en: 'Managing anxiety' },
  monto: 14,
  cuotaActual: 3,
  cuotaTotal: 4,
  vence: { es: '8 ago', en: 'Aug 8' },
};

export interface NotificacionAula {
  icono: 'evaluacion' | 'vivo' | 'certificado';
  texto: { es: string; en: string };
  tiempo: { es: string; en: string };
}

export const NOTIFICACIONES_AULA: NotificacionAula[] = [
  { icono: 'evaluacion', texto: { es: 'Nueva evaluación disponible en "Ansiedad".', en: 'New quiz available in "Anxiety".' }, tiempo: { es: 'Hace 1 h', en: '1h ago' } },
  { icono: 'vivo', texto: { es: 'Clase en vivo hoy a las 18:00.', en: 'Live class today at 6:00 PM.' }, tiempo: { es: 'Hace 3 h', en: '3h ago' } },
  { icono: 'certificado', texto: { es: '¡Obtuviste tu certificado de "Crianza consciente"!', en: 'You earned your "Mindful parenting" certificate!' }, tiempo: { es: 'Ayer', en: 'Yesterday' } },
];
