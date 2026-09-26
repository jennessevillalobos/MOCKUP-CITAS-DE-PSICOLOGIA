import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, X, CalendarDays } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminModal from '@/components/admin/ui/AdminModal';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import { demoCitas, AGENDA_HOY, type CitaRecord, type CitaEstado } from '@/data/admin/agendaData';
import { demoProfesionales, demoLugares, demoServicios } from '@/data/admin/servicesData';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useDialogo } from '@/context/DialogoContext';
import { cargarAgendaAdmin, actualizarCitaAdmin, crearCitaAdmin, type AgendaAdmin, type CitaAdmin, type EstadoCitaBase } from '@/lib/api/admin';

// Con Supabase: cita de la base → registro del calendario.
type RegistroCita = CitaRecord & { estadoBase?: EstadoCitaBase; precio?: number; saldo?: number };

const ESTADO_DESDE_BASE: Record<EstadoCitaBase, CitaEstado> = {
  pendiente_pago: 'Programada', parcialmente_pagada: 'Programada', confirmada: 'Programada', reprogramada: 'Programada',
  completada: 'Completada', cancelada: 'Cancelada', no_asistio: 'No asistió',
};
const ETIQUETA_BASE: Partial<Record<EstadoCitaBase, string>> = {
  pendiente_pago: 'Pendiente de pago', parcialmente_pagada: 'Pago parcial', confirmada: 'Confirmada', reprogramada: 'Reprogramada',
};

function citaDesdeBase(c: CitaAdmin): RegistroCita {
  const online = c.modalidad === 'virtual';
  return {
    id: c.id,
    fechaISO: c.fecha,
    hora: c.hora,
    duracionMin: c.duracion,
    paciente: c.paciente ?? '—',
    correo: c.correo ?? '',
    servicio: c.servicio ?? 'Cita',
    profesional: c.profesional ?? '—',
    modalidad: online ? 'Online' : 'Presencial',
    lugar: online ? undefined : c.lugar ?? (c.modalidad === 'domicilio' ? 'Domicilio' : undefined),
    estado: ESTADO_DESDE_BASE[c.estado] ?? 'Programada',
    notas: c.notas ?? undefined,
    estadoBase: c.estado,
    precio: c.precio,
    saldo: c.saldo,
  };
}

function hoyLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Vista = 'dia' | 'semana' | 'mes';

const text = {
  es: {
    title: 'Agenda / Citas', subtitle: (n: number) => `${n} citas · datos de demostración`, newCita: 'Nueva cita',
    views: { dia: 'Día', semana: 'Semana', mes: 'Mes' } as Record<Vista, string>,
    today: 'Hoy', filters: 'Filtros', professional: 'Profesional', location: 'Sede', service: 'Servicio',
    status: 'Estado', all: 'Todos', clear: 'Limpiar filtros', legend: 'Leyenda',
    estados: { Programada: 'Programada', Completada: 'Completada', Cancelada: 'Cancelada', 'No asistió': 'No asistió' } as Record<CitaEstado, string>,
    noAppointments: 'No hay citas con estos filtros.',
    weekdaysShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    months: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
    detail: 'Detalle de la cita', patient: 'Paciente', email: 'Correo', service2: 'Servicio', professional2: 'Profesional',
    place: 'Lugar', online: 'En línea', date: 'Fecha', start: 'Hora de inicio', end: 'Hora de fin', notes: 'Notas',
    save: 'Guardar cambios', reschedule: 'Reprogramar cita cambiando la fecha/hora y guarda los cambios.',
    complete: 'Marcar como completada', cancel: 'Cancelar cita', markNoShow: 'Marcar no asistió', close: 'Cerrar',
    saved: 'Cambios guardados.', more: 'más',
  },
  en: {
    title: 'Schedule / Appointments', subtitle: (n: number) => `${n} appointments · demo data`, newCita: 'New appointment',
    views: { dia: 'Day', semana: 'Week', mes: 'Month' } as Record<Vista, string>,
    today: 'Today', filters: 'Filters', professional: 'Professional', location: 'Location', service: 'Service',
    status: 'Status', all: 'All', clear: 'Clear filters', legend: 'Legend',
    estados: { Programada: 'Scheduled', Completada: 'Completed', Cancelada: 'Cancelled', 'No asistió': 'No-show' } as Record<CitaEstado, string>,
    noAppointments: 'No appointments match these filters.',
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    detail: 'Appointment detail', patient: 'Patient', email: 'Email', service2: 'Service', professional2: 'Professional',
    place: 'Location', online: 'Online', date: 'Date', start: 'Start time', end: 'End time', notes: 'Notes',
    save: 'Save changes', reschedule: 'Reschedule by changing the date/time and saving.',
    complete: 'Mark as completed', cancel: 'Cancel appointment', markNoShow: 'Mark no-show', close: 'Close',
    saved: 'Changes saved.', more: 'more',
  },
} as const;

const ESTADO_DOT: Record<CitaEstado, string> = {
  Programada: 'bg-brand-500',
  Completada: 'bg-emerald-500',
  Cancelada: 'bg-rose-500',
  'No asistió': 'bg-amber-500',
};
const ESTADO_TONE: Record<CitaEstado, 'positivo' | 'neutro' | 'alerta' | 'negativo'> = {
  Programada: 'neutro',
  Completada: 'positivo',
  Cancelada: 'negativo',
  'No asistió': 'alerta',
};

function parseISO(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d: Date, n: number) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}
function startOfWeek(d: Date) {
  const nd = new Date(d);
  const day = nd.getDay();
  nd.setDate(nd.getDate() - day);
  return nd;
}
function addMinutes(hora: string, min: number) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + min;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export default function AdminAgendaPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];
  const { esReal } = useAdminAuth();
  const { confirmar, pedirTexto } = useDialogo();
  const HOY = esReal ? hoyLocalISO() : AGENDA_HOY;
  const [citas, setCitas] = useState<RegistroCita[]>(() => (esReal ? [] : demoCitas));
  const [catalogo, setCatalogo] = useState<AgendaAdmin | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [vista, setVista] = useState<Vista>('semana');
  const [cursor, setCursor] = useState<Date>(() => parseISO(esReal ? hoyLocalISO() : AGENDA_HOY));
  const [filtroProf, setFiltroProf] = useState('todos');
  const [filtroLugar, setFiltroLugar] = useState('todos');
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [filtroEstados, setFiltroEstados] = useState<Set<CitaEstado>>(new Set());
  const [seleccion, setSeleccion] = useState<RegistroCita | null>(null);
  const [edicion, setEdicion] = useState<{ fechaISO: string; hora: string } | null>(null);

  // Declarar primero para que citaVacia pueda usarlas sin crash
  const profesionales = esReal ? (catalogo?.profesionales ?? []).map((p) => p.nombre) : demoProfesionales.map((p) => p.nombre);
  const lugares = esReal ? (catalogo?.lugares ?? []).map((l) => l.nombre) : demoLugares.map((l) => l.nombre);
  const servicios = esReal ? (catalogo?.servicios ?? []).map((s) => s.nombre) : demoServicios.map((s) => s.nombre);

  function mostrarAviso(texto: string, error = false) {
    setAviso({ texto, error });
    window.setTimeout(() => setAviso(null), 4000);
  }

  // Modo real: citas de todas las profesionales + catálogo (admin_agenda).
  const recargar = useCallback(async () => {
    if (!esReal) return null;
    const res = await cargarAgendaAdmin();
    if (res.error) {
      setErrorCarga(res.error.message);
      return null;
    }
    setErrorCarga(null);
    setCatalogo(res.data);
    const lista = res.data.citas.map(citaDesdeBase);
    setCitas(lista);
    return lista;
  }, [esReal]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  // ===== NUEVA CITA (modo real): por ids del catálogo =====
  const idModalidad = (nombre: string) => catalogo?.modalidades.find((m) => m.nombre === nombre)?.id ?? 0;
  const formRealVacio = () => ({
    correo: '',
    profesionalId: catalogo?.profesionales[0]?.id ?? 0,
    servicioId: 0,
    modalidadId: idModalidad('virtual'),
    lugarId: catalogo?.lugares[0]?.id ?? 0,
    fechaISO: hoyLocalISO(),
    hora: '09:00',
  });
  const [formReal, setFormReal] = useState(formRealVacio);
  const serviciosDeProf = (catalogo?.servicios ?? []).filter((s) =>
    (catalogo?.ofrece ?? []).some((o) => o.profesionalId === formReal.profesionalId && o.servicioId === s.id)
  );
  const tarifaReal = catalogo?.tarifas.find((t) => t.servicioId === formReal.servicioId && t.modalidadId === formReal.modalidadId);
  const esPresencialReal = formReal.modalidadId === idModalidad('presencial');

  // ===== NUEVA CITA =====
  const citaVacia = () => ({
    paciente: '', correo: '', profesional: profesionales[0] ?? '',
    servicio: servicios[0] ?? '', modalidad: 'Online' as 'Online' | 'Presencial',
    lugar: '', fechaISO: AGENDA_HOY, hora: '09:00', duracionMin: 50,
  });
  const [modalNuevaCita, setModalNuevaCita] = useState(false);
  const [formNueva, setFormNueva] = useState(citaVacia);
  const [errorNueva, setErrorNueva] = useState('');

  function abrirModalNuevaCita() {
    setFormNueva(citaVacia());
    setFormReal(formRealVacio());
    setErrorNueva('');
    setModalNuevaCita(true);
  }

  async function crearCitaReal() {
    const servicioId = formReal.servicioId || serviciosDeProf[0]?.id || 0;
    if (!/^\S+@\S+\.\S+$/.test(formReal.correo.trim())) return setErrorNueva('Escribe el correo de la cuenta del paciente.');
    if (!servicioId) return setErrorNueva('Esa profesional no tiene servicios asignados.');
    if (!formReal.fechaISO || !formReal.hora) return setErrorNueva('Elige fecha y hora.');
    setProcesando(true);
    const res = await crearCitaAdmin({
      correo: formReal.correo.trim(),
      servicioId,
      profesionalId: formReal.profesionalId,
      modalidadId: formReal.modalidadId,
      lugarId: esPresencialReal ? formReal.lugarId : null,
      fecha: formReal.fechaISO,
      hora: formReal.hora,
    });
    setProcesando(false);
    if (res.error) return setErrorNueva(res.error.message);
    setModalNuevaCita(false);
    mostrarAviso('Cita creada. La paciente y la profesional recibieron un aviso.');
    setCursor(parseISO(formReal.fechaISO));
    await recargar();
  }

  function crearCita() {
    if (esReal) {
      void crearCitaReal();
      return;
    }
    if (!formNueva.paciente.trim()) { setErrorNueva(lang === 'es' ? 'El nombre del paciente es requerido.' : 'Patient name is required.'); return; }
    if (!formNueva.fechaISO) { setErrorNueva(lang === 'es' ? 'Selecciona una fecha.' : 'Select a date.'); return; }
    const nueva: CitaRecord = {
      id: `c${Date.now()}`,
      ...formNueva,
      estado: 'Programada',
      lugar: formNueva.modalidad === 'Presencial' ? formNueva.lugar : undefined,
    };
    setCitas((prev) => [...prev, nueva]);
    setModalNuevaCita(false);
  }

  const filtradas = useMemo(
    () =>
      citas.filter(
        (c) =>
          (filtroProf === 'todos' || c.profesional === filtroProf) &&
          (filtroLugar === 'todos' || c.lugar === filtroLugar) &&
          (filtroServicio === 'todos' || c.servicio === filtroServicio) &&
          (filtroEstados.size === 0 || filtroEstados.has(c.estado)),
      ),
    [citas, filtroProf, filtroLugar, filtroServicio, filtroEstados],
  );

  function toggleEstado(e: CitaEstado) {
    setFiltroEstados((prev) => {
      const next = new Set(prev);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return next;
    });
  }
  function limpiarFiltros() {
    setFiltroProf('todos');
    setFiltroLugar('todos');
    setFiltroServicio('todos');
    setFiltroEstados(new Set());
  }

  function abrirDetalle(c: RegistroCita) {
    setSeleccion(c);
    setEdicion({ fechaISO: c.fechaISO, hora: c.hora });
  }
  function cerrarDetalle() {
    setSeleccion(null);
    setEdicion(null);
  }
  async function cambiarEstado(id: string, estado: CitaEstado) {
    if (esReal) {
      const base = estado === 'Completada' ? 'completada' : estado === 'Cancelada' ? 'cancelada' : 'no_asistio';
      let motivo: string | undefined;
      if (base === 'cancelada') {
        const texto = await pedirTexto(
          'Motivo de la cancelación (opcional). La paciente y la profesional recibirán un aviso. Si la cita tenía pagos, el reembolso se registra en Pagos.',
          { peligro: true, textoAceptar: 'Cancelar cita' }
        );
        if (texto === null) return;
        motivo = texto;
      } else {
        const ok = await confirmar(base === 'completada' ? '¿Marcar la cita como realizada?' : '¿Marcar que la paciente no asistió?', {
          textoAceptar: 'Confirmar',
        });
        if (!ok) return;
      }
      setProcesando(true);
      const res = await actualizarCitaAdmin(id, { estado: base, motivo });
      setProcesando(false);
      if (res.error) {
        const msg = /Transición de estado inválida/.test(res.error.message) ? 'Esa cita ya no admite ese cambio de estado.' : res.error.message;
        return mostrarAviso(msg, true);
      }
      mostrarAviso('Cita actualizada.');
      const lista = await recargar();
      setSeleccion(lista?.find((c) => c.id === id) ?? null);
      return;
    }
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, estado } : c)));
    setSeleccion((prev) => (prev && prev.id === id ? { ...prev, estado } : prev));
  }
  async function guardarReprogramacion() {
    if (!seleccion || !edicion) return;
    if (esReal) {
      if (edicion.fechaISO === seleccion.fechaISO && edicion.hora === seleccion.hora) return;
      setProcesando(true);
      const res = await actualizarCitaAdmin(seleccion.id, { fecha: edicion.fechaISO, hora: edicion.hora });
      setProcesando(false);
      if (res.error) return mostrarAviso(res.error.message, true);
      mostrarAviso('Cita reprogramada. La paciente y la profesional recibieron un aviso.');
      const lista = await recargar();
      const nueva = lista?.find((c) => c.id === seleccion.id) ?? null;
      setSeleccion(nueva);
      if (nueva) setEdicion({ fechaISO: nueva.fechaISO, hora: nueva.hora });
      return;
    }
    setCitas((prev) => prev.map((c) => (c.id === seleccion.id ? { ...c, ...edicion } : c)));
    setSeleccion((prev) => (prev ? { ...prev, ...edicion } : prev));
  }

  function nombreMes(d: Date) {
    return `${t.months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function irHoy() {
    setCursor(parseISO(HOY));
  }
  function navegar(dir: 1 | -1) {
    if (vista === 'dia') setCursor((c) => addDays(c, dir));
    else if (vista === 'semana') setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  const citaChip = (c: RegistroCita, compact = false) => (
    <button
      key={c.id}
      onClick={(e) => {
        e.stopPropagation();
        abrirDetalle(c);
      }}
      className={`block w-full truncate rounded-lg border px-2 py-1 text-left text-[11px] font-semibold shadow-sm transition hover:-translate-y-px hover:shadow ${
        c.estado === 'Cancelada'
          ? 'border-rose-200 bg-rose-50 text-rose-700 line-through decoration-rose-300'
          : c.estado === 'Completada'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : c.estado === 'No asistió'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-brand-200 bg-brand-50 text-brand-700'
      }`}
      title={`${c.hora} · ${c.paciente} · ${c.servicio}`}
    >
      {!compact && <span className="mr-1">{c.hora}</span>}
      {c.paciente}
    </button>
  );

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">
            {esReal ? `${filtradas.length} ${lang === 'es' ? 'citas · datos reales' : 'appointments · live data'}` : t.subtitle(filtradas.length)}
          </p>
        </div>
        <button
          onClick={abrirModalNuevaCita}
          className="flex h-10 items-center gap-2 rounded-2xl bg-brand-gradient px-4 text-sm font-bold text-white shadow-soft hover:opacity-90"
        >
          <Plus size={16} />
          {t.newCita}
        </button>
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        {/* Filtros */}
        <aside className="h-fit space-y-4 rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink">{t.filters}</p>
            <button onClick={limpiarFiltros} className="text-[11px] font-semibold text-brand-600 hover:underline">
              {t.clear}
            </button>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.professional}</label>
            <select
              value={filtroProf}
              onChange={(e) => setFiltroProf(e.target.value)}
              className="h-9 w-full rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none"
            >
              <option value="todos">{t.all}</option>
              {profesionales.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.location}</label>
            <select
              value={filtroLugar}
              onChange={(e) => setFiltroLugar(e.target.value)}
              className="h-9 w-full rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none"
            >
              <option value="todos">{t.all}</option>
              {lugares.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.service}</label>
            <select
              value={filtroServicio}
              onChange={(e) => setFiltroServicio(e.target.value)}
              className="h-9 w-full rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none"
            >
              <option value="todos">{t.all}</option>
              {servicios.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.status}</p>
            <div className="space-y-1.5">
              {(Object.keys(ESTADO_DOT) as CitaEstado[]).map((e) => (
                <label key={e} className="flex cursor-pointer items-center gap-2 text-xs text-ink/70">
                  <input
                    type="checkbox"
                    checked={filtroEstados.has(e)}
                    onChange={() => toggleEstado(e)}
                    className="h-3.5 w-3.5 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
                  />
                  <span className={`h-2 w-2 rounded-full ${ESTADO_DOT[e]}`} />
                  {t.estados[e]}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Calendario */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft">
            <div className="flex items-center gap-2">
              <button onClick={() => navegar(-1)} className="rounded-lg p-1.5 text-ink/50 hover:bg-brand-50" aria-label="prev">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => navegar(1)} className="rounded-lg p-1.5 text-ink/50 hover:bg-brand-50" aria-label="next">
                <ChevronRight size={18} />
              </button>
              <button onClick={irHoy} className="rounded-xl border border-brand-100 px-3 py-1.5 text-xs font-bold text-ink/60 hover:bg-brand-50">
                {t.today}
              </button>
              <span className="ml-2 flex items-center gap-1.5 font-display text-base font-semibold text-ink">
                <CalendarDays size={16} className="text-brand-500" />
                {vista === 'mes' ? nombreMes(cursor) : `${nombreMes(cursor)}`}
              </span>
            </div>
            <div className="flex gap-1 rounded-2xl border border-brand-100 bg-brand-50/40 p-1">
              {(['dia', 'semana', 'mes'] as Vista[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    vista === v ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/50 hover:bg-white'
                  }`}
                >
                  {t.views[v]}
                </button>
              ))}
            </div>
          </div>

          {vista === 'dia' && (
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="mb-3 text-sm font-bold text-ink">
                {t.weekdaysShort[cursor.getDay()]} {cursor.getDate()} {t.months[cursor.getMonth()]}
              </p>
              <div className="space-y-2">
                {filtradas
                  .filter((c) => c.fechaISO === toISO(cursor))
                  .sort((a, b) => a.hora.localeCompare(b.hora))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => abrirDetalle(c)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-brand-100 p-3 text-left hover:bg-brand-50/50"
                    >
                      <span className="w-14 shrink-0 text-sm font-bold text-brand-700">{c.hora}</span>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${ESTADO_DOT[c.estado]}`} />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{c.paciente}</span>
                        <span className="block truncate text-xs text-ink/50">{c.servicio} · {c.profesional}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-ink/45">
                        {c.modalidad === 'Online' ? <Video size={13} /> : <MapPin size={13} />}
                        {c.modalidad === 'Online' ? t.online : c.lugar}
                      </span>
                      <StatusBadge tone={ESTADO_TONE[c.estado]}>{t.estados[c.estado]}</StatusBadge>
                    </button>
                  ))}
                {filtradas.filter((c) => c.fechaISO === toISO(cursor)).length === 0 && (
                  <p className="py-8 text-center text-sm text-ink/40">{t.noAppointments}</p>
                )}
              </div>
            </div>
          )}

          {vista === 'semana' && (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)).map((d) => {
                const iso = toISO(d);
                const esHoy = iso === HOY;
                const delDia = filtradas.filter((c) => c.fechaISO === iso).sort((a, b) => a.hora.localeCompare(b.hora));
                return (
                  <div
                    key={iso}
                    className={`min-h-[220px] rounded-2xl border p-2 ${esHoy ? 'border-brand-300 bg-brand-50/40' : 'border-brand-100 bg-white'}`}
                  >
                    <p className={`mb-2 text-center text-xs font-bold ${esHoy ? 'text-brand-700' : 'text-ink/50'}`}>
                      {t.weekdaysShort[d.getDay()]} <span className="block text-sm">{d.getDate()}</span>
                    </p>
                    <div className="space-y-1">
                      {delDia.map((c) => citaChip(c))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {vista === 'mes' && (
            <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
              <div className="grid grid-cols-7 border-b border-brand-100 bg-brand-50/40 text-center text-[11px] font-bold uppercase tracking-wide text-ink/45">
                {t.weekdaysShort.map((w) => (
                  <div key={w} className="py-2">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {(() => {
                  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
                  const gridStart = startOfWeek(first);
                  return Array.from({ length: 42 }, (_, i) => {
                    const d = addDays(gridStart, i);
                    const iso = toISO(d);
                    const enMes = d.getMonth() === cursor.getMonth();
                    const esHoy = iso === HOY;
                    const delDia = filtradas.filter((c) => c.fechaISO === iso).sort((a, b) => a.hora.localeCompare(b.hora));
                    return (
                      <div
                        key={iso}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setCursor(d); setVista('dia'); }}
                        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setCursor(d);
                            setVista('dia');
                          }
                        }}
                        className={`min-h-[92px] cursor-pointer border-b border-r border-brand-50 p-1.5 text-left align-top last:border-r-0 hover:bg-brand-50/40 ${
                          enMes ? '' : 'bg-ink/[0.02] text-ink/30'
                        }`}
                      >
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${esHoy ? 'bg-brand-gradient text-white' : 'text-ink/60'}`}>
                          {d.getDate()}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {delDia.slice(0, 2).map((c) => citaChip(c, true))}
                          {delDia.length > 2 && (
                            <p className="px-1 text-[10px] font-semibold text-ink/40">+{delDia.length - 2} {t.more}</p>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </section>
      </div>

      {seleccion && edicion && (
        <AdminModal onClose={cerrarDetalle} title={t.detail}>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-ink">{seleccion.paciente}</p>
                <p className="text-xs text-ink/50">{seleccion.correo}</p>
              </div>
              <StatusBadge tone={ESTADO_TONE[seleccion.estado]}>
                {(seleccion.estadoBase && ETIQUETA_BASE[seleccion.estadoBase]) ?? t.estados[seleccion.estado]}
              </StatusBadge>
            </div>

            {esReal && seleccion.precio !== undefined && (
              <p className="rounded-2xl bg-brand-50/60 px-3 py-2 text-xs text-ink/60">
                Precio USD {seleccion.precio} · {seleccion.saldo ? `saldo pendiente USD ${seleccion.saldo}` : 'pagada'}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.service2}</p>
                <p className="text-ink">{seleccion.servicio}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.professional2}</p>
                <p className="text-ink">{seleccion.profesional}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.place}</p>
                <p className="flex items-center gap-1.5 text-ink">
                  {seleccion.modalidad === 'Online' ? <Video size={13} /> : <MapPin size={13} />}
                  {seleccion.modalidad === 'Online' ? t.online : seleccion.lugar}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.end}</p>
                <p className="text-ink">{addMinutes(edicion.hora, seleccion.duracionMin)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
              <p className="mb-2 text-xs font-semibold text-ink/60">{t.reschedule}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.date}</label>
                  <input
                    type="date"
                    value={edicion.fechaISO}
                    onChange={(e) => setEdicion((prev) => (prev ? { ...prev, fechaISO: e.target.value } : prev))}
                    className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-xs text-ink outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.start}</label>
                  <input
                    type="time"
                    value={edicion.hora}
                    onChange={(e) => setEdicion((prev) => (prev ? { ...prev, hora: e.target.value } : prev))}
                    className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-xs text-ink outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => void guardarReprogramacion()}
                disabled={procesando || (esReal && ['Cancelada', 'Completada', 'No asistió'].includes(seleccion.estado))}
                className="mt-3 w-full rounded-xl bg-brand-gradient py-2 text-xs font-bold text-white shadow-soft disabled:opacity-50"
              >
                {t.save}
              </button>
            </div>

            {seleccion.notas && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.notes}</p>
                <p className="text-sm text-ink/70">{seleccion.notas}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-brand-100 pt-3">
              {(esReal ? seleccion.estado === 'Programada' : seleccion.estado !== 'Completada') && (
                <button
                  disabled={procesando} onClick={() => void cambiarEstado(seleccion.id, 'Completada')}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  {t.complete}
                </button>
              )}
              {seleccion.estado === 'Programada' && (
                <button
                  disabled={procesando} onClick={() => void cambiarEstado(seleccion.id, 'No asistió')}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                >
                  {t.markNoShow}
                </button>
              )}
              {(esReal ? seleccion.estado === 'Programada' : seleccion.estado !== 'Cancelada') && (
                <button
                  disabled={procesando} onClick={() => void cambiarEstado(seleccion.id, 'Cancelada')}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  {t.cancel}
                </button>
              )}
              <button
                onClick={cerrarDetalle}
                className="ml-auto flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-ink/50 hover:bg-ink/5"
              >
                <X size={13} />
                {t.close}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* ===== MODAL NUEVA CITA ===== */}
      {modalNuevaCita && (
        <AdminModal
          title={lang === 'es' ? 'Nueva cita' : 'New appointment'}
          onClose={() => setModalNuevaCita(false)}
        >
          {esReal ? (
          <div className="space-y-4">
            <p className="rounded-2xl bg-brand-50 px-3 py-2 text-xs leading-relaxed text-ink/60">
              Para pacientes que ya tienen cuenta. La cita queda pendiente de pago (puede pagarla desde su portal) y se valida el horario de la
              profesional como en la reserva del sitio.
            </p>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Correo de la cuenta del paciente</label>
              <input
                type="email"
                value={formReal.correo}
                onChange={(e) => setFormReal((f) => ({ ...f, correo: e.target.value }))}
                placeholder="email@ejemplo.com"
                className="h-9 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none focus:border-brand-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Profesional</label>
                <select
                  value={formReal.profesionalId}
                  onChange={(e) => setFormReal((f) => ({ ...f, profesionalId: Number(e.target.value), servicioId: 0 }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-sm text-ink outline-none"
                >
                  {(catalogo?.profesionales ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Servicio</label>
                <select
                  value={formReal.servicioId || serviciosDeProf[0]?.id || 0}
                  onChange={(e) => setFormReal((f) => ({ ...f, servicioId: Number(e.target.value) }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-sm text-ink outline-none"
                >
                  {serviciosDeProf.map((sv) => <option key={sv.id} value={sv.id}>{sv.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Modalidad</label>
                <select
                  value={formReal.modalidadId}
                  onChange={(e) => setFormReal((f) => ({ ...f, modalidadId: Number(e.target.value) }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-sm text-ink outline-none"
                >
                  <option value={idModalidad('virtual')}>Online</option>
                  <option value={idModalidad('presencial')}>Presencial</option>
                </select>
              </div>
              {esPresencialReal && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Sede</label>
                  <select
                    value={formReal.lugarId}
                    onChange={(e) => setFormReal((f) => ({ ...f, lugarId: Number(e.target.value) }))}
                    className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-sm text-ink outline-none"
                  >
                    {(catalogo?.lugares ?? []).map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Fecha</label>
                <input
                  type="date"
                  value={formReal.fechaISO}
                  min={hoyLocalISO()}
                  onChange={(e) => setFormReal((f) => ({ ...f, fechaISO: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-xs text-ink outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Hora</label>
                <input
                  type="time"
                  value={formReal.hora}
                  onChange={(e) => setFormReal((f) => ({ ...f, hora: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-xs text-ink outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-ink/50">
              {(() => {
                const tarifa =
                  tarifaReal ??
                  catalogo?.tarifas.find((x) => x.servicioId === (serviciosDeProf[0]?.id ?? 0) && x.modalidadId === formReal.modalidadId);
                return tarifa ? `Duración ${tarifa.duracion} min · precio USD ${tarifa.precio}` : 'Ese servicio no se ofrece en esta modalidad.';
              })()}
            </p>
            {errorNueva && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{errorNueva}</p>}
            <div className="flex gap-2 border-t border-brand-100 pt-3">
              <button
                onClick={() => setModalNuevaCita(false)}
                className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50"
              >
                Cancelar
              </button>
              <button
                onClick={crearCita}
                disabled={procesando}
                className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft hover:opacity-90 disabled:opacity-60"
              >
                Crear cita
              </button>
            </div>
          </div>
          ) : (
          <div className="space-y-4">
            {/* Paciente */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">
                  {lang === 'es' ? 'Paciente' : 'Patient'}
                </label>
                <input
                  type="text"
                  value={formNueva.paciente}
                  onChange={(e) => setFormNueva((f) => ({ ...f, paciente: e.target.value }))}
                  placeholder={lang === 'es' ? 'Nombre completo' : 'Full name'}
                  className="h-9 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">
                  {lang === 'es' ? 'Correo' : 'Email'}
                </label>
                <input
                  type="email"
                  value={formNueva.correo}
                  onChange={(e) => setFormNueva((f) => ({ ...f, correo: e.target.value }))}
                  placeholder="email@ejemplo.com"
                  className="h-9 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none focus:border-brand-400"
                />
              </div>
            </div>

            {/* Profesional y Servicio */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">
                  {lang === 'es' ? 'Profesional' : 'Professional'}
                </label>
                <select
                  value={formNueva.profesional}
                  onChange={(e) => setFormNueva((f) => ({ ...f, profesional: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-sm text-ink outline-none"
                >
                  {profesionales.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">
                  {lang === 'es' ? 'Servicio' : 'Service'}
                </label>
                <select
                  value={formNueva.servicio}
                  onChange={(e) => setFormNueva((f) => ({ ...f, servicio: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-sm text-ink outline-none"
                >
                  {servicios.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Modalidad y Sede */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">
                  {lang === 'es' ? 'Modalidad' : 'Modality'}
                </label>
                <select
                  value={formNueva.modalidad}
                  onChange={(e) => setFormNueva((f) => ({ ...f, modalidad: e.target.value as 'Online' | 'Presencial' }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-sm text-ink outline-none"
                >
                  <option value="Online">Online</option>
                  <option value="Presencial">{lang === 'es' ? 'Presencial' : 'In-person'}</option>
                </select>
              </div>
              {formNueva.modalidad === 'Presencial' && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">
                    {lang === 'es' ? 'Sede' : 'Location'}
                  </label>
                  <select
                    value={formNueva.lugar}
                    onChange={(e) => setFormNueva((f) => ({ ...f, lugar: e.target.value }))}
                    className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-sm text-ink outline-none"
                  >
                    {lugares.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Fecha, Hora y Duración */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">
                  {lang === 'es' ? 'Fecha' : 'Date'}
                </label>
                <input
                  type="date"
                  value={formNueva.fechaISO}
                  onChange={(e) => setFormNueva((f) => ({ ...f, fechaISO: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-xs text-ink outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">
                  {lang === 'es' ? 'Hora' : 'Time'}
                </label>
                <input
                  type="time"
                  value={formNueva.hora}
                  onChange={(e) => setFormNueva((f) => ({ ...f, hora: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-xs text-ink outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">
                  {lang === 'es' ? 'Duración (min)' : 'Duration (min)'}
                </label>
                <input
                  type="number"
                  min={15}
                  value={formNueva.duracionMin}
                  onChange={(e) => setFormNueva((f) => ({ ...f, duracionMin: Number(e.target.value) }))}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-xs text-ink outline-none"
                />
              </div>
            </div>

            {errorNueva && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{errorNueva}</p>
            )}

            <div className="flex gap-2 border-t border-brand-100 pt-3">
              <button
                onClick={() => setModalNuevaCita(false)}
                className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={crearCita}
                className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft hover:opacity-90"
              >
                {lang === 'es' ? 'Crear cita' : 'Create appointment'}
              </button>
            </div>
          </div>
          )}
        </AdminModal>
      )}
    </AdminLayout>
  );
}
