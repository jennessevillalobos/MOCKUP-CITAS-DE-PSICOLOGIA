// Contenido de demostración para "Clases en vivo" del Aula Virtual, basado
// en PsiqueAmor_17_ClasesEnVivo.html. Reutiliza los instructores/cursos ya
// establecidos en el resto del sitio (aulaVirtualData.ts, libraryData.ts).
export interface ProximaClase {
  key: string;
  titulo: { es: string; en: string };
  esHoy: boolean;
  diaCorto: { es: string; en: string };
  hora: string;
  duracionMin: number;
  profesional: string;
  curso?: { es: string; en: string };
  conectados?: number;
  inscrito: boolean;
}

export const PROXIMAS_CLASES: ProximaClase[] = [
  {
    key: 'respiracion-calma',
    titulo: { es: 'Taller: Respiración y calma', en: 'Workshop: Breathing & calm' },
    esHoy: true,
    diaCorto: { es: 'HOY', en: 'TODAY' },
    hora: '18:00',
    duracionMin: 60,
    profesional: 'Dra. Ana Rivas',
    curso: { es: 'Manejo de la ansiedad', en: 'Managing anxiety' },
    conectados: 42,
    inscrito: true,
  },
  {
    key: 'qa-inteligencia',
    titulo: { es: 'Q&A: Inteligencia emocional', en: 'Q&A: Emotional intelligence' },
    esHoy: false,
    diaCorto: { es: '12 AGO', en: 'AUG 12' },
    hora: '17:00',
    duracionMin: 60,
    profesional: 'Lic. Carlos Mora',
    inscrito: true,
  },
  {
    key: 'crianza-limites',
    titulo: { es: 'Charla: Crianza y límites', en: 'Talk: Parenting & boundaries' },
    esHoy: false,
    diaCorto: { es: '19 AGO', en: 'AUG 19' },
    hora: '19:00',
    duracionMin: 45,
    profesional: 'Dra. Lucía Peña',
    inscrito: false,
  },
];

export interface Grabacion {
  key: string;
  titulo: { es: string; en: string };
  profesional: string;
  fecha: { es: string; en: string };
  duracion: string;
  image: string;
}

export const GRABACIONES: Grabacion[] = [
  {
    key: 'crisis-ansiedad',
    titulo: { es: 'Manejo de crisis de ansiedad', en: 'Handling anxiety crises' },
    profesional: 'Dra. Ana Rivas',
    fecha: { es: '22 jul 2026', en: 'Jul 22, 2026' },
    duracion: '58:20',
    image: 'https://images.pexels.com/photos/8715971/pexels-photo-8715971.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
  },
  {
    key: 'comunicacion-pareja',
    titulo: { es: 'Comunicación en pareja', en: 'Communication in couples' },
    profesional: 'Lic. Carlos Mora',
    fecha: { es: '15 jul 2026', en: 'Jul 15, 2026' },
    duracion: '45:10',
    image: 'https://images.pexels.com/photos/13849252/pexels-photo-13849252.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
  },
  {
    key: 'rutinas-sueno',
    titulo: { es: 'Rutinas de sueño', en: 'Sleep routines' },
    profesional: 'Dr. Miguel Torres',
    fecha: { es: '8 jul 2026', en: 'Jul 8, 2026' },
    duracion: '39:00',
    image: 'https://images.pexels.com/photos/9127682/pexels-photo-9127682.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
  },
];

export interface MensajeChatVivo {
  autor: string;
  hora: string;
  texto: { es: string; en: string };
  esInstructor?: boolean;
}

export const CHAT_DEMO: MensajeChatVivo[] = [
  {
    autor: 'Dra. Ana Rivas',
    hora: '18:02',
    texto: { es: '¡Bienvenidos! Hoy practicaremos respiración diafragmática.', en: "Welcome! Today we'll practice diaphragmatic breathing." },
    esInstructor: true,
  },
  {
    autor: 'Jorge L.',
    hora: '18:03',
    texto: { es: '¡Gracias! Justo lo necesitaba esta semana 🙏', en: 'Thank you! Just what I needed this week 🙏' },
  },
  {
    autor: 'María G.',
    hora: '18:04',
    texto: { es: '¿Se puede hacer acostada?', en: 'Can I do it lying down?' },
  },
  {
    autor: 'Dra. Ana Rivas',
    hora: '18:05',
    texto: { es: 'Sí, María. Acostada o sentada, lo importante es la comodidad.', en: 'Yes, María. Lying or seated, comfort is what matters.' },
    esInstructor: true,
  },
];
