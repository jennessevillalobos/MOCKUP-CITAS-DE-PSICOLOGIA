import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, GraduationCap, Radio, Star, CreditCard, Bell } from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { INSTRUCTOR_NAV_LABELS, buildInstructorNav } from '@/components/site/instructorNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useInstructorNotifications } from '@/context/InstructorNotificationsContext';
import type { TipoNotifInstructor } from '@/data/notificacionesInstructorData';

const text = {
  es: {
    volverPortal: 'Volver al panel',
    titulo: 'Notificaciones', subtitulo: 'Novedades de tus citas, cursos y evaluaciones.',
    marcarTodo: 'Marcar todo como leído',
    hoy: 'Hoy', semana: 'Esta semana', anteriores: 'Anteriores',
    vacio: 'No tienes notificaciones.',
  },
  en: {
    volverPortal: 'Back to panel',
    titulo: 'Notifications', subtitulo: 'Updates on your appointments, courses and assessments.',
    marcarTodo: 'Mark all read',
    hoy: 'Today', semana: 'This week', anteriores: 'Earlier',
    vacio: 'You have no notifications.',
  },
} as const;

const tipoIcono: Record<TipoNotifInstructor, typeof CalendarDays> = {
  cita: CalendarDays,
  evaluacion: ClipboardCheck,
  curso: GraduationCap,
  vivo: Radio,
  reseña: Star,
  pago: CreditCard,
};

export default function InstructorNotificationsPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const navItems = buildInstructorNav(INSTRUCTOR_NAV_LABELS, ['notif'], ['constructor', 'citas', 'cursos', 'vivo', 'evaluaciones', 'notif', 'agenda', 'perfil']);

  const { notificaciones, marcarLeida, marcarTodasLeidas } = useInstructorNotifications();
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const hoy = notificaciones.filter((n) => n.grupo === 'hoy');
  const semana = notificaciones.filter((n) => n.grupo === 'semana');
  const anteriores = notificaciones.filter((n) => n.grupo === 'anteriores');

  function Grupo({ titulo, items }: { titulo: string; items: typeof notificaciones }) {
    if (!items.length) return null;
    return (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">{titulo}</p>
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = tipoIcono[n.tipo];
            return (
              <Link
                key={n.id}
                to={n.link}
                onClick={() => marcarLeida(n.id)}
                className={`flex gap-3 rounded-2xl border bg-white p-4 shadow-soft transition hover:bg-brand-50/60 ${
                  n.leida ? 'border-brand-100' : 'border-brand-300'
                }`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{n.texto[language]}</p>
                  <p className="text-xs text-ink/40">{n.tiempo[language]}</p>
                </div>
                {!n.leida && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="notif"
      onNavigate={() => {}}
      roleBadge={{ es: 'Instructor', en: 'Instructor' }}
      profileTo="/instructor/perfil"
      backTo="/instructor"
      backLabel={{ es: t.volverPortal, en: t.volverPortal }}
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          {t.titulo}
          {noLeidas > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">{noLeidas}</span>}
        </h1>
        <button onClick={marcarTodasLeidas} className="text-sm font-semibold text-brand-600 hover:underline">{t.marcarTodo}</button>
      </div>
      <p className="-mt-4 text-sm text-ink/50">{t.subtitulo}</p>

      {notificaciones.length === 0 ? (
        <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center text-sm text-ink/45">
          <Bell size={20} className="mx-auto mb-2 text-ink/30" />
          {t.vacio}
        </div>
      ) : (
        <div className="space-y-6">
          <Grupo titulo={t.hoy} items={hoy} />
          <Grupo titulo={t.semana} items={semana} />
          <Grupo titulo={t.anteriores} items={anteriores} />
        </div>
      )}
    </PortalLayout>
  );
}
