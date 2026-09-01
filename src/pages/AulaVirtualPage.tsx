import { Link } from 'react-router-dom';
import { ClipboardCheck, Trophy, Radio, Award } from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { AULA_NAV_LABELS, buildAulaVirtualNav } from '@/components/site/aulaVirtualNav';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { CURSOS_INSCRITOS, CLASES_EN_VIVO_AULA, CUOTA_PENDIENTE, NOTIFICACIONES_AULA } from '@/data/aulaVirtualData';

const text = {
  es: {
    clases: 'Clases', evaluaciones: 'Evaluaciones', calificaciones: 'Calificaciones', progreso: 'Progreso',
    pagosCuotas: 'Pagos y cuotas', videosComprados: 'Videos comprados', librosComprados: 'Libros comprados',
    clasesEnVivo: 'Clases en vivo', notificaciones: 'Notificaciones',
    volverPortal: 'Volver al portal', hola: '¡Hola de nuevo', sigue: 'Sigue avanzando en tu bienestar. Vas muy bien.',
    progresoGeneral: 'Progreso general',
    cursosInscritos: 'Cursos inscritos', clasesCompletadas: 'Clases completadas', certificados: 'Certificados', cuotasPorVencer: 'Cuotas por vencer',
    continuaAprendiendo: 'Continúa aprendiendo', verTodos: 'Ver todos', leccion: 'Lección', continuar: 'Continuar', certificado: 'Certificado',
    proximasClases: 'Próximas clases en vivo', hoy: 'Hoy', unirme: 'Unirme', recordarme: 'Recordarme',
    cuotasTitle: 'Cuotas por vencer', cuota: 'Cuota', de: 'de', vence: 'vence', pagarCuota: 'Pagar cuota',
    avisoCuota: 'Una cuota vencida puede bloquear el acceso al contenido.',
    exploraMas: 'Explora más cursos', verCatalogo: 'Ver catálogo',
    verTodasNotif: 'Ver todas',
  },
  en: {
    clases: 'Classes', evaluaciones: 'Assessments', calificaciones: 'Grades', progreso: 'Progress',
    pagosCuotas: 'Payments & installments', videosComprados: 'My videos', librosComprados: 'My books',
    clasesEnVivo: 'Live classes', notificaciones: 'Notifications',
    volverPortal: 'Back to portal', hola: 'Welcome back', sigue: "Keep growing your wellbeing. You're doing great.",
    progresoGeneral: 'Overall progress',
    cursosInscritos: 'Enrolled courses', clasesCompletadas: 'Lessons done', certificados: 'Certificates', cuotasPorVencer: 'Installments due',
    continuaAprendiendo: 'Keep learning', verTodos: 'View all', leccion: 'Lesson', continuar: 'Continue', certificado: 'Certificate',
    proximasClases: 'Upcoming live classes', hoy: 'Today', unirme: 'Join', recordarme: 'Remind me',
    cuotasTitle: 'Installments due', cuota: 'Installment', de: 'of', vence: 'due', pagarCuota: 'Pay installment',
    avisoCuota: 'An overdue installment may lock content access.',
    exploraMas: 'Explore more courses', verCatalogo: 'Catalog',
    verTodasNotif: 'All',
  },
} as const;

export default function AulaVirtualPage() {
  const { user } = useSiteAuth();
  const { language } = useSiteLanguage();
  const t = text[language];

  const navItems = buildAulaVirtualNav(AULA_NAV_LABELS[language], ['dash']);

  const primerNombre = (user?.nombre || '').trim().split(/\s+/)[0] || (language === 'es' ? 'Paciente' : 'Patient');
  const progresoPromedio = Math.round(CURSOS_INSCRITOS.reduce((acc, c) => acc + c.progreso, 0) / CURSOS_INSCRITOS.length);
  const clasesCompletadas = CURSOS_INSCRITOS.reduce((acc, c) => acc + c.leccionActual, 0);
  const certificados = CURSOS_INSCRITOS.filter((c) => c.completado).length;
  const circ = 2 * Math.PI * 16;

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="dash"
      onNavigate={() => {}}
      roleBadge={{ es: 'Aula Virtual', en: 'Classroom' }}
      backTo="/portal-paciente"
      backLabel={{ es: text.es.volverPortal, en: text.en.volverPortal }}
      sidebarExtra={
        <div className="rounded-2xl bg-white/10 p-4 text-white">
          <p className="mb-2 text-sm font-semibold">{t.exploraMas}</p>
          <Link to="/cursos" className="block rounded-full bg-white py-2 text-center text-sm font-semibold text-brand-800">
            {t.verCatalogo}
          </Link>
        </div>
      }
    >
      {/* Saludo + progreso */}
      <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-brand-gradient p-6 shadow-soft sm:flex-row sm:p-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">{t.hola}, {primerNombre}! 🌱</h1>
          <p className="mt-1 text-sm text-white/85">{t.sigue}</p>
        </div>
        <div className="shrink-0 text-center">
          <div className="relative h-24 w-24">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="16" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ - (circ * progresoPromedio) / 100}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display text-2xl font-semibold text-white">{progresoPromedio}%</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-white/85">{t.progresoGeneral}</p>
        </div>
      </div>

      {/* Métricas */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
          <p className="text-xs text-ink/50">{t.cursosInscritos}</p>
          <p className="font-display text-2xl font-semibold text-ink">{CURSOS_INSCRITOS.length}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
          <p className="text-xs text-ink/50">{t.clasesCompletadas}</p>
          <p className="font-display text-2xl font-semibold text-ink">{clasesCompletadas}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
          <p className="text-xs text-ink/50">{t.certificados}</p>
          <p className="font-display text-2xl font-semibold text-ink">{certificados}</p>
        </div>
        <Link to="/aula-virtual/pagos" className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft transition hover:border-brand-200">
          <p className="text-xs text-ink/50">{t.cuotasPorVencer}</p>
          <p className="font-display text-2xl font-semibold text-amber-600">1</p>
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">{t.continuaAprendiendo}</h2>
              <Link to="/cursos" className="text-sm font-semibold text-brand-600 hover:underline">{t.verTodos}</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {CURSOS_INSCRITOS.filter((c) => !c.completado).map((c) => (
                <article key={c.key} className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
                  <div className="relative">
                    <img src={c.image} alt={c.title[language]} className="h-28 w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-brand-700">{c.progreso}%</span>
                  </div>
                  <div className="p-4">
                    <h3 className="mb-1 text-sm font-semibold text-ink">{c.title[language]}</h3>
                    <p className="mb-2 text-xs text-ink/45">{c.instructor} · {t.leccion} {c.leccionActual}/{c.totalLecciones}</p>
                    <div className="mb-3 h-1.5 rounded-full bg-brand-50">
                      <div className="h-1.5 rounded-full bg-brand-gradient" style={{ width: `${c.progreso}%` }} />
                    </div>
                    <Link
                      to="/aula-virtual/clase"
                      className="block w-full rounded-full bg-brand-gradient py-2 text-center text-xs font-semibold text-white hover:opacity-90"
                    >
                      {t.continuar}
                    </Link>
                  </div>
                </article>
              ))}
              {CURSOS_INSCRITOS.filter((c) => c.completado).map((c) => (
                <article key={c.key} className="flex items-center gap-4 rounded-3xl border border-brand-100 bg-white p-4 shadow-soft sm:col-span-2">
                  <img src={c.image} alt={c.title[language]} className="h-16 w-24 shrink-0 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-ink">{c.title[language]}</h3>
                    <p className="mb-2 text-xs text-ink/45">{c.instructor} · 100% ✓</p>
                    <div className="h-1.5 rounded-full bg-brand-50"><div className="h-1.5 w-full rounded-full bg-emerald-500" /></div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700">
                    <Award size={14} />{t.certificado}
                  </span>
                </article>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">{t.proximasClases}</h2>
              <Link to="/aula-virtual/vivo" className="text-sm font-semibold text-brand-600 hover:underline">{t.verTodos}</Link>
            </div>
            <div className="space-y-3">
              {CLASES_EN_VIVO_AULA.map((c, i) => (
                <div key={i} className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-center leading-none ${c.esHoy ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700'}`}>
                    <span className="text-xs font-bold">{c.dia[language]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{c.titulo[language]}</p>
                    <p className="text-xs text-ink/45">{c.hora} · {c.profesional}{c.esHoy ? ` · ${language === 'es' ? 'en vivo' : 'live'}` : ''}</p>
                  </div>
                  {c.esHoy ? (
                    <>
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">● {t.hoy}</span>
                      <Link to="/aula-virtual/vivo" className="rounded-full bg-brand-gradient px-4 py-2 text-xs font-semibold text-white hover:opacity-90">{t.unirme}</Link>
                    </>
                  ) : (
                    <Link to="/aula-virtual/vivo" className="rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">{t.recordarme}</Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t.cuotasTitle}</h2>
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{CUOTA_PENDIENTE.curso[language]}</p>
                <span className="font-display font-semibold text-amber-700">USD ${CUOTA_PENDIENTE.monto}</span>
              </div>
              <p className="mb-3 text-xs text-ink/50">{t.cuota} {CUOTA_PENDIENTE.cuotaActual} {t.de} {CUOTA_PENDIENTE.cuotaTotal} · {t.vence} {CUOTA_PENDIENTE.vence[language]}</p>
              <Link to="/aula-virtual/pagos" className="block w-full rounded-full bg-brand-gradient py-2 text-center text-xs font-semibold text-white hover:opacity-90">
                {t.pagarCuota}
              </Link>
            </div>
            <p className="text-xs text-ink/45">⚠️ {t.avisoCuota}</p>
          </div>

          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">{t.notificaciones}</h2>
              <Link to="/aula-virtual/notificaciones" className="text-xs font-semibold text-brand-600 hover:underline">{t.verTodasNotif}</Link>
            </div>
            <div className="space-y-3 text-sm">
              {NOTIFICACIONES_AULA.map((n, i) => (
                <Link key={i} to="/aula-virtual/notificaciones" className="-m-1 flex gap-3 rounded-xl p-1 hover:bg-brand-50/60">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                    {n.icono === 'evaluacion' ? <ClipboardCheck size={14} /> : n.icono === 'vivo' ? <Radio size={14} /> : <Trophy size={14} />}
                  </span>
                  <div>
                    <p className="text-ink">{n.texto[language]}</p>
                    <p className="text-xs text-ink/40">{n.tiempo[language]}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PortalLayout>
  );
}
