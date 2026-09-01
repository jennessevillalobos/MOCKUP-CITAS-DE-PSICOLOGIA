import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, CreditCard, Bell, UserCog,
  Wallet, Search, CheckCircle2, ArrowLeft, Video, GraduationCap,
} from 'lucide-react';
import PortalLayout, { type PortalNavItem } from '@/components/site/PortalLayout';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useMyAppointments, useMyPurchases } from '@/hooks/useSupabaseData';
import { CITAS_PACIENTE, NOTIFICACIONES_PACIENTE, type CitaPaciente } from '@/data/patientPortalData';





type Tab = 'dash' | 'citas' | 'detalle' | 'pagos' | 'notif';

const text = {
  es: {
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
    misPagosTitle: 'Mis pagos', misPagosSub: 'Historial de órdenes, abonos y comprobantes.',
    totalPagado: 'Total pagado', pendiente: 'Pendiente', enRevision: 'En revisión',
    concepto: 'Concepto', fecha: 'Fecha', monto: 'Monto', metodo: 'Método', estado: 'Estado',
    estadoPagado: 'Pagado', estadoPendiente: 'Pendiente', estadoRevision: 'Revisión', estadoRechazado: 'Rechazado',
    notifTitle: 'Notificaciones', notifSub: 'Novedades sobre tus citas y pagos.',
    proximoLabel: 'Sin próximas',
  },
  en: {
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
    misPagosTitle: 'My payments', misPagosSub: 'History of orders, payments and receipts.',
    totalPagado: 'Total paid', pendiente: 'Pending', enRevision: 'Under review',
    concepto: 'Concept', fecha: 'Date', monto: 'Amount', metodo: 'Method', estado: 'Status',
    estadoPagado: 'Paid', estadoPendiente: 'Pending', estadoRevision: 'Review', estadoRechazado: 'Rejected',
    notifTitle: 'Notifications', notifSub: 'Updates on your sessions and payments.',
    proximoLabel: 'No upcoming',
  },
} as const;

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
  const t = text[language];
  const [tab, setTab] = useState<Tab>('dash');
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaPaciente | null>(null);

  // Datos reales: citas (DB + wizard demo), pagos, notificaciones.
  // Mientras no haya sesión real, se muestran los datos demo.
  const { data: citasOrigen } = useMyAppointments();
  const { dbCompras, demoPagos } = useMyPurchases();

  // Combinar citas: primero las reales (DB), luego las del wizard demo, luego los datos demo
  const citasCombinadas = useMemo<CitaPaciente[]>(() => {
    return [...citasOrigen.dbCitas, ...citasOrigen.agenda, ...CITAS_PACIENTE];
  }, [citasOrigen]);

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

  const navItems: PortalNavItem[] = [
    { key: 'dash', label: { es: 'Dashboard', en: 'Dashboard' }, icon: LayoutDashboard, disponible: true },
    { key: 'aula-virtual', label: { es: t.aulaVirtual, en: t.aulaVirtual }, icon: GraduationCap, disponible: true, to: '/aula-virtual' },
    { key: 'citas', label: { es: t.misCitas, en: t.misCitas }, icon: CalendarDays, disponible: true },
    { key: 'pagos', label: { es: t.misPagos, en: t.misPagos }, icon: CreditCard, disponible: true },
    { key: 'notif', label: { es: t.notificaciones, en: t.notificaciones }, icon: Bell, disponible: true },
    { key: 'perfil', label: { es: t.miPerfil, en: t.miPerfil }, icon: UserCog, disponible: true, to: '/portal-paciente/perfil' },
  ];

  const primerNombre = (user?.nombre || '').trim().split(/\s+/)[0] || (language === 'es' ? 'Paciente' : 'Patient');
  const saldoTotal = citasCombinadas.filter((c) => c.total > c.pagado).reduce((acc, c) => acc + (c.total - c.pagado), 0);
  const proxima = citasCombinadas.find((c) => c.estado !== 'completada' && c.estado !== 'cancelada');

  function abrirDetalle(cita: CitaPaciente) {
    setCitaSeleccionada(cita);
    setTab('detalle');
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey={tab === 'detalle' ? 'citas' : tab}
      onNavigate={(k) => setTab(k as Tab)}
      roleBadge={{ es: 'Paciente', en: 'Patient' }}
      sidebarExtra={
        <div className="rounded-2xl bg-white/10 p-4 text-white">
          <p className="mb-1 text-sm font-semibold">{language === 'es' ? '¿Necesitas otra cita?' : 'Need another session?'}</p>
          <p className="mb-3 text-xs text-white/70">{language === 'es' ? 'Agenda en menos de 1 minuto.' : 'Book in under a minute.'}</p>
          <Link to="/contacto" className="block rounded-full bg-white py-2 text-center text-sm font-semibold text-brand-800">
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
              <p className="mt-2 font-display text-lg font-semibold text-ink">USD ${saldoTotal}</p>
              <p className="text-xs text-amber-600">{saldoTotal > 0 ? t.saldoPendiente : t.sinSaldos}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <p className="text-xs text-ink/50">{t.sesionesCompletadas}</p>
              <p className="mt-2 font-display text-lg font-semibold text-ink">{citasCombinadas.filter((c) => c.estado === 'completada').length + 5}</p>
              <p className="text-xs text-emerald-600">{t.buenProgreso}</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">{t.proximasCitas}</h2>
                <button onClick={() => setTab('citas')} className="text-sm font-semibold text-brand-600 hover:underline">{t.verTodas}</button>
              </div>
              <div className="space-y-3">
                {citasCombinadas.filter((c) => c.estado !== 'completada' && c.estado !== 'cancelada').map((c, i) => (
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
                  <Link to="/contacto" className="rounded-2xl bg-brand-50 p-3 text-center hover:bg-brand-100">
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

              {saldoTotal > 0 && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-amber-700">⚠️ {t.saldoPendiente}</p>
                  <p className="mb-3 text-xs text-ink/60">{t.tienesSaldo} <b className="text-ink">USD ${saldoTotal}</b>.</p>
                  <button onClick={() => setTab('pagos')} className="rounded-full bg-brand-gradient px-4 py-2 text-xs font-bold text-white">{t.pagarAhora}</button>
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
                    <button className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">{t.volverAAgendar}</button>
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
                <div><p className="text-xs text-ink/45">{t.modalidad}</p><p className="text-ink">{citaSeleccionada.modalidad}</p></div>
                <div><p className="text-xs text-ink/45">{t.duracion}</p><p className="text-ink">50 min</p></div>
              </div>
              <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Video size={16} className="text-brand-600" /> {t.salaSesion}</p>
                  <p className="text-xs text-ink/50">{t.enlaceInfo}</p>
                </div>
                <button className="rounded-full bg-brand-gradient px-5 py-2.5 text-center text-sm font-bold text-white shadow-soft">{t.unirmeSesion}</button>
              </div>
            </div>
            <aside className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
              <h2 className="mb-4 font-display text-lg font-semibold text-ink">{t.estadoPago}</h2>
              <dl className="space-y-2 border-b border-brand-50 pb-4 text-sm">
                <div className="flex justify-between"><dt className="text-ink/50">{t.total}</dt><dd className="text-ink">USD ${citaSeleccionada.total}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/50">{t.abonado}</dt><dd className="text-emerald-600">USD ${citaSeleccionada.pagado}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/50">{t.saldo}</dt><dd className="font-semibold text-amber-600">USD ${citaSeleccionada.total - citaSeleccionada.pagado}</dd></div>
              </dl>
              {citaSeleccionada.total > citaSeleccionada.pagado ? (
                <button onClick={() => setTab('pagos')} className="mt-4 block w-full rounded-full bg-brand-gradient py-2.5 text-center text-sm font-bold text-white shadow-soft">
                  {t.pagarSaldo} USD ${citaSeleccionada.total - citaSeleccionada.pagado}
                </button>
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
              <p className="font-display text-xl font-semibold text-ink">USD $87</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.pendiente}</p>
              <p className="font-display text-xl font-semibold text-amber-600">USD $30</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.enRevision}</p>
              <p className="font-display text-xl font-semibold text-lilac-600">USD $55</p>
            </div>
          </section>
          <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="hidden grid-cols-12 gap-2 border-b border-brand-50 px-5 py-3 text-xs text-ink/45 sm:grid">
              <span className="col-span-4">{t.concepto}</span><span className="col-span-2">{t.fecha}</span><span className="col-span-2">{t.monto}</span><span className="col-span-2">{t.metodo}</span><span className="col-span-2">{t.estado}</span>
            </div>
            <div className="divide-y divide-brand-50 text-sm">
              {pagosCombinados.map((p, i) => (
                <div key={i} className="grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-12 sm:items-center sm:gap-2">
                  <span className="text-ink sm:col-span-4">{p.concepto[language]}</span>
                  <span className="text-ink/50 sm:col-span-2">{p.fecha}</span>
                  <span className="text-ink sm:col-span-2">USD ${p.monto}</span>
                  <span className="text-ink/50 sm:col-span-2">{p.metodo[language]}</span>
                  <span className="sm:col-span-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pagoEstadoEstilo[p.estado]}`}>
                      {p.estado === 'pagado' ? t.estadoPagado : p.estado === 'pendiente' ? t.estadoPendiente : p.estado === 'revision' ? t.estadoRevision : t.estadoRechazado}
                    </span>
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
            {NOTIFICACIONES_PACIENTE.map((n, i) => (
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
    </PortalLayout>
  );
}
