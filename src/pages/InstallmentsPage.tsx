import { Lock, Check, AlertTriangle, Circle } from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { AULA_NAV_LABELS, buildAulaVirtualNav } from '@/components/site/aulaVirtualNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { PLAN_CUOTAS, CUOTAS } from '@/data/installmentsData';

const text = {
  es: {
    volverPortal: 'Volver al portal',
    titulo: 'Mis cuotas',
    subtitulo: (curso: string, n: number) => `Curso: ${curso} · Plan de ${n} cuotas`,
    bloqueoTitulo: 'Acceso bloqueado por cuota vencida',
    bloqueoDetalle: 'Tienes 1 cuota vencida. Paga para reactivar el acceso al contenido del curso.',
    pagarVencida: 'Pagar cuota vencida',
    totalPlan: 'Total plan', pagado: 'Pagado', vencido: 'Vencido', porVencer: 'Por vencer',
    calendario: 'Calendario de cuotas',
    cuota: 'Cuota', de: 'de',
    vencia: 'Vencía', vence: 'Vence',
    chipPagada: 'Pagada', chipVencida: 'Vencida', chipPendiente: 'Pendiente',
    pagar: 'Pagar', pagarAntes: 'Pagar antes',
  },
  en: {
    volverPortal: 'Back to portal',
    titulo: 'My installments',
    subtitulo: (curso: string, n: number) => `Course: ${curso} · ${n}-installment plan`,
    bloqueoTitulo: 'Access locked due to overdue installment',
    bloqueoDetalle: 'You have 1 overdue installment. Pay to reactivate access to the course content.',
    pagarVencida: 'Pay overdue',
    totalPlan: 'Plan total', pagado: 'Paid', vencido: 'Overdue', porVencer: 'Upcoming',
    calendario: 'Installment schedule',
    cuota: 'Installment', de: 'of',
    vencia: 'Due', vence: 'Due',
    chipPagada: 'Paid', chipVencida: 'Overdue', chipPendiente: 'Pending',
    pagar: 'Pay', pagarAntes: 'Pay early',
  },
} as const;

const estadoIcono = { pagada: Check, vencida: AlertTriangle, pendiente: Circle } as const;
const estadoIconoCls = {
  pagada: 'bg-emerald-50 text-emerald-600',
  vencida: 'bg-rose-50 text-rose-600',
  pendiente: 'bg-amber-50 text-amber-600',
} as const;
const estadoChipCls = {
  pagada: 'bg-emerald-50 text-emerald-700',
  vencida: 'bg-rose-50 text-rose-600',
  pendiente: 'bg-amber-50 text-amber-700',
} as const;

export default function InstallmentsPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const navItems = buildAulaVirtualNav(AULA_NAV_LABELS[language], ['pagos']);

  const hayVencida = CUOTAS.some((c) => c.estado === 'vencida');
  const pctPagado = Math.round((PLAN_CUOTAS.pagado / PLAN_CUOTAS.totalPlan) * 100);

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="pagos"
      onNavigate={() => {}}
      roleBadge={{ es: 'Aula Virtual', en: 'Classroom' }}
      backTo="/aula-virtual"
      backLabel={{ es: text.es.volverPortal, en: text.en.volverPortal }}
    >
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.titulo}</h1>
        <p className="text-sm text-ink/50">{t.subtitulo(PLAN_CUOTAS.curso[language], PLAN_CUOTAS.totalCuotas)}</p>
      </div>

      {hayVencida && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center">
          <Lock size={22} className="shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-700">{t.bloqueoTitulo}</p>
            <p className="text-xs text-ink/50">{t.bloqueoDetalle}</p>
          </div>
          <button className="shrink-0 whitespace-nowrap rounded-full bg-brand-gradient px-5 py-2.5 text-center text-sm font-semibold text-white hover:opacity-90">
            {t.pagarVencida}
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.totalPlan}</p>
          <p className="font-display text-lg font-semibold text-ink">USD ${PLAN_CUOTAS.totalPlan}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.pagado}</p>
          <p className="font-display text-lg font-semibold text-emerald-600">USD ${PLAN_CUOTAS.pagado}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.vencido}</p>
          <p className="font-display text-lg font-semibold text-rose-600">USD ${PLAN_CUOTAS.vencido}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.porVencer}</p>
          <p className="font-display text-lg font-semibold text-amber-600">USD ${PLAN_CUOTAS.porVencer}</p>
        </div>
      </section>

      <div className="h-2 overflow-hidden rounded-full bg-brand-50">
        <div className="h-2 rounded-full bg-brand-gradient" style={{ width: `${pctPagado}%` }} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t.calendario}</h2>
        <div className="space-y-3">
          {CUOTAS.map((c) => {
            const Icon = estadoIcono[c.estado];
            return (
              <div
                key={c.numero}
                className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${
                  c.estado === 'vencida' ? 'border-rose-200 bg-rose-50/40' : 'border-brand-100 bg-white'
                }`}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${estadoIconoCls[c.estado]}`}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{t.cuota} {c.numero} {t.de} {PLAN_CUOTAS.totalCuotas}</p>
                  <p className={`text-xs ${c.estado === 'vencida' ? 'text-rose-600' : 'text-ink/45'}`}>
                    {c.estado === 'pagada' ? t.vencia : t.vence} {c.vence[language]} · {c.detalle[language]}
                  </p>
                </div>
                <span className="font-display font-semibold text-ink">USD ${c.monto}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estadoChipCls[c.estado]}`}>
                    {c.estado === 'pagada' ? t.chipPagada : c.estado === 'vencida' ? t.chipVencida : t.chipPendiente}
                  </span>
                  {c.estado === 'vencida' && (
                    <button className="rounded-full bg-brand-gradient px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90">{t.pagar}</button>
                  )}
                  {c.estado === 'pendiente' && (
                    <button className="rounded-full border border-brand-200 px-4 py-1.5 text-xs font-semibold text-ink hover:bg-brand-50">{t.pagarAntes}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PortalLayout>
  );
}
