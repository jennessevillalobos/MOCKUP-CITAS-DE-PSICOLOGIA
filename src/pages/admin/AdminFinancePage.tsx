import { useMemo, useState } from 'react';
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

  const [monedas, setMonedas] = useState<MonedaRecord[]>(demoMonedas);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tasaTemp, setTasaTemp] = useState('');

  const [rateMonedaId, setRateMonedaId] = useState('ves');
  const [rateValue, setRateValue] = useState('');
  const [historial, setHistorial] = useState(demoHistorialTasas);

  const [precios, setPrecios] = useState<PrecioMonedaRecord[]>(demoPreciosPorMoneda);

  const [ordenes, setOrdenes] = useState<OrdenRecord[]>(demoOrdenes);
  const [ordenSel, setOrdenSel] = useState<string | null>(null);
  const [nuevoAbono, setNuevoAbono] = useState('');

  const tabs: { key: Tab; label: string; icon: typeof Coins }[] = [
    { key: 'monedas', label: t.tabs.monedas, icon: Coins },
    { key: 'tasas', label: t.tabs.tasas, icon: History },
    { key: 'precios', label: t.tabs.precios, icon: Tag },
    { key: 'ordenes', label: t.tabs.ordenes, icon: Receipt },
  ];

  function empezarEdicion(m: MonedaRecord) {
    setEditandoId(m.id);
    setTasaTemp(String(m.tasa));
  }
  function guardarTasa(id: string) {
    const nueva = parseFloat(tasaTemp);
    if (!Number.isNaN(nueva) && nueva > 0) {
      setMonedas((prev) => prev.map((m) => (m.id === id ? { ...m, tasa: nueva, actualizada: 'Justo ahora' } : m)));
    }
    setEditandoId(null);
  }
  function toggleActiva(id: string) {
    setMonedas((prev) => prev.map((m) => (m.id === id ? { ...m, activa: !m.activa } : m)));
  }

  function registrarTasa() {
    const val = parseFloat(rateValue);
    if (Number.isNaN(val) || val <= 0) return;
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

  function abonado(o: OrdenRecord) {
    return o.abonos.reduce((acc, a) => acc + a.monto, 0);
  }

  function agregarAbono() {
    if (!orden) return;
    const monto = parseFloat(nuevoAbono);
    if (Number.isNaN(monto) || monto <= 0) return;
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
          <p className="mt-1 text-sm text-ink/50">{t.subtitle}</p>
        </div>
        {tab === 'monedas' && (
          <button className="flex h-10 items-center gap-2 rounded-2xl bg-brand-gradient px-4 text-sm font-bold text-white shadow-soft">
            <Plus size={16} />
            {t.addCurrency}
          </button>
        )}
      </div>

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
                            <button onClick={() => guardarTasa(m.id)} className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-white" aria-label="Guardar tasa">
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="font-semibold text-ink">{m.tasa.toLocaleString('es', { maximumFractionDigits: 2 })} {m.codigo}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink/45">{m.actualizada}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => toggleActiva(m.id)} disabled={m.id === 'usd'}>
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
              <button onClick={registrarTasa} className="w-full rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">{t.register}</button>
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

      {tab === 'precios' && (
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
              { label: t.kpiOverdue, value: kpiOrdenes.vencidas },
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
                      <td className="px-5 py-3 font-semibold text-ink">{o.id}</td>
                      <td className="px-5 py-3 text-ink/60">{o.cliente}</td>
                      <td className="px-5 py-3 text-ink/45">{o.fecha}</td>
                      <td className="px-5 py-3 font-semibold text-ink">{o.moneda} {o.total}</td>
                      <td className="px-5 py-3 text-ink/60">{o.moneda} {abonado(o)}</td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={ordenTone(o.estado)}>{t.estadosOrden[o.estado]}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {orden && (
        <AdminModal title={`${t.orderDetail} · ${orden.id}`} onClose={() => setOrdenSel(null)}>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-ink">{orden.cliente}</p>
                <p className="text-xs text-ink/50">{orden.fecha}</p>
              </div>
              <StatusBadge tone={ordenTone(orden.estado)}>{t.estadosOrden[orden.estado]}</StatusBadge>
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
                    <span className="text-ink/50">{a.moneda} {a.monto} <span className="text-ink/30">({t.rateAtPayment}: {a.tasaAlPagar})</span></span>
                  </div>
                ))}
                {orden.abonos.length === 0 && <p className="px-3 py-3 text-xs text-ink/40">—</p>}
              </div>
              <p className="mt-2 flex justify-between text-xs font-bold text-ink">
                <span>{t.balance}</span>
                <span>{orden.moneda} {(orden.total - abonado(orden)).toFixed(0)}</span>
              </p>
            </div>

            {orden.estado !== 'Pagada' && (
              <div className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
                <input
                  type="number" value={nuevoAbono} onChange={(e) => setNuevoAbono(e.target.value)}
                  placeholder={t.amount} className="h-9 w-full rounded-xl border border-brand-200 bg-white px-3 text-xs text-ink outline-none"
                />
                <button onClick={agregarAbono} className="whitespace-nowrap rounded-xl bg-brand-gradient px-3 py-2 text-xs font-bold text-white shadow-soft">
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
