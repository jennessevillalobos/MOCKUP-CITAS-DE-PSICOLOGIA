// Datos de demostración de "Clases en vivo" del panel del instructor,
// adaptado del mockup de administración PsiqueAmor_30_ClasesEnVivo.html al
// perfil del profesional: en vez de un admin notificando a toda la
// plataforma (2,841 usuarios), aquí cada profesional programa SUS propias
// clases (dirigidas a un curso suyo o a pacientes específicos) y además ve
// un feed compartido de las próximas clases en vivo de sus colegas para
// poder unirse como espectadora.
//
// Reutiliza deliberadamente los mismos títulos/profesionales/fechas ya
// establecidos en `liveClassesData.ts` (el lado del paciente): la clase de
// hoy "Taller: Respiración y calma" es la misma que ven los pacientes en su
// Aula Virtual — así ambas vistas cuentan la misma historia.

export type ClaseVivoEstado = 'programada' | 'vivo' | 'finalizada' | 'cancelada';
export type DestinatarioTipo = 'curso' | 'pacientes';

export interface ClaseEnVivo {
  id: string;
  titulo: string;
  instructor: string;
  // true = la dicta la instructora de la sesión actual (puede editar/
  // cancelar/iniciar); false = es de un colega, solo se puede "seguir" o
  // unirse como espectadora.
  esPropia: boolean;
  cursoKey?: string; // referencia a CURSOS_META cuando la clase es suya y está atada a un curso propio
  cursoTitulo?: string; // etiqueta de curso a mostrar (también se usa para las de colegas, donde no hay cursoKey)
  fechaISO: string; // YYYY-MM-DD
  hora: string; // HH:mm
  duracionMin: number;
  enlace: string;
  destinatario?: { tipo: DestinatarioTipo; pacientesCorreos?: string[] }; // solo aplica cuando esPropia
  grabar: boolean;
  recordatorio: boolean; // "avisarme 1h antes" — solo aplica cuando esPropia
  estado: ClaseVivoEstado;
  conectados?: number; // presente mientras está "vivo"
  asistieron?: number; // presente cuando "finalizada"
  grabacionImagen?: string; // miniatura, solo si grabar=true y ya finalizó
  grabacionDuracion?: string; // "58:20", solo si grabar=true y ya finalizó
}

// "Hoy" de referencia — la misma fecha que usan "Mis citas" y la Agenda del admin.
export const HOY_VIVO = '2026-08-12';

export const CLASES_VIVO_DEMO: ClaseEnVivo[] = [
  // ===== Propias de la Dra. Ana Rivas =====
  {
    id: 'cv1',
    titulo: 'Taller: Respiración y calma',
    instructor: 'Dra. Ana Rivas',
    esPropia: true,
    cursoKey: 'manejo-ansiedad',
    cursoTitulo: 'Manejo de la ansiedad',
    fechaISO: '2026-08-12',
    hora: '18:00',
    duracionMin: 60,
    enlace: 'https://zoom.us/j/8842019',
    destinatario: { tipo: 'curso' },
    grabar: true,
    recordatorio: true,
    estado: 'vivo',
    conectados: 42,
  },
  {
    id: 'cv2',
    titulo: 'Q&A: dudas sobre ansiedad social',
    instructor: 'Dra. Ana Rivas',
    esPropia: true,
    cursoKey: 'ansiedad-social',
    cursoTitulo: 'Superar la ansiedad social',
    fechaISO: '2026-08-19',
    hora: '17:00',
    duracionMin: 60,
    enlace: 'https://zoom.us/j/5521873',
    destinatario: { tipo: 'curso' },
    grabar: true,
    recordatorio: true,
    estado: 'programada',
  },
  {
    id: 'cv3',
    titulo: 'Sesión abierta: preguntas sobre el duelo',
    instructor: 'Dra. Ana Rivas',
    esPropia: true,
    cursoTitulo: undefined,
    fechaISO: '2026-08-21',
    hora: '19:00',
    duracionMin: 45,
    enlace: 'https://meet.google.com/abc-defg-hij',
    destinatario: { tipo: 'pacientes', pacientesCorreos: ['valentina.torres@correo.com', 'maria.g@correo.com'] },
    grabar: false,
    recordatorio: true,
    estado: 'programada',
  },
  {
    id: 'cv4',
    titulo: 'Manejo de crisis de ansiedad',
    instructor: 'Dra. Ana Rivas',
    esPropia: true,
    cursoKey: 'manejo-ansiedad',
    cursoTitulo: 'Manejo de la ansiedad',
    fechaISO: '2026-07-22',
    hora: '18:00',
    duracionMin: 58,
    enlace: '',
    destinatario: { tipo: 'curso' },
    grabar: true,
    recordatorio: false,
    estado: 'finalizada',
    asistieron: 96,
    grabacionImagen: 'https://images.pexels.com/photos/8715971/pexels-photo-8715971.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
    grabacionDuracion: '58:20',
  },
  {
    id: 'cv5',
    titulo: 'Bienvenida cohorte agosto',
    instructor: 'Dra. Ana Rivas',
    esPropia: true,
    cursoTitulo: undefined,
    fechaISO: '2026-08-04',
    hora: '10:00',
    duracionMin: 30,
    enlace: '',
    destinatario: { tipo: 'pacientes', pacientesCorreos: ['jorge.l@correo.com'] },
    grabar: false,
    recordatorio: false,
    estado: 'cancelada',
  },

  // ===== De colegas (solo para unirse/seguir, sin editar) =====
  {
    id: 'cv6',
    titulo: 'Q&A: Inteligencia emocional',
    instructor: 'Lic. Carlos Mora',
    esPropia: false,
    cursoTitulo: 'Inteligencia emocional',
    fechaISO: '2026-08-14',
    hora: '17:00',
    duracionMin: 60,
    enlace: 'https://zoom.us/j/1102938',
    grabar: false,
    recordatorio: false,
    estado: 'programada',
  },
  {
    id: 'cv7',
    titulo: 'Charla: Crianza y límites',
    instructor: 'Dra. Lucía Peña',
    esPropia: false,
    cursoTitulo: 'Crianza consciente',
    fechaISO: '2026-08-16',
    hora: '19:00',
    duracionMin: 45,
    enlace: 'https://meet.google.com/xyz-uvwx-rst',
    grabar: false,
    recordatorio: false,
    estado: 'programada',
  },
  {
    id: 'cv8',
    titulo: 'Comunicación en pareja: preguntas frecuentes',
    instructor: 'Lic. Carlos Mora',
    esPropia: false,
    cursoTitulo: 'Comunicación en pareja',
    fechaISO: '2026-07-15',
    hora: '18:00',
    duracionMin: 45,
    enlace: '',
    grabar: true,
    recordatorio: false,
    estado: 'finalizada',
    asistieron: 31,
    grabacionImagen: 'https://images.pexels.com/photos/13849252/pexels-photo-13849252.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
    grabacionDuracion: '45:10',
  },
  {
    id: 'cv9',
    titulo: 'Rutinas de sueño',
    instructor: 'Dr. Miguel Torres',
    esPropia: false,
    cursoTitulo: 'Mindfulness para dormir mejor',
    fechaISO: '2026-07-08',
    hora: '18:00',
    duracionMin: 39,
    enlace: '',
    grabar: true,
    recordatorio: false,
    estado: 'finalizada',
    asistieron: 110,
    grabacionImagen: 'https://images.pexels.com/photos/9127682/pexels-photo-9127682.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
    grabacionDuracion: '39:00',
  },
];

// Mensajes de chat de demo para la sala en vivo — mismo formato/participantes
// que el chat de la clase de hoy en el Aula Virtual del paciente
// (`liveClassesData.ts`), para que ambos lados vean la misma conversación.
export interface MensajeChatVivo {
  autor: string;
  hora: string;
  texto: { es: string; en: string };
  esInstructor?: boolean;
}

export const CHAT_DEMO_INSTRUCTOR: MensajeChatVivo[] = [
  {
    autor: 'Dra. Ana Rivas', hora: '18:02', esInstructor: true,
    texto: { es: '¡Bienvenidos! Hoy practicaremos respiración diafragmática.', en: "Welcome! Today we'll practice diaphragmatic breathing." },
  },
  { autor: 'Jorge L.', hora: '18:03', texto: { es: '¡Gracias! Justo lo necesitaba esta semana 🙏', en: 'Thank you! Just what I needed this week 🙏' } },
  { autor: 'María G.', hora: '18:04', texto: { es: '¿Se puede hacer acostada?', en: 'Can I do it lying down?' } },
  {
    autor: 'Dra. Ana Rivas', hora: '18:05', esInstructor: true,
    texto: { es: 'Sí, María. Acostada o sentada, lo importante es la comodidad.', en: 'Yes, María. Lying or seated, comfort is what matters.' },
  },
];
