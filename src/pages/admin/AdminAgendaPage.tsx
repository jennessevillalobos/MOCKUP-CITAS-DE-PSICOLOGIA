import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, X, CalendarDays } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminModal from '@/components/admin/ui/AdminModal';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import { demoCitas, AGENDA_HOY, type CitaRecord, type CitaEstado } from '@/data/admin/agendaData';
import { demoProfesionales, demoLugares, demoServicios } from '@/data/admin/servicesData';

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
  const [citas, setCitas] = useState<CitaRecord[]>(demoCitas);
  const [vista, setVista] = useState<Vista>('semana');
  const [cursor, setCursor] = useState<Date>(parseISO(AGENDA_HOY));
  const [filtroProf, setFiltroProf] = useState('todos');
  const [filtroLugar, setFiltroLugar] = useState('todos');
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [filtroEstados, setFiltroEstados] = useState<Set<CitaEstado>>(new Set());
  const [seleccion, setSeleccion] = useState<CitaRecord | null>(null);
  const [edicion, setEdicion] = useState<{ fechaISO: string; hora: string } | null>(null);

  const profesionales = demoProfesionales.map((p) => p.nombre);
  const lugares = demoLugares.map((l) => l.nombre);
  const servicios = demoServicios.map((s) => s.nombre);

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

  function abrirDetalle(c: CitaRecord) {
    setSeleccion(c);
    setEdicion({ fechaISO: c.fechaISO, hora: c.hora });
  }
  function cerrarDetalle() {
    setSeleccion(null);
    setEdicion(null);
  }
  function cambiarEstado(id: string, estado: CitaEstado) {
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, estado } : c)));
    setSeleccion((prev) => (prev && prev.id === id ? { ...prev, estado } : prev));
  }
  function guardarReprogramacion() {
    if (!seleccion || !edicion) return;
    setCitas((prev) => prev.map((c) => (c.id === seleccion.id ? { ...c, ...edicion } : c)));
    setSeleccion((prev) => (prev ? { ...prev, ...edicion } : prev));
  }

  function nombreMes(d: Date) {
    return `${t.months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function irHoy() {
    setCursor(parseISO(AGENDA_HOY));
  }
  function navegar(dir: 1 | -1) {
    if (vista === 'dia') setCursor((c) => addDays(c, dir));
    else if (vista === 'semana') setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  const citaChip = (c: CitaRecord, compact = false) => (
    <button
      key={c.id}
      onClick={() => abrirDetalle(c)}
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
          <p className="mt-1 text-sm text-ink/50">{t.subtitle(filtradas.length)}</p>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-2xl bg-brand-gradient px-4 text-sm font-bold text-white shadow-soft">
          <Plus size={16} />
          {t.newCita}
        </button>
      </div>

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
                const esHoy = iso === AGENDA_HOY;
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
                    const esHoy = iso === AGENDA_HOY;
                    const delDia = filtradas.filter((c) => c.fechaISO === iso).sort((a, b) => a.hora.localeCompare(b.hora));
                    return (
                      <button
                        key={iso}
                        onClick={() => { setCursor(d); setVista('dia'); }}
                        className={`min-h-[92px] border-b border-r border-brand-50 p-1.5 text-left align-top last:border-r-0 hover:bg-brand-50/40 ${
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
                      </button>
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
              <StatusBadge tone={ESTADO_TONE[seleccion.estado]}>{t.estados[seleccion.estado]}</StatusBadge>
            </div>

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
                onClick={guardarReprogramacion}
                className="mt-3 w-full rounded-xl bg-brand-gradient py-2 text-xs font-bold text-white shadow-soft"
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
              {seleccion.estado !== 'Completada' && (
                <button
                  onClick={() => cambiarEstado(seleccion.id, 'Completada')}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  {t.complete}
                </button>
              )}
              {seleccion.estado === 'Programada' && (
                <button
                  onClick={() => cambiarEstado(seleccion.id, 'No asistió')}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                >
                  {t.markNoShow}
                </button>
              )}
              {seleccion.estado !== 'Cancelada' && (
                <button
                  onClick={() => cambiarEstado(seleccion.id, 'Cancelada')}
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
    </AdminLayout>
  );
}
