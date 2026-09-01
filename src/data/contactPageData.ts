export interface Sede {
  key: string;
  nombre: string;
  direccion: { es: string; en: string };
}

export const SEDES: Sede[] = [
  { key: 'caracas', nombre: 'Sede Caracas', direccion: { es: 'Av. Principal, Torre A, Piso 5', en: 'Av. Principal, Torre A, 5th floor' } },
  { key: 'valencia', nombre: 'Sede Valencia', direccion: { es: 'C.C. Bienestar, Local 12', en: 'C.C. Bienestar, Unit 12' } },
];

export interface FaqItem {
  pregunta: { es: string; en: string };
  respuesta: { es: string; en: string };
}

export interface FaqCategoria {
  key: string;
  nombre: { es: string; en: string };
  preguntas: FaqItem[];
}

export const FAQ_CATEGORIAS: FaqCategoria[] = [
  {
    key: 'citas',
    nombre: { es: 'Citas', en: 'Appointments' },
    preguntas: [
      {
        pregunta: { es: '¿Cómo agendo una cita?', en: 'How do I book an appointment?' },
        respuesta: { es: 'Desde el botón "Agendar cita": eliges servicio, profesional, fecha y forma de pago.', en: 'Use the "Book" button: choose service, therapist, date and payment method.' },
      },
      {
        pregunta: { es: '¿Puedo reprogramar o cancelar?', en: 'Can I reschedule or cancel?' },
        respuesta: { es: 'Sí, gratis hasta 24h antes desde tu portal del paciente.', en: 'Yes, free of charge up to 24h before, from your patient portal.' },
      },
    ],
  },
  {
    key: 'pagos',
    nombre: { es: 'Pagos', en: 'Payments' },
    preguntas: [
      {
        pregunta: { es: '¿Qué métodos de pago aceptan?', en: 'What payment methods do you accept?' },
        respuesta: { es: 'Tarjeta, PayPal y pagos manuales (transferencia, pago móvil, efectivo), en varias monedas.', en: 'Card, PayPal and manual payments (transfer, mobile payment, cash), in several currencies.' },
      },
      {
        pregunta: { es: '¿Puedo pagar en cuotas?', en: 'Can I pay in installments?' },
        respuesta: { es: 'Sí, en citas (abono + saldo) y en cursos (planes de pago y cuotas).', en: 'Yes, for sessions (deposit + balance) and courses (payment plans and installments).' },
      },
    ],
  },
  {
    key: 'cursos',
    nombre: { es: 'Cursos', en: 'Courses' },
    preguntas: [
      {
        pregunta: { es: '¿Los cursos dan certificado?', en: 'Do courses include a certificate?' },
        respuesta: { es: 'Sí, al completar el curso y aprobar las evaluaciones recibes un certificado descargable.', en: 'Yes, on completing the course and passing the assessments you get a downloadable certificate.' },
      },
      {
        pregunta: { es: '¿Por cuánto tiempo tengo acceso?', en: 'How long do I have access?' },
        respuesta: { es: 'Acceso de por vida al contenido comprado, desde tu aula virtual.', en: 'Lifetime access to purchased content, from your virtual classroom.' },
      },
    ],
  },
];
