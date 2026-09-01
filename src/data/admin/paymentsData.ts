export type MetodoPago = 'Transferencia' | 'Efectivo' | 'Tarjeta' | 'Pago móvil';
export type EstadoPago =
  | 'Pendiente'
  | 'Reportado'
  | 'En revisión'
  | 'Aprobado'
  | 'Rechazado'
  | 'Reembolsado'
  | 'Parcial'
  | 'Vencido';

export interface ReembolsoRecord {
  tipo: 'Total' | 'Parcial';
  monto: number;
  motivo: string;
  notas?: string;
  generarCredito: boolean;
  metodoDevolucion: MetodoPago;
  fecha: string;
}

export interface PagoRecord {
  id: string;
  cliente: string;
  correo: string;
  concepto: string;
  metodo: MetodoPago;
  monto: number;
  moneda: string;
  fecha: string;
  estado: EstadoPago;
  referencia?: string;
  banco?: string;
  notas?: string;
  reembolso?: ReembolsoRecord;
}

export const demoPagos: PagoRecord[] = [
  { id: 'pg1', cliente: 'Roberto Salas', correo: 'roberto.salas@mail.com', concepto: 'Cuota 4/4 · Terapia individual', metodo: 'Transferencia', monto: 120, moneda: 'USD', fecha: '2026-08-10', estado: 'Pendiente', referencia: 'TRX-88213', banco: 'Banco Nacional' },
  { id: 'pg2', cliente: 'Diana Cruz', correo: 'diana.cruz@mail.com', concepto: 'Curso: Manejo de ansiedad', metodo: 'Efectivo', monto: 79, moneda: 'USD', fecha: '2026-08-09', estado: 'Reportado' },
  { id: 'pg3', cliente: 'Grupo Bienestar S.A.', correo: 'contacto@bienestar.com', concepto: 'Factura corporativa · Agosto', metodo: 'Transferencia', monto: 860, moneda: 'USD', fecha: '2026-08-08', estado: 'En revisión', referencia: 'TRX-88190', banco: 'Banco Mercantil' },
  { id: 'pg4', cliente: 'Lucía González', correo: 'lucia.gonzalez@mail.com', concepto: 'Curso: Manejo de ansiedad', metodo: 'Tarjeta', monto: 79, moneda: 'USD', fecha: '2026-08-11', estado: 'Aprobado' },
  { id: 'pg5', cliente: 'Ana Torres', correo: 'ana.torres@mail.com', concepto: 'Evaluación inicial', metodo: 'Pago móvil', monto: 40, moneda: 'USD', fecha: '2026-08-12', estado: 'Aprobado', referencia: 'PM-55210' },
  { id: 'pg6', cliente: 'Marco Peña', correo: 'marco.pena@mail.com', concepto: 'Terapia de pareja', metodo: 'Transferencia', monto: 75, moneda: 'USD', fecha: '2026-08-05', estado: 'Rechazado', notas: 'Comprobante ilegible, se solicitó reenvío.' },
  { id: 'pg7', cliente: 'Camila Rivas', correo: 'camila.rivas@mail.com', concepto: 'Sesión: Terapia individual', metodo: 'Tarjeta', monto: 60, moneda: 'USD', fecha: '2026-08-01', estado: 'Reembolsado', reembolso: { tipo: 'Total', monto: 60, motivo: 'Cancelación de sesión con 48h de anticipación', generarCredito: false, metodoDevolucion: 'Tarjeta', fecha: '2026-08-03' } },
  { id: 'pg8', cliente: 'Grupo Bienestar S.A.', correo: 'contacto@bienestar.com', concepto: 'Curso: Liderazgo consciente (grupal)', metodo: 'Transferencia', monto: 400, moneda: 'USD', fecha: '2026-08-06', estado: 'Parcial', reembolso: { tipo: 'Parcial', monto: 120, motivo: '2 de 10 cupos no utilizados', generarCredito: true, metodoDevolucion: 'Transferencia', fecha: '2026-08-07' } },
  { id: 'pg9', cliente: 'Diego Duarte', correo: 'diego.duarte@mail.com', concepto: 'Cuota 2/4 · Terapia de pareja', metodo: 'Transferencia', monto: 75, moneda: 'USD', fecha: '2026-07-20', estado: 'Vencido' },
];
