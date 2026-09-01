import { useMemo, useState } from 'react';
import {
  CalendarDays, Clock, Video, MapPin, History, RotateCcw, XCircle, ArrowLeft, Check, Plus,
} from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { INSTRUCTOR_NAV_LABELS, buildInstructorNav } from '@/components/site/instructorNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useInstructorAgenda } from '@/context/InstructorAgendaContext';
import { AGENDA_INSTRUCTOR_HOY, type CitaInstructor } from '@/data/citasInstructorData';
import type { CitaEstado } from '@/data/admin/agendaData';

type Tab = 'proximas' | 'canceladas' | 'realizadas';
type Vista = 'lista' | 'historial';

const text = {
  es: {
    volverPortal: 'Volver al panel',
    titulo: 'Mis citas', subtitulo: 'Todas tus citas agendadas, canceladas y realizadas, con el historial de cada paciente.',
    hoy: 'Hoy', estaSemana: 'Esta semana', canceladas: 'Canceladas', realizadas: 'Realizadas',
    tabProximas: 'Próximas', tabCanceladas: 'Canceladas', tabRealizadas: 'Realizadas',
    sinCitas: 'No tienes citas en esta categoría.',
    enLinea: 'En línea',
    reagendar: 'Reagendar', cancelar: 'Cancelar', verHistorial: 'Ver historial',
    confirmCancelar: '¿Cancelar esta cita? El paciente será notificado.',
    fecha: 'Fecha', hora: 'Hora', guardarCambio: 'Guardar', cancelarAccion: 'Cerrar',
    estadoProgramada: 'Programada', estadoCompletada: 'Completada', estadoCancelada: 'Cancelada', estadoNoAsistio: 'No asistió',
    volverCitas: 'Volver a mis citas', pacienteDesde: 'Paciente desde', ultimaSesion: 'última sesión',
    historialSesiones: 'Historial de sesiones', notaSesion: 'Nota de la sesión', notaPlaceholder: 'Escribe una nota clínica de esta sesión…',
    guardarNota: 'Guardar nota', notaGuardada: 'Guardado ✓',
    notasGenerales: 'Notas generales del paciente', notaGeneralPlaceholder: 'Agrega una nota general sobre este paciente…',
    agregarNota: '+ Agregar nota', sinNotasGenerales: 'Aún no hay notas generales para este paciente.',
  },
  en: {
    volverPortal: 'Back to panel',
    titulo: 'My appointments', subtitulo: 'All your scheduled, cancelled and completed appointments, with each patient\'s history.',
    hoy: 'Today', estaSemana: 'This week', canceladas: 'Cancelled', realizadas: 'Completed',
    tabProximas: 'Upcoming', tabCanceladas: 'Cancelled', tabRealizadas: 'Completed',
    sinCitas: 'No appointments in this category.',
    enLinea: 'Online',
    reagendar: 'Reschedule', cancelar: 'Cancel', verHistorial: 'View history',
    confirmCancelar: 'Cancel this appointment? The patient will be notified.',
    fecha: 'Date', hora: 'Time', guardarCambio: 'Save', cancelarAccion: 'Close',
    estadoProgramada: 'Scheduled', estadoCompletada: 'Completed', estadoCancelada: 'Cancelled', estadoNoAsistio: 'No-show',
    volverCitas: 'Back to my appointments', pacienteDesde: 'Patient since', ultimaSesion: 'last session',
    historialSesiones: 'Session history', notaSesion: 'Session note', notaPlaceholder: 'Write a clinical note for this session…',
    guardarNota: 'Save note', notaGuardada: 'Saved ✓',
    notasGenerales: "General notes on this patient", notaGeneralPlaceholder: 'Add a general note about this patient…',
    agregarNota: '+ Add note', sinNotasGenerales: 'No general notes for this patient yet.',
  },
} as const;

const ESTADO_LABEL_KEY: Record<CitaEstado, keyof typeof text.es> = {
  Programada: 'estadoProgramada', Completada: 'estadoCompletada', Cancelada: 'estadoCancelada', 'No asistió': 'estadoNoAsistio',
};
const ESTADO_CHIP_CLS: Record<CitaEstado, string> = {
  Programada: 'bg-brand-50 text-brand-700',
  Completada: 'bg-emerald-50 text-emerald-700',
  Cancelada: 'bg-rose-50 text-rose-600',
  'No asistió': 'bg-amber-50 text-amber-700',
};

function iniciales(nombre: string) {
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

function diffDias(fechaISO: string, base: string) {
  const a = new Date(`${fechaISO}T00:00:00`);
  const b = new Date(`${base}T00:00:00`);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export default function MisCitasPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const { citas, notas, reagendarCita, cambiarEstado, actualizarNotaSesion, agregarNotaPaciente } = useInstructorAgenda();

  const navItems = buildInstructorNav(INSTRUCTOR_NAV_LABELS, ['citas'], ['constructor', 'citas', 'cursos', 'vivo', 'evaluaciones', 'notif', 'agenda', 'perfil']);

  const [tab, setTab] = useState<Tab>('proximas');
  const [vista, setVista] = useState<Vista>('lista');
  const [historialCorreo, setHistorialCorreo] = useState<string | null>(null);

  const [reagendandoId, setReagendandoId] = useState<string | null>(null);
  const [draftFecha, setDraftFecha] = useState('');
  const [draftHora, setDraftHora] = useState('');

  const [notaDraftId, setNotaDraftId] = useState<string | null>(null);
  const [notaDraftTexto, setNotaDraftTexto] = useState('');
  const [notaGuardadaId, setNotaGuardadaId] = useState<string | null>(null);
  const [notaGeneralTexto, setNotaGeneralTexto] = useState('');

  const proximas = useMemo(
    () => citas.filter((c) => c.estado === 'Programada').sort((a, b) => (a.fechaISO + a.hora).localeCompare(b.fechaISO + b.hora)),
    [citas]
  );
  const canceladasLista = useMemo(
    () => citas.filter((c) => c.estado === 'Cancelada').sort((a, b) => (b.fechaISO + b.hora).localeCompare(a.fechaISO + a.hora)),
    [citas]
  );
  const realizadas = useMemo(
    () => citas.filter((c) => c.estado === 'Completada' || c.estado === 'No asistió').sort((a, b) => (b.fechaISO + b.hora).localeCompare(a.fechaISO + a.hora)),
    [citas]
  );

  const citasHoy = proximas.filter((c) => c.fechaISO === AGENDA_INSTRUCTOR_HOY).length;
  const citasSemana = proximas.filter((c) => {
    const d = diffDias(c.fechaISO, AGENDA_INSTRUCTOR_HOY);
    return d >= 0 && d <= 6;
  }).length;

  const listaActual = tab === 'proximas' ? proximas : tab === 'canceladas' ? canceladasLista : realizadas;

  function abrirReagendar(cita: CitaInstructor) {
    setReagendandoId(cita.id);
    setDraftFecha(cita.fechaISO);
    setDraftHora(cita.hora);
  }
  function confirmarReagendo(id: string) {
    if (!draftFecha || !draftHora) return;
    reagendarCita(id, draftFecha, draftHora);
    setReagendandoId(null);
  }
  function cancelarCita(id: string) {
    if (!window.confirm(t.confirmCancelar)) return;
    cambiarEstado(id, 'Cancelada');
  }

  function abrirHistorial(correo: string) {
    setHistorialCorreo(correo);
    setVista('historial');
    setNotaDraftId(null);
  }

  function iniciarNotaDraft(cita: CitaInstructor) {
    setNotaDraftId(cita.id);
    setNotaDraftTexto(cita.notas);
  }
  function guardarNotaSesion(id: string) {
    actualizarNotaSesion(id, notaDraftTexto);
    setNotaDraftId(null);
    setNotaGuardadaId(id);
    window.setTimeout(() => setNotaGuardadaId(null), 1800);
  }

  const citasPaciente = useMemo(
    () => (historialCorreo ? citas.filter((c) => c.correo === historialCorreo).sort((a, b) => (b.fechaISO + b.hora).localeCompare(a.fechaISO + a.hora)) : []),
    [citas, historialCorreo]
  );
  const notasPacienteActual = useMemo(() => (historialCorreo ? notas.filter((n) => n.correo === historialCorreo) : []), [notas, historialCorreo]);
  const nombrePacienteActual = citasPaciente[0]?.paciente || '';
  const pacienteDesde = citasPaciente.length ? citasPaciente.reduce((min, c) => (c.fechaISO < min ? c.fechaISO : min), citasPaciente[0].fechaISO) : '';

  function agregarNotaGeneral() {
    if (!historialCorreo || !notaGeneralTexto.trim()) return;
    agregarNotaPaciente(historialCorreo, nombrePacienteActual, notaGeneralTexto);
    setNotaGeneralTexto('');
  }

  function citaRow(c: CitaInstructor) {
    const estKey = ESTADO_LABEL_KEY[c.estado];
    return (
      <div key={c.id} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
            {iniciales(c.paciente)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{c.paciente}</p>
            <p className="truncate text-xs text-ink/50">{c.servicio}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-ink/60">
            <CalendarDays size={13} /> {c.fechaISO}
            <Clock size={13} className="ml-2" /> {c.hora}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-ink/45">
            {c.modalidad === 'Online' ? <Video size={13} /> : <MapPin size={13} />}
            {c.modalidad === 'Online' ? t.enLinea : c.lugar}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_CHIP_CLS[c.estado]}`}>{t[estKey]}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brand-50 pt-3">
          {(c.estado === 'Programada' || c.estado === 'Cancelada') && (
            <button
              onClick={() => abrirReagendar(c)}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-brand-50"
            >
              <RotateCcw size={13} /> {t.reagendar}
            </button>
          )}
          {c.estado === 'Programada' && (
            <button
              onClick={() => cancelarCita(c.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <XCircle size={13} /> {t.cancelar}
            </button>
          )}
          <button
            onClick={() => abrirHistorial(c.correo)}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-brand-50"
          >
            <History size={13} /> {t.verHistorial}
          </button>
        </div>

        {reagendandoId === c.id && (
          <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.fecha}</label>
                <input
                  type="date"
                  value={draftFecha}
                  onChange={(e) => setDraftFecha(e.target.value)}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-xs text-ink outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.hora}</label>
                <input
                  type="time"
                  value={draftHora}
                  onChange={(e) => setDraftHora(e.target.value)}
                  className="h-9 w-full rounded-xl border border-brand-200 bg-white px-2 text-xs text-ink outline-none"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => confirmarReagendo(c.id)} className="rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-white shadow-soft hover:opacity-90">
                {t.guardarCambio}
              </button>
              <button onClick={() => setReagendandoId(null)} className="rounded-xl border border-brand-200 px-4 py-2 text-xs font-bold text-ink/60 hover:bg-white">
                {t.cancelarAccion}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="citas"
      onNavigate={() => {}}
      roleBadge={{ es: 'Instructor', en: 'Instructor' }}
      profileTo="/instructor/perfil"
      backTo="/instructor"
      backLabel={{ es: t.volverPortal, en: t.volverPortal }}
    >
      {vista === 'lista' ? (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{t.titulo}</h1>
            <p className="text-sm text-ink/50">{t.subtitulo}</p>
          </div>

          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.hoy}</p>
              <p className="font-display text-2xl font-semibold text-ink">{citasHoy}</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.estaSemana}</p>
              <p className="font-display text-2xl font-semibold text-ink">{citasSemana}</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.canceladas}</p>
              <p className="font-display text-2xl font-semibold text-rose-600">{canceladasLista.length}</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.realizadas}</p>
              <p className="font-display text-2xl font-semibold text-emerald-600">{realizadas.length}</p>
            </div>
          </section>

          <div className="flex gap-2">
            {(['proximas', 'canceladas', 'realizadas'] as Tab[]).map((tb) => (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  tab === tb ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'
                }`}
              >
                {tb === 'proximas' ? t.tabProximas : tb === 'canceladas' ? t.tabCanceladas : t.tabRealizadas}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {listaActual.length === 0 ? (
              <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center text-sm text-ink/45">{t.sinCitas}</div>
            ) : (
              listaActual.map((c) => citaRow(c))
            )}
          </div>
        </>
      ) : (
        <div>
          <button onClick={() => setVista('lista')} className="mb-4 flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
            <ArrowLeft size={15} /> {t.volverCitas}
          </button>

          <div className="mb-5 flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-gradient text-lg font-semibold text-white">
              {iniciales(nombrePacienteActual)}
            </span>
            <div>
              <h1 className="font-display text-xl font-semibold text-ink">{nombrePacienteActual}</h1>
              <p className="text-xs text-ink/50">{historialCorreo}</p>
              <p className="text-xs text-ink/40">{t.pacienteDesde} {pacienteDesde}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t.historialSesiones}</h2>
            <div className="space-y-3">
              {citasPaciente.map((c) => {
                const estKey = ESTADO_LABEL_KEY[c.estado];
                const editando = notaDraftId === c.id;
                return (
                  <div key={c.id} className="rounded-2xl border border-brand-100 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <CalendarDays size={13} /> {c.fechaISO} · {c.hora}
                      </span>
                      <span className="text-xs text-ink/50">{c.servicio}</span>
                      <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_CHIP_CLS[c.estado]}`}>{t[estKey]}</span>
                    </div>

                    {!editando ? (
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <p className="text-sm text-ink/60">{c.notas || <span className="italic text-ink/35">{t.notaPlaceholder}</span>}</p>
                        <button onClick={() => iniciarNotaDraft(c)} className="shrink-0 text-xs font-semibold text-brand-600 hover:underline">
                          {notaGuardadaId === c.id ? t.notaGuardada : t.notaSesion}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.notaSesion}</label>
                        <textarea
                          rows={3}
                          value={notaDraftTexto}
                          onChange={(e) => setNotaDraftTexto(e.target.value)}
                          placeholder={t.notaPlaceholder}
                          className="focus-ring w-full rounded-xl border border-brand-200 p-3 text-sm text-ink"
                        />
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => guardarNotaSesion(c.id)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-1.5 text-xs font-bold text-white shadow-soft hover:opacity-90">
                            <Check size={13} /> {t.guardarNota}
                          </button>
                          <button onClick={() => setNotaDraftId(null)} className="rounded-full border border-brand-200 px-4 py-1.5 text-xs font-bold text-ink/60 hover:bg-brand-50">
                            {t.cancelarAccion}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t.notasGenerales}</h2>
            <div className="mb-3 space-y-2">
              {notasPacienteActual.length === 0 ? (
                <p className="text-sm text-ink/40">{t.sinNotasGenerales}</p>
              ) : (
                notasPacienteActual.map((n) => (
                  <div key={n.id} className="rounded-2xl border border-brand-100 bg-white p-4">
                    <p className="mb-1 text-xs font-semibold text-ink/40">{n.fecha}</p>
                    <p className="text-sm text-ink/70">{n.texto}</p>
                  </div>
                ))
              )}
            </div>
            <textarea
              rows={2}
              value={notaGeneralTexto}
              onChange={(e) => setNotaGeneralTexto(e.target.value)}
              placeholder={t.notaGeneralPlaceholder}
              className="focus-ring mb-2 w-full rounded-xl border border-brand-200 p-3 text-sm text-ink"
            />
            <button
              onClick={agregarNotaGeneral}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-brand-200 px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-50"
            >
              <Plus size={14} /> {t.agregarNota}
            </button>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
