export const images = {
  hero: 'https://images.pexels.com/photos/3958417/pexels-photo-3958417.jpeg?auto=compress&cs=tinysrgb&h=1200&w=900',
  emotional: 'https://images.pexels.com/photos/16216651/pexels-photo-16216651.jpeg?auto=compress&cs=tinysrgb&h=1200&w=900',
  professionalOne: 'https://images.pexels.com/photos/4098357/pexels-photo-4098357.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800',
  professionalTwo: 'https://images.pexels.com/photos/36439572/pexels-photo-36439572.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800',
  professionalThree: 'https://images.pexels.com/photos/3958409/pexels-photo-3958409.jpeg?auto=compress&cs=tinysrgb&h=1000&w=800',
  video: 'https://images.pexels.com/photos/9159284/pexels-photo-9159284.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1400',
  courseOne: 'https://images.pexels.com/photos/8715971/pexels-photo-8715971.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1400',
  courseTwo: 'https://images.pexels.com/photos/13849252/pexels-photo-13849252.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1000',
  courseThree: 'https://images.pexels.com/photos/7447240/pexels-photo-7447240.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1000',
  cta: 'https://images.pexels.com/photos/8715586/pexels-photo-8715586.jpeg?auto=compress&cs=tinysrgb&h=1000&w=1000',
};

export const professionals = [
  { name: 'Laura Méndez', specialty: 'Psicología clínica', description: 'Un espacio para comprenderte con calma.', modality: 'Online y presencial', image: images.professionalOne },
  { name: 'Valentina Ríos', specialty: 'Parejas y vínculos', description: 'Conversaciones que abren nuevas posibilidades.', modality: 'Online', image: images.professionalTwo },
  { name: 'Sofía Herrera', specialty: 'Bienestar emocional', description: 'Herramientas para volver a ti.', modality: 'Presencial', image: images.professionalThree },
];

export const courses = [
  { title: 'Manejo de la ansiedad', category: 'CURSO PRÁCTICO', description: 'Entiende lo que sientes y encuentra recursos cotidianos.', duration: '4 semanas', modality: 'A tu ritmo', image: images.courseOne },
  { title: 'Inteligencia emocional', category: 'BIENESTAR', description: 'Una mirada amable a tu mundo interno.', duration: '3 h', modality: 'Online', image: images.courseTwo },
  { title: 'Comunicación en pareja', category: 'VÍNCULOS', description: 'Hablar para encontrarse, no para ganar.', duration: '2 h', modality: 'Online', image: images.courseThree },
];
