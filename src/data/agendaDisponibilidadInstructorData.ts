// Datos de demostración de "Agenda / Disponibilidad" del panel del
// instructor — a diferencia de "Mis citas" (que solo muestra el listado de
// citas ya agendadas), aquí la profesional configura su propio horario de
// trabajo y sus bloqueos. No existe un mockup de administración equivalente
// para adaptar; se diseñó desde cero siguiendo las decisiones acordadas con
// el usuario (ver `prompt_agenda_disponibilidad_profesional.md`).
//
// "Hoy" de referencia: el mismo 2026-08-12 que usa el resto del panel del
// instructor (`AGENDA_INSTRUCTOR_HOY` en `citasInstructorData.ts`).

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export const DIAS_SEMANA: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export const DIA_LABEL: Record<DiaSemana, { es: string; en: string }> = {
  lunes: { es: 'Lunes', en: 'Monday' },
  martes: { es: 'Martes', en: 'Tuesday' },
  miercoles: { es: 'Miércoles', en: 'Wednesday' },
  jueves: { es: 'Jueves', en: 'Thursday' },
  viernes: { es: 'Viernes', en: 'Friday' },
  sabado: { es: 'Sábado', en: 'Saturday' },
  domingo: { es: 'Domingo', en: 'Sunday' },
};

export interface HorarioDia {
  activo: boolean;
  inicio: string; // HH:mm
  fin: string; // HH:mm
}

export type HorarioSemanal = Record<DiaSemana, HorarioDia>;

export const HORARIO_SEMANAL_DEMO: HorarioSemanal = {
  lunes: { activo: true, inicio: '09:00', fin: '17:00' },
  martes: { activo: true, inicio: '09:00', fin: '17:00' },
  miercoles: { activo: true, inicio: '09:00', fin: '17:00' },
  jueves: { activo: true, inicio: '09:00', fin: '17:00' },
  viernes: { activo: true, inicio: '09:00', fin: '17:00' },
  sabado: { activo: true, inicio: '09:00', fin: '13:00' },
  domingo: { activo: false, inicio: '09:00', fin: '17:00' },
};

export interface ConfiguracionSesiones {
  duracionMin: number;
  descansoMin: number;
}

export const CONFIG_SESIONES_DEMO: ConfiguracionSesiones = { duracionMin: 50, descansoMin: 10 };

export type TipoBloqueo = 'dia' | 'rango' | 'horas';

export interface BloqueoAgenda {
  id: string;
  tipo: TipoBloqueo;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin?: string; // YYYY-MM-DD — solo en tipo 'rango'
  horaInicio?: string; // HH:mm — solo en tipo 'horas'
  horaFin?: string; // HH:mm — solo en tipo 'horas'
  motivo?: string;
}

export const BLOQUEOS_INSTRUCTOR_DEMO: BloqueoAgenda[] = [
  { id: 'bl1', tipo: 'rango', fechaInicio: '2026-08-24', fechaFin: '2026-08-28', motivo: 'Vacaciones' },
  { id: 'bl2', tipo: 'horas', fechaInicio: '2026-08-19', horaInicio: '14:00', horaFin: '16:00', motivo: 'Cita médica personal' },
];
