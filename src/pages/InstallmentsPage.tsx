import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Check, AlertTriangle, Circle } from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { AULA_NAV_LABELS, buildAulaVirtualNav } from '@/components/site/aulaVirtualNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { PLAN_CUOTAS, CUOTAS } from '@/data/installmentsData';
import { useSiteAuth } from '@/context/SiteAuthContext';
import PaymentCheckoutModal from '@/components/site/PaymentCheckoutModal';
import { cargarMisPagosCursos, type PagoCursoEstudiante } from '@/lib/api/cursosEstudiante';

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
    tituloReal: 'Pagos de mis cursos', subtituloReal: 'Lo pagado, lo que está en revisión y lo que falta en cada curso.',
    precio: 'Precio', enRevision: 'En revisión', porPagar: 'Por pagar', pagarSaldo: 'Pagar saldo',
    accesoActivo: 'Acceso activo', accesoPendiente: 'Acceso al completar el pago',
    sinPagos: 'Aún no tienes pagos de cursos.', verCatalogo: 'Ver cursos', cargando: 'Cargando tus pagos…',
    pagoAprobado: 'Aprobado', pagoPendiente: 'En revisión', pagoRechazado: 'Rechazado', ref: 'Ref.', motivo: 'Motivo',
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
    tituloReal: 'My course payments', subtituloReal: 'What you paid, what is under review and what is left for each course.',
    precio: 'Price', enRevision: 'Under review', porPagar: 'Left to pay', pagarSaldo: 'Pay balance',
    accesoActivo: 'Access active', accesoPendiente: 'Access once fully paid',
    sinPagos: 'You have no course payments yet.', verCatalogo: 'Browse courses', cargando: 'Loading your payments…',
    pagoAprobado: 'Approved', pagoPendiente: 'Under review', pagoRechazado: 'Rejected', ref: 'Ref.', motivo: 'Reason',
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

type Textos = (typeof text)['es'] | (typeof text)['en'];

const usd = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });

// Con sesión real: pagos por curso (sin cuotas, decidido con la usuaria).
function PagosCursosReales({ t, language }: { t: Textos; language: 'es' | 'en' }) {
  const [cursos, setCursos] = useState<PagoCursoEstudiante[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagando, setPagando] = useState<PagoCursoEstudiante | null>(null);

  const recargar = useCallback(async () => {
    const res = await cargarMisPagosCursos();
    if (res.error) setError(res.error.message);
    else setCursos(res.data);
  }, []);
  useEffect(() => { void recargar(); }, [recargar]);

  if (error) return <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>;
  if (!cursos) return <p className="text-sm text-ink/45">{t.cargando}</p>;

  const total = (k: 'pagado' | 'enRevision' | 'saldo' | 'precio') => cursos.reduce((a, c) => a + c[k], 0);
  const fecha = (iso: string) => new Date(iso).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.tituloReal}</h1>
        <p className="text-sm text-ink/50">{t.subtituloReal}</p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.precio}</p>
          <p className="font-display text-lg font-semibold text-ink">USD ${usd(total('precio'))}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.pagado}</p>
          <p className="font-display text-lg font-semibold text-emerald-600">USD ${usd(total('pagado'))}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.enRevision}</p>
          <p className="font-display text-lg font-semibold text-lilac-600">USD ${usd(total('enRevision'))}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.porPagar}</p>
          <p className="font-display text-lg font-semibold text-amber-600">USD ${usd(total('saldo'))}</p>
        </div>
      </section>

      {cursos.length === 0 && (
        <div className="rounded-3xl border border-dashed border-brand-200 bg-white p-6 text-center text-sm text-ink/55">
          <p className="mb-3">{t.sinPagos}</p>
          <Link to="/cursos" className="inline-block rounded-full bg-brand-gradient px-5 py-2 text-xs font-semibold text-white">{t.verCatalogo}</Link>
        </div>
      )}

      <div className="space-y-4">
        {cursos.map((c) => {
          const pct = c.precio > 0 ? Math.round((c.pagado / c.precio) * 100) : 100;
          return (
            <div key={c.cursoId} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display font-semibold text-ink">{c.curso}</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.inscrito ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {c.inscrito ? t.accesoActivo : t.accesoPendiente}
                </span>
              </div>
              <p className="mb-2 text-xs text-ink/50">
                {t.pagado} USD ${usd(c.pagado)} {t.de} ${usd(c.precio)}
                {c.enRevision > 0 && ` · ${t.enRevision} USD $${usd(c.enRevision)}`}
                {c.saldo > 0 && ` · ${t.porPagar} USD $${usd(c.saldo)}`}
              </p>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-brand-50">
                <div className="h-2 rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
              </div>
              <div className="space-y-2">
                {c.pagos.map((p) => {
                  const Icon = p.estado === 'aprobado' ? Check : p.estado === 'rechazado' ? AlertTriangle : Circle;
                  const cls = p.estado === 'aprobado' ? 'pagada' : p.estado === 'rechazado' ? 'vencida' : 'pendiente';
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-50 px-3 py-2 text-sm">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${estadoIconoCls[cls]}`}><Icon size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink">{fecha(p.fecha)}{p.referencia && <span className="text-ink/45"> · {t.ref} {p.referencia}</span>}</p>
                        {p.motivoRechazo && <p className="text-xs text-rose-600">{t.motivo}: {p.motivoRechazo}</p>}
                      </div>
                      <span className="font-semibold text-ink">USD ${usd(p.monto)}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estadoChipCls[cls]}`}>
                        {p.estado === 'aprobado' ? t.pagoAprobado : p.estado === 'rechazado' ? t.pagoRechazado : t.pagoPendiente}
                      </span>
                    </div>
                  );
                })}
              </div>
              {c.saldo > 0 && (
                <button onClick={() => setPagando(c)} className="mt-4 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
                  {t.pagarSaldo} · USD ${usd(c.saldo)}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pagando && (
        <PaymentCheckoutModal
          monto={pagando.saldo}
          concepto={pagando.curso}
          cursoId={pagando.cursoId}
          onClose={() => setPagando(null)}
          onSuccess={() => { setPagando(null); void recargar(); }}
        />
      )}
    </>
  );
}

export default function InstallmentsPage() {
  const { language } = useSiteLanguage();
  const { esSesionReal } = useSiteAuth();
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
      {esSesionReal ? <PagosCursosReales t={t} language={language} /> : <>
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
      </>}
    </PortalLayout>
  );
}
