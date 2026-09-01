export type ClaseEstado = 'Programada' | 'En vivo' | 'Finalizada' | 'Borrador';
export type Destinatario = 'Todos' | 'Curso' | 'Grupo' | 'Específicos';

export interface ClaseEnVivoRecord {
  id: string;
  titulo: string;
  cursoId?: string;
  instructor: string;
  fechaISO: string;
  hora: string;
  duracionMin: number;
  enlace: string;
  destinatarios: Destinatario;
  estudiantesEspecificos: string[];
  grabarSesion: boolean;
  recordatorio: boolean;
  estado: ClaseEstado;
  grabacionUrl?: string;
  inscritos: number;
}

export const demoClasesEnVivo: ClaseEnVivoRecord[] = [
  {
    id: 'lv1', titulo: 'Sesión en vivo: Respiración y regulación', cursoId: 'cu1', instructor: 'Dra. Valentina Ríos',
    fechaISO: '2026-08-20', hora: '17:00', duracionMin: 60, enlace: 'https://meet.psiqueamor.com/sala-8f21', destinatarios: 'Curso',
    estudiantesEspecificos: [], grabarSesion: true, recordatorio: true, estado: 'Programada', inscritos: 58,
  },
  {
    id: 'lv2', titulo: 'Preguntas y respuestas: Liderazgo consciente', cursoId: 'cu2', instructor: 'Lic. Andrés Duarte',
    fechaISO: '2026-08-19', hora: '19:00', duracionMin: 45, enlace: 'https://meet.psiqueamor.com/sala-1a02', destinatarios: 'Grupo',
    estudiantesEspecificos: [], grabarSesion: false, recordatorio: true, estado: 'En vivo', inscritos: 24,
  },
  {
    id: 'lv3', titulo: 'Taller grupal: Comunicación asertiva', cursoId: 'cu3', instructor: 'Lic. Sofía Herrera',
    fechaISO: '2026-08-05', hora: '18:00', duracionMin: 90, enlace: 'https://meet.psiqueamor.com/sala-77bd', destinatarios: 'Todos',
    estudiantesEspecificos: [], grabarSesion: true, recordatorio: true, estado: 'Finalizada', inscritos: 33,
    grabacionUrl: 'https://cdn.psiqueamor.com/grabaciones/taller-comunicacion.mp4',
  },
  {
    id: 'lv4', titulo: 'Sesión personalizada de seguimiento', instructor: 'Dra. Valentina Ríos',
    fechaISO: '2026-08-22', hora: '10:00', duracionMin: 30, enlace: '', destinatarios: 'Específicos',
    estudiantesEspecificos: ['Lucía González', 'Roberto Salas'], grabarSesion: false, recordatorio: false, estado: 'Borrador', inscritos: 2,
  },
];

export const ESTUDIANTES_DISPONIBLES = ['Lucía González', 'Marco Peña', 'Ana Torres', 'Roberto Salas', 'Diana Cruz', 'Camila Rivas', 'Diego Duarte'];
