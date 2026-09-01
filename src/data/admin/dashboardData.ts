// Datos de demostración para el dashboard del panel admin. Cuando se conecte
// un backend real, este archivo se reemplaza por llamadas a la API sin tener
// que tocar la pantalla.

export const kpis = [
  { label: 'Ingresos del mes', value: '$28,540', delta: '▲ 12.4%', positivo: true, sub: 'Meta: $32,000' },
  { label: 'Citas de hoy', value: '17', delta: '▲ 4', positivo: true, sub: '3 en línea · 14 presenciales' },
  { label: 'Nuevos usuarios', value: '126', delta: '▲ 8.1%', positivo: true, sub: 'Este mes' },
  { label: 'Ventas (cursos + libros)', value: '342', delta: '▼ 2.3%', positivo: false, sub: '$9,180 en el periodo' },
];

export const revenueByMonth = [
  { mes: 'Ene', terapias: 62, academia: 38 },
  { mes: 'Feb', terapias: 70, academia: 44 },
  { mes: 'Mar', terapias: 58, academia: 50 },
  { mes: 'Abr', terapias: 75, academia: 55 },
  { mes: 'May', terapias: 82, academia: 60 },
  { mes: 'Jun', terapias: 78, academia: 66 },
  { mes: 'Jul', terapias: 90, academia: 72 },
  { mes: 'Ago', terapias: 96, academia: 80 },
];

export const activityByChannel = [
  { label: 'Terapias', pct: 46, color: '#5d83a7' },
  { label: 'Cursos', pct: 30, color: '#9580b9' },
  { label: 'Productos', pct: 24, color: '#d9a441' },
];

export const upcomingAppointments = [
  { hora: '09:00', turno: 'AM', paciente: 'Lucía González', iniciales: 'LG', detalle: 'Terapia individual · Dra. Ríos', estado: 'En línea' },
  { hora: '10:30', turno: 'AM', paciente: 'Marco Peña', iniciales: 'MP', detalle: 'Terapia de pareja · Lic. Duarte', estado: 'Sede Centro' },
  { hora: '12:00', turno: 'PM', paciente: 'Ana Torres', iniciales: 'AT', detalle: 'Evaluación inicial · Dra. Ríos', estado: 'En línea' },
  { hora: '04:15', turno: 'PM', paciente: 'Roberto Salas', iniciales: 'RS', detalle: 'Seguimiento · Lic. Duarte', estado: 'Sede Norte' },
];

export const recentSales = [
  { titulo: 'Curso: Manejo de ansiedad', quien: 'Lucía González · 10:42', monto: '+$79' },
  { titulo: 'Libro: Vínculos sanos (PDF)', quien: 'Marco Peña · 09:58', monto: '+$14' },
  { titulo: 'Sesión: Terapia individual', quien: 'Ana Torres · 09:30', monto: '+$60' },
  { titulo: 'Taller en vivo: Autoestima', quien: '+12 inscritos · 08:15', monto: '+$420' },
];

export const pendingPayments = [
  { nombre: 'Roberto Salas', detalle: 'Transferencia · por verificar', monto: '$120' },
  { nombre: 'Diana Cruz', detalle: 'Curso · pago en efectivo', monto: '$79' },
  { nombre: 'Grupo Bienestar S.A.', detalle: 'Factura · vence en 3 días', monto: '$860' },
];

export const overdueInstallments = [
  { nombre: 'Ana Torres', detalle: 'Cuota 2/4 · 6 días de atraso', monto: '$95' },
  { nombre: 'Marco Peña', detalle: 'Cuota 3/6 · 12 días de atraso', monto: '$130' },
  { nombre: 'Lucía González', detalle: 'Cuota 4/4 · 2 días de atraso', monto: '$95' },
];
