import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Check, Coins, History, Tag, Receipt, Star, TrendingUp } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminModal from '@/components/admin/ui/AdminModal';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import {
  demoMonedas, demoHistorialTasas, demoPreciosPorMoneda, demoOrdenes,
  type MonedaRecord, type PrecioMonedaRecord, type OrdenRecord,
} from '@/data/admin/currenciesData';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useDialogo } from '@/context/DialogoContext';
import {
  cargarMonedasYTasas,
  guardarMonedaAdmin,
  estadoMonedaAdmin,
  registrarTasaAdmin,
  listarOrdenesAdmin,
  registrarAbonoAdmin,
  type OrdenAdmin,
} from '@/lib/api/admin';

function fechaLocal(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const METODO_LABEL: Record<string, string> = {
  transferencia: 'Transferencia', manual: 'Registrado por administración', stripe: 'Tarjeta', paypal: 'PayPal', credito: 'Crédito',
};

// Con Supabase: orden de la base → fila de la pantalla (una línea por orden).
type RegistroOrden = OrdenRecord & { real?: boolean; etiqueta?: string; saldo?: number; reembolsado?: number; enRevision?: number };

function ordenDesdeBase(o: OrdenAdmin): RegistroOrden {
  const aprobados = o.pagos.filter((p) => p.estado === 'aprobado' || p.estado === 'reembolsado');
  const cobrado = aprobados.reduce((acc, p) => acc + p.monto, 0) - o.reembolsado;
  const saldo = o.tipo === 'cita' && o.saldoCita !== null ? o.saldoCita : Math.max(0, Math.round((o.total - cobrado) * 100) / 100);
  const estado: OrdenRecord['estado'] = o.estado === 'pagado' ? 'Pagada' : cobrado > 0 ? 'Parcial' : 'Pendiente';
  return {
    id: o.id,
    cliente: o.cliente ?? '—',
    fecha: fechaLocal(o.fecha),
    moneda: o.moneda,
    total: o.total,
    items: [{ concepto: o.concepto ?? 'Orden', cantidad: 1, precioUnitario: o.total }],
    abonos: o.pagos
      .filter((p) => p.estado !== 'rechazado')
      .map((p) => ({
        id: p.id,
        monto: p.monto,
        moneda: p.moneda,
        tasaAlPagar: 1,
        fecha: fechaLocal(p.fecha),
        metodo:
          (METODO_LABEL[p.metodo] ?? p.metodo) +
          (p.estado === 'pendiente' ? ' · en revisión' : p.estado === 'reembolsado' ? ' · reembolsado' : ''),
      })),
    estado,
    real: true,
    etiqueta: o.estado === 'reembolsado' ? 'Reembolsada' : o.estado === 'cancelado' ? 'Cancelada' : undefined,
    saldo,
    reembolsado: o.reembolsado,
    enRevision: o.pagos.filter((p) => p.estado === 'pendiente').reduce((acc, p) => acc + p.monto, 0),
  };
}

type Tab = 'monedas' | 'tasas' | 'precios' | 'ordenes';

const text = {
  es: {
    title: 'Motor financiero', subtitle: 'Monedas, tasas de cambio, precios y órdenes · datos de demostración',
    tabs: { monedas: 'Monedas', tasas: 'Tasas de cambio', precios: 'Precios por moneda', ordenes: 'Órdenes' } as Record<Tab, string>,
    addCurrency: 'Agregar moneda', currency: 'Moneda', symbol: 'Símbolo', rate: 'Tasa (por 1 USD)', updated: 'Actualizada',
    status: 'Estado', active: 'Activa', inactive: 'Inactiva', base: 'Base', baseNote: 'USD es la moneda base del sistema y su tasa no se puede editar. Las monedas inactivas no aparecen como opción de pago.',
    registerRate: 'Registrar nueva tasa', selectCurrency: 'Moneda', newRate: 'Nueva tasa', register: 'Registrar', history: 'Historial de tasas',
    source: 'Fuente', manual: 'Manual', auto: 'Automática', date: 'Fecha',
    pricingMode: 'Modo de precio', service: 'Servicio', automatic: 'Automático', fixed: 'Fijo', fixedPrice: 'Precio fijo',
    kpiTotalOrders: 'Órdenes totales', kpiPaid: 'Pagadas', kpiPartial: 'Parciales', kpiOverdue: 'Vencidas',
    order: 'Orden', client: 'Cliente', total: 'Total', paid: 'Abonado', balance: 'Saldo',
    orderDetail: 'Detalle de la orden', items: 'Ítems', qty: 'Cant.', unitPrice: 'Precio unit.', payments: 'Abonos',
    rateAtPayment: 'Tasa al momento del pago', method: 'Método', addPayment: 'Registrar abono', amount: 'Monto', close: 'Cerrar',
    estadosOrden: { Pagada: 'Pagada', Parcial: 'Parcial', Pendiente: 'Pendiente', Vencida: 'Vencida' } as Record<OrdenRecord['estado'], string>,
    save: 'Guardar',
  },
  en: {
    title: 'Financial engine', subtitle: 'Currencies, exchange rates, pricing and orders · demo data',
    tabs: { monedas: 'Currencies', tasas: 'Exchange rates', precios: 'Pricing per currency', ordenes: 'Orders' } as Record<Tab, string>,
    addCurrency: 'Add currency', currency: 'Currency', symbol: 'Symbol', rate: 'Rate (per 1 USD)', updated: 'Updated',
    status: 'Status', active: 'Active', inactive: 'Inactive', base: 'Base', baseNote: 'USD is the system base currency and its rate cannot be edited. Inactive currencies do not appear as a payment option.',
    registerRate: 'Register new rate', selectCurrency: 'Currency', newRate: 'New rate', register: 'Register', history: 'Rate history',
    source: 'Source', manual: 'Manual', auto: 'Automatic', date: 'Date',
    pricingMode: 'Pricing mode', service: 'Service', automatic: 'Automatic', fixed: 'Fixed', fixedPrice: 'Fixed price',
    kpiTotalOrders: 'Total orders', kpiPaid: 'Paid', kpiPartial: 'Partial', kpiOverdue: 'Overdue',
    order: 'Order', client: 'Client', total: 'Total', paid: 'Paid', balance: 'Balance',
    orderDetail: 'Order detail', items: 'Items', qty: 'Qty', unitPrice: 'Unit price', payments: 'Payments',
    rateAtPayment: 'Rate at time of payment', method: 'Method', addPayment: 'Register payment', amount: 'Amount', close: 'Close',
    estadosOrden: { Pagada: 'Paid', Parcial: 'Partial', Pendiente: 'Pending', Vencida: 'Overdue' } as Record<OrdenRecord['estado'], string>,
    save: 'Save',
  },
} as const;

function ordenTone(estado: OrdenRecord['estado']) {
  if (estado === 'Pagada') return 'positivo';
  if (estado === 'Vencida') return 'negativo';
  if (estado === 'Parcial') return 'alerta';
  return 'neutro';
}

export default function AdminFinancePage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'monedas';

  const { esReal } = useAdminAuth();
  const { confirmar } = useDialogo();
  const [monedas, setMonedas] = useState<MonedaRecord[]>(() => (esReal ? [] : demoMonedas));
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [nuevaMoneda, setNuevaMoneda] = useState<{ codigo: string; nombre: string; simbolo: string } | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tasaTemp, setTasaTemp] = useState('');

  const [rateMonedaId, setRateMonedaId] = useState('ves');
  const [rateValue, setRateValue] = useState('');
  const [historial, setHistorial] = useState(() => (esReal ? [] : demoHistorialTasas));

  const [precios, setPrecios] = useState<PrecioMonedaRecord[]>(demoPreciosPorMoneda);

  const [ordenes, setOrdenes] = useState<RegistroOrden[]>(() => (esReal ? [] : demoOrdenes));
  const [ordenSel, setOrdenSel] = useState<string | null>(null);
  const [nuevoAbono, setNuevoAbono] = useState('');

  const tabs: { key: Tab; label: string; icon: typeof Coins }[] = [
    { key: 'monedas', label: t.tabs.monedas, icon: Coins },
    { key: 'tasas', label: t.tabs.tasas, icon: History },
    { key: 'precios', label: t.tabs.precios, icon: Tag },
    { key: 'ordenes', label: t.tabs.ordenes, icon: Receipt },
  ];

  function mostrarAviso(texto: string, error = false) {
    setAviso({ texto, error });
    window.setTimeout(() => setAviso(null), 4000);
  }

  // Modo real: monedas y tasas (lectura pública) y órdenes (admin_listar_ordenes).
  const recargarMonedas = useCallback(async () => {
    if (!esReal) return;
    const res = await cargarMonedasYTasas();
    if (res.error) return setErrorCarga(res.error.message);
    const { monedas: ms, tasas } = res.data;
    setMonedas(
      ms.map((m) => {
        const ultima = tasas.find((x) => x.codigo === m.codigo);
        return {
          id: m.codigo.toLowerCase(),
          codigo: m.codigo,
          nombre: m.nombre,
          simbolo: m.simbolo,
          tasa: m.esPrincipal ? 1 : ultima?.tasa ?? 0,
          activa: m.activa,
          actualizada: m.esPrincipal ? '—' : ultima ? fechaLocal(ultima.fecha) : 'Sin tasa',
        };
      })
    );
    setHistorial(tasas.map((x) => ({ id: String(x.id), monedaId: x.codigo.toLowerCase(), tasa: x.tasa, fecha: fechaLocal(x.fecha), fuente: 'Manual' as const })));
    setRateMonedaId((actual) => (ms.some((m) => m.codigo.toLowerCase() === actual && !m.esPrincipal) ? actual : ms.find((m) => !m.esPrincipal)?.codigo.toLowerCase() ?? ''));
  }, [esReal]);

  const recargarOrdenes = useCallback(async () => {
    if (!esReal) return;
    const res = await listarOrdenesAdmin();
    if (res.error) return setErrorCarga(res.error.message);
    setOrdenes(res.data.map(ordenDesdeBase));
  }, [esReal]);

  useEffect(() => {
    void recargarMonedas();
    void recargarOrdenes();
  }, [recargarMonedas, recargarOrdenes]);

  const codigoDe = (id: string) => monedas.find((m) => m.id === id)?.codigo ?? id.toUpperCase();

  async function guardarNuevaMoneda() {
    if (!nuevaMoneda) return;
    const codigo = nuevaMoneda.codigo.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(codigo)) return mostrarAviso('El código debe tener 3 letras, por ejemplo VES.', true);
    if (!nuevaMoneda.nombre.trim() || !nuevaMoneda.simbolo.trim()) return mostrarAviso('Indica el nombre y el símbolo.', true);
    if (!esReal) {
      setMonedas((prev) =>
        prev.some((m) => m.codigo === codigo)
          ? prev
          : [...prev, { id: codigo.toLowerCase(), codigo, nombre: nuevaMoneda.nombre.trim(), simbolo: nuevaMoneda.simbolo.trim(), tasa: 0, activa: true, actualizada: 'Sin tasa' }]
      );
      setNuevaMoneda(null);
      return;
    }
    const res = await guardarMonedaAdmin(codigo, nuevaMoneda.nombre, nuevaMoneda.simbolo);
    if (res.error) return mostrarAviso(res.error.message, true);
    setNuevaMoneda(null);
    mostrarAviso(`Moneda ${codigo} guardada. Registra su tasa en "Tasas de cambio".`);
    await recargarMonedas();
  }

  function empezarEdicion(m: MonedaRecord) {
    setEditandoId(m.id);
    setTasaTemp(String(m.tasa));
  }
  async function guardarTasa(id: string) {
    const nueva = parseFloat(tasaTemp);
    if (esReal) {
      setEditandoId(null);
      if (Number.isNaN(nueva) || nueva <= 0) return mostrarAviso('La tasa debe ser mayor que 0.', true);
      const res = await registrarTasaAdmin(codigoDe(id), nueva);
      if (res.error) return mostrarAviso(res.error.message, true);
      mostrarAviso('Tasa registrada.');
      return recargarMonedas();
    }
    if (!Number.isNaN(nueva) && nueva > 0) {
      setMonedas((prev) => prev.map((m) => (m.id === id ? { ...m, tasa: nueva, actualizada: 'Justo ahora' } : m)));
    }
    setEditandoId(null);
  }
  async function toggleActiva(id: string) {
    if (esReal) {
      const m = monedas.find((x) => x.id === id);
      if (!m) return;
      const res = await estadoMonedaAdmin(m.codigo, !m.activa);
      if (res.error) return mostrarAviso(res.error.message, true);
      return recargarMonedas();
    }
    setMonedas((prev) => prev.map((m) => (m.id === id ? { ...m, activa: !m.activa } : m)));
  }

  async function registrarTasa() {
    const val = parseFloat(rateValue);
    if (Number.isNaN(val) || val <= 0) return mostrarAviso('La tasa debe ser mayor que 0.', true);
    if (esReal) {
      if (!rateMonedaId) return;
      const res = await registrarTasaAdmin(codigoDe(rateMonedaId), val);
      if (res.error) return mostrarAviso(res.error.message, true);
      setRateValue('');
      mostrarAviso('Tasa registrada.');
      return recargarMonedas();
    }
    setHistorial((prev) => [{ id: `h${Date.now()}`, monedaId: rateMonedaId, tasa: val, fecha: '2026-08-12', fuente: 'Manual' }, ...prev]);
    setMonedas((prev) => prev.map((m) => (m.id === rateMonedaId ? { ...m, tasa: val, actualizada: 'Justo ahora' } : m)));
    setRateValue('');
  }

  function togglePrecioModo(id: string) {
    setPrecios((prev) => prev.map((p) => (p.id === id ? { ...p, modo: p.modo === 'Automático' ? 'Fijo' : 'Automático' } : p)));
  }
  function setPrecioFijo(id: string, valor: number) {
    setPrecios((prev) => prev.map((p) => (p.id === id ? { ...p, precioFijo: valor } : p)));
  }

  const orden = ordenes.find((o) => o.id === ordenSel) || null;
  const kpiOrdenes = useMemo(() => {
    const total = ordenes.length;
    const pagadas = ordenes.filter((o) => o.estado === 'Pagada').length;
    const parciales = ordenes.filter((o) => o.estado === 'Parcial').length;
    const vencidas = ordenes.filter((o) => o.estado === 'Vencida').length;
    return { total, pagadas, parciales, vencidas };
  }, [ordenes]);

  function abonado(o: RegistroOrden) {
    if (o.real) return Math.round((o.total - (o.saldo ?? 0)) * 100) / 100;
    return o.abonos.reduce((acc, a) => acc + a.monto, 0);
  }
  const saldoDe = (o: RegistroOrden) => (o.real ? o.saldo ?? 0 : o.total - abonado(o));

  async function agregarAbono() {
    if (!orden) return;
    const monto = parseFloat(nuevoAbono);
    if (Number.isNaN(monto) || monto <= 0) return;
    if (esReal) {
      if (monto > saldoDe(orden)) return mostrarAviso(`El abono no puede superar el saldo (${orden.moneda} ${saldoDe(orden)}).`, true);
      const ok = await confirmar(
        `¿Registrar un abono de ${orden.moneda} ${monto} para ${orden.cliente}? Úsalo para pagos recibidos fuera del sistema (efectivo, pago móvil…). Queda aprobado de inmediato.${(orden.enRevision ?? 0) > 0 ? ` Ojo: hay ${orden.moneda} ${orden.enRevision} en transferencias por revisar; resuélvelas primero en Pagos para no cobrar de más.` : ''}`,
        { textoAceptar: 'Registrar' }
      );
      if (!ok) return;
      const res = await registrarAbonoAdmin(orden.id, monto);
      if (res.error) return mostrarAviso(res.error.message, true);
      setNuevoAbono('');
      mostrarAviso('Abono registrado. El paciente recibió un aviso.');
      return recargarOrdenes();
    }
    setOrdenes((prev) =>
      prev.map((o) => {
        if (o.id !== orden.id) return o;
        const abonos = [...o.abonos, { id: `ab${Date.now()}`, monto, moneda: o.moneda, tasaAlPagar: 1, fecha: '2026-08-12', metodo: 'Transferencia' }];
        const totalAbonado = abonos.reduce((acc, a) => acc + a.monto, 0);
        const estado: OrdenRecord['estado'] = totalAbonado >= o.total ? 'Pagada' : 'Parcial';
        return { ...o, abonos, estado };
      }),
    );
    setNuevoAbono('');
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">
            {esReal ? (lang === 'es' ? 'Monedas, tasas de cambio, precios y órdenes · datos reales' : 'Currencies, exchange rates, pricing and orders · live data') : t.subtitle}
          </p>
        </div>
        {tab === 'monedas' && (
          <button
            onClick={() => setNuevaMoneda({ codigo: '', nombre: '', simbolo: '' })}
            className="flex h-10 items-center gap-2 rounded-2xl bg-brand-gradient px-4 text-sm font-bold text-white shadow-soft"
          >
            <Plus size={16} />
            {t.addCurrency}
          </button>
        )}
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

      <div className="flex w-full max-w-2xl gap-1 rounded-2xl border border-brand-100 bg-white p-1">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setSearchParams({ tab: tb.key })}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
                active ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/50 hover:bg-brand-50'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tb.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'monedas' && (
        <>
          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-5 py-3 font-semibold">{t.currency}</th>
                    <th className="px-5 py-3 font-semibold">{t.symbol}</th>
                    <th className="px-5 py-3 font-semibold">{t.rate}</th>
                    <th className="px-5 py-3 font-semibold">{t.updated}</th>
                    <th className="px-5 py-3 font-semibold">{t.status}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {monedas.map((m) => (
                    <tr key={m.id} className="hover:bg-brand-50/50">
                      <td className="px-5 py-3">
                        <p className="flex items-center gap-1.5 font-semibold text-ink">
                          {m.id === 'usd' && <Star size={12} className="fill-amber-400 text-amber-400" />}
                          {m.codigo}
                        </p>
                        <p className="text-xs text-ink/45">{m.nombre}</p>
                      </td>
                      <td className="px-5 py-3 text-ink/60">{m.simbolo}</td>
                      <td className="px-5 py-3">
                        {editandoId === m.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number" step="0.01" value={tasaTemp} onChange={(e) => setTasaTemp(e.target.value)}
                              disabled={m.id === 'usd'} className="w-28 rounded-lg border border-brand-200 px-2 py-1 text-sm text-ink outline-none" autoFocus
                            />
                            <button onClick={() => void guardarTasa(m.id)} className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-white" aria-label="Guardar tasa">
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="font-semibold text-ink">
                            {m.tasa > 0 ? `${m.tasa.toLocaleString('es', { maximumFractionDigits: 4 })} ${m.codigo}` : '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink/45">{m.actualizada}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => void toggleActiva(m.id)} disabled={m.id === 'usd'}>
                          <StatusBadge tone={m.activa ? 'positivo' : 'neutro'}>{m.activa ? t.active : t.inactive}</StatusBadge>
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {m.id !== 'usd' && editandoId !== m.id && (
                          <button onClick={() => empezarEdicion(m)} className="rounded-lg p-1.5 text-ink/40 hover:bg-brand-50 hover:text-ink" aria-label="Editar tasa">
                            <Pencil size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="text-xs text-ink/40">{t.baseNote}</p>
        </>
      )}

      {tab === 'tasas' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <div className="h-fit rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <p className="mb-3 text-sm font-bold text-ink">{t.registerRate}</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.selectCurrency}</label>
                <select value={rateMonedaId} onChange={(e) => setRateMonedaId(e.target.value)} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none">
                  {monedas.filter((m) => m.id !== 'usd').map((m) => (
                    <option key={m.id} value={m.id}>{m.codigo} — {m.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.newRate}</label>
                <input type="number" step="0.01" value={rateValue} onChange={(e) => setRateValue(e.target.value)} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
              </div>
              <button onClick={() => void registrarTasa()} className="w-full rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">{t.register}</button>
            </div>
          </div>
          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <p className="border-b border-brand-100 px-5 py-3 text-sm font-bold text-ink">{t.history}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-5 py-3 font-semibold">{t.currency}</th>
                    <th className="px-5 py-3 font-semibold">{t.rate}</th>
                    <th className="px-5 py-3 font-semibold">{t.date}</th>
                    <th className="px-5 py-3 font-semibold">{t.source}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {historial.map((h) => {
                    const m = monedas.find((mo) => mo.id === h.monedaId);
                    return (
                      <tr key={h.id} className="hover:bg-brand-50/50">
                        <td className="px-5 py-3 font-semibold text-ink">{m?.codigo}</td>
                        <td className="px-5 py-3 text-ink/60">{h.tasa}</td>
                        <td className="px-5 py-3 text-ink/45">{h.fecha}</td>
                        <td className="px-5 py-3">
                          <StatusBadge tone={h.fuente === 'Manual' ? 'neutro' : 'positivo'}>{h.fuente === 'Manual' ? t.manual : t.auto}</StatusBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === 'precios' && esReal && (
        <p className="rounded-3xl border border-brand-100 bg-white p-5 text-sm text-ink/60 shadow-soft">
          Próximamente. Hoy todo el sitio cobra en USD (moneda base); los precios por moneda se activarán cuando se acepten pagos en otras
          monedas. Las tasas registradas ya quedan guardadas para ese momento.
        </p>
      )}

      {tab === 'precios' && !esReal && (
        <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-5 py-3 font-semibold">{t.service}</th>
                  <th className="px-5 py-3 font-semibold">{t.pricingMode}</th>
                  <th className="px-5 py-3 font-semibold">{t.fixedPrice}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {precios.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-50/50">
                    <td className="px-5 py-3 font-semibold text-ink">{p.servicio}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => togglePrecioModo(p.id)} className="flex items-center gap-1.5 rounded-full border border-brand-200 px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-50">
                        {p.modo === 'Automático' ? <TrendingUp size={13} /> : <Tag size={13} />}
                        {p.modo === 'Automático' ? t.automatic : t.fixed}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      {p.modo === 'Fijo' ? (
                        <input
                          type="number" value={p.precioFijo ?? 0}
                          onChange={(e) => setPrecioFijo(p.id, Number(e.target.value))}
                          className="w-24 rounded-lg border border-brand-200 px-2 py-1 text-sm text-ink outline-none"
                        />
                      ) : (
                        <span className="text-ink/35">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'ordenes' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: t.kpiTotalOrders, value: kpiOrdenes.total },
              { label: t.kpiPaid, value: kpiOrdenes.pagadas },
              { label: t.kpiPartial, value: kpiOrdenes.parciales },
              esReal
                ? { label: lang === 'es' ? 'Reembolsadas' : 'Refunded', value: ordenes.filter((o) => o.etiqueta === 'Reembolsada').length }
                : { label: t.kpiOverdue, value: kpiOrdenes.vencidas },
            ].map((k) => (
              <div key={k.label} className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
                <p className="font-display text-2xl font-semibold text-ink">{k.value}</p>
                <p className="text-xs text-ink/50">{k.label}</p>
              </div>
            ))}
          </div>
          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-5 py-3 font-semibold">{t.order}</th>
                    <th className="px-5 py-3 font-semibold">{t.client}</th>
                    <th className="px-5 py-3 font-semibold">{t.date}</th>
                    <th className="px-5 py-3 font-semibold">{t.total}</th>
                    <th className="px-5 py-3 font-semibold">{t.paid}</th>
                    <th className="px-5 py-3 font-semibold">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {ordenes.map((o) => (
                    <tr key={o.id} className="cursor-pointer hover:bg-brand-50/50" onClick={() => setOrdenSel(o.id)}>
                      <td className="px-5 py-3 font-semibold text-ink">
                        {o.real ? `#${o.id.slice(0, 8).toUpperCase()}` : o.id}
                        {o.real && <span className="block text-xs font-normal text-ink/45">{o.items[0]?.concepto}</span>}
                      </td>
                      <td className="px-5 py-3 text-ink/60">{o.cliente}</td>
                      <td className="px-5 py-3 text-ink/45">{o.fecha}</td>
                      <td className="px-5 py-3 font-semibold text-ink">{o.moneda} {o.total}</td>
                      <td className="px-5 py-3 text-ink/60">{o.moneda} {abonado(o)}</td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={o.etiqueta ? 'neutro' : ordenTone(o.estado)}>{o.etiqueta ?? t.estadosOrden[o.estado]}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                  {esReal && ordenes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink/40">Aún no hay órdenes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {nuevaMoneda && (
        <AdminModal title={t.addCurrency} onClose={() => setNuevaMoneda(null)}>
          <div className="space-y-3 text-sm">
            {([
              ['codigo', lang === 'es' ? 'Código (3 letras, p. ej. VES)' : 'Code (3 letters, e.g. VES)', 3],
              ['nombre', lang === 'es' ? 'Nombre' : 'Name', 60],
              ['simbolo', t.symbol, 8],
            ] as const).map(([campo, etiqueta, max]) => (
              <div key={campo}>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{etiqueta}</label>
                <input
                  value={nuevaMoneda[campo]}
                  maxLength={max}
                  onChange={(e) => setNuevaMoneda((m) => (m ? { ...m, [campo]: campo === 'codigo' ? e.target.value.toUpperCase() : e.target.value } : m))}
                  className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none"
                />
              </div>
            ))}
            <div className="flex gap-2 border-t border-brand-100 pt-3">
              <button onClick={() => setNuevaMoneda(null)} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button onClick={() => void guardarNuevaMoneda()} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">
                {t.save}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {orden && (
        <AdminModal title={`${t.orderDetail} · ${orden.real ? `#${orden.id.slice(0, 8).toUpperCase()}` : orden.id}`} onClose={() => setOrdenSel(null)}>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-ink">{orden.cliente}</p>
                <p className="text-xs text-ink/50">{orden.fecha}</p>
              </div>
              <StatusBadge tone={orden.etiqueta ? 'neutro' : ordenTone(orden.estado)}>{orden.etiqueta ?? t.estadosOrden[orden.estado]}</StatusBadge>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.items}</p>
              <div className="divide-y divide-brand-50 rounded-2xl border border-brand-100">
                {orden.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-ink">{it.concepto}</span>
                    <span className="text-ink/50">{it.cantidad} × {orden.moneda} {it.precioUnitario}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.payments}</p>
              <div className="divide-y divide-brand-50 rounded-2xl border border-brand-100">
                {orden.abonos.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-ink">{a.fecha} · {a.metodo}</span>
                    <span className="text-ink/50">
                      {a.moneda} {a.monto} {!orden.real && <span className="text-ink/30">({t.rateAtPayment}: {a.tasaAlPagar})</span>}
                    </span>
                  </div>
                ))}
                {orden.abonos.length === 0 && <p className="px-3 py-3 text-xs text-ink/40">—</p>}
              </div>
              {orden.real && (orden.reembolsado ?? 0) > 0 && (
                <p className="mt-2 flex justify-between text-xs text-lilac-700">
                  <span>Reembolsado</span>
                  <span>− {orden.moneda} {orden.reembolsado}</span>
                </p>
              )}
              {orden.real && (orden.enRevision ?? 0) > 0 && (
                <p className="mt-1 flex justify-between text-xs text-amber-700">
                  <span>Transferencias en revisión</span>
                  <span>{orden.moneda} {orden.enRevision}</span>
                </p>
              )}
              <p className="mt-2 flex justify-between text-xs font-bold text-ink">
                <span>{t.balance}</span>
                <span>{orden.moneda} {orden.real ? saldoDe(orden) : (orden.total - abonado(orden)).toFixed(0)}</span>
              </p>
            </div>

            {(orden.real ? saldoDe(orden) > 0 && orden.etiqueta !== 'Cancelada' : orden.estado !== 'Pagada') && (
              <div className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
                <input
                  type="number" value={nuevoAbono} onChange={(e) => setNuevoAbono(e.target.value)}
                  placeholder={t.amount} className="h-9 w-full rounded-xl border border-brand-200 bg-white px-3 text-xs text-ink outline-none"
                />
                <button onClick={() => void agregarAbono()} className="whitespace-nowrap rounded-xl bg-brand-gradient px-3 py-2 text-xs font-bold text-white shadow-soft">
                  {t.addPayment}
                </button>
              </div>
            )}

            <button onClick={() => setOrdenSel(null)} className="text-xs font-semibold text-ink/50 hover:underline">{t.close}</button>
          </div>
        </AdminModal>
      )}
    </AdminLayout>
  );
}
