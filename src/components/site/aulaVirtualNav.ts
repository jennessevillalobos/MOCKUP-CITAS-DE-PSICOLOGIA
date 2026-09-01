// Construye el menú lateral compartido por todas las páginas del Aula
// Virtual (Dashboard, Clases, Evaluaciones, Calificaciones, Progreso, Pagos
// y cuotas, Videos/Libros comprados, Clases en vivo, Notificaciones).
// Centralizar esto evita que cada página nueva tenga que repetir la lista
// completa de rutas/íconos y olvide habilitar un ítem que ya tiene página
// propia en otra sección.
import {
  LayoutDashboard, PlayCircle, ClipboardCheck, Trophy, TrendingUp, CreditCard,
  Video, BookOpen, Radio, Bell, type LucideIcon,
} from 'lucide-react';
import type { PortalNavItem } from '@/components/site/PortalLayout';

export interface AulaNavLabels {
  clases: string;
  evaluaciones: string;
  calificaciones: string;
  progreso: string;
  pagosCuotas: string;
  videosComprados: string;
  librosComprados: string;
  clasesEnVivo: string;
  notificaciones: string;
}

export const AULA_NAV_LABELS: { es: AulaNavLabels; en: AulaNavLabels } = {
  es: {
    clases: 'Clases', evaluaciones: 'Evaluaciones', calificaciones: 'Calificaciones', progreso: 'Progreso',
    pagosCuotas: 'Pagos y cuotas', videosComprados: 'Videos comprados', librosComprados: 'Libros comprados',
    clasesEnVivo: 'Clases en vivo', notificaciones: 'Notificaciones',
  },
  en: {
    clases: 'Classes', evaluaciones: 'Assessments', calificaciones: 'Grades', progreso: 'Progress',
    pagosCuotas: 'Payments & installments', videosComprados: 'My videos', librosComprados: 'My books',
    clasesEnVivo: 'Live classes', notificaciones: 'Notifications',
  },
};

// Ruta de destino de cada sección ya construida.
const ROUTES: Partial<Record<string, string>> = {
  dash: '/aula-virtual',
  clases: '/aula-virtual/clase',
  evaluaciones: '/aula-virtual/evaluacion',
  calificaciones: '/aula-virtual/calificaciones',
  progreso: '/aula-virtual/progreso',
  pagos: '/aula-virtual/pagos',
  videos: '/aula-virtual/biblioteca',
  libros: '/aula-virtual/biblioteca',
  vivo: '/aula-virtual/vivo',
  notif: '/aula-virtual/notificaciones',
};

interface NavDef {
  key: string;
  label: string;
  icon: LucideIcon;
  disponible: boolean;
}

/**
 * @param t Textos de las etiquetas del menú, ya resueltos al idioma activo.
 * @param currentKeys Claves de la(s) sección(es) que representa la página
 *   actual — no reciben `to` (así el clic no navega, y en páginas como la
 *   Biblioteca que sirve dos claves a la vez, ambas quedan "actuales").
 */
export function buildAulaVirtualNav(t: AulaNavLabels, currentKeys: string[]): PortalNavItem[] {
  const items: NavDef[] = [
    { key: 'dash', label: 'Dashboard', icon: LayoutDashboard, disponible: true },
    { key: 'clases', label: t.clases, icon: PlayCircle, disponible: true },
    { key: 'evaluaciones', label: t.evaluaciones, icon: ClipboardCheck, disponible: true },
    { key: 'calificaciones', label: t.calificaciones, icon: Trophy, disponible: true },
    { key: 'progreso', label: t.progreso, icon: TrendingUp, disponible: true },
    { key: 'pagos', label: t.pagosCuotas, icon: CreditCard, disponible: true },
    { key: 'videos', label: t.videosComprados, icon: Video, disponible: true },
    { key: 'libros', label: t.librosComprados, icon: BookOpen, disponible: true },
    { key: 'vivo', label: t.clasesEnVivo, icon: Radio, disponible: true },
    { key: 'notif', label: t.notificaciones, icon: Bell, disponible: true },
  ];

  return items.map((item) => ({
    key: item.key,
    label: { es: item.label, en: item.label },
    icon: item.icon,
    disponible: item.disponible,
    to: item.disponible && !currentKeys.includes(item.key) ? ROUTES[item.key] : undefined,
  }));
}
