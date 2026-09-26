import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ClipboardCheck, Radio, Trophy, CreditCard, Bell, CalendarDays, Star } from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { AULA_NAV_LABELS, buildAulaVirtualNav } from '@/components/site/aulaVirtualNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { NOTIFICACIONES_COMPLETAS } from '@/data/notificationsData';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { cargarNotificaciones, marcarNotificacionesLeidas } from '@/lib/api/notificaciones';

const text = {
  es: {
    volverPortal: 'Volver al portal',
    titulo: 'Notificaciones', subtitulo: 'Novedades de tus cursos, clases en vivo y evaluaciones.',
    marcarTodo: 'Marcar todo como leído',
    hoy: 'Hoy', semana: 'Esta semana', anteriores: 'Anteriores',
    vacio: 'No tienes notificaciones.',
  },
  en: {
    volverPortal: 'Back to portal',
    titulo: 'Notifications', subtitulo: 'Updates on your courses, live classes and quizzes.',
    marcarTodo: 'Mark all read',
    hoy: 'Today', semana: 'This week', anteriores: 'Earlier',
    vacio: 'You have no notifications.',
  },
} as const;

// Tipos del demo (cuota, certificado) y de la base (cita, curso, pago, reseña).
const tipoIcono: Record<string, typeof GraduationCap> = {
  vivo: Radio,
  evaluacion: ClipboardCheck,
  cuota: CreditCard,
  pago: CreditCard,
  certificado: Trophy,
  cita: CalendarDays,
  curso: GraduationCap,
  'reseña': Star,
};

interface NotifVista {
  id?: string;
  tipo: string;
  grupo: 'hoy' | 'semana' | 'anteriores';
  texto: { es: string; en: string };
  tiempo: { es: string; en: string };
  leida: boolean;
  link: string;
}

export default function NotificationsPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const navItems = buildAulaVirtualNav(AULA_NAV_LABELS[language], ['notif']);

  const { esSesionReal } = useSiteAuth();
  const [notifs, setNotifs] = useState<NotifVista[]>(() => (esSesionReal ? [] : NOTIFICACIONES_COMPLETAS.map((n) => ({ ...n }))));

  // Con sesión real: notificaciones de la base (las generan los triggers).
  useEffect(() => {
    if (!esSesionReal) return;
    void cargarNotificaciones().then((res) => { if (!res.error) setNotifs(res.data); });
  }, [esSesionReal]);

  function marcarLeida(index: number) {
    const n = notifs[index];
    if (esSesionReal && n?.id && !n.leida) void marcarNotificacionesLeidas([n.id]);
    setNotifs((arr) => arr.map((x, i) => (i === index ? { ...x, leida: true } : x)));
  }

  function marcarTodasLeidas() {
    if (esSesionReal && notifs.some((n) => !n.leida)) void marcarNotificacionesLeidas(null);
    setNotifs((arr) => arr.map((n) => ({ ...n, leida: true })));
  }

  const hoy = notifs.map((n, i) => [n, i] as const).filter(([n]) => n.grupo === 'hoy');
  const semana = notifs.map((n, i) => [n, i] as const).filter(([n]) => n.grupo === 'semana');
  const anteriores = notifs.map((n, i) => [n, i] as const).filter(([n]) => n.grupo === 'anteriores');

  function Grupo({ titulo, items }: { titulo: string; items: ReadonlyArray<readonly [(typeof notifs)[number], number]> }) {
    if (!items.length) return null;
    return (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">{titulo}</p>
        <div className="space-y-2">
          {items.map(([n, i]) => {
            const Icon = tipoIcono[n.tipo] ?? Bell;
            return (
              <Link
                key={n.id ?? i}
                to={n.link || '/aula-virtual'}
                onClick={() => marcarLeida(i)}
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
      roleBadge={{ es: 'Aula Virtual', en: 'Classroom' }}
      backTo="/aula-virtual"
      backLabel={{ es: text.es.volverPortal, en: text.en.volverPortal }}
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">{t.titulo}</h1>
        <button onClick={marcarTodasLeidas} className="text-sm font-semibold text-brand-600 hover:underline">{t.marcarTodo}</button>
      </div>
      <p className="-mt-4 text-sm text-ink/50">{t.subtitulo}</p>

      {notifs.length === 0 ? (
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
