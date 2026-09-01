import {
  LayoutDashboard, CalendarDays, GraduationCap, Wrench, ClipboardCheck, CalendarClock, Radio, Bell, UserCog, type LucideIcon,
} from 'lucide-react';
import type { PortalNavItem } from '@/components/site/PortalLayout';

// Centraliza las rutas/íconos/labels del panel del instructor, igual que
// aulaVirtualNav.ts para el Aula Virtual del paciente — así ninguna página
// nueva olvida habilitar un enlace que otra ya activó.
export interface InstructorNavLabels {
  dashboard: string;
  misCitas: string;
  misCursos: string;
  constructor: string;
  evaluaciones: string;
  agenda: string;
  clasesEnVivo: string;
  notificaciones: string;
  miPerfil: string;
}

export const INSTRUCTOR_NAV_LABELS: { es: InstructorNavLabels; en: InstructorNavLabels } = {
  es: {
    dashboard: 'Panel',
    misCitas: 'Mis citas', misCursos: 'Mis cursos', constructor: 'Constructor de cursos', evaluaciones: 'Evaluaciones',
    agenda: 'Agenda / Disponibilidad', clasesEnVivo: 'Clases en vivo', notificaciones: 'Notificaciones', miPerfil: 'Mi perfil',
  },
  en: {
    dashboard: 'Dashboard',
    misCitas: 'My appointments', misCursos: 'My courses', constructor: 'Course builder', evaluaciones: 'Assessments',
    agenda: 'Schedule / Availability', clasesEnVivo: 'Live classes', notificaciones: 'Notifications', miPerfil: 'My profile',
  },
};

const ROUTES: Partial<Record<string, string>> = {
  dash: '/instructor',
  citas: '/instructor/citas',
  cursos: '/instructor/cursos',
  constructor: '/instructor/constructor',
  evaluaciones: '/instructor/evaluaciones',
  agenda: '/instructor/agenda',
  vivo: '/instructor/vivo',
  notif: '/instructor/notificaciones',
  perfil: '/instructor/perfil',
};

/**
 * `disponibles` lista las claves de secciones ya construidas. El resto se
 * muestra deshabilitada con la etiqueta "Pronto" hasta que se construyan
 * en un turno futuro (igual que se hizo con el Aula Virtual). "Mis citas"
 * va primero en el menú (después del Dashboard), a pedido explícito del
 * usuario — es la sección más importante del día a día del profesional.
 * "Mi perfil" va al final, después de Notificaciones, igual que en el
 * Aula Virtual del paciente.
 */
export function buildInstructorNav(labels: { es: InstructorNavLabels; en: InstructorNavLabels }, currentKeys: string[], disponibles: string[] = []): PortalNavItem[] {
  const items: Array<{ key: string; label: keyof InstructorNavLabels; icon: LucideIcon; disponible: boolean }> = [
    { key: 'dash', label: 'dashboard', icon: LayoutDashboard, disponible: true },
    { key: 'citas', label: 'misCitas', icon: CalendarDays, disponible: disponibles.includes('citas') },
    { key: 'cursos', label: 'misCursos', icon: GraduationCap, disponible: disponibles.includes('cursos') },
    { key: 'constructor', label: 'constructor', icon: Wrench, disponible: disponibles.includes('constructor') },
    { key: 'evaluaciones', label: 'evaluaciones', icon: ClipboardCheck, disponible: disponibles.includes('evaluaciones') },
    { key: 'agenda', label: 'agenda', icon: CalendarClock, disponible: disponibles.includes('agenda') },
    { key: 'vivo', label: 'clasesEnVivo', icon: Radio, disponible: disponibles.includes('vivo') },
    { key: 'notif', label: 'notificaciones', icon: Bell, disponible: disponibles.includes('notif') },
    { key: 'perfil', label: 'miPerfil', icon: UserCog, disponible: disponibles.includes('perfil') },
  ];
  return items.map((item) => ({
    key: item.key,
    label: { es: labels.es[item.label], en: labels.en[item.label] },
    icon: item.icon,
    disponible: item.disponible,
    to: item.disponible && !currentKeys.includes(item.key) ? ROUTES[item.key] : undefined,
  }));
}
