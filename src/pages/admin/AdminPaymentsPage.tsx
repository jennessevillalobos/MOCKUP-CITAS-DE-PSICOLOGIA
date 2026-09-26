import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Check, X, Landmark, RotateCcw, Wallet, Clock, TrendingUp, FileImage } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminModal from '@/components/admin/ui/AdminModal';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import { demoPagos, type PagoRecord, type EstadoPago, type MetodoPago, type ReembolsoRecord } from '@/data/admin/paymentsData';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useDialogo } from '@/context/DialogoContext';
import { listarPagosAdmin, reembolsarPago, type PagoAdmin } from '@/lib/api/admin';
import { revisarPago, urlComprobante } from '@/lib/api/pagos';

const HOY_DEMO = '2026-08-12';

function hoyLocal(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Con Supabase: pago de la base → fila de la pantalla.
type RegistroPago = PagoRecord & { comprobante?: string | null; profesional?: string | null; disponible?: number; real?: boolean };

const METODO_DESDE_BASE: Record<string, MetodoPago> = {
  transferencia: 'Transferencia', manual: 'Efectivo', credito: 'Efectivo', stripe: 'Tarjeta', paypal: 'Tarjeta',
};

function desdeBase(p: PagoAdmin): RegistroPago {
  const estado: EstadoPago =
    p.estado === 'pendiente' ? 'En revisión'
      : p.estado === 'rechazado' ? 'Rechazado'
        : p.estado === 'reembolsado' ? 'Reembolsado'
          : p.estado === 'pendiente_reembolso' ? 'Pendiente'
            : p.reembolsado > 0 ? 'Parcial' : 'Aprobado';
  const metodo = METODO_DESDE_BASE[p.metodo] ?? 'Transferencia';
  const ultimo = p.reembolsos[p.reembolsos.length - 1];
  return {
    id: p.id,
    cliente: p.cliente ?? '—',
    correo: p.correo ?? '',
    concepto: p.concepto,
    metodo,
    monto: p.monto,
    moneda: p.moneda,
    fecha: hoyLocal(p.fecha),
    estado,
    referencia: p.referencia ?? undefined,
    notas: p.motivoRechazo ? `Motivo del rechazo: ${p.motivoRechazo}` : undefined,
    reembolso: ultimo
      ? {
          tipo: p.estado === 'reembolsado' ? 'Total' : 'Parcial',
          monto: p.reembolsado,
          motivo: p.reembolsos.map((r) => r.motivo).join(' · '),
          generarCredito: false,
          metodoDevolucion: metodo,
          fecha: hoyLocal(ultimo.fecha),
        }
      : undefined,
    comprobante: p.comprobante,
    profesional: p.profesional,
    disponible: Math.round((p.monto - p.reembolsado) * 100) / 100,
    real: true,
  };
}

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
  const { esReal } = useAdminAuth();
  const { confirmar, pedirTexto } = useDialogo();
  const HOY = esReal ? hoyLocal() : HOY_DEMO;
  const [pagos, setPagos] = useState<RegistroPago[]>(() => (esReal ? [] : demoPagos));
  const [cargando, setCargando] = useState(esReal);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [urlRecibo, setUrlRecibo] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoPago>('Todos');
  const [filtroMetodo, setFiltroMetodo] = useState<'Todos' | MetodoPago>('Todos');
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundForm, setRefundForm] = useState<ReembolsoRecord>({
    tipo: 'Total', monto: 0, motivo: '', notas: '', generarCredito: false, metodoDevolucion: 'Transferencia', fecha: HOY,
  });

  const seleccionado = pagos.find((p) => p.id === seleccionadoId) || null;

  function mostrarAviso(texto: string, error = false) {
    setAviso({ texto, error });
    window.setTimeout(() => setAviso(null), 4000);
  }

  const recargar = useCallback(async () => {
    if (!esReal) return;
    const res = await listarPagosAdmin();
    setCargando(false);
    if (res.error) setErrorCarga(res.error.message);
    else {
      setErrorCarga(null);
      setPagos(res.data.map(desdeBase));
    }
  }, [esReal]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  // Comprobante (bucket privado): enlace temporal al abrir el detalle.
  useEffect(() => {
    setUrlRecibo(null);
    if (!esReal || !seleccionado?.comprobante) return;
    let vigente = true;
    void urlComprobante(seleccionado.comprobante).then((u) => vigente && setUrlRecibo(u));
    return () => {
      vigente = false;
    };
  }, [esReal, seleccionado?.id, seleccionado?.comprobante]);

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
    const mes = HOY.slice(0, 7);
    const reembolsosMes = pagos.reduce(
      (acc, p) => acc + (p.reembolso && (!esReal || p.reembolso.fecha.startsWith(mes)) ? p.reembolso.monto : 0),
      0
    );
    return { porRevisar, aprobadosHoy, montoPendiente, reembolsosMes };
  }, [pagos, HOY, esReal]);

  async function actualizarEstado(id: string, estado: EstadoPago, notas?: string) {
    if (!esReal) {
      setPagos((prev) => prev.map((p) => (p.id === id ? { ...p, estado, notas: notas ?? p.notas } : p)));
      setSeleccionadoId(null);
      return;
    }
    // Modo real: la misma revisión que usa la profesional (revisar_pago).
    const aprobar = estado === 'Aprobado';
    let motivo: string | undefined;
    if (aprobar) {
      const pago = pagos.find((p) => p.id === id);
      const ok = await confirmar(
        `¿Aprobar el pago de ${pago?.moneda ?? ''} ${pago?.monto ?? ''} de ${pago?.cliente ?? 'este cliente'}? Se abonará a su cita, curso o producto.`,
        { textoAceptar: 'Aprobar' }
      );
      if (!ok) return;
    } else {
      const texto = await pedirTexto('Motivo del rechazo (lo verá el paciente):', { peligro: true, textoAceptar: 'Rechazar' });
      if (texto === null) return;
      motivo = texto;
    }
    setProcesando(true);
    const res = await revisarPago(id, aprobar, motivo);
    setProcesando(false);
    if (res.error) return mostrarAviso(res.error.message, true);
    mostrarAviso(aprobar ? 'Pago aprobado.' : 'Pago rechazado.');
    setSeleccionadoId(null);
    await recargar();
  }

  function abrirReembolso() {
    if (!seleccionado) return;
    const disponible = seleccionado.disponible ?? seleccionado.monto;
    setRefundForm({ tipo: 'Total', monto: disponible, motivo: '', notas: '', generarCredito: false, metodoDevolucion: seleccionado.metodo, fecha: HOY });
    setRefundOpen(true);
  }

  async function confirmarReembolso() {
    if (!seleccionado) return;
    if (esReal) {
      const disponible = seleccionado.disponible ?? seleccionado.monto;
      const monto = refundForm.tipo === 'Total' ? disponible : refundForm.monto;
      if (!refundForm.motivo.trim()) return mostrarAviso('Indica el motivo del reembolso.', true);
      if (!(monto > 0) || monto > disponible) return mostrarAviso(`El monto debe estar entre 0,01 y ${disponible}.`, true);
      setProcesando(true);
      const res = await reembolsarPago(seleccionado.id, monto, [refundForm.motivo.trim(), refundForm.notas?.trim()].filter(Boolean).join(' — '));
      setProcesando(false);
      if (res.error) return mostrarAviso(res.error.message, true);
      mostrarAviso('Reembolso registrado. El paciente recibió un aviso.');
      setRefundOpen(false);
      setSeleccionadoId(null);
      await recargar();
      return;
    }
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
          <p className="mt-1 text-sm text-ink/50">
            {esReal ? (lang === 'es' ? 'Verificación de pagos manuales y reembolsos · datos reales' : 'Manual payment verification and refunds · live data') : t.subtitle}
            {cargando ? ' · …' : ''}
          </p>
        </div>
      </div>

      {errorCarga && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorCarga}</p>}
      {aviso && (
        <p
          role="status"
          className={`fixed bottom-6 right-6 z-[60] max-w-sm rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-lg ${aviso.error ? 'bg-rose-600' : 'bg-emerald-600'}`}
        >
          {aviso.texto}
        </p>
      )}

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
                  {!seleccionado.real && (
                    <p className="flex justify-between"><span>{t.bank}</span><span className="font-semibold text-ink">{seleccionado.banco || '—'}</span></p>
                  )}
                  <p className="flex justify-between"><span>{t.reference}</span><span className="font-semibold text-ink">{seleccionado.referencia || '—'}</span></p>
                  <p className="flex justify-between"><span>{t.amount}</span><span className="font-semibold text-ink">{seleccionado.moneda} {seleccionado.monto}</span></p>
                  <p className="flex justify-between"><span>{t.date}</span><span className="font-semibold text-ink">{seleccionado.fecha}</span></p>
                </div>
                {seleccionado.real &&
                  (seleccionado.comprobante ? (
                    urlRecibo ? (
                      <a href={urlRecibo} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl border border-brand-100 bg-white">
                        {/\.pdf($|\?)/i.test(seleccionado.comprobante) ? (
                          <span className="flex items-center gap-2 p-3 text-xs font-semibold text-brand-700"><FileImage size={14} />Abrir comprobante (PDF)</span>
                        ) : (
                          <>
                            <img src={urlRecibo} alt="Comprobante" className="max-h-72 w-full object-contain" />
                            <span className="flex items-center gap-2 border-t border-brand-100 p-2 text-xs font-semibold text-brand-700">
                              <FileImage size={14} />
                              Abrir comprobante
                            </span>
                          </>
                        )}
                      </a>
                    ) : (
                      <p className="mt-3 text-xs text-ink/45">Cargando comprobante…</p>
                    )
                  ) : (
                    <p className="mt-3 text-xs text-ink/45">El paciente no adjuntó comprobante.</p>
                  ))}
              </div>
            )}

            {seleccionado.real && seleccionado.profesional && (
              <p className="text-xs text-ink/50">Profesional responsable: <b className="text-ink/70">{seleccionado.profesional}</b></p>
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
                    onClick={() => void actualizarEstado(seleccionado.id, 'Aprobado')}
                    disabled={procesando}
                    className="flex items-center gap-2 rounded-2xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-soft disabled:opacity-60"
                  >
                    <Check size={15} />
                    {t.verify}
                  </button>
                  <button
                    onClick={() => void actualizarEstado(seleccionado.id, 'Rechazado', 'Comprobante rechazado por un administrador.')}
                    disabled={procesando}
                    className="flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                  >
                    <X size={15} />
                    {t.reject}
                  </button>
                </>
              )}
              {(seleccionado.estado === 'Aprobado' || (seleccionado.real && seleccionado.estado === 'Parcial')) && (
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
            {seleccionado.real && (
              <p className="rounded-2xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-ink/60">
                El dinero se devuelve por fuera (transferencia, efectivo…). Aquí queda registrado: en una cita vuelve a quedar ese saldo;
                en un curso o libro, un reembolso <b>total</b> quita el acceso. Disponible para reembolsar: {seleccionado.moneda}{' '}
                {seleccionado.disponible}.
              </p>
            )}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.refundType}</label>
              <div className="flex gap-1 rounded-2xl border border-brand-100 bg-brand-50/40 p-1">
                {(['Total', 'Parcial'] as const).map((op) => (
                  <button
                    key={op}
                    onClick={() =>
                      setRefundForm((f) => ({ ...f, tipo: op, monto: op === 'Total' ? seleccionado.disponible ?? seleccionado.monto : f.monto }))
                    }
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
            {!seleccionado.real && (
            <>
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
            </>
            )}
            <div className="flex gap-2 border-t border-brand-100 pt-3">
              <button onClick={() => setRefundOpen(false)} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">{t.cancel}</button>
              <button
                onClick={() => void confirmarReembolso()}
                disabled={procesando}
                className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft disabled:opacity-60"
              >
                {t.confirmRefund}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </AdminLayout>
  );
}
