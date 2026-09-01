export interface CitaPaciente {
  dia: string;
  mes: string;
  fecha: { es: string; en: string };
  servicio: { es: string; en: string };
  hora: string;
  modalidad: string;
  profesional: string;
  // 'cancelada' se agrega para representar reservas reales hechas desde
  // /agendar que luego el profesional cancela o reagenda (ver
  // AgendaDisponibilidadPage / InstructorAgendaContext.cambiarEstado).
  estado: 'confirmada' | 'agendada' | 'completada' | 'cancelada';
  total: number;
  pagado: number;
  // true solo para las que vienen del wizard público de reserva — permite
  // distinguirlas de los 3 registros de demostración de abajo si hiciera falta.
  origenReserva?: boolean;
}

// Datos de demostración (no hay todavía un flujo real de reservas conectado
// a este portal) — reflejan el mismo contenido de ejemplo del mockup.
export const CITAS_PACIENTE: CitaPaciente[] = [
  {
    dia: '06', mes: 'AGO', fecha: { es: '6 agosto 2026', en: 'August 6, 2026' },
    servicio: { es: 'Terapia individual', en: 'Individual therapy' },
    hora: '14:00', modalidad: 'Online', profesional: 'Dra. Ana Rivas',
    estado: 'confirmada', total: 50, pagado: 20,
  },
  {
    dia: '13', mes: 'AGO', fecha: { es: '13 agosto 2026', en: 'August 13, 2026' },
    servicio: { es: 'Seguimiento', en: 'Follow-up' },
    hora: '10:00', modalidad: 'Online', profesional: 'Dra. Ana Rivas',
    estado: 'agendada', total: 40, pagado: 40,
  },
  {
    dia: '22', mes: 'JUL', fecha: { es: '22 julio 2026', en: 'July 22, 2026' },
    servicio: { es: 'Terapia individual', en: 'Individual therapy' },
    hora: '14:00', modalidad: 'Online', profesional: 'Dra. Ana Rivas',
    estado: 'completada', total: 50, pagado: 50,
  },
];

export interface PagoPaciente {
  concepto: { es: string; en: string };
  fecha: string;
  monto: number;
  metodo: { es: string; en: string };
  estado: 'pagado' | 'pendiente' | 'revision' | 'rechazado';
}

export const PAGOS_PACIENTE: PagoPaciente[] = [
  { concepto: { es: 'Cita · Terapia individual', en: 'Session · Individual' }, fecha: '2 ago 2026', monto: 20, metodo: { es: 'Tarjeta', en: 'Card' }, estado: 'pagado' },
  { concepto: { es: 'Saldo · Terapia individual', en: 'Balance · Individual' }, fecha: '—', monto: 30, metodo: { es: '—', en: '—' }, estado: 'pendiente' },
  { concepto: { es: 'Curso · Manejo de la ansiedad', en: 'Course · Anxiety' }, fecha: '28 jul 2026', monto: 55, metodo: { es: 'Transferencia', en: 'Transfer' }, estado: 'revision' },
  { concepto: { es: 'Libro · Respira', en: 'Book · Breathe' }, fecha: '15 jul 2026', monto: 12, metodo: { es: 'PayPal', en: 'PayPal' }, estado: 'pagado' },
];

export interface NotificacionPaciente {
  icono: 'cita' | 'pago' | 'revision' | 'curso';
  texto: { es: string; en: string };
  tiempo: { es: string; en: string };
}

export const NOTIFICACIONES_PACIENTE: NotificacionPaciente[] = [
  { icono: 'cita', texto: { es: 'Tu cita del 6 ago fue confirmada.', en: 'Your Aug 6 session was confirmed.' }, tiempo: { es: 'Hace 2 h', en: '2h ago' } },
  { icono: 'pago', texto: { es: 'Recuerda: tienes un saldo de USD $30.', en: 'Reminder: you have a balance of USD $30.' }, tiempo: { es: 'Ayer', en: 'Yesterday' } },
  { icono: 'revision', texto: { es: 'Tu pago por transferencia está en revisión.', en: 'Your transfer payment is under review.' }, tiempo: { es: '28 jul', en: 'Jul 28' } },
  { icono: 'curso', texto: { es: 'Nuevo curso disponible: "Inteligencia emocional".', en: 'New course available: "Emotional intelligence".' }, tiempo: { es: '26 jul', en: 'Jul 26' } },
];
