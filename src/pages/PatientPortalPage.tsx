import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, CreditCard, Bell, UserCog,
  Wallet, Search, CheckCircle2, ArrowLeft, Video, GraduationCap,
} from 'lucide-react';
import PortalLayout, { type PortalNavItem } from '@/components/site/PortalLayout';
import PaymentCheckoutModal from '@/components/site/PaymentCheckoutModal';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useMyAppointments, useMyPurchases } from '@/hooks/useSupabaseData';
import { CITAS_PACIENTE, NOTIFICACIONES_PACIENTE, type CitaPaciente } from '@/data/patientPortalData';
import { cancelAppointment } from '@/lib/api/edgeFunctions';
import { cargarMisPagos, type PagoPaciente } from '@/lib/api/pagos';
import { cargarNotificaciones, marcarNotificacionesLeidas } from '@/lib/api/notificaciones';
import type { NotificacionInstructor } from '@/data/notificacionesInstructorData';
import ReprogramarCitaPanel from '@/components/site/ReprogramarCitaPanel';
import { useDialogo } from '@/context/DialogoContext';





type Tab = 'dash' | 'citas' | 'detalle' | 'pagos' | 'notif';

const text = {
  es: {
    sinPagos: 'Todavía no registraste pagos.', motivoRechazo: 'Motivo del rechazo', sinNotif: 'No tienes notificaciones.',
    citaCancelada: 'Cita cancelada.', primeraSesion: 'Tu primera sesión te espera.',
    sinProximas: 'No tienes citas próximas.', sinCitas: 'Todavía no tienes citas.',
    dashboard: 'Dashboard', aulaVirtual: 'Aula Virtual', misCitas: 'Mis citas', misPagos: 'Mis pagos', notificaciones: 'Notificaciones', miPerfil: 'Mi perfil',
    hola: 'Hola', resumen: 'Este es el resumen de tu bienestar.',
    proximaCita: 'Próxima cita', pagosPendientes: 'Pagos pendientes', sinSaldos: 'Sin saldos', sesionesCompletadas: 'Sesiones completadas', buenProgreso: '¡Buen progreso!',
    proximasCitas: 'Próximas citas', verTodas: 'Ver todas', accesosRapidos: 'Accesos rápidos', agendar: 'Agendar', pagarSaldo: 'Pagar saldo', cursos: 'Cursos', unirme: 'Unirme',
    saldoPendiente: 'Saldo pendiente', tienesSaldo: 'Tienes un saldo pendiente de', pagarAhora: 'Pagar ahora',
    tusCitasTitle: 'Mis citas', tusCitasSub: 'Consulta tus próximas y pasadas sesiones.',
    confirmada: 'Confirmada', agendada: 'Agendada', completada: 'Completada', cancelada: 'Cancelada', consultar: 'Consultar', volverAAgendar: 'Volver a agendar',
    volver: 'Volver a mis citas', fechaYHora: 'Fecha y hora', profesional: 'Profesional', modalidad: 'Modalidad / Lugar', duracion: 'Duración',
    salaSesion: 'Sala de la sesión', enlaceInfo: 'El enlace se activa 10 min antes.', unirmeSesion: 'Unirme a la sesión',
    estadoPago: 'Estado de pago', total: 'Total', abonado: 'Abonado', saldo: 'Saldo pendiente', pagado: 'Pagada',
    cancelarCitaBtn: 'Cancelar cita', reprogramarBtn: 'Reprogramar', confirmCancelar: '¿Seguro que deseas cancelar esta cita?', cancelando: 'Cancelando...',
    misPagosTitle: 'Mis pagos', misPagosSub: 'Historial de órdenes, abonos y comprobantes.',
    totalPagado: 'Total pagado', pendiente: 'Pendiente', enRevision: 'En revisión',
    concepto: 'Concepto', fecha: 'Fecha', monto: 'Monto', metodo: 'Método', estado: 'Estado',
    estadoPagado: 'Pagado', estadoPendiente: 'Pendiente', estadoRevision: 'Revisión', estadoRechazado: 'Rechazado',
    notifTitle: 'Notificaciones', notifSub: 'Novedades sobre tus citas y pagos.',
    proximoLabel: 'Sin próximas',
  },
  en: {
    sinPagos: 'You have no payments yet.', motivoRechazo: 'Rejection reason', sinNotif: 'You have no notifications.',
    citaCancelada: 'Appointment cancelled.', primeraSesion: 'Your first session awaits.',
    sinProximas: 'You have no upcoming appointments.', sinCitas: 'You have no appointments yet.',
    dashboard: 'Dashboard', aulaVirtual: 'Virtual Classroom', misCitas: 'My appointments', misPagos: 'My payments', notificaciones: 'Notifications', miPerfil: 'My profile',
    hola: 'Hi', resumen: "Here's your wellbeing summary.",
    proximaCita: 'Next session', pagosPendientes: 'Pending payments', sinSaldos: 'No balances', sesionesCompletadas: 'Completed sessions', buenProgreso: 'Great progress!',
    proximasCitas: 'Upcoming', verTodas: 'View all', accesosRapidos: 'Quick actions', agendar: 'Book', pagarSaldo: 'Pay balance', cursos: 'Courses', unirme: 'Join',
    saldoPendiente: 'Balance due', tienesSaldo: 'You have a balance of', pagarAhora: 'Pay now',
    tusCitasTitle: 'My appointments', tusCitasSub: 'View your upcoming and past sessions.',
    confirmada: 'Confirmed', agendada: 'Scheduled', completada: 'Completed', cancelada: 'Cancelled', consultar: 'View', volverAAgendar: 'Rebook',
    volver: 'Back to appointments', fechaYHora: 'Date & time', profesional: 'Therapist', modalidad: 'Mode / Location', duracion: 'Duration',
    salaSesion: 'Session room', enlaceInfo: 'Link opens 10 min before.', unirmeSesion: 'Join session',
    estadoPago: 'Payment status', total: 'Total', abonado: 'Paid', saldo: 'Balance due', pagado: 'Paid',
    cancelarCitaBtn: 'Cancel appointment', reprogramarBtn: 'Reschedule', confirmCancelar: 'Are you sure you want to cancel this appointment?', cancelando: 'Canceling...',
    misPagosTitle: 'My payments', misPagosSub: 'History of orders, payments and receipts.',
    totalPagado: 'Total paid', pendiente: 'Pending', enRevision: 'Under review',
    concepto: 'Concept', fecha: 'Date', monto: 'Amount', metodo: 'Method', estado: 'Status',
    estadoPagado: 'Paid', estadoPendiente: 'Pending', estadoRevision: 'Review', estadoRechazado: 'Rejected',
    notifTitle: 'Notifications', notifSub: 'Updates on your sessions and payments.',
    proximoLabel: 'No upcoming',
  },
} as const;

const METODO_PAGO: Record<string, { es: string; en: string }> = {
  transferencia: { es: 'Transferencia', en: 'Transfer' },
  stripe: { es: 'Tarjeta', en: 'Card' },
  paypal: { es: 'PayPal', en: 'PayPal' },
  manual: { es: 'Manual', en: 'Manual' },
  credito: { es: 'Crédito', en: 'Credit' },
};

// USD con 2 decimales solo si hace falta (50 → "50", 37.5 → "37.50").
function monto(valor: number) {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(2);
}

const estadoEstilo: Record<CitaPaciente['estado'], string> = {
  confirmada: 'bg-emerald-50 text-emerald-600',
  agendada: 'bg-amber-50 text-amber-600',
  completada: 'bg-brand-50 text-ink/50',
  cancelada: 'bg-rose-50 text-rose-600',
};

const pagoEstadoEstilo: Record<string, string> = {
  pagado: 'bg-emerald-50 text-emerald-600',
  pendiente: 'bg-amber-50 text-amber-600',
  revision: 'bg-lilac-100 text-lilac-700',
  rechazado: 'bg-rose-50 text-rose-600',
};

export default function PatientPortalPage() {
  const { user } = useSiteAuth();
  const { language } = useSiteLanguage();
  const navigate = useNavigate();
  const t = text[language];
  const dialogo = useDialogo();
  const [tab, setTab] = useState<Tab>('dash');
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaPaciente | null>(null);
  const [paymentModalData, setPaymentModalData] = useState<{ isOpen: boolean; monto: number; concepto: string; citaId?: string } | null>(null);
  const [pagosReales, setPagosReales] = useState<PagoPaciente[]>([]);
  const [notifReales, setNotifReales] = useState<NotificacionInstructor[]>([]);
  const [isCanceling, setIsCanceling] = useState(false);
  const [reprogramando, setReprogramando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Datos reales: citas (DB + wizard demo), pagos, notificaciones.
  // Mientras no haya sesión real, se muestran los datos demo.
  const { data: citasOrigen, enBase, refresh: refreshCitas } = useMyAppointments();
  const { dbCompras, demoPagos } = useMyPurchases();

  // Con sesión real, solo las citas reales; en demo: las del wizard + los datos demo.
  const citasCombinadas = useMemo<CitaPaciente[]>(() => {
    if (enBase) return citasOrigen.dbCitas;
    return [...citasOrigen.dbCitas, ...citasOrigen.agenda, ...CITAS_PACIENTE];
  }, [citasOrigen, enBase]);
  // Próximas primero (por fecha ascendente); con la base vienen de la más nueva a la más vieja.
  const citasProximas = useMemo(
    () => citasCombinadas
      .filter((c) => c.estado !== 'completada' && c.estado !== 'cancelada')
      .sort((a, b) => ((a.fechaISO ?? '') + a.hora).localeCompare((b.fechaISO ?? '') + b.hora)),
    [citasCombinadas]
  );

  // Combinar pagos: primero las compras reales, luego los pagos demo
  const pagosCombinados = useMemo(() => {
    const reales = dbCompras
      .filter((p): p is { id: number; usuario_id: string | null; producto_id: number; pago_id: string | null; fecha: string } => p !== null)
      .map((p) => {
        const d = p.fecha ? new Date(p.fecha) : new Date();
        return {
          concepto: { es: `Producto #${p.producto_id}`, en: `Product #${p.producto_id}` },
          fecha: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
          monto: 0,
          metodo: { es: 'Pendiente', en: 'Pending' },
          estado: p.pago_id ? 'pagado' as const : 'pendiente' as const,
        };
      });
    return [...reales, ...demoPagos];
  }, [dbCompras, demoPagos]);

  const handleCancelar = async (citaId?: string) => {
    if (!(await dialogo.confirmar(t.confirmCancelar, { peligro: true }))) return;
    // Sin sesión real o sin id de base (citas demo/wizard), la cancelación es solo visual.
    if (!enBase || !citaId) {
      setCitaSeleccionada(prev => prev ? { ...prev, estado: 'cancelada' } : null);
      return;
    }
    // La Edge Function aplica la política de reembolso y registra el historial.
    setIsCanceling(true);
    const res = await cancelAppointment(citaId);
    setIsCanceling(false);
    if (res.error) {
      setAviso({ tipo: 'error', texto: res.error.message });
      return;
    }
    setAviso({ tipo: 'ok', texto: `${t.citaCancelada} ${res.data.mensaje_reembolso}` });
    setCitaSeleccionada(prev => prev ? { ...prev, estado: 'cancelada' } : null);
    await refreshCitas();
  };

  // Con sesión real: pagos y notificaciones de la base.
  const recargarPagos = useCallback(async () => {
    const res = await cargarMisPagos();
    if (!res.error) setPagosReales(res.data);
  }, []);

  useEffect(() => {
    if (!enBase) return;
    void recargarPagos();
    void cargarNotificaciones().then((res) => { if (!res.error) setNotifReales(res.data); });
  }, [enBase, recargarPagos]);

  function abrirNotificaciones() {
    setTab('notif');
    if (enBase && notifReales.some((n) => !n.leida)) {
      void marcarNotificacionesLeidas(null);
      setNotifReales((ns) => ns.map((n) => ({ ...n, leida: true })));
    }
  }

  async function pagoReportado() {
    setPaymentModalData(null);
    await Promise.all([recargarPagos(), refreshCitas()]);
  }

  // Con la base, el saldo se paga cita por cita (el pago va a la orden de esa cita).
  function pagarSaldoGeneral() {
    if (enBase) {
      setTab('pagos');
      return;
    }
    setPaymentModalData({ isOpen: true, monto: saldoTotal, concepto: language === 'es' ? 'Saldo pendiente total' : 'Total balance due' });
  }

  async function reprogramacionLista(mensaje: string) {
    setReprogramando(false);
    setAviso({ tipo: 'ok', texto: mensaje });
    await refreshCitas();
  }

  const navItems: PortalNavItem[] = [
    { key: 'dash', label: { es: 'Dashboard', en: 'Dashboard' }, icon: LayoutDashboard, disponible: true },
    { key: 'aula-virtual', label: { es: t.aulaVirtual, en: t.aulaVirtual }, icon: GraduationCap, disponible: true, to: '/aula-virtual' },
    { key: 'citas', label: { es: t.misCitas, en: t.misCitas }, icon: CalendarDays, disponible: true },
    { key: 'pagos', label: { es: t.misPagos, en: t.misPagos }, icon: CreditCard, disponible: true },
    { key: 'notif', label: { es: t.notificaciones, en: t.notificaciones }, icon: Bell, disponible: true },
    { key: 'perfil', label: { es: t.miPerfil, en: t.miPerfil }, icon: UserCog, disponible: true, to: '/portal-paciente/perfil' },
  ];

  const primerNombre = (user?.nombre || '').trim().split(/\s+/)[0] || (language === 'es' ? 'Paciente' : 'Patient');
  // Al recargar las citas (tras reprogramar/cancelar), el detalle muestra la versión nueva.
  useEffect(() => {
    setCitaSeleccionada((sel) => (sel?.id ? citasCombinadas.find((c) => c.id === sel.id) ?? sel : sel));
  }, [citasCombinadas]);

  // Saldo solo de citas vigentes (una cancelada no se cobra).
  const saldoTotal = citasProximas.filter((c) => c.total > c.pagado).reduce((acc, c) => acc + (c.total - c.pagado), 0);
  const proxima = citasProximas[0];
  // Pagos: con la base, los reales (en revisión = transferencias pendientes).
  const pagosVista = useMemo(() => (enBase
    ? pagosReales.map((p) => ({
        concepto: { es: p.concepto, en: p.concepto },
        fecha: new Date(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        monto: p.monto,
        metodo: { es: METODO_PAGO[p.metodo]?.es ?? p.metodo, en: METODO_PAGO[p.metodo]?.en ?? p.metodo },
        motivoRechazo: p.motivoRechazo,
        estado: (p.estado === 'aprobado' ? 'pagado' : p.estado === 'rechazado' ? 'rechazado' : p.estado === 'pendiente' ? 'revision' : 'pendiente') as 'pagado' | 'pendiente' | 'revision' | 'rechazado',
      }))
    : pagosCombinados.map((p) => ({ ...p, motivoRechazo: null as string | null }))), [enBase, pagosReales, pagosCombinados]);
  const totalPagado = pagosReales.filter((p) => p.estado === 'aprobado').reduce((a, p) => a + p.monto, 0);
  const totalEnRevision = pagosReales.filter((p) => p.estado === 'pendiente').reduce((a, p) => a + p.monto, 0);
  // Lo que falta pagar: el saldo menos las transferencias ya reportadas (en revisión).
  const saldoPorPagar = enBase ? Math.max(0, saldoTotal - totalEnRevision) : saldoTotal;
  const enRevisionDeCita = (citaId?: string) =>
    pagosReales.filter((p) => p.estado === 'pendiente' && p.citaId === citaId).reduce((a, p) => a + p.monto, 0);
  const sesionesCompletadas = citasCombinadas.filter((c) => c.estado === 'completada').length + (enBase ? 0 : 5);

  function abrirDetalle(cita: CitaPaciente) {
    setCitaSeleccionada(cita);
    setReprogramando(false);
    setAviso(null);
    setTab('detalle');
  }

  function reprogramar() {
    if (!enBase || !citaSeleccionada?.id) {
      navigate('/agendar');
      return;
    }
    setAviso(null);
    setReprogramando(true);
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey={tab === 'detalle' ? 'citas' : tab}
      onNavigate={(k) => (k === 'notif' ? abrirNotificaciones() : setTab(k as Tab))}
      roleBadge={{ es: 'Paciente', en: 'Patient' }}
      sidebarExtra={
        <div className="rounded-2xl bg-white/10 p-4 text-white">
          <p className="mb-1 text-sm font-semibold">{language === 'es' ? '¿Necesitas otra cita?' : 'Need another session?'}</p>
          <p className="mb-3 text-xs text-white/70">{language === 'es' ? 'Agenda en menos de 1 minuto.' : 'Book in under a minute.'}</p>
          <Link to="/agendar" className="block rounded-full bg-white py-2 text-center text-sm font-semibold text-brand-800">
            {t.agendar}
          </Link>
        </div>
      }
    >
      {tab === 'dash' && (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.hola}, {primerNombre} 👋</h1>
            <p className="mt-1 text-sm text-ink/50">{t.resumen}</p>
          </div>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <p className="text-xs text-ink/50">{t.proximaCita}</p>
              <p className="mt-2 font-display text-lg font-semibold text-ink">{proxima ? proxima.fecha[language] : '—'}</p>
              <p className="text-xs text-brand-600">{proxima ? proxima.profesional : t.proximoLabel}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <p className="text-xs text-ink/50">{t.pagosPendientes}</p>
              <p className="mt-2 font-display text-lg font-semibold text-ink">USD ${monto(saldoPorPagar)}</p>
              <p className="text-xs text-amber-600">{saldoPorPagar > 0 ? t.saldoPendiente : t.sinSaldos}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <p className="text-xs text-ink/50">{t.sesionesCompletadas}</p>
              <p className="mt-2 font-display text-lg font-semibold text-ink">{sesionesCompletadas}</p>
              <p className="text-xs text-emerald-600">{sesionesCompletadas > 0 ? t.buenProgreso : t.primeraSesion}</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">{t.proximasCitas}</h2>
                <button onClick={() => setTab('citas')} className="text-sm font-semibold text-brand-600 hover:underline">{t.verTodas}</button>
              </div>
              <div className="space-y-3">
                {citasProximas.length === 0 && (
                  <p className="rounded-2xl bg-brand-50/60 p-4 text-sm text-ink/50">
                    {t.sinProximas} <Link to="/agendar" className="font-semibold text-brand-600 hover:underline">{t.agendar}</Link>
                  </p>
                )}
                {citasProximas.map((c, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl bg-brand-50/60 p-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-100 text-center leading-none text-brand-700">
                      <span className="text-xs font-bold">{c.dia}<br />{c.mes}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{c.servicio[language]}</p>
                      <p className="text-xs text-ink/45">{c.hora} · {c.modalidad} · {c.profesional}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${estadoEstilo[c.estado]}`}>{t[c.estado]}</span>
                    <button onClick={() => abrirDetalle(c)} className="text-sm font-semibold text-brand-600 hover:underline">→</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
                <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t.accesosRapidos}</h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Link to="/agendar" className="rounded-2xl bg-brand-50 p-3 text-center hover:bg-brand-100">
                    <CalendarDays className="mx-auto mb-1 text-brand-600" size={20} />
                    <span className="font-semibold text-ink">{t.agendar}</span>
                  </Link>
                  <button onClick={() => setTab('pagos')} className="rounded-2xl bg-brand-50 p-3 text-center hover:bg-brand-100">
                    <Wallet className="mx-auto mb-1 text-brand-600" size={20} />
                    <span className="font-semibold text-ink">{t.pagarSaldo}</span>
                  </button>
                  <Link to="/cursos" className="rounded-2xl bg-brand-50 p-3 text-center hover:bg-brand-100">
                    <Search className="mx-auto mb-1 text-brand-600" size={20} />
                    <span className="font-semibold text-ink">{t.cursos}</span>
                  </Link>
                  <button onClick={() => proxima && abrirDetalle(proxima)} className="rounded-2xl bg-brand-50 p-3 text-center hover:bg-brand-100">
                    <Video className="mx-auto mb-1 text-brand-600" size={20} />
                    <span className="font-semibold text-ink">{t.unirme}</span>
                  </button>
                </div>
              </div>

              {saldoPorPagar > 0 && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-amber-700">⚠️ {t.saldoPendiente}</p>
                  <p className="mb-3 text-xs text-ink/60">{t.tienesSaldo} <b className="text-ink">USD ${monto(saldoPorPagar)}</b>.</p>
                  <button onClick={pagarSaldoGeneral} className="rounded-full bg-brand-gradient px-4 py-2 text-xs font-bold text-white">{t.pagarAhora}</button>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {tab === 'citas' && (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.tusCitasTitle}</h1>
            <p className="mt-1 text-sm text-ink/50">{t.tusCitasSub}</p>
          </div>
          <div className="space-y-3">
            {citasCombinadas.length === 0 && (
              <p className="rounded-3xl border border-brand-100 bg-white p-6 text-sm text-ink/50">
                {t.sinCitas} <Link to="/agendar" className="font-semibold text-brand-600 hover:underline">{t.agendar}</Link>
              </p>
            )}
            {citasCombinadas.map((c, i) => (
              <div key={i} className="flex flex-col gap-4 rounded-3xl border border-brand-100 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-50 text-center leading-none text-brand-700">
                  <span className="text-sm font-bold">{c.dia}<br />{c.mes}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{c.servicio[language]}</p>
                  <p className="text-sm text-ink/50">{c.hora} · {c.modalidad} · {c.profesional}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${estadoEstilo[c.estado]}`}>{t[c.estado]}</span>
                  {c.estado === 'completada' ? (
                    <button onClick={() => navigate('/agendar')} className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">{t.volverAAgendar}</button>
                  ) : (
                    <button onClick={() => abrirDetalle(c)} className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">{t.consultar}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'detalle' && citaSeleccionada && (
        <>
          <button onClick={() => setTab('citas')} className="flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink">
            <ArrowLeft size={15} /> {t.volver}
          </button>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h1 className="font-display text-2xl font-semibold text-ink">{citaSeleccionada.servicio[language]}</h1>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${estadoEstilo[citaSeleccionada.estado]}`}>{t[citaSeleccionada.estado]}</span>
              </div>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div><p className="text-xs text-ink/45">{t.fechaYHora}</p><p className="text-ink">{citaSeleccionada.fecha[language]} · {citaSeleccionada.hora}</p></div>
                <div><p className="text-xs text-ink/45">{t.profesional}</p><p className="text-ink">{citaSeleccionada.profesional}</p></div>
                <div><p className="text-xs text-ink/45">{t.modalidad}</p><p className="text-ink">{citaSeleccionada.lugar ? `${citaSeleccionada.modalidad} · ${citaSeleccionada.lugar}` : citaSeleccionada.modalidad}</p></div>
                <div><p className="text-xs text-ink/45">{t.duracion}</p><p className="text-ink">{citaSeleccionada.duracionMin ?? 50} min</p></div>
              </div>
              <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Video size={16} className="text-brand-600" /> {t.salaSesion}</p>
                  <p className="text-xs text-ink/50">{t.enlaceInfo}</p>
                </div>
                <button
                  onClick={() => window.open('https://zoom.us/j/demo', '_blank')}
                  className="rounded-full bg-brand-gradient px-5 py-2.5 text-center text-sm font-bold text-white shadow-soft hover:opacity-90"
                >
                  {t.unirmeSesion}
                </button>
              </div>

              {aviso && (
                <p role={aviso.tipo === 'error' ? 'alert' : 'status'} className={`mt-6 rounded-2xl px-4 py-3 text-sm ${aviso.tipo === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                  {aviso.texto}
                </p>
              )}

              {reprogramando && (
                <ReprogramarCitaPanel
                  cita={citaSeleccionada}
                  language={language}
                  onCerrar={() => setReprogramando(false)}
                  onListo={(m) => void reprogramacionLista(m)}
                />
              )}

              {(citaSeleccionada.estado === 'confirmada' || citaSeleccionada.estado === 'agendada') && !reprogramando && (
                <div className="mt-8 flex flex-wrap gap-3 border-t border-brand-100 pt-6">
                  <button onClick={reprogramar} className="rounded-full border border-brand-200 px-5 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition">
                    {t.reprogramarBtn}
                  </button>
                  <button onClick={() => handleCancelar(citaSeleccionada.id)} disabled={isCanceling} className="rounded-full border border-rose-200 px-5 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 transition disabled:opacity-50">
                    {isCanceling ? t.cancelando : t.cancelarCitaBtn}
                  </button>
                </div>
              )}
            </div>
            <aside className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
              <h2 className="mb-4 font-display text-lg font-semibold text-ink">{t.estadoPago}</h2>
              <dl className="space-y-2 border-b border-brand-50 pb-4 text-sm">
                <div className="flex justify-between"><dt className="text-ink/50">{t.total}</dt><dd className="text-ink">USD ${monto(citaSeleccionada.total)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/50">{t.abonado}</dt><dd className="text-emerald-600">USD ${monto(citaSeleccionada.pagado)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/50">{t.saldo}</dt><dd className="font-semibold text-amber-600">USD ${monto(citaSeleccionada.total - citaSeleccionada.pagado)}</dd></div>
              </dl>
              {citaSeleccionada.estado === 'cancelada' ? null : citaSeleccionada.total > citaSeleccionada.pagado ? (
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  <span>{t.pagarSaldo} USD ${monto(citaSeleccionada.total - citaSeleccionada.pagado)}</span>
                  <button 
                    onClick={() => setPaymentModalData({ isOpen: true, monto: citaSeleccionada.total - citaSeleccionada.pagado - enRevisionDeCita(citaSeleccionada.id), concepto: `${citaSeleccionada.servicio[language]} · ${citaSeleccionada.fecha[language]}`, citaId: citaSeleccionada.id })} 
                    className="rounded-full bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-700 transition"
                  >
                    {t.pagarAhora}
                  </button>
                </div>
              ) : (
                <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><CheckCircle2 size={16} /> {t.pagado}</p>
              )}
            </aside>
          </div>
        </>
      )}

      {tab === 'pagos' && (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.misPagosTitle}</h1>
            <p className="mt-1 text-sm text-ink/50">{t.misPagosSub}</p>
          </div>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.totalPagado}</p>
              <p className="font-display text-xl font-semibold text-ink">USD ${enBase ? monto(totalPagado) : 87}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.pendiente}</p>
              <p className="font-display text-xl font-semibold text-amber-600">USD ${enBase ? monto(saldoPorPagar) : 30}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.enRevision}</p>
              <p className="font-display text-xl font-semibold text-lilac-600">USD ${enBase ? monto(totalEnRevision) : 55}</p>
            </div>
          </section>

          {enBase && citasProximas.some((c) => c.total - c.pagado - enRevisionDeCita(c.id) > 0) && (
            <div className="space-y-2">
              {citasProximas.filter((c) => c.total - c.pagado - enRevisionDeCita(c.id) > 0).map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <span className="text-ink">{c.servicio[language]} · {c.fecha[language]} {c.hora}</span>
                  <span className="flex items-center gap-3">
                    <b className="text-amber-700">USD ${monto(c.total - c.pagado - enRevisionDeCita(c.id))}</b>
                    <button
                      onClick={() => setPaymentModalData({ isOpen: true, monto: c.total - c.pagado - enRevisionDeCita(c.id), concepto: `${c.servicio[language]} · ${c.fecha[language]}`, citaId: c.id })}
                      className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      {t.pagarAhora}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="hidden grid-cols-12 gap-2 border-b border-brand-50 px-5 py-3 text-xs text-ink/45 sm:grid">
              <span className="col-span-4">{t.concepto}</span><span className="col-span-2">{t.fecha}</span><span className="col-span-2">{t.monto}</span><span className="col-span-2">{t.metodo}</span><span className="col-span-2">{t.estado}</span>
            </div>
            <div className="divide-y divide-brand-50 text-sm">
              {enBase && pagosVista.length === 0 && (
                <p className="px-5 py-6 text-sm text-ink/45">{t.sinPagos}</p>
              )}
              {pagosVista.map((p, i) => (
                <div key={i} className="grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-12 sm:items-center sm:gap-2">
                  <span className="text-ink sm:col-span-4">
                    {p.concepto[language]}
                    {p.motivoRechazo && (
                      <span className="mt-0.5 block text-xs text-rose-600">{t.motivoRechazo}: {p.motivoRechazo}</span>
                    )}
                  </span>
                  <span className="text-ink/50 sm:col-span-2">{p.fecha}</span>
                  <span className="text-ink sm:col-span-2">USD ${p.monto}</span>
                  <span className="text-ink/50 sm:col-span-2">{p.metodo[language]}</span>
                  <span className="sm:col-span-2 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pagoEstadoEstilo[p.estado]}`}>
                      {p.estado === 'pagado' ? t.estadoPagado : p.estado === 'pendiente' ? t.estadoPendiente : p.estado === 'revision' ? t.estadoRevision : t.estadoRechazado}
                    </span>
                    {!enBase && (p.estado === 'pendiente' || p.estado === 'rechazado') && (
                      <button 
                        onClick={() => setPaymentModalData({ isOpen: true, monto: p.monto, concepto: p.concepto[language] })}
                        className="rounded bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-200"
                      >
                        {t.pagarAhora}
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'notif' && (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.notifTitle}</h1>
            <p className="mt-1 text-sm text-ink/50">{t.notifSub}</p>
          </div>
          <div className="space-y-2">
            {enBase && notifReales.length === 0 && (
              <p className="rounded-2xl border border-brand-100 bg-white p-6 text-sm text-ink/45">{t.sinNotif}</p>
            )}
            {(enBase ? notifReales : NOTIFICACIONES_PACIENTE).map((n, i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <Bell size={16} />
                </span>
                <div className="flex-1">
                  <p className="text-sm text-ink">{n.texto[language]}</p>
                  <p className="text-xs text-ink/40">{n.tiempo[language]}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Payment Modal */}
      {paymentModalData?.isOpen && (
        <PaymentCheckoutModal
          monto={paymentModalData.monto}
          concepto={paymentModalData.concepto}
          citaId={paymentModalData.citaId}
          onClose={() => setPaymentModalData(null)}
          onSuccess={() => void pagoReportado()}
        />
      )}
    </PortalLayout>
  );
}
