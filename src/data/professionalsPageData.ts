export interface ProfesionalPublico {
  key: string;
  name: string;
  specialty: { es: string; en: string };
  description: { es: string; en: string };
  modality: { es: string; en: string };
  image: string;
}

// Los primeros 3 son el mismo equipo destacado en el Home (misma foto y datos).
// Los siguientes 3 vienen del mockup de Profesionales (los únicos con foto real,
// los otros 3 del mockup usaban imágenes de relleno y no se incluyeron).
export const PROFESIONALES_PUBLICOS: ProfesionalPublico[] = [
  {
    key: 'laura-mendez',
    name: 'Laura Méndez',
    specialty: { es: 'Psicología clínica', en: 'Clinical psychology' },
    description: { es: 'Un espacio para comprenderte con calma.', en: 'A space to understand yourself, calmly.' },
    modality: { es: 'Online y presencial', en: 'Online and in-person' },
    image: 'https://images.pexels.com/photos/4098357/pexels-photo-4098357.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800',
  },
  {
    key: 'valentina-rios',
    name: 'Valentina Ríos',
    specialty: { es: 'Parejas y vínculos', en: 'Couples & bonds' },
    description: { es: 'Conversaciones que abren nuevas posibilidades.', en: 'Conversations that open new possibilities.' },
    modality: { es: 'Online', en: 'Online' },
    image: 'https://images.pexels.com/photos/36439572/pexels-photo-36439572.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800',
  },
  {
    key: 'sofia-herrera',
    name: 'Sofía Herrera',
    specialty: { es: 'Bienestar emocional', en: 'Emotional wellbeing' },
    description: { es: 'Herramientas para volver a ti.', en: 'Tools to return to yourself.' },
    modality: { es: 'Presencial', en: 'In-person' },
    image: 'https://images.pexels.com/photos/3958409/pexels-photo-3958409.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800',
  },
  {
    key: 'ana-rivas',
    name: 'Dra. Ana Rivas',
    specialty: { es: 'Ansiedad y estrés', en: 'Anxiety & stress' },
    description: { es: 'Herramientas prácticas para manejar la ansiedad del día a día.', en: 'Practical tools to manage everyday anxiety.' },
    modality: { es: 'Online', en: 'Online' },
    image: 'https://images.pexels.com/photos/7579108/pexels-photo-7579108.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800',
  },
  {
    key: 'carlos-mora',
    name: 'Lic. Carlos Mora',
    specialty: { es: 'Terapia de pareja', en: 'Couples therapy' },
    description: { es: 'Acompañamiento para fortalecer la comunicación en pareja.', en: 'Support to strengthen communication as a couple.' },
    modality: { es: 'Online', en: 'Online' },
    image: 'https://images.pexels.com/photos/15960478/pexels-photo-15960478.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800',
  },
  {
    key: 'lucia-pena',
    name: 'Dra. Lucía Peña',
    specialty: { es: 'Terapia infantil', en: 'Child therapy' },
    description: { es: 'Un enfoque cálido y lúdico para el bienestar de niñas y niños.', en: "A warm, playful approach to children's wellbeing." },
    modality: { es: 'Presencial', en: 'In-person' },
    image: 'https://images.pexels.com/photos/7579119/pexels-photo-7579119.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800',
  },
];
