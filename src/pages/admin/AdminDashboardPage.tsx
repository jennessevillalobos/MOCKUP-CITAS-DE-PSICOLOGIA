import { useEffect, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, CalendarDays, ShoppingBag, Wallet, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  kpis,
  revenueByMonth,
  activityByChannel,
  upcomingAppointments,
  recentSales,
  pendingPayments,
  overdueInstallments,
} from '@/data/admin/dashboardData';

const maxRevenue = 180;

export default function AdminDashboardPage() {
  const [animar, setAnimar] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setAnimar(true), 80);
    return () => clearTimeout(id);
  }, []);

  const totalPct = activityByChannel.reduce((acc, c) => acc + c.pct, 0);
  let acumulado = 0;
  const donutSegments = activityByChannel.map((c) => {
    const dasharray = `${c.pct} ${100 - c.pct}`;
    const dashoffset = 25 - acumulado;
    acumulado += c.pct;
    return { ...c, dasharray, dashoffset };
  });

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Panel general</h1>
          <p className="mt-1 text-sm text-ink/50">Vista consolidada · datos de demostración</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="h-10 rounded-2xl border border-brand-100 bg-white px-3 text-sm text-ink outline-none">
            <option>Hoy</option>
            <option>Últimos 30 días</option>
            <option>Este trimestre</option>
            <option>Este año</option>
          </select>
          <button className="flex h-10 items-center gap-2 rounded-2xl bg-brand-gradient px-4 text-sm font-bold text-white shadow-soft">
            <Plus size={16} />
            Nuevo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                  kpi.positivo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}
              >
                {kpi.positivo ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {kpi.delta}
              </span>
            </div>
            <p className="mt-4 text-sm text-ink/50">{kpi.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">{kpi.value}</p>
            <p className="mt-1 text-[11px] text-ink/40">{kpi.sub}</p>
          </div>
        ))}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Ingresos por mes</h2>
              <p className="text-xs text-ink/45">Terapias, cursos y productos · 2026</p>
            </div>
            <div className="flex gap-3 text-[11px] text-ink/50">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
                Terapias
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-lilac-400" />
                Academia
              </span>
            </div>
          </div>
          <div className="flex h-56 items-end gap-3">
            {revenueByMonth.map((d) => (
              <div key={d.mes} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-[200px] w-full flex-col items-stretch justify-end gap-0.5">
                  <div
                    className="rounded-t bg-lilac-400/80 transition-all duration-700 ease-out"
                    style={{ height: animar ? `${(d.academia / maxRevenue) * 100}%` : '0%' }}
                  />
                  <div
                    className="rounded-b bg-brand-500 transition-all duration-700 ease-out"
                    style={{ height: animar ? `${(d.terapias / maxRevenue) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-[11px] text-ink/40">{d.mes}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          <h2 className="font-display text-lg font-semibold text-ink">Actividad por canal</h2>
          <p className="mb-4 text-xs text-ink/45">Distribución de ingresos</p>
          <div className="flex items-center gap-5">
            <svg viewBox="0 0 42 42" className="h-32 w-32 shrink-0" aria-hidden="true">
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f1f6fb" strokeWidth="6" />
              {donutSegments.map((seg) => (
                <circle
                  key={seg.label}
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="6"
                  strokeDasharray={seg.dasharray}
                  strokeDashoffset={seg.dashoffset}
                  strokeLinecap="round"
                />
              ))}
              <text x="21" y="20" textAnchor="middle" fontSize="6" fill="#17324b" fontWeight={700}>
                {totalPct}%
              </text>
              <text x="21" y="26" textAnchor="middle" fontSize="3" fill="#17324b66">
                total
              </text>
            </svg>
            <ul className="w-full space-y-2 text-sm">
              {activityByChannel.map((c) => (
                <li key={c.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink/70">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.label}
                  </span>
                  <b className="text-ink">{c.pct}%</b>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex justify-between border-t border-brand-100 pt-4 text-xs text-ink/50">
            <span>Ticket promedio</span>
            <b className="text-ink">$42.80</b>
          </div>
        </div>
      </section>

      {/* Widgets */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <CalendarDays size={17} className="text-brand-500" />
              Citas próximas
            </h2>
            <span className="text-xs font-semibold text-brand-600">Ver agenda</span>
          </div>
          <ul className="divide-y divide-brand-50 text-sm">
            {upcomingAppointments.map((c) => (
              <li key={c.paciente} className="flex items-center gap-3 py-3">
                <span className="w-11 text-center">
                  <b className="block text-ink">{c.hora}</b>
                  <span className="text-[11px] text-ink/40">{c.turno}</span>
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                  {c.iniciales}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{c.paciente}</p>
                  <p className="text-xs text-ink/45">{c.detalle}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    c.estado === 'En línea' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-ink/50'
                  }`}
                >
                  {c.estado}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <ShoppingBag size={17} className="text-lilac-500" />
              Ventas recientes
            </h2>
            <span className="text-xs font-semibold text-brand-600">Ver todas</span>
          </div>
          <ul className="divide-y divide-brand-50 text-sm">
            {recentSales.map((s) => (
              <li key={s.titulo} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{s.titulo}</p>
                  <p className="text-xs text-ink/45">{s.quien}</p>
                </div>
                <b className="text-emerald-600">{s.monto}</b>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <Wallet size={17} className="text-amber-500" />
              Pagos pendientes
            </h2>
            <span className="text-xs text-ink/45">{pendingPayments.length} pendientes</span>
          </div>
          <ul className="divide-y divide-brand-50 text-sm">
            {pendingPayments.map((p) => (
              <li key={p.nombre} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-semibold text-ink">{p.nombre}</p>
                  <p className="text-xs text-ink/45">{p.detalle}</p>
                </div>
                <div className="text-right">
                  <b className="block text-ink">{p.monto}</b>
                  <button className="text-[11px] font-semibold text-brand-600 hover:underline">Verificar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-rose-600">
              <AlertTriangle size={17} />
              Cuotas vencidas
            </h2>
            <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
              {overdueInstallments.length} vencidas
            </span>
          </div>
          <ul className="divide-y divide-brand-50 text-sm">
            {overdueInstallments.map((o) => (
              <li key={o.nombre} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-semibold text-ink">{o.nombre}</p>
                  <p className="text-xs text-rose-500">{o.detalle}</p>
                </div>
                <div className="text-right">
                  <b className="block text-ink">{o.monto}</b>
                  <button className="text-[11px] font-semibold text-brand-600 hover:underline">Notificar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="pb-6 pt-2 text-center text-xs text-ink/35">
        PsiqueAmor ERP · Prototipo de interfaz — datos de demostración
      </footer>
    </AdminLayout>
  );
}
