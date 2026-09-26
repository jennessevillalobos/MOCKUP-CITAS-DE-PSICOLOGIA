import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown, CalendarDays, ShoppingBag, Wallet, AlertTriangle, GraduationCap, Users, ChevronDown } from 'lucide-react';
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
import { useAdminAuth } from '@/context/AdminAuthContext';
import { cargarPanelAdmin, recordarSaldo, type PanelAdmin, type PeriodoPanel } from '@/lib/api/admin';

const maxRevenue = 180;
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
// Variación contra el periodo anterior (▲/▼ %), o "nuevo" si antes no había.
function variacion(actual: number, previo: number) {
  if (previo === 0) return { delta: actual > 0 ? '▲ nuevo' : '—', positivo: true };
  const pct = ((actual - previo) / previo) * 100;
  return { delta: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`, positivo: pct >= 0 };
}
const fechaCorta = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const iniciales = (nombre: string | null) => (nombre ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { esReal } = useAdminAuth();
  const [animar, setAnimar] = useState(false);
  // Con Supabase: datos reales del periodo elegido (admin_panel_resumen, migración 039).
  const [periodo, setPeriodo] = useState<PeriodoPanel>('30d');
  const [panel, setPanel] = useState<PanelAdmin | null>(null);
  const [errorPanel, setErrorPanel] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!esReal) return;
    let vigente = true;
    void cargarPanelAdmin(periodo).then((res) => {
      if (!vigente) return;
      if (res.error) setErrorPanel(res.error.message);
      else { setPanel(res.data); setErrorPanel(null); }
    });
    return () => { vigente = false; };
  }, [esReal, periodo]);

  function mostrarAviso(texto: string) {
    setAviso(texto);
    window.setTimeout(() => setAviso(null), 3500);
  }

  async function notificarSaldo(citaId: string | undefined, nombre: string) {
    if (!esReal || !citaId) return mostrarAviso('Modo demostración: no se envían avisos.');
    const res = await recordarSaldo(citaId);
    mostrarAviso(res.error ? res.error.message : `Recordatorio enviado a ${nombre}.`);
  }

  // ── Modelo de vista: demo o base ──
  const real = esReal && panel;
  const kpisVista = real ? [
    { label: 'Ingresos del periodo', value: usd(panel.kpis.ingresos), ...variacion(panel.kpis.ingresos, panel.kpis.ingresosPrevio), sub: `Periodo anterior: ${usd(panel.kpis.ingresosPrevio)}` },
    { label: 'Citas de hoy', value: String(panel.kpis.citasHoy), delta: '—', positivo: true, sub: `${panel.kpis.citasHoyOnline} en línea · ${panel.kpis.citasHoy - panel.kpis.citasHoyOnline} presenciales` },
    { label: 'Nuevos usuarios', value: String(panel.kpis.nuevosUsuarios), ...variacion(panel.kpis.nuevosUsuarios, panel.kpis.nuevosUsuariosPrevio), sub: 'En el periodo' },
    { label: 'Ventas (cursos + libros)', value: String(panel.kpis.ventas), ...variacion(panel.kpis.ventas, panel.kpis.ventasPrevio), sub: `${usd(panel.kpis.ventasMonto)} en el periodo` },
  ] : kpis;
  const mesesVista = real
    ? panel.ingresosPorMes.map((m) => ({ mes: MESES[Number(m.mes.slice(5, 7)) - 1], terapias: m.terapias, academia: m.academia }))
    : revenueByMonth;
  const maxVista = real ? Math.max(1, ...mesesVista.map((m) => m.terapias + m.academia)) * 1.1 : maxRevenue;
  const totalCanales = real ? panel.canales.terapias + panel.canales.cursos + panel.canales.productos : 0;
  const canalesVista = real
    ? [
        { label: 'Terapias', monto: panel.canales.terapias, color: '#5d83a7' },
        { label: 'Cursos', monto: panel.canales.cursos, color: '#9580b9' },
        { label: 'Productos', monto: panel.canales.productos, color: '#d9a441' },
      ].map((c) => ({ label: c.label, color: c.color, pct: totalCanales ? Math.round((c.monto / totalCanales) * 100) : 0 }))
    : activityByChannel;
  const citasVista = real
    ? panel.proximasCitas.map((c) => {
        const h = Number(c.hora.slice(0, 2));
        return {
          clave: c.id, hora: `${String(((h + 11) % 12) + 1).padStart(2, '0')}:${c.hora.slice(3, 5)}`, turno: h < 12 ? 'AM' : 'PM',
          paciente: c.paciente ?? '—', iniciales: iniciales(c.paciente),
          detalle: `${c.servicio ?? 'Cita'} · ${c.profesional ?? ''} · ${fechaCorta(c.fecha)}`,
          estado: /online/i.test(c.lugar ?? '') ? 'En línea' : c.lugar ?? '—',
        };
      })
    : upcomingAppointments.map((c) => ({ ...c, clave: c.paciente }));
  const ventasVista = real
    ? panel.ventasRecientes.map((v, i) => ({ clave: `${i}`, titulo: v.concepto ?? 'Pago', quien: `${v.quien ?? '—'} · ${fechaCorta(v.fecha)}`, monto: `+${usd(v.monto)}` }))
    : recentSales.map((v) => ({ ...v, clave: v.titulo }));
  const pendientesVista = real
    ? panel.pagosPorVerificar.map((p) => ({ clave: p.id, nombre: p.nombre ?? '—', detalle: `${p.concepto ?? 'Pago'} · ${p.metodo}`, monto: usd(p.monto) }))
    : pendingPayments.map((p) => ({ ...p, clave: p.nombre }));
  const saldosVista = real
    ? panel.saldosPendientes.map((c) => ({
        clave: c.citaId, citaId: c.citaId as string | undefined, nombre: c.nombre ?? '—',
        detalle: `${c.servicio ?? 'Cita'} · cita ${fechaCorta(c.fecha)}${c.enRevision > 0 ? ` · ${usd(c.enRevision)} en revisión` : ''}`,
        monto: usd(c.saldo),
      }))
    : overdueInstallments.map((o) => ({ ...o, clave: o.nombre, citaId: undefined as string | undefined }));
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setAnimar(true), 80);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    }
    if (menuAbierto) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuAbierto]);

  const opcionesNuevo = [
    { icon: CalendarDays, label: 'Nueva cita', ruta: '/admin/agenda' },
    { icon: GraduationCap, label: 'Nuevo curso', ruta: '/admin/cursos' },
    { icon: Users, label: 'Nuevo paciente', ruta: '/admin/usuarios' },
  ];

  const totalPct = canalesVista.reduce((acc, c) => acc + c.pct, 0);
  let acumulado = 0;
  const donutSegments = canalesVista.map((c) => {
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
          <p className="mt-1 text-sm text-ink/50">Vista consolidada · {esReal ? 'datos reales' : 'datos de demostración'}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoPanel)}
            className="h-10 rounded-2xl border border-brand-100 bg-white px-3 text-sm text-ink outline-none"
          >
            <option value="hoy">Hoy</option>
            <option value="30d">Últimos 30 días</option>
            <option value="trimestre">Este trimestre</option>
            <option value="anio">Este año</option>
          </select>
          {/* Dropdown Nuevo */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              className="flex h-10 items-center gap-2 rounded-2xl bg-brand-gradient px-4 text-sm font-bold text-white shadow-soft hover:opacity-90"
            >
              <Plus size={16} />
              Nuevo
              <ChevronDown size={14} className={`transition-transform ${menuAbierto ? 'rotate-180' : ''}`} />
            </button>
            {menuAbierto && (
              <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-lift">
                {opcionesNuevo.map(({ icon: Icon, label, ruta }) => (
                  <button
                    key={ruta}
                    onClick={() => { navigate(ruta); setMenuAbierto(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-ink/70 transition hover:bg-brand-50 hover:text-ink"
                  >
                    <Icon size={15} className="text-brand-500" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {errorPanel && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorPanel}</p>}
      {aviso && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{aviso}</p>}

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpisVista.map((kpi) => (
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
              <p className="text-xs text-ink/45">Terapias, cursos y productos · {esReal ? 'últimos 8 meses (USD)' : '2026'}</p>
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
            {mesesVista.map((d) => (
              <div key={d.mes} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-[200px] w-full flex-col items-stretch justify-end gap-0.5">
                  <div
                    className="rounded-t bg-lilac-400/80 transition-all duration-700 ease-out"
                    style={{ height: animar ? `${(d.academia / maxVista) * 100}%` : '0%' }}
                  />
                  <div
                    className="rounded-b bg-brand-500 transition-all duration-700 ease-out"
                    style={{ height: animar ? `${(d.terapias / maxVista) * 100}%` : '0%' }}
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
              {canalesVista.map((c) => (
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
            <span>{real ? 'Total del periodo' : 'Ticket promedio'}</span>
            <b className="text-ink">{real ? usd(totalCanales) : '$42.80'}</b>
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
            <Link to="/admin/agenda" className="text-xs font-semibold text-brand-600 hover:underline">Ver agenda</Link>
          </div>
          <ul className="divide-y divide-brand-50 text-sm">
            {real && citasVista.length === 0 && <li className="py-3 text-xs text-ink/45">No hay citas próximas.</li>}
            {citasVista.map((c) => (
              <li key={c.clave} className="flex items-center gap-3 py-3">
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
            <Link to="/admin/pagos" className="text-xs font-semibold text-brand-600 hover:underline">Ver todas</Link>
          </div>
          <ul className="divide-y divide-brand-50 text-sm">
            {real && ventasVista.length === 0 && <li className="py-3 text-xs text-ink/45">Aún no hay ventas.</li>}
            {ventasVista.map((s) => (
              <li key={s.clave} className="flex items-center gap-3 py-3">
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
            <span className="text-xs text-ink/45">{pendientesVista.length} pendientes</span>
          </div>
          <ul className="divide-y divide-brand-50 text-sm">
            {real && pendientesVista.length === 0 && <li className="py-2.5 text-xs text-ink/45">No hay pagos por verificar.</li>}
            {pendientesVista.map((p) => (
              <li key={p.clave} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-semibold text-ink">{p.nombre}</p>
                  <p className="text-xs text-ink/45">{p.detalle}</p>
                </div>
                <div className="text-right">
                  <b className="block text-ink">{p.monto}</b>
                  <button onClick={() => navigate('/admin/pagos')} className="text-[11px] font-semibold text-brand-600 hover:underline">Verificar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-rose-600">
              <AlertTriangle size={17} />
              {real ? 'Saldos por cobrar' : 'Cuotas vencidas'}
            </h2>
            <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
              {saldosVista.length} {real ? 'con saldo' : 'vencidas'}
            </span>
          </div>
          <ul className="divide-y divide-brand-50 text-sm">
            {real && saldosVista.length === 0 && <li className="py-2.5 text-xs text-ink/45">No hay saldos pendientes.</li>}
            {saldosVista.map((o) => (
              <li key={o.clave} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-semibold text-ink">{o.nombre}</p>
                  <p className="text-xs text-rose-500">{o.detalle}</p>
                </div>
                <div className="text-right">
                  <b className="block text-ink">{o.monto}</b>
                  <button onClick={() => void notificarSaldo(o.citaId, o.nombre)} className="text-[11px] font-semibold text-brand-600 hover:underline">Notificar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="pb-6 pt-2 text-center text-xs text-ink/35">
        PsiqueAmor ERP · {esReal ? 'datos en tiempo real' : 'Prototipo de interfaz — datos de demostración'}
      </footer>
    </AdminLayout>
  );
}
