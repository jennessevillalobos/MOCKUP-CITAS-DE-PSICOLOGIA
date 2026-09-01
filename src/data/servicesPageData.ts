import { Heart, Users, Baby, Target, UsersRound, Moon, Bird, Compass, Puzzle, type LucideIcon } from 'lucide-react';

export type CategoriaServicio = 'individual' | 'pareja' | 'infantil' | 'orientacion';

export interface ServicioPublico {
  key: string;
  categoria: CategoriaServicio;
  icon: LucideIcon;
  colorClases: string;
  imagen: string;
  imagenPosicion?: string;
  titulo: { es: string; en: string };
  descripcion: { es: string; en: string };
  duracionMin: number;
  precio: number;
  modalidad: { es: string; en: string };
}

export const SERVICIOS_PUBLICOS: ServicioPublico[] = [
  {
    key: 'individual', categoria: 'individual', icon: Heart, colorClases: 'bg-brand-50 text-brand-600',
    imagen: 'https://images.pexels.com/photos/7176288/pexels-photo-7176288.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200',
    titulo: { es: 'Terapia individual', en: 'Individual therapy' },
    descripcion: { es: 'Sesiones personalizadas para ansiedad, estrés y crecimiento personal.', en: 'Personalized sessions for anxiety, stress and personal growth.' },
    duracionMin: 50, precio: 50, modalidad: { es: 'En línea / Presencial', en: 'Online / In-person' },
  },
  {
    key: 'pareja', categoria: 'pareja', icon: Users, colorClases: 'bg-lilac-50 text-lilac-600',
    imagen: 'https://images.pexels.com/photos/7447253/pexels-photo-7447253.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200',
    titulo: { es: 'Terapia de pareja', en: 'Couples therapy' },
    descripcion: { es: 'Herramientas para mejorar la comunicación y reconstruir vínculos.', en: 'Tools to improve communication and rebuild bonds.' },
    duracionMin: 75, precio: 85, modalidad: { es: 'Presencial', en: 'In-person' },
  },
  {
    key: 'infantil', categoria: 'infantil', icon: Baby, colorClases: 'bg-emerald-50 text-emerald-600',
    imagen: 'https://images.pexels.com/photos/7447264/pexels-photo-7447264.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200',
    titulo: { es: 'Terapia infantil', en: 'Child therapy' },
    descripcion: { es: 'Apoyo emocional para niñas y niños con enfoque lúdico y cálido.', en: 'Emotional support for children with a playful, warm approach.' },
    duracionMin: 45, precio: 55, modalidad: { es: 'Presencial', en: 'In-person' },
  },
  {
    key: 'orientacion', categoria: 'orientacion', icon: Target, colorClases: 'bg-brand-50 text-brand-600',
    imagen: 'https://images.pexels.com/photos/36729384/pexels-photo-36729384.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200',
    titulo: { es: 'Orientación vocacional', en: 'Career guidance' },
    descripcion: { es: 'Descubre tu camino profesional con evaluación y acompañamiento.', en: 'Discover your career path with assessment and guidance.' },
    duracionMin: 60, precio: 50, modalidad: { es: 'En línea', en: 'Online' },
  },
  {
    key: 'familiar', categoria: 'pareja', icon: UsersRound, colorClases: 'bg-lilac-50 text-lilac-600',
    imagen: 'https://images.pexels.com/photos/5336930/pexels-photo-5336930.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200',
    imagenPosicion: 'object-top',
    titulo: { es: 'Terapia familiar', en: 'Family therapy' },
    descripcion: { es: 'Sesiones con el sistema familiar para resolver conflictos y fortalecer lazos.', en: 'Sessions with the family system to resolve conflict and strengthen bonds.' },
    duracionMin: 90, precio: 110, modalidad: { es: 'Presencial', en: 'In-person' },
  },
  {
    key: 'ansiedad', categoria: 'individual', icon: Moon, colorClases: 'bg-brand-50 text-brand-600',
    imagen: 'https://images.pexels.com/photos/5699455/pexels-photo-5699455.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200',
    titulo: { es: 'Manejo de ansiedad', en: 'Anxiety management' },
    descripcion: { es: 'Programa enfocado en técnicas para reducir la ansiedad y el estrés.', en: 'Program focused on techniques to reduce anxiety and stress.' },
    duracionMin: 60, precio: 65, modalidad: { es: 'En línea / Presencial', en: 'Online / In-person' },
  },
  {
    key: 'duelo', categoria: 'individual', icon: Bird, colorClases: 'bg-brand-50 text-brand-600',
    imagen: 'https://images.pexels.com/photos/29060673/pexels-photo-29060673.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200',
    titulo: { es: 'Acompañamiento en duelo', en: 'Grief support' },
    descripcion: { es: 'Espacio seguro para transitar la pérdida a tu ritmo.', en: 'A safe space to move through loss at your own pace.' },
    duracionMin: 60, precio: 60, modalidad: { es: 'En línea', en: 'Online' },
  },
  {
    key: 'evaluacion', categoria: 'orientacion', icon: Compass, colorClases: 'bg-brand-50 text-brand-600',
    imagen: 'https://images.pexels.com/photos/7176036/pexels-photo-7176036.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200',
    titulo: { es: 'Evaluación psicológica', en: 'Psychological assessment' },
    descripcion: { es: 'Valoración inicial con informe y plan de trabajo personalizado.', en: 'Initial assessment with report and a personalized plan.' },
    duracionMin: 50, precio: 45, modalidad: { es: 'En línea', en: 'Online' },
  },
  {
    key: 'adolescentes', categoria: 'infantil', icon: Puzzle, colorClases: 'bg-emerald-50 text-emerald-600',
    imagen: 'https://images.pexels.com/photos/36729377/pexels-photo-36729377.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200',
    titulo: { es: 'Terapia para adolescentes', en: 'Teen therapy' },
    descripcion: { es: 'Acompañamiento para adolescentes en etapas de cambio.', en: 'Support for teenagers through stages of change.' },
    duracionMin: 50, precio: 58, modalidad: { es: 'En línea / Presencial', en: 'Online / In-person' },
  },
];
