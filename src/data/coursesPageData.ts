export interface CursoPublico {
  key: string;
  title: { es: string; en: string };
  category: { es: string; en: string };
  description: { es: string; en: string };
  duration: { es: string; en: string };
  modality?: { es: string; en: string };
  instructor?: string;
  lessons?: number;
  price?: number;
  image: string;
}

// Los primeros 3 son los mismos cursos del Home, enriquecidos con profesor,
// número de clases y precio cuando el mockup traía esos datos para el mismo
// curso. Los siguientes 4 son cursos nuevos del mockup (con fotos de stock,
// ya que el mockup solo traía imágenes de relleno).
export const CURSOS_PUBLICOS: CursoPublico[] = [
  {
    key: 'manejo-ansiedad',
    title: { es: 'Manejo de la ansiedad', en: 'Managing anxiety' },
    category: { es: 'Curso práctico', en: 'Practical course' },
    description: { es: 'Entiende lo que sientes y encuentra recursos cotidianos.', en: 'Understand what you feel and find everyday tools.' },
    duration: { es: '4 semanas', en: '4 weeks' },
    modality: { es: 'A tu ritmo', en: 'At your own pace' },
    instructor: 'Dra. Ana Rivas',
    lessons: 12,
    price: 49,
    image: 'https://images.pexels.com/photos/8715971/pexels-photo-8715971.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1400',
  },
  {
    key: 'inteligencia-emocional',
    title: { es: 'Inteligencia emocional', en: 'Emotional intelligence' },
    category: { es: 'Bienestar', en: 'Wellbeing' },
    description: { es: 'Una mirada amable a tu mundo interno.', en: 'A gentle look at your inner world.' },
    duration: { es: '3 h', en: '3h' },
    modality: { es: 'Online', en: 'Online' },
    instructor: 'Lic. Carlos Mora',
    lessons: 8,
    price: 39,
    image: 'https://images.pexels.com/photos/13849252/pexels-photo-13849252.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1400',
  },
  {
    key: 'comunicacion-pareja',
    title: { es: 'Comunicación en pareja', en: 'Couples communication' },
    category: { es: 'Vínculos', en: 'Bonds' },
    description: { es: 'Hablar para encontrarse, no para ganar.', en: 'Speaking to connect, not to win.' },
    duration: { es: '2 h', en: '2h' },
    modality: { es: 'Online', en: 'Online' },
    image: 'https://images.pexels.com/photos/7447240/pexels-photo-7447240.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1400',
  },
  {
    key: 'crianza-consciente',
    title: { es: 'Crianza consciente', en: 'Mindful parenting' },
    category: { es: 'Familia', en: 'Family' },
    description: { es: 'Herramientas prácticas para acompañar a tus hijos con presencia y calma.', en: 'Practical tools to raise your children with presence and calm.' },
    duration: { es: '3.5 h', en: '3.5h' },
    instructor: 'Dra. Lucía Peña',
    lessons: 10,
    price: 59,
    image: 'https://images.pexels.com/photos/9127682/pexels-photo-9127682.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1400',
  },
  {
    key: 'autoestima-confianza',
    title: { es: 'Autoestima y confianza', en: 'Self-esteem & confidence' },
    category: { es: 'Bienestar', en: 'Wellbeing' },
    description: { es: 'Fortalece tu relación contigo mismo y gana seguridad en tu día a día.', en: 'Strengthen your relationship with yourself and gain everyday confidence.' },
    duration: { es: '3 h', en: '3h' },
    instructor: 'Lic. Sofía Núñez',
    lessons: 9,
    price: 45,
    image: 'https://images.pexels.com/photos/6954097/pexels-photo-6954097.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1400',
  },
  {
    key: 'mindfulness-dormir',
    title: { es: 'Mindfulness para dormir', en: 'Mindfulness for sleep' },
    category: { es: 'Bienestar', en: 'Wellbeing' },
    description: { es: 'Técnicas de mindfulness para calmar la mente antes de dormir.', en: 'Mindfulness techniques to quiet the mind before sleep.' },
    duration: { es: '2 h', en: '2h' },
    instructor: 'Dr. Miguel Torres',
    lessons: 6,
    price: 29,
    image: 'https://images.pexels.com/photos/6940880/pexels-photo-6940880.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1400',
  },
  {
    key: 'ansiedad-social',
    title: { es: 'Superar la ansiedad social', en: 'Overcoming social anxiety' },
    category: { es: 'Bienestar', en: 'Wellbeing' },
    description: { es: 'Estrategias prácticas para sentirte más cómodo en situaciones sociales.', en: 'Practical strategies to feel more comfortable in social situations.' },
    duration: { es: '4 h', en: '4h' },
    instructor: 'Dra. Ana Rivas',
    lessons: 11,
    price: 55,
    image: 'https://images.pexels.com/photos/6567345/pexels-photo-6567345.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1400',
  },
];
