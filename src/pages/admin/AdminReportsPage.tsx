import { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Download } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import {
  DIARIO,
  serviciosDisponibles,
  profesionalesDisponibles,
  cursosDisponibles,
  videosDisponibles,
  librosDisponibles,
  rangoPeriodo,
  diasEnRango,
  rangoAnterior,
  sum,
  cambio,
  bucketize,
  formatBucketLabel,
  exportarCSV,
  type PeriodoValor,
  type DiaReporte,
} from '@/data/admin/reportsData';

type Tab = 'fin' | 'cit' | 'aca' | 'com' | 'cal';

const HOY_BASE = new Date('2026-08-19T00:00:00');

const text = {
  es: {
    title: 'Reportes',
    subtitle: 'Evolución y comparación por período, con exportación a CSV',
    tabs: { fin: 'Financiero', cit: 'Citas y agenda', aca: 'Academia', com: 'Comercio', cal: 'Comentarios' } as Record<Tab, string>,
    periodo: {
      hoy: 'Hoy', '7d': '7 días', '30d': '30 días', trim: 'Este trimestre', anio: 'Este año', custom: 'Rango personalizado',
    } as Record<PeriodoValor, string>,
    vsAnterior: 'vs período anterior',
    exportCsv: 'Exportar CSV',
    noData: 'Sin datos en este rango.',
    meses: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    // financiero
    finTotal: 'Ingresos totales', finServicios: 'Servicios / Terapias', finCursos: 'Cursos', finProductos: 'Productos digitales',
    revenueOverTime: 'Ingresos por período', breakdown: 'Desglose', concepto: 'Concepto', categoria: 'Categoría', monto: 'Monto',
    servicio: 'Servicio', curso: 'Curso', video: 'Video', libro: 'Libro',
    // citas
    citReal: 'Citas realizadas', citCancel: 'Canceladas', citNoshow: 'No-show', citOcup: 'Tasa de ocupación',
    citOverTime: 'Citas realizadas por período', byProfessional: 'Por profesional', profesional: 'Profesional',
    realizadas: 'Realizadas', canceladas: 'Canceladas', ocupacion: 'Ocupación',
    // academia
    acaInsc: 'Nuevas inscripciones', acaComp: 'Cursos completados', acaEvalT: 'Evaluaciones presentadas', acaEvalPct: 'Tasa de aprobación',
    enrollOverTime: 'Inscripciones por período', byCourse: 'Por curso', inscripciones: 'Inscripciones', completados: 'Completados',
    pctCompletacion: '% completación', pctAprobacion: '% aprobación',
    // comercio
    comUnid: 'Unidades vendidas', comMonto: 'Monto vendido', comTop: 'Producto más vendido', salesOverTime: 'Ventas por período',
    producto: 'Producto', unidades: 'Unidades',
    // comentarios
    calProm: 'Calificación promedio', calTotal: 'Comentarios recibidos', calSatis: 'Satisfacción (4-5★)',
    starDist: 'Distribución de estrellas', avgByService: 'Promedio por servicio', avgByProfessional: 'Promedio por profesional',
    noReviews: 'Sin comentarios en este rango.',
  },
  en: {
    title: 'Reports',
    subtitle: 'Trends and period comparison, with CSV export',
    tabs: { fin: 'Financial', cit: 'Appointments', aca: 'Academy', com: 'Commerce', cal: 'Reviews' } as Record<Tab, string>,
    periodo: {
      hoy: 'Today', '7d': '7 days', '30d': '30 days', trim: 'This quarter', anio: 'This year', custom: 'Custom range',
    } as Record<PeriodoValor, string>,
    vsAnterior: 'vs previous period',
    exportCsv: 'Export CSV',
    noData: 'No data for this range.',
    meses: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    finTotal: 'Total revenue', finServicios: 'Services / Therapy', finCursos: 'Courses', finProductos: 'Digital products',
    revenueOverTime: 'Revenue over time', breakdown: 'Breakdown', concepto: 'Item', categoria: 'Category', monto: 'Amount',
    servicio: 'Service', curso: 'Course', video: 'Video', libro: 'Book',
    citReal: 'Completed', citCancel: 'Cancelled', citNoshow: 'No-shows', citOcup: 'Occupancy rate',
    citOverTime: 'Completed appointments over time', byProfessional: 'By professional', profesional: 'Professional',
    realizadas: 'Completed', canceladas: 'Cancelled', ocupacion: 'Occupancy',
    acaInsc: 'New enrollments', acaComp: 'Courses completed', acaEvalT: 'Assessments taken', acaEvalPct: 'Pass rate',
    enrollOverTime: 'Enrollments over time', byCourse: 'By course', inscripciones: 'Enrollments', completados: 'Completed',
    pctCompletacion: '% completion', pctAprobacion: '% pass rate',
    comUnid: 'Units sold', comMonto: 'Amount sold', comTop: 'Best-selling item', salesOverTime: 'Sales over time',
    producto: 'Product', unidades: 'Units',
    calProm: 'Average rating', calTotal: 'Reviews received', calSatis: 'Satisfaction (4-5★)',
    starDist: 'Star distribution', avgByService: 'Average by service', avgByProfessional: 'Average by professional',
    noReviews: 'No reviews in this range.',
  },
} as const;

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminReportsPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];

  const [tab, setTab] = useState<Tab>('fin');
  const [periodo, setPeriodo] = useState<PeriodoValor>('7d');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    setAnimar(false);
    const id = setTimeout(() => setAnimar(true), 80);
    return () => clearTimeout(id);
  }, [tab, periodo, fDesde, fHasta]);

  const { dias, diasAnt } = useMemo(() => {
    const { desde, hasta } = rangoPeriodo(periodo, HOY_BASE, fDesde, fHasta);
    const d = diasEnRango(desde, hasta);
    const ant = rangoAnterior(desde, hasta);
    return { dias: d, diasAnt: diasEnRango(ant.desde, ant.hasta) };
  }, [periodo, fDesde, fHasta]);

  const servicios = useMemo(() => serviciosDisponibles(), []);
  const profesionales = useMemo(() => profesionalesDisponibles(), []);
  const cursos = useMemo(() => cursosDisponibles(), []);
  const videos = useMemo(() => videosDisponibles(), []);
  const libros = useMemo(() => librosDisponibles(), []);

  function Badge({ actual, anterior }: { actual: number; anterior: number }) {
    const c = cambio(actual, anterior);
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${c.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {c.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {c.v}%
      </span>
    );
  }

  function BarChart({ pares, color }: { pares: [string, number][]; color: string }) {
    if (!pares.length) return <p className="m-auto text-sm text-ink/40">{t.noData}</p>;
    const max = Math.max(1, ...pares.map((p) => p[1]));
    return (
      <div className="flex h-56 items-end gap-2">
        {pares.map(([key, v]) => (
          <div key={key} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-[200px] w-full flex-col items-stretch justify-end">
              <div
                className="rounded-t transition-all duration-700 ease-out"
                style={{ height: animar ? `${(v / max) * 100}%` : '0%', backgroundColor: color }}
              />
            </div>
            <span className="text-[10px] text-ink/40">{formatBucketLabel(key, [...t.meses])}</span>
          </div>
        ))}
      </div>
    );
  }

  function ExportBtn({ onClick }: { onClick: () => void }) {
    return (
      <button onClick={onClick} className="flex items-center gap-1.5 rounded-full border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50">
        <Download size={13} />
        {t.exportCsv}
      </button>
    );
  }

  // ---------- Financiero ----------
  const finServicios = sum(dias, 'ingresosServicios');
  const finServiciosAnt = sum(diasAnt, 'ingresosServicios');
  const finCursos = sum(dias, 'ingresosCursos');
  const finCursosAnt = sum(diasAnt, 'ingresosCursos');
  const finProductos = sum(dias, 'ingresosVideos') + sum(dias, 'ingresosLibros');
  const finProductosAnt = sum(diasAnt, 'ingresosVideos') + sum(diasAnt, 'ingresosLibros');
  const finTotal = finServicios + finCursos + finProductos;
  const finTotalAnt = finServiciosAnt + finCursosAnt + finProductosAnt;

  const filasFin = useMemo(() => {
    const totalGeneral = finTotal || 1;
    const filas = [
      ...servicios.map((s) => ({ concepto: s.n, categoria: t.servicio, monto: finServicios * s.w })),
      ...cursos.map((c) => ({ concepto: c.n, categoria: t.curso, monto: finCursos * c.w })),
      ...videos.map((v) => ({ concepto: v.n, categoria: t.video, monto: (sum(dias, 'ingresosVideos')) * v.w })),
      ...libros.map((l) => ({ concepto: l.n, categoria: t.libro, monto: (sum(dias, 'ingresosLibros')) * l.w })),
    ];
    return filas.map((f) => ({ ...f, pct: (f.monto / totalGeneral) * 100 })).sort((a, b) => b.monto - a.monto);
  }, [dias, servicios, cursos, videos, libros, finServicios, finCursos, finTotal, t]);

  // ---------- Citas ----------
  const citReal = sum(dias, 'citasReal');
  const citRealAnt = sum(diasAnt, 'citasReal');
  const citCancel = sum(dias, 'citasCancel');
  const citNoshow = sum(dias, 'citasNoShow');
  const citTotalAgenda = citReal + citCancel + citNoshow;

  const filasCit = useMemo(
    () =>
      profesionales
        .map((p) => {
          const r = Math.round(citReal * p.w);
          const c = Math.round(citCancel * p.w);
          const n = Math.round(citNoshow * p.w);
          const total = r + c + n;
          return { profesional: p.n, realizadas: r, canceladas: c, noshow: n, ocupacion: total ? Math.round((r / total) * 100) : 0 };
        })
        .sort((a, b) => b.realizadas - a.realizadas),
    [profesionales, citReal, citCancel, citNoshow],
  );

  // ---------- Academia ----------
  const acaInsc = sum(dias, 'inscripciones');
  const acaInscAnt = sum(diasAnt, 'inscripciones');
  const acaComp = sum(dias, 'cursosCompletados');
  const acaEvalT = sum(dias, 'evalTotal');
  const acaEvalA = sum(dias, 'evalAprobadas');

  const filasAca = useMemo(
    () =>
      cursos
        .map((c) => {
          const i = Math.round(acaInsc * c.w);
          const cp = Math.round(acaComp * c.w);
          const et = Math.round(acaEvalT * c.w);
          const ea = Math.round(acaEvalA * c.w);
          return {
            curso: c.n, inscripciones: i, completados: cp,
            pctCompletacion: i ? Math.round((cp / i) * 100) : 0,
            pctAprobacion: et ? Math.round((ea / et) * 100) : 0,
          };
        })
        .sort((a, b) => b.inscripciones - a.inscripciones),
    [cursos, acaInsc, acaComp, acaEvalT, acaEvalA],
  );

  // ---------- Comercio ----------
  const uCursos = sum(dias, 'ventasCursosUnid');
  const mCursos = sum(dias, 'ingresosCursos');
  const uVideos = sum(dias, 'ventasVideosUnid');
  const mVideos = sum(dias, 'ingresosVideos');
  const uLibros = sum(dias, 'ventasLibrosUnid');
  const mLibros = sum(dias, 'ingresosLibros');
  const comUnidTotal = uCursos + uVideos + uLibros;
  const comUnidAnt = sum(diasAnt, 'ventasCursosUnid') + sum(diasAnt, 'ventasVideosUnid') + sum(diasAnt, 'ventasLibrosUnid');
  const comMontoTotal = mCursos + mVideos + mLibros;

  const filasCom = useMemo(
    () =>
      [
        ...cursos.map((c) => ({ producto: c.n, categoria: t.curso, unidades: Math.round(uCursos * c.w), monto: mCursos * c.w })),
        ...videos.map((v) => ({ producto: v.n, categoria: t.video, unidades: Math.round(uVideos * v.w), monto: mVideos * v.w })),
        ...libros.map((l) => ({ producto: l.n, categoria: t.libro, unidades: Math.round(uLibros * l.w), monto: mLibros * l.w })),
      ].sort((a, b) => b.monto - a.monto),
    [cursos, videos, libros, uCursos, mCursos, uVideos, mVideos, uLibros, mLibros, t],
  );

  // ---------- Comentarios ----------
  const calTotalComentarios = sum(dias, 'comentarios');
  const calSumaEstrellas = sum(dias, 'sumaEstrellas');
  const calPromedio = calTotalComentarios ? calSumaEstrellas / calTotalComentarios : 0;
  const calDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    dias.forEach((d: DiaReporte) => d.dist.forEach((v, i) => (dist[i] += v)));
    return dist;
  }, [dias]);
  const calSatis = calTotalComentarios ? Math.round(((calDist[3] + calDist[4]) / calTotalComentarios) * 100) : 0;
  const variacion = [0.3, -0.1, 0.15, -0.2, 0.05];

  function BloqueEstrellas({ dimensiones }: { dimensiones: string[] }) {
    if (!calTotalComentarios) return <p className="text-sm text-ink/40">{t.noReviews}</p>;
    return (
      <div className="space-y-3">
        {dimensiones.map((d, i) => {
          const val = Math.min(5, Math.max(1, calPromedio + variacion[i % variacion.length]));
          const pct = Math.round((val / 5) * 100);
          return (
            <div key={d}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-ink/70">{d}</span>
                <span className="text-ink/45">{val.toFixed(1)} ★</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-brand-50">
                <div className="h-full rounded-full bg-lilac-400" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const esCustom = periodo === 'custom';

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
            <BarChart3 size={22} className="text-brand-500" />
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-ink/50">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoValor)}
            className="h-10 rounded-2xl border border-brand-100 bg-white px-3 text-sm text-ink outline-none"
          >
            {(Object.keys(t.periodo) as PeriodoValor[]).map((p) => (
              <option key={p} value={p}>{t.periodo[p]}</option>
            ))}
          </select>
          {esCustom && (
            <>
              <input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} className="h-10 rounded-2xl border border-brand-100 bg-white px-3 text-sm text-ink outline-none" />
              <input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} className="h-10 rounded-2xl border border-brand-100 bg-white px-3 text-sm text-ink outline-none" />
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-brand-100 bg-white p-1 sm:w-fit">
        {(Object.keys(t.tabs) as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
              tab === tb ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/50 hover:bg-brand-50'
            }`}
          >
            {t.tabs[tb]}
          </button>
        ))}
      </div>

      {tab === 'fin' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.finTotal}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{fmt(finTotal)}</p>
              <div className="mt-1"><Badge actual={finTotal} anterior={finTotalAnt} /> <span className="text-[11px] text-ink/40">{t.vsAnterior}</span></div>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.finServicios}</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink">{fmt(finServicios)}</p>
              <div className="mt-1"><Badge actual={finServicios} anterior={finServiciosAnt} /></div>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.finCursos}</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink">{fmt(finCursos)}</p>
              <div className="mt-1"><Badge actual={finCursos} anterior={finCursosAnt} /></div>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.finProductos}</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink">{fmt(finProductos)}</p>
              <div className="mt-1"><Badge actual={finProductos} anterior={finProductosAnt} /></div>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">{t.revenueOverTime}</h2>
            <BarChart pares={bucketize(dias, 'ingresosTotal')} color="#2d485f" />
          </div>

          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{t.breakdown}</h2>
              <ExportBtn onClick={() => exportarCSV('reporte-financiero.csv', [t.concepto, t.categoria, t.monto, '%'], filasFin.map((f) => [f.concepto, f.categoria, f.monto.toFixed(2), `${f.pct.toFixed(1)}%`]))} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-4 py-3 font-semibold">{t.concepto}</th>
                    <th className="px-4 py-3 font-semibold">{t.categoria}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.monto}</th>
                    <th className="px-4 py-3 text-right font-semibold">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {filasFin.length ? filasFin.map((f) => (
                    <tr key={`${f.concepto}-${f.categoria}`} className="hover:bg-brand-50/50">
                      <td className="px-4 py-3 font-semibold text-ink">{f.concepto}</td>
                      <td className="px-4 py-3 text-ink/50">{f.categoria}</td>
                      <td className="px-4 py-3 text-right text-ink/70">{fmt(f.monto)}</td>
                      <td className="px-4 py-3 text-right text-ink/45">{f.pct.toFixed(1)}%</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink/40">{t.noData}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === 'cit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="text-xs text-emerald-700/70">{t.citReal}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-emerald-700">{citReal}</p>
              <div className="mt-1"><Badge actual={citReal} anterior={citRealAnt} /></div>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-amber-50/40 p-4">
              <p className="text-xs text-amber-700/70">{t.citCancel}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-amber-700">{citCancel}</p>
            </div>
            <div className="rounded-3xl border border-rose-100 bg-rose-50/40 p-4">
              <p className="text-xs text-rose-700/70">{t.citNoshow}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-rose-700">{citNoshow}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.citOcup}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{citTotalAgenda ? Math.round((citReal / citTotalAgenda) * 100) : 0}%</p>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">{t.citOverTime}</h2>
            <BarChart pares={bucketize(dias, 'citasReal')} color="#3e5e7d" />
          </div>

          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{t.byProfessional}</h2>
              <ExportBtn onClick={() => exportarCSV('reporte-citas.csv', [t.profesional, t.realizadas, t.canceladas, 'No-show', t.ocupacion], filasCit.map((f) => [f.profesional, f.realizadas, f.canceladas, f.noshow, `${f.ocupacion}%`]))} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-4 py-3 font-semibold">{t.profesional}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.realizadas}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.canceladas}</th>
                    <th className="px-4 py-3 text-right font-semibold">No-show</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.ocupacion}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {filasCit.length ? filasCit.map((f) => (
                    <tr key={f.profesional} className="hover:bg-brand-50/50">
                      <td className="px-4 py-3 font-semibold text-ink">{f.profesional}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{f.realizadas}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{f.canceladas}</td>
                      <td className="px-4 py-3 text-right text-rose-600">{f.noshow}</td>
                      <td className="px-4 py-3 text-right text-ink/50">{f.ocupacion}%</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink/40">{t.noData}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === 'aca' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.acaInsc}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{acaInsc}</p>
              <div className="mt-1"><Badge actual={acaInsc} anterior={acaInscAnt} /></div>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="text-xs text-emerald-700/70">{t.acaComp}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-emerald-700">{acaComp}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.acaEvalT}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{acaEvalT}</p>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="text-xs text-emerald-700/70">{t.acaEvalPct}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-emerald-700">{acaEvalT ? Math.round((acaEvalA / acaEvalT) * 100) : 0}%</p>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">{t.enrollOverTime}</h2>
            <BarChart pares={bucketize(dias, 'inscripciones')} color="#9d8bc9" />
          </div>

          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{t.byCourse}</h2>
              <ExportBtn onClick={() => exportarCSV('reporte-academia.csv', [t.curso, t.inscripciones, t.completados, t.pctCompletacion, t.pctAprobacion], filasAca.map((f) => [f.curso, f.inscripciones, f.completados, `${f.pctCompletacion}%`, `${f.pctAprobacion}%`]))} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-4 py-3 font-semibold">{t.curso}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.inscripciones}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.completados}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.pctCompletacion}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.pctAprobacion}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {filasAca.length ? filasAca.map((f) => (
                    <tr key={f.curso} className="hover:bg-brand-50/50">
                      <td className="px-4 py-3 font-semibold text-ink">{f.curso}</td>
                      <td className="px-4 py-3 text-right text-ink/70">{f.inscripciones}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{f.completados}</td>
                      <td className="px-4 py-3 text-right text-ink/45">{f.pctCompletacion}%</td>
                      <td className="px-4 py-3 text-right text-ink/45">{f.pctAprobacion}%</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink/40">{t.noData}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === 'com' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.comUnid}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{comUnidTotal}</p>
              <div className="mt-1"><Badge actual={comUnidTotal} anterior={comUnidAnt} /></div>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="text-xs text-emerald-700/70">{t.comMonto}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-emerald-700">{fmt(comMontoTotal)}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft sm:col-span-2">
              <p className="text-xs text-ink/50">{t.comTop}</p>
              <p className="mt-1 truncate font-display text-lg font-semibold text-ink">{filasCom.length ? filasCom[0].producto : '—'}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">{t.salesOverTime}</h2>
            <BarChart pares={bucketize(dias, 'ingresosTotal')} color="#d9a441" />
          </div>

          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{t.breakdown}</h2>
              <ExportBtn onClick={() => exportarCSV('reporte-comercio.csv', [t.producto, t.categoria, t.unidades, t.monto], filasCom.map((f) => [f.producto, f.categoria, f.unidades, f.monto.toFixed(2)]))} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-4 py-3 font-semibold">{t.producto}</th>
                    <th className="px-4 py-3 font-semibold">{t.categoria}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.unidades}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.monto}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {filasCom.length ? filasCom.map((f) => (
                    <tr key={`${f.producto}-${f.categoria}`} className="hover:bg-brand-50/50">
                      <td className="px-4 py-3 font-semibold text-ink">{f.producto}</td>
                      <td className="px-4 py-3 text-ink/50">{f.categoria}</td>
                      <td className="px-4 py-3 text-right text-ink/70">{f.unidades}</td>
                      <td className="px-4 py-3 text-right text-ink/70">{fmt(f.monto)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink/40">{t.noData}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === 'cal' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="text-xs text-emerald-700/70">{t.calProm}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-emerald-700">{calTotalComentarios ? `${calPromedio.toFixed(1)} ★` : '—'}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.calTotal}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{calTotalComentarios}</p>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="text-xs text-emerald-700/70">{t.calSatis}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-emerald-700">{calTotalComentarios ? `${calSatis}%` : '—'}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">{t.starDist}</h2>
            {calTotalComentarios ? (
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((estr) => {
                  const v = calDist[estr - 1];
                  const maxDist = Math.max(1, ...calDist);
                  const pct = Math.round((v / maxDist) * 100);
                  return (
                    <div key={estr} className="flex items-center gap-3 text-sm">
                      <span className="w-8 text-ink/50">{estr}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-50">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-ink/45">{v}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ink/40">{t.noReviews}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t.avgByService}</h2>
              <BloqueEstrellas dimensiones={servicios.map((s) => s.n)} />
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t.avgByProfessional}</h2>
              <BloqueEstrellas dimensiones={profesionales.map((p) => p.n)} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// Re-exportado para que TS no marque DIARIO como no usado si se agrega
// alguna utilidad futura de depuración sobre la serie completa.
export const _debugTotalDias = DIARIO.length;
