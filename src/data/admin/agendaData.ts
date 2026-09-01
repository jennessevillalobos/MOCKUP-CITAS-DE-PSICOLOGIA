export type CitaEstado = 'Programada' | 'Completada' | 'Cancelada' | 'No asistió';

export interface CitaRecord {
  id: string;
  fechaISO: string; // YYYY-MM-DD
  hora: string; // HH:mm
  duracionMin: number;
  paciente: string;
  correo: string;
  servicio: string;
  profesional: string;
  modalidad: 'Online' | 'Presencial';
  lugar?: string;
  estado: CitaEstado;
  notas?: string;
}

// Referencia de "hoy" para los datos de demostración del calendario.
export const AGENDA_HOY = '2026-08-12';

export const demoCitas: CitaRecord[] = [
  { id: 'c1', fechaISO: '2026-08-12', hora: '09:00', duracionMin: 50, paciente: 'Lucía González', correo: 'lucia.gonzalez@mail.com', servicio: 'Terapia individual', profesional: 'Dra. Valentina Ríos', modalidad: 'Online', estado: 'Programada' },
  { id: 'c2', fechaISO: '2026-08-12', hora: '10:30', duracionMin: 60, paciente: 'Marco Peña', correo: 'marco.pena@mail.com', servicio: 'Terapia de pareja', profesional: 'Lic. Andrés Duarte', modalidad: 'Presencial', lugar: 'Sede Centro', estado: 'Programada' },
  { id: 'c3', fechaISO: '2026-08-12', hora: '12:00', duracionMin: 45, paciente: 'Ana Torres', correo: 'ana.torres@mail.com', servicio: 'Evaluación inicial', profesional: 'Dra. Valentina Ríos', modalidad: 'Online', estado: 'Programada' },
  { id: 'c4', fechaISO: '2026-08-12', hora: '16:15', duracionMin: 30, paciente: 'Roberto Salas', correo: 'roberto.salas@mail.com', servicio: 'Seguimiento', profesional: 'Lic. Andrés Duarte', modalidad: 'Presencial', lugar: 'Sede Norte', estado: 'Programada' },
  { id: 'c5', fechaISO: '2026-08-11', hora: '09:00', duracionMin: 50, paciente: 'Lucía González', correo: 'lucia.gonzalez@mail.com', servicio: 'Terapia individual', profesional: 'Dra. Valentina Ríos', modalidad: 'Online', estado: 'Completada' },
  { id: 'c6', fechaISO: '2026-08-11', hora: '11:00', duracionMin: 50, paciente: 'Diana Cruz', correo: 'diana.cruz@mail.com', servicio: 'Terapia individual', profesional: 'Lic. Sofía Herrera', modalidad: 'Online', estado: 'Cancelada' },
  { id: 'c7', fechaISO: '2026-08-10', hora: '15:00', duracionMin: 60, paciente: 'Marco Peña', correo: 'marco.pena@mail.com', servicio: 'Terapia de pareja', profesional: 'Lic. Andrés Duarte', modalidad: 'Presencial', lugar: 'Sede Centro', estado: 'Completada' },
  { id: 'c8', fechaISO: '2026-08-13', hora: '09:30', duracionMin: 50, paciente: 'Camila Rivas', correo: 'camila.rivas@mail.com', servicio: 'Terapia individual', profesional: 'Lic. Sofía Herrera', modalidad: 'Online', estado: 'Programada' },
  { id: 'c9', fechaISO: '2026-08-13', hora: '13:00', duracionMin: 60, paciente: 'Grupo Bienestar S.A.', correo: 'contacto@bienestar.com', servicio: 'Terapia familiar', profesional: 'Lic. Andrés Duarte', modalidad: 'Presencial', lugar: 'Sede Norte', estado: 'Programada' },
  { id: 'c10', fechaISO: '2026-08-14', hora: '10:00', duracionMin: 45, paciente: 'Roberto Salas', correo: 'roberto.salas@mail.com', servicio: 'Evaluación inicial', profesional: 'Dra. Valentina Ríos', modalidad: 'Online', estado: 'Programada' },
  { id: 'c11', fechaISO: '2026-08-14', hora: '17:00', duracionMin: 50, paciente: 'Diana Cruz', correo: 'diana.cruz@mail.com', servicio: 'Terapia individual', profesional: 'Lic. Sofía Herrera', modalidad: 'Online', estado: 'Programada' },
  { id: 'c12', fechaISO: '2026-08-17', hora: '09:00', duracionMin: 50, paciente: 'Lucía González', correo: 'lucia.gonzalez@mail.com', servicio: 'Seguimiento', profesional: 'Dra. Valentina Ríos', modalidad: 'Online', estado: 'Programada' },
  { id: 'c13', fechaISO: '2026-08-07', hora: '11:30', duracionMin: 60, paciente: 'Ana Torres', correo: 'ana.torres@mail.com', servicio: 'Terapia de pareja', profesional: 'Lic. Andrés Duarte', modalidad: 'Presencial', lugar: 'Sede Centro', estado: 'No asistió' },
];
