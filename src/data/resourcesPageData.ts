export type TipoRecurso = 'libro' | 'video';

export interface RecursoPublico {
  key: string;
  tipo: TipoRecurso;
  titulo: { es: string; en: string };
  descripcion?: { es: string; en: string };
  autor: string;
  precio?: number;
  duracion?: string;
  colorClases: string;
  destacado?: boolean;
}

// Los primeros 2 son el video y el libro que ya se destacan en el Home (sin
// precio, marcados como "Destacado"). Los siguientes 8 vienen del mockup de
// Libros y Videos (4 libros + 4 videos), con portadas ilustradas ya que el
// mockup solo traía imágenes de relleno con el título como texto.
export const RECURSOS_PUBLICOS: RecursoPublico[] = [
  {
    key: 'autocuidado-limites',
    tipo: 'video',
    titulo: { es: 'Autocuidado: aprende a poner límites', en: 'Self-care: learning to set boundaries' },
    descripcion: { es: 'Pequeños límites pueden hacer más espacio para lo que importa.', en: 'Small boundaries can make more room for what matters.' },
    autor: 'Equipo Psique Amor',
    colorClases: 'bg-brand-700',
    destacado: true,
  },
  {
    key: 'sanar-soltar',
    tipo: 'libro',
    titulo: { es: 'Sanar para soltar', en: 'Healing to let go' },
    descripcion: { es: 'Una guía amable para cerrar ciclos y volver a empezar.', en: 'A gentle guide to closing cycles and beginning again.' },
    autor: 'Equipo Psique Amor',
    colorClases: 'bg-lilac-600',
    destacado: true,
  },
  {
    key: 'respira-calma',
    tipo: 'libro',
    titulo: { es: 'Respira: guía para la calma', en: 'Breathe: a guide to calm' },
    autor: 'Dra. Ana Rivas',
    precio: 12,
    colorClases: 'bg-brand-600',
  },
  {
    key: 'vinculos-sanos',
    tipo: 'libro',
    titulo: { es: 'Vínculos sanos', en: 'Healthy bonds' },
    autor: 'Dra. Lucía Peña',
    precio: 14,
    colorClases: 'bg-lilac-500',
  },
  {
    key: 'quererme-bien',
    tipo: 'libro',
    titulo: { es: 'Quererme bien', en: 'Loving myself' },
    autor: 'Lic. Sofía Núñez',
    precio: 11,
    colorClases: 'bg-brand-500',
  },
  {
    key: 'dormir-mejor-libro',
    tipo: 'libro',
    titulo: { es: 'Aprende a dormir mejor', en: 'Sleep better' },
    autor: 'Dr. Miguel Torres',
    precio: 10,
    colorClases: 'bg-lilac-700',
  },
  {
    key: 'mindfulness-20',
    tipo: 'video',
    titulo: { es: 'Mindfulness en 20 minutos', en: 'Mindfulness in 20 min' },
    autor: 'Lic. Carlos Mora',
    precio: 9,
    duracion: '20:00',
    colorClases: 'bg-brand-700',
  },
  {
    key: 'rutina-dormir',
    tipo: 'video',
    titulo: { es: 'Rutina para dormir', en: 'Sleep routine' },
    autor: 'Dra. Ana Rivas',
    precio: 8,
    duracion: '15:00',
    colorClases: 'bg-lilac-600',
  },
  {
    key: 'respiracion-calma',
    tipo: 'video',
    titulo: { es: 'Respiración para la calma', en: 'Breathing for calm' },
    autor: 'Dra. Lucía Peña',
    precio: 7,
    duracion: '12:00',
    colorClases: 'bg-brand-600',
  },
  {
    key: 'estres-diario',
    tipo: 'video',
    titulo: { es: 'Manejar el estrés diario', en: 'Managing daily stress' },
    autor: 'Dr. Miguel Torres',
    precio: 9,
    duracion: '18:00',
    colorClases: 'bg-lilac-500',
  },
];
