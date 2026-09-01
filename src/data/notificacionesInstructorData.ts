// Datos de demostración de "Notificaciones" del panel del instructor,
// adaptado del mockup de administración (`PsiqueAmor_XX_Notificaciones.html`,
// el "Centro de notificaciones" con reglas/plantillas/integraciones) al
// perfil de una profesional individual: aquí es solo el feed, sin
// automatizaciones ni configuración de canales — a pedido explícito del
// usuario ("sencilla y clara").
//
// Reutiliza únicamente nombres/cursos/colegas ya establecidos en el resto
// del panel del instructor (Valentina Torres, María G., Luis T., Carla R.,
// Andrés P., Jorge L., Lic. Carlos Mora), sin inventar datos nuevos.

export type TipoNotifInstructor = 'cita' | 'evaluacion' | 'curso' | 'vivo' | 'reseña' | 'pago';
export type GrupoNotif = 'hoy' | 'semana' | 'anteriores';

export interface NotificacionInstructor {
  id: string;
  tipo: TipoNotifInstructor;
  texto: { es: string; en: string };
  tiempo: { es: string; en: string };
  grupo: GrupoNotif;
  leida: boolean;
  link: string;
}

export const NOTIFICACIONES_INSTRUCTOR_DEMO: NotificacionInstructor[] = [
  // ===== HOY =====
  {
    id: 'ni1',
    tipo: 'cita',
    texto: { es: 'Valentina Torres agendó una cita para el 14 ago, 10:00 am.', en: 'Valentina Torres booked an appointment for Aug 14, 10:00 am.' },
    tiempo: { es: 'Hace 25 min', en: '25 min ago' },
    grupo: 'hoy', leida: false, link: '/instructor/citas',
  },
  {
    id: 'ni2',
    tipo: 'evaluacion',
    texto: { es: "María G. envió un intento de \"Evaluación · Módulo 1\" pendiente de calificar.", en: 'María G. submitted an attempt for "Assessment · Module 1" pending grading.' },
    tiempo: { es: 'Hace 1 h', en: '1h ago' },
    grupo: 'hoy', leida: false, link: '/instructor/evaluaciones',
  },
  {
    id: 'ni3',
    tipo: 'vivo',
    texto: { es: 'Tu clase "Taller: Respiración y calma" empieza en 30 min.', en: 'Your class "Workshop: Breathing and calm" starts in 30 min.' },
    tiempo: { es: 'Hace 2 h', en: '2h ago' },
    grupo: 'hoy', leida: true, link: '/instructor/vivo',
  },
  // ===== ESTA SEMANA =====
  {
    id: 'ni4',
    tipo: 'curso',
    texto: { es: 'Jorge L. se inscribió en "Manejo de la ansiedad".', en: 'Jorge L. enrolled in "Managing anxiety".' },
    tiempo: { es: 'Ayer', en: 'Yesterday' },
    grupo: 'semana', leida: false, link: '/instructor/cursos',
  },
  {
    id: 'ni5',
    tipo: 'cita',
    texto: { es: 'Luis T. canceló su cita del 20 ago.', en: 'Luis T. cancelled his appointment on Aug 20.' },
    tiempo: { es: 'Hace 2 días', en: '2 days ago' },
    grupo: 'semana', leida: true, link: '/instructor/citas',
  },
  {
    id: 'ni6',
    tipo: 'vivo',
    texto: { es: 'La clase de Lic. Carlos Mora "Q&A: Inteligencia emocional" empieza hoy a las 6:00 pm.', en: 'Lic. Carlos Mora\'s class "Q&A: Emotional intelligence" starts today at 6:00 pm.' },
    tiempo: { es: 'Hace 3 días', en: '3 days ago' },
    grupo: 'semana', leida: true, link: '/instructor/vivo',
  },
  {
    id: 'ni7',
    tipo: 'evaluacion',
    texto: { es: "Luis T. envió un intento de \"Evaluación · Módulo 1\" pendiente de calificar.", en: 'Luis T. submitted an attempt for "Assessment · Module 1" pending grading.' },
    tiempo: { es: 'Hace 3 días', en: '3 days ago' },
    grupo: 'semana', leida: false, link: '/instructor/evaluaciones',
  },
  // ===== ANTERIORES =====
  {
    id: 'ni8',
    tipo: 'reseña',
    texto: { es: 'Carla R. dejó una reseña de 5★ en "Superar la ansiedad social".', en: 'Carla R. left a 5★ review on "Overcoming social anxiety".' },
    tiempo: { es: 'Hace 1 semana', en: '1 week ago' },
    grupo: 'anteriores', leida: true, link: '/instructor',
  },
  {
    id: 'ni9',
    tipo: 'pago',
    texto: { es: 'Se registró el pago de la cuota 2/3 de Andrés P.', en: "Andrés P.'s installment 2/3 payment was recorded." },
    tiempo: { es: 'Hace 1 semana', en: '1 week ago' },
    grupo: 'anteriores', leida: true, link: '/instructor',
  },
];
