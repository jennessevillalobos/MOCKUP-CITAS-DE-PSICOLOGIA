import {
  LayoutDashboard,
  Users,
  HeartHandshake,
  UserRound,
  MapPin,
  CalendarDays,
  GraduationCap,
  ClipboardCheck,
  Radio,
  CreditCard,
  Coins,
  Package,
  Bell,
  BarChart3,
  Settings,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  // Módulos aún no construidos (fases siguientes del plan) — se muestran
  // deshabilitados con etiqueta "Próximamente" en vez de enlazar a una
  // página vacía.
  disponible: boolean;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    title: 'Principal',
    items: [{ label: 'Panel general', path: '/admin/dashboard', icon: LayoutDashboard, disponible: true }],
  },
  {
    title: 'Operación',
    items: [
      { label: 'Usuarios', path: '/admin/usuarios', icon: Users, disponible: true },
      { label: 'Servicios / Profesionales / Lugares', path: '/admin/servicios', icon: HeartHandshake, disponible: true },
      { label: 'Agenda / Citas', path: '/admin/agenda', icon: CalendarDays, disponible: true },
    ],
  },
  {
    title: 'Academia',
    items: [
      { label: 'Cursos', path: '/admin/cursos', icon: GraduationCap, disponible: true },
      { label: 'Evaluaciones', path: '/admin/evaluaciones', icon: ClipboardCheck, disponible: true },
      { label: 'Clases en vivo', path: '/admin/clases-en-vivo', icon: Radio, disponible: true },
    ],
  },
  {
    title: 'Comercio',
    items: [
      { label: 'Pagos', path: '/admin/pagos', icon: CreditCard, disponible: true },
      { label: 'Monedas / Tarifas', path: '/admin/finanzas', icon: Coins, disponible: true },
      { label: 'Productos digitales', path: '/admin/productos-digitales', icon: Package, disponible: true },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Notificaciones', path: '/admin/notificaciones', icon: Bell, disponible: true },
      { label: 'Reseñas', path: '/admin/reseñas', icon: MessageSquare, disponible: true },
      { label: 'Reportes', path: '/admin/reportes', icon: BarChart3, disponible: true },
      { label: 'Configuración', path: '/admin/configuracion', icon: Settings, disponible: true },
    ],
  },
];

// Íconos usados en las fichas rápidas del dashboard (fuera del menú).
export { UserRound, MapPin };
