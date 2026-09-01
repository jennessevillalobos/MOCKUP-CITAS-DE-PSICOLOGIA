import { useMemo, useState } from 'react';
import { Search, Check, X, Landmark, RotateCcw, Wallet, Clock, TrendingUp } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminModal from '@/components/admin/ui/AdminModal';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import { demoPagos, type PagoRecord, type EstadoPago, type MetodoPago, type ReembolsoRecord } from '@/data/admin/paymentsData';

const HOY = '2026-08-12';

const text = {
  es: {
    title: 'Pagos', subtitle: 'Verificación de pagos manuales y reembolsos · datos de demostración',
    kpiReview: 'Por revisar', kpiApprovedToday: 'Aprobados hoy', kpiPending: 'Monto pendiente', kpiRefunds: 'Reembolsos del mes',
    search: 'Buscar por cliente o concepto…', method: 'Método', all: 'Todos', results: 'resultados',
    client: 'Cliente', concept: 'Concepto', date: 'Fecha', amount: 'Monto', status: 'Estado', noResults: 'No hay pagos con estos filtros.',
    detail: 'Detalle del pago', receipt: 'Comprobante de transferencia', bank: 'Banco emisor', reference: 'Referencia',
    verify: 'Verificar', reject: 'Rechazar', refund: 'Emitir reembolso', close: 'Cerrar',
    estados: {
      Pendiente: 'Pendiente', Reportado: 'Reportado', 'En revisión': 'En revisión', Aprobado: 'Aprobado',
      Rechazado: 'Rechazado', Reembolsado: 'Reembolsado', Parcial: 'Parcial', Vencido: 'Vencido',
    } as Record<EstadoPago, string>,
    refundTitle: 'Emitir reembolso', refundType: 'Tipo de reembolso', total: 'Total', partial: 'Parcial',
    refundAmount: 'Monto a reembolsar', reason: 'Motivo', notes: 'Notas adicionales', credit: 'Generar crédito a favor del cliente',
    refundMethod: 'Método de devolución', confirmRefund: 'Confirmar reembolso', cancel: 'Cancelar',
    refundedOn: 'Reembolsado el', refundInfo: 'Información del reembolso',
  },
  en: {
    title: 'Payments', subtitle: 'Manual payment verification and refunds · demo data',
    kpiReview: 'To review', kpiApprovedToday: 'Approved today', kpiPending: 'Pending amount', kpiRefunds: 'Refunds this month',
    search: 'Search by client or concept…', method: 'Method', all: 'All', results: 'results',
    client: 'Client', concept: 'Concept', date: 'Date', amount: 'Amount', status: 'Status', noResults: 'No payments match these filters.',
    detail: 'Payment detail', receipt: 'Transfer receipt', bank: 'Issuing bank', reference: 'Reference',
    verify: 'Verify', reject: 'Reject', refund: 'Issue refund', close: 'Close',
    estados: {
      Pendiente: 'Pending', Reportado: 'Reported', 'En revisión': 'In review', Aprobado: 'Approved',
      Rechazado: 'Rejected', Reembolsado: 'Refunded', Parcial: 'Partial', Vencido: 'Overdue',
    } as Record<EstadoPago, string>,
    refundTitle: 'Issue refund', refundType: 'Refund type', total: 'Total', partial: 'Partial',
    refundAmount: 'Amount to refund', reason: 'Reason', notes: 'Additional notes', credit: 'Generate credit for the client',
    refundMethod: 'Refund method', confirmRefund: 'Confirm refund', cancel: 'Cancel',
    refundedOn: 'Refunded on', refundInfo: 'Refund information',
  },
} as const;

function estadoTone(estado: EstadoPago) {
  if (estado === 'Aprobado') return 'positivo';
  if (estado === 'Rechazado' || estado === 'Vencido') return 'negativo';
  if (estado === 'Pendiente' || estado === 'Parcial') return 'alerta';
  return 'neutro';
}

const ESTADOS: EstadoPago[] = ['Pendiente', 'Reportado', 'En revisión', 'Aprobado', 'Rechazado', 'Reembolsado', 'Parcial', 'Vencido'];

export default function AdminPaymentsPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];
  const [pagos, setPagos] = useState<PagoRecord[]>(demoPagos);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoPago>('Todos');
  const [filtroMetodo, setFiltroMetodo] = useState<'Todos' | MetodoPago>('Todos');
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundForm, setRefundForm] = useState<ReembolsoRecord>({
    tipo: 'Total', monto: 0, motivo: '', notas: '', generarCredito: false, metodoDevolucion: 'Transferencia', fecha: HOY,
  });

  const seleccionado = pagos.find((p) => p.id === seleccionadoId) || null;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pagos.filter((p) => {
      const matchQ = !q || p.cliente.toLowerCase().includes(q) || p.concepto.toLowerCase().includes(q);
      const matchEstado = filtroEstado === 'Todos' || p.estado === filtroEstado;
      const matchMetodo = filtroMetodo === 'Todos' || p.metodo === filtroMetodo;
      return matchQ && matchEstado && matchMetodo;
    });
  }, [pagos, busqueda, filtroEstado, filtroMetodo]);

  const kpi = useMemo(() => {
    const porRevisar = pagos.filter((p) => ['Pendiente', 'Reportado', 'En revisión'].includes(p.estado)).length;
    const aprobadosHoy = pagos.filter((p) => p.estado === 'Aprobado' && p.fecha === HOY).length;
    const montoPendiente = pagos
      .filter((p) => ['Pendiente', 'Reportado', 'En revisión', 'Vencido'].includes(p.estado))
      .reduce((acc, p) => acc + p.monto, 0);
    const reembolsosMes = pagos.reduce((acc, p) => acc + (p.reembolso ? p.reembolso.monto : 0), 0);
    return { porRevisar, aprobadosHoy, montoPendiente, reembolsosMes };
  }, [pagos]);

  function actualizarEstado(id: string, estado: EstadoPago, notas?: string) {
    setPagos((prev) => prev.map((p) => (p.id === id ? { ...p, estado, notas: notas ?? p.notas } : p)));
    setSeleccionadoId(null);
  }

  function abrirReembolso() {
    if (!seleccionado) return;
    setRefundForm({ tipo: 'Total', monto: seleccionado.monto, motivo: '', notas: '', generarCredito: false, metodoDevolucion: seleccionado.metodo, fecha: HOY });
    setRefundOpen(true);
  }

  function confirmarReembolso() {
    if (!seleccionado) return;
    const estado: EstadoPago = refundForm.tipo === 'Total' ? 'Reembolsado' : 'Parcial';
    setPagos((prev) => prev.map((p) => (p.id === seleccionado.id ? { ...p, estado, reembolso: refundForm } : p)));
    setRefundOpen(false);
    setSeleccionadoId(null);
  }

  const kpiCards = [
    { label: t.kpiReview, value: kpi.porRevisar, icon: Clock, tone: 'text-amber-600 bg-amber-50' },
    { label: t.kpiApprovedToday, value: kpi.aprobadosHoy, icon: TrendingUp, tone: 'text-emerald-600 bg-emerald-50' },
    { label: t.kpiPending, value: `$${kpi.montoPendiente.toFixed(0)}`, icon: Wallet, tone: 'text-brand-600 bg-brand-50' },
    { label: t.kpiRefunds, value: `$${kpi.reembolsosMes.toFixed(0)}`, icon: RotateCcw, tone: 'text-lilac-600 bg-lilac-50' },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${k.tone}`}>
                <Icon size={16} />
              </span>
              <p className="mt-3 font-display text-2xl font-semibold text-ink">{k.value}</p>
              <p className="text-xs text-ink/50">{k.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft">
        <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-3">
          <Search size={15} className="text-ink/35" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
            placeholder={t.search}
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink/50">
          {t.method}
          <select
            value={filtroMetodo}
            onChange={(e) => setFiltroMetodo(e.target.value as 'Todos' | MetodoPago)}
            className="h-9 rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none"
          >
            <option value="Todos">{t.all}</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Pago móvil">Pago móvil</option>
          </select>
        </label>
        <span className="ml-auto text-xs text-ink/40">{filtrados.length} {t.results}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFiltroEstado('Todos')}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
            filtroEstado === 'Todos' ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 bg-white text-ink/55 hover:bg-brand-50'
          }`}
        >
          {t.all}
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              filtroEstado === e ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 bg-white text-ink/55 hover:bg-brand-50'
            }`}
          >
            {t.estados[e]}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                <th className="px-5 py-3 font-semibold">{t.client}</th>
                <th className="px-5 py-3 font-semibold">{t.concept}</th>
                <th className="px-5 py-3 font-semibold">{t.method}</th>
                <th className="px-5 py-3 font-semibold">{t.date}</th>
                <th className="px-5 py-3 font-semibold">{t.amount}</th>
                <th className="px-5 py-3 font-semibold">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filtrados.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-brand-50/50" onClick={() => setSeleccionadoId(p.id)}>
                  <td className="px-5 py-3 font-semibold text-ink">{p.cliente}</td>
                  <td className="px-5 py-3 text-ink/60">{p.concepto}</td>
                  <td className="px-5 py-3 text-ink/60">{p.metodo}</td>
                  <td className="px-5 py-3 text-ink/50">{p.fecha}</td>
                  <td className="px-5 py-3 font-semibold text-ink">{p.moneda} {p.monto}</td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={estadoTone(p.estado)}>{t.estados[p.estado]}</StatusBadge>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink/40">{t.noResults}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {seleccionado && (
        <AdminModal title={t.detail} onClose={() => setSeleccionadoId(null)}>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-ink">{seleccionado.cliente}</p>
                <p className="text-xs text-ink/50">{seleccionado.concepto}</p>
              </div>
              <StatusBadge tone={estadoTone(seleccionado.estado)}>{t.estados[seleccionado.estado]}</StatusBadge>
            </div>

            {seleccionado.metodo === 'Transferencia' && (
              <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">
                  <Landmark size={13} />
                  {t.receipt}
                </p>
                <div className="space-y-1.5 rounded-xl border border-brand-100 bg-white p-3 font-mono text-xs text-ink/70">
                  <p className="flex justify-between"><span>{t.bank}</span><span className="font-semibold text-ink">{seleccionado.banco || '—'}</span></p>
                  <p className="flex justify-between"><span>{t.reference}</span><span className="font-semibold text-ink">{seleccionado.referencia || '—'}</span></p>
                  <p className="flex justify-between"><span>{t.amount}</span><span className="font-semibold text-ink">{seleccionado.moneda} {seleccionado.monto}</span></p>
                  <p className="flex justify-between"><span>{t.date}</span><span className="font-semibold text-ink">{seleccionado.fecha}</span></p>
                </div>
              </div>
            )}

            {seleccionado.notas && (
              <p className="rounded-2xl bg-rose-50 p-3 text-xs text-rose-600">{seleccionado.notas}</p>
            )}

            {seleccionado.reembolso && (
              <div className="rounded-2xl border border-lilac-200 bg-lilac-50/60 p-3 text-xs text-ink/70">
                <p className="mb-1 font-bold uppercase tracking-wide text-lilac-700">{t.refundInfo}</p>
                <p>{seleccionado.reembolso.tipo} · {seleccionado.moneda} {seleccionado.reembolso.monto} · {t.refundedOn} {seleccionado.reembolso.fecha}</p>
                <p className="mt-1 text-ink/55">{seleccionado.reembolso.motivo}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-brand-100 pt-3">
              {['Pendiente', 'Reportado', 'En revisión', 'Vencido'].includes(seleccionado.estado) && (
                <>
                  <button
                    onClick={() => actualizarEstado(seleccionado.id, 'Aprobado')}
                    className="flex items-center gap-2 rounded-2xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-soft"
                  >
                    <Check size={15} />
                    {t.verify}
                  </button>
                  <button
                    onClick={() => actualizarEstado(seleccionado.id, 'Rechazado', 'Comprobante rechazado por un administrador.')}
                    className="flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <X size={15} />
                    {t.reject}
                  </button>
                </>
              )}
              {seleccionado.estado === 'Aprobado' && (
                <button
                  onClick={abrirReembolso}
                  className="flex items-center gap-2 rounded-2xl border border-lilac-200 px-4 py-2.5 text-sm font-semibold text-lilac-700 hover:bg-lilac-50"
                >
                  <RotateCcw size={15} />
                  {t.refund}
                </button>
              )}
            </div>
          </div>
        </AdminModal>
      )}

      {refundOpen && seleccionado && (
        <AdminModal title={t.refundTitle} onClose={() => setRefundOpen(false)}>
          <div className="space-y-4 text-sm">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.refundType}</label>
              <div className="flex gap-1 rounded-2xl border border-brand-100 bg-brand-50/40 p-1">
                {(['Total', 'Parcial'] as const).map((op) => (
                  <button
                    key={op}
                    onClick={() => setRefundForm((f) => ({ ...f, tipo: op, monto: op === 'Total' ? seleccionado.monto : f.monto }))}
                    className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      refundForm.tipo === op ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/50 hover:bg-white'
                    }`}
                  >
                    {op === 'Total' ? t.total : t.partial}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.refundAmount}</label>
              <input
                type="number"
                value={refundForm.monto}
                disabled={refundForm.tipo === 'Total'}
                onChange={(e) => setRefundForm((f) => ({ ...f, monto: Number(e.target.value) }))}
                className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none disabled:bg-ink/5"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.reason}</label>
              <input
                value={refundForm.motivo}
                onChange={(e) => setRefundForm((f) => ({ ...f, motivo: e.target.value }))}
                className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.notes}</label>
              <textarea
                value={refundForm.notas}
                onChange={(e) => setRefundForm((f) => ({ ...f, notas: e.target.value }))}
                rows={2}
                className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.refundMethod}</label>
              <select
                value={refundForm.metodoDevolucion}
                onChange={(e) => setRefundForm((f) => ({ ...f, metodoDevolucion: e.target.value as MetodoPago }))}
                className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none"
              >
                <option>Transferencia</option>
                <option>Efectivo</option>
                <option>Tarjeta</option>
                <option>Pago móvil</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={refundForm.generarCredito}
                onChange={(e) => setRefundForm((f) => ({ ...f, generarCredito: e.target.checked }))}
                className="h-4 w-4 rounded border-brand-300 text-brand-600"
              />
              {t.credit}
            </label>
            <div className="flex gap-2 border-t border-brand-100 pt-3">
              <button onClick={() => setRefundOpen(false)} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">{t.cancel}</button>
              <button onClick={confirmarReembolso} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">{t.confirmRefund}</button>
            </div>
          </div>
        </AdminModal>
      )}
    </AdminLayout>
  );
}
