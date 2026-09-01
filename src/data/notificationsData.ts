// Contenido de demostración para la página de Notificaciones del Aula
// Virtual, basado en PsiqueAmor_35_NotificacionesAula.html. El widget del
// dashboard (NOTIFICACIONES_AULA en aulaVirtualData.ts) muestra un resumen
// corto; esta lista es la versión completa, agrupada, con enlaces a cada
// sección de origen.
export type TipoNotificacion = 'vivo' | 'evaluacion' | 'cuota' | 'certificado';
export type GrupoNotificacion = 'hoy' | 'semana' | 'anteriores';

export interface NotificacionCompleta {
  tipo: TipoNotificacion;
  grupo: GrupoNotificacion;
  texto: { es: string; en: string };
  tiempo: { es: string; en: string };
  leida: boolean;
  link: string;
}

export const NOTIFICACIONES_COMPLETAS: NotificacionCompleta[] = [
  {
    tipo: 'vivo',
    grupo: 'hoy',
    texto: {
      es: 'Clase en vivo hoy a las 18:00: "Taller: Respiración y calma".',
      en: 'Live class today at 6:00 PM: "Workshop: Breathing & calm".',
    },
    tiempo: { es: 'Hace 2 h', en: '2h ago' },
    leida: false,
    link: '/aula-virtual/vivo',
  },
  {
    tipo: 'evaluacion',
    grupo: 'semana',
    texto: {
      es: 'Nueva evaluación disponible en "Manejo de la ansiedad".',
      en: 'New quiz available in "Managing anxiety".',
    },
    tiempo: { es: 'Ayer', en: 'Yesterday' },
    leida: false,
    link: '/aula-virtual/evaluacion',
  },
  {
    tipo: 'cuota',
    grupo: 'semana',
    texto: {
      es: 'Tu cuota 3 de 4 de "Manejo de la ansiedad" está vencida.',
      en: 'Installment 3 of 4 for "Managing anxiety" is overdue.',
    },
    tiempo: { es: 'Hace 4 días', en: '4 days ago' },
    leida: true,
    link: '/aula-virtual/pagos',
  },
  {
    tipo: 'certificado',
    grupo: 'anteriores',
    texto: {
      es: '¡Obtuviste tu certificado de "Crianza consciente"!',
      en: 'You earned your "Mindful parenting" certificate!',
    },
    tiempo: { es: 'Hace 9 días', en: '9 days ago' },
    leida: true,
    link: '/aula-virtual/calificaciones',
  },
];
