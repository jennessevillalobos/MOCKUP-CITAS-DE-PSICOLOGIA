export type TipoNotificacion = 'Cita' | 'Pago' | 'Curso' | 'Sistema';
export type CanalNotificacion = 'Email' | 'SMS' | 'WhatsApp' | 'Push';

export interface NotificacionRecord {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

export const demoNotificaciones: NotificacionRecord[] = [
  { id: 'n1', tipo: 'Cita', titulo: 'Nueva cita agendada', mensaje: 'Lucía González agendó una cita para el 12 de agosto a las 09:00.', fecha: '2026-08-12 08:10', leida: false },
  { id: 'n2', tipo: 'Pago', titulo: 'Pago pendiente de revisión', mensaje: 'Roberto Salas reportó un pago de USD 120 por transferencia.', fecha: '2026-08-12 07:45', leida: false },
  { id: 'n3', tipo: 'Curso', titulo: 'Nueva inscripción', mensaje: 'Grupo Bienestar S.A. se inscribió en Liderazgo consciente.', fecha: '2026-08-11 18:20', leida: true },
  { id: 'n4', tipo: 'Sistema', titulo: 'Copia de seguridad completada', mensaje: 'La copia de seguridad automática se completó sin errores.', fecha: '2026-08-11 03:00', leida: true },
  { id: 'n5', tipo: 'Pago', titulo: 'Cuota vencida', mensaje: 'La cuota 2/4 de Diego Duarte venció el 20 de julio.', fecha: '2026-08-10 09:00', leida: false },
  { id: 'n6', tipo: 'Cita', titulo: 'Cita cancelada', mensaje: 'Diana Cruz canceló su cita del 11 de agosto.', fecha: '2026-08-10 08:00', leida: true },
];

export type Disparador =
  | 'Cita creada' | 'Cita por comenzar' | 'Pago recibido' | 'Pago vencido' | 'Curso completado' | 'Cuota por vencer';

export interface ReglaNotificacion {
  id: string;
  nombre: string;
  disparador: Disparador;
  canal: CanalNotificacion;
  plantillaId: string;
  activa: boolean;
}

export const demoReglasNotificacion: ReglaNotificacion[] = [
  { id: 'rn1', nombre: 'Recordatorio de cita 24h antes', disparador: 'Cita por comenzar', canal: 'Email', plantillaId: 'pl1', activa: true },
  { id: 'rn2', nombre: 'Confirmación de pago', disparador: 'Pago recibido', canal: 'WhatsApp', plantillaId: 'pl2', activa: true },
  { id: 'rn3', nombre: 'Aviso de cuota vencida', disparador: 'Pago vencido', canal: 'Email', plantillaId: 'pl3', activa: true },
  { id: 'rn4', nombre: 'Felicitación por curso completado', disparador: 'Curso completado', canal: 'Push', plantillaId: 'pl4', activa: false },
];

export interface PlantillaNotificacion {
  id: string;
  nombre: string;
  canales: CanalNotificacion[];
  variables: string[];
  es: { asunto: string; cuerpo: string };
  en: { asunto: string; cuerpo: string };
}

export const demoPlantillas: PlantillaNotificacion[] = [
  {
    id: 'pl1', nombre: 'Recordatorio de cita', canales: ['Email', 'SMS'], variables: ['{{nombre}}', '{{fecha}}', '{{hora}}', '{{profesional}}'],
    es: { asunto: 'Recordatorio: tu cita es mañana', cuerpo: 'Hola {{nombre}}, te recordamos tu cita el {{fecha}} a las {{hora}} con {{profesional}}.' },
    en: { asunto: 'Reminder: your appointment is tomorrow', cuerpo: 'Hi {{nombre}}, this is a reminder of your appointment on {{fecha}} at {{hora}} with {{profesional}}.' },
  },
  {
    id: 'pl2', nombre: 'Confirmación de pago', canales: ['Email', 'WhatsApp'], variables: ['{{nombre}}', '{{monto}}', '{{fecha}}'],
    es: { asunto: 'Pago confirmado', cuerpo: 'Hola {{nombre}}, confirmamos tu pago de {{monto}} realizado el {{fecha}}. ¡Gracias!' },
    en: { asunto: 'Payment confirmed', cuerpo: 'Hi {{nombre}}, we confirm your payment of {{monto}} made on {{fecha}}. Thank you!' },
  },
  {
    id: 'pl3', nombre: 'Cuota vencida', canales: ['Email'], variables: ['{{nombre}}', '{{monto}}', '{{fechaVencimiento}}'],
    es: { asunto: 'Tienes una cuota vencida', cuerpo: 'Hola {{nombre}}, tu cuota de {{monto}} venció el {{fechaVencimiento}}. Por favor regulariza tu pago.' },
    en: { asunto: 'You have an overdue installment', cuerpo: 'Hi {{nombre}}, your installment of {{monto}} was due on {{fechaVencimiento}}. Please settle your payment.' },
  },
  {
    id: 'pl4', nombre: 'Curso completado', canales: ['Push', 'Email'], variables: ['{{nombre}}', '{{curso}}'],
    es: { asunto: '¡Felicidades por completar el curso!', cuerpo: 'Hola {{nombre}}, completaste {{curso}}. ¡Sigue así!' },
    en: { asunto: 'Congratulations on completing the course!', cuerpo: 'Hi {{nombre}}, you completed {{curso}}. Keep it up!' },
  },
];

export interface IntegracionRecord {
  id: string;
  nombre: string;
  conectada: boolean;
  detalle: string;
}

export const demoIntegraciones: IntegracionRecord[] = [
  { id: 'gcal', nombre: 'Google Calendar', conectada: true, detalle: 'admin@psiqueamor.com' },
  { id: 'whatsapp', nombre: 'WhatsApp Business', conectada: false, detalle: '' },
  { id: 'smtp', nombre: 'SMTP personalizado', conectada: true, detalle: 'smtp.psiqueamor.com:587' },
];
