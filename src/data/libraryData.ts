// Contenido de demostración para "Mi biblioteca" (videos y libros
// comprados) del Aula Virtual, basado en PsiqueAmor_16_Biblioteca.html.
export interface VideoComprado {
  key: string;
  titulo: { es: string; en: string };
  instructor: string;
  duracion: string;
  image: string;
  compra: { fecha: string; orden: string; precio: string; metodo: string };
}

export const VIDEOS_COMPRADOS: VideoComprado[] = [
  {
    key: 'mindfulness-20',
    titulo: { es: 'Mindfulness en 20 minutos', en: 'Mindfulness in 20 min' },
    instructor: 'Lic. Carlos Mora',
    duracion: '20:00',
    image: 'https://images.pexels.com/photos/8715971/pexels-photo-8715971.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
    compra: { fecha: '20 jul 2026', orden: '#PA-10231', precio: 'USD $9', metodo: 'PayPal' },
  },
  {
    key: 'rutina-dormir',
    titulo: { es: 'Rutina para dormir', en: 'Sleep routine' },
    instructor: 'Dra. Ana Rivas',
    duracion: '15:00',
    image: 'https://images.pexels.com/photos/9127682/pexels-photo-9127682.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
    compra: { fecha: '2 ago 2026', orden: '#PA-10256', precio: 'USD $9', metodo: 'Tarjeta' },
  },
  {
    key: 'estres-diario',
    titulo: { es: 'Manejar el estrés diario', en: 'Managing daily stress' },
    instructor: 'Dr. Miguel Torres',
    duracion: '18:00',
    image: 'https://images.pexels.com/photos/13849252/pexels-photo-13849252.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
    compra: { fecha: '10 ago 2026', orden: '#PA-10298', precio: 'USD $9', metodo: 'PayPal' },
  },
];

export interface LibroComprado {
  key: string;
  titulo: { es: string; en: string };
  autor: string;
  paginas: number;
  formato: string;
  image: string;
  compra: { fecha: string; orden: string; precio: string };
  capitulo: { titulo: string; parrafos: { es: string; en: string }[] };
}

export const LIBROS_COMPRADOS: LibroComprado[] = [
  {
    key: 'respira',
    titulo: { es: 'Respira: guía para la calma', en: 'Breathe: a guide to calm' },
    autor: 'Dra. Ana Rivas',
    paginas: 120,
    formato: 'PDF · EPUB',
    image: 'https://images.pexels.com/photos/8715971/pexels-photo-8715971.jpeg?auto=compress&cs=tinysrgb&h=520&w=390',
    compra: { fecha: '15 jul 2026', orden: '#PA-10245', precio: 'USD $12' },
    capitulo: {
      titulo: 'Capítulo 1 — Entender la ansiedad',
      parrafos: [
        {
          es: 'La ansiedad no es tu enemiga. Es una señal de tu cuerpo que, bien entendida, puede convertirse en una aliada. En este capítulo aprenderás a reconocer sus formas, a nombrar lo que sientes y a dar el primer paso hacia la calma.',
          en: 'Anxiety is not your enemy. It is a signal from your body that, once understood, can become an ally. In this chapter you will learn to recognize its forms, name what you feel, and take the first step toward calm.',
        },
        {
          es: 'Antes de continuar, respira. Inhala en cuatro tiempos, sostén cuatro, exhala en seis. Repite tres veces y observa cómo tu cuerpo empieza a soltar la tensión acumulada.',
          en: 'Before continuing, breathe. Inhale for four counts, hold for four, exhale for six. Repeat three times and notice how your body begins to release built-up tension.',
        },
        {
          es: 'Muchas personas creen que deben "eliminar" la ansiedad por completo. Sin embargo, el objetivo no es hacerla desaparecer, sino aprender a relacionarnos con ella de una forma más sana…',
          en: 'Many people believe they must "eliminate" anxiety completely. However, the goal is not to make it disappear, but to learn to relate to it in a healthier way…',
        },
      ],
    },
  },
  {
    key: 'vinculos-sanos',
    titulo: { es: 'Vínculos sanos', en: 'Healthy bonds' },
    autor: 'Dra. Lucía Peña',
    paginas: 96,
    formato: 'PDF',
    image: 'https://images.pexels.com/photos/9127682/pexels-photo-9127682.jpeg?auto=compress&cs=tinysrgb&h=520&w=390',
    compra: { fecha: '20 jun 2026', orden: '#PA-10198', precio: 'USD $10' },
    capitulo: {
      titulo: 'Capítulo 1 — Cómo se construye un vínculo sano',
      parrafos: [
        {
          es: 'Un vínculo sano se construye sobre tres pilares: comunicación honesta, límites claros y respeto mutuo. Ninguno de ellos aparece de un día para otro; se cultivan con la práctica.',
          en: 'A healthy bond is built on three pillars: honest communication, clear boundaries, and mutual respect. None of them appear overnight; they are cultivated with practice.',
        },
        {
          es: 'Reflexiona sobre tus relaciones actuales: ¿en cuáles te sientes escuchado? ¿en cuáles te cuesta poner límites? Este capítulo te acompaña a identificar patrones y a empezar a cambiarlos.',
          en: 'Reflect on your current relationships: in which do you feel heard? In which do you find it hard to set boundaries? This chapter helps you identify patterns and begin to change them.',
        },
      ],
    },
  },
];
