// Datos de demostración de "Mis citas" del panel del instructor (Dra. Ana
// Rivas). Reutiliza el mismo tipo `CitaEstado` y el mismo vocabulario que ya
// usa la agenda del panel admin (`src/data/admin/agendaData.ts`) — mismos
// nombres de servicio (Terapia individual, Seguimiento, Evaluación inicial) y
// de sede (Sede Centro) — para que ambos lados de la plataforma hablen el
// mismo idioma de datos.
//
// La primera paciente, Valentina Torres, es exactamente la misma paciente
// demo que ya usa el Portal Paciente (`SiteAuthContext.PATIENT_DEMO` /
// `patientPortalData.ts`) — su cita del 6 de agosto y la del 13 de agosto
// coinciden en fecha/hora/servicio con las que ella ve en "Mis citas" desde
// su propio portal, así ambas vistas cuentan la misma historia.
import type { CitaEstado } from '@/data/admin/agendaData';

// "Hoy" de referencia para este set de datos — la misma fecha que usa la
// agenda del panel admin (`AGENDA_HOY`), para que "próxima", "hoy" y
// "esta semana" tengan sentido en ambos lados.
export const AGENDA_INSTRUCTOR_HOY = '2026-08-12';

export interface CitaInstructor {
  id: string;
  fechaISO: string; // YYYY-MM-DD
  hora: string; // HH:mm
  duracionMin: number;
  paciente: string;
  correo: string;
  telefono?: string;
  servicio: string;
  // Nombre del profesional con quien es la cita. El panel del instructor es
  // de un solo profesional (Dra. Ana Rivas) así que todo lo que ya existía
  // aquí lleva ese valor por defecto; las nuevas reservas hechas desde
  // /agendar sí pueden traer cualquiera de los profesionales públicos.
  profesional: string;
  modalidad: 'Online' | 'Presencial';
  lugar?: string;
  estado: CitaEstado;
  notas: string; // nota clínica de la sesión (vacía si aún no se ha escrito)
  // Precio pagado (USD) — solo se completa en las reservas hechas desde
  // /agendar, ya que ese wizard cobra por adelantado (pago simulado).
  precio?: number;
  // true solo para las citas creadas desde el wizard público de /agendar —
  // permite distinguir, si hiciera falta, una reserva real del cliente de
  // los datos de demostración originales.
  origenReserva?: boolean;
}

export const CITAS_INSTRUCTOR_DEMO: CitaInstructor[] = [
  { id: 'ci1', fechaISO: '2026-08-13', hora: '10:00', duracionMin: 50, paciente: 'Valentina Torres', correo: 'valentina.torres@correo.com', servicio: 'Seguimiento', profesional: 'Dra. Ana Rivas', modalidad: 'Online', estado: 'Programada', notas: '' },
  { id: 'ci2', fechaISO: '2026-08-06', hora: '14:00', duracionMin: 50, paciente: 'Valentina Torres', correo: 'valentina.torres@correo.com', servicio: 'Terapia individual', profesional: 'Dra. Ana Rivas', modalidad: 'Online', estado: 'Completada', notas: 'Buen progreso con la técnica de respiración diafragmática. Continuar reforzando en casa.' },
  { id: 'ci3', fechaISO: '2026-07-22', hora: '14:00', duracionMin: 50, paciente: 'Valentina Torres', correo: 'valentina.torres@correo.com', servicio: 'Terapia individual', profesional: 'Dra. Ana Rivas', modalidad: 'Online', estado: 'Completada', notas: 'Primera sesión: exploramos el origen de los episodios de ansiedad. Buena apertura.' },
  { id: 'ci4', fechaISO: '2026-08-12', hora: '16:00', duracionMin: 50, paciente: 'María G.', correo: 'maria.g@correo.com', servicio: 'Terapia individual', profesional: 'Dra. Ana Rivas', modalidad: 'Online', estado: 'Programada', notas: '' },
  { id: 'ci5', fechaISO: '2026-08-14', hora: '11:00', duracionMin: 50, paciente: 'Luis T.', correo: 'luis.t@correo.com', servicio: 'Terapia individual', profesional: 'Dra. Ana Rivas', modalidad: 'Presencial', lugar: 'Sede Centro', estado: 'Programada', notas: '' },
  { id: 'ci6', fechaISO: '2026-08-17', hora: '09:30', duracionMin: 45, paciente: 'Carla R.', correo: 'carla.r@correo.com', servicio: 'Evaluación inicial', profesional: 'Dra. Ana Rivas', modalidad: 'Online', estado: 'Programada', notas: '' },
  { id: 'ci7', fechaISO: '2026-08-05', hora: '10:00', duracionMin: 50, paciente: 'Jorge L.', correo: 'jorge.l@correo.com', servicio: 'Terapia individual', profesional: 'Dra. Ana Rivas', modalidad: 'Online', estado: 'Cancelada', notas: 'Paciente solicitó cancelar por viaje de trabajo.' },
  { id: 'ci8', fechaISO: '2026-08-03', hora: '15:00', duracionMin: 50, paciente: 'Andrés P.', correo: 'andres.p@correo.com', servicio: 'Terapia individual', profesional: 'Dra. Ana Rivas', modalidad: 'Online', estado: 'Completada', notas: 'Cierre de proceso: completó los objetivos planteados al inicio.' },
  { id: 'ci9', fechaISO: '2026-07-29', hora: '16:00', duracionMin: 50, paciente: 'María G.', correo: 'maria.g@correo.com', servicio: 'Terapia individual', profesional: 'Dra. Ana Rivas', modalidad: 'Online', estado: 'Completada', notas: 'Buen manejo de la ansiedad anticipatoria antes de exámenes.' },
  { id: 'ci10', fechaISO: '2026-08-01', hora: '11:00', duracionMin: 50, paciente: 'Luis T.', correo: 'luis.t@correo.com', servicio: 'Terapia individual', profesional: 'Dra. Ana Rivas', modalidad: 'Presencial', lugar: 'Sede Centro', estado: 'No asistió', notas: 'No se presentó, se reagendó para la próxima semana.' },
];

export interface NotaPaciente {
  id: string;
  correo: string;
  paciente: string;
  fecha: string;
  texto: string;
}

// Notas generales del paciente, no atadas a una cita puntual — parte del
// historial clínico que el profesional va construyendo con el tiempo.
export const NOTAS_PACIENTE_DEMO: NotaPaciente[] = [
  { id: 'np1', correo: 'valentina.torres@correo.com', paciente: 'Valentina Torres', fecha: '2 ago 2026', texto: 'Reporta antecedentes de ansiedad generalizada desde hace 2 años. Buena adherencia al tratamiento.' },
  { id: 'np2', correo: 'maria.g@correo.com', paciente: 'María G.', fecha: '15 jul 2026', texto: 'Estudiante universitaria; ansiedad relacionada principalmente a exámenes y evaluaciones.' },
];

export type { CitaEstado };
