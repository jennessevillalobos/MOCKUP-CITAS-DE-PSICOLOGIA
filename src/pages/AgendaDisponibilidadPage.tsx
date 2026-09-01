import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Lock, Trash2, Check, AlertTriangle, X, CalendarClock,
} from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { INSTRUCTOR_NAV_LABELS, buildInstructorNav } from '@/components/site/instructorNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useInstructorSchedule } from '@/context/InstructorScheduleContext';
import { useInstructorAgenda } from '@/context/InstructorAgendaContext';
import { AGENDA_INSTRUCTOR_HOY, type CitaInstructor } from '@/data/citasInstructorData';
import {
  DIAS_SEMANA, DIA_LABEL, type DiaSemana, type BloqueoAgenda, type TipoBloqueo,
} from '@/data/agendaDisponibilidadInstructorData';

type Tab = 'semanal' | 'calendario';

const text = {
  es: {
    volverPortal: 'Volver al panel',
    titulo: 'Agenda / Disponibilidad', subtitulo: 'Configura tus días y horarios de atención, y bloquea el tiempo que necesites.',
    diasLaborables: 'Días laborables', horasDisponibles: 'Horas disponibles esta semana',
    proximoBloqueo: 'Próximo bloqueo', citasEstaSemana: 'Citas esta semana', sinBloqueos: 'Ninguno',
    tabSemanal: 'Horario semanal', tabCalendario: 'Calendario y bloqueos',
    activo: 'Activo', inactivo: 'Inactivo', noLaborable: 'No laborable',
    duracionSesiones: 'Duración de las sesiones', duracionCita: 'Duración de cada cita', descansoCitas: 'Descanso entre citas',
    min: 'min', guardarHorario: 'Guardar horario', guardadoOk: 'Guardado ✓',
    hoyLabel: 'Hoy', noLaborableCorta: 'No laborable', citasCorta: 'citas', citaCorta: 'cita',
    bloqueado: 'Bloqueado', proximosBloqueos: 'Próximos bloqueos', sinBloqueosProximos: 'No tienes bloqueos programados.',
    quitarBloqueo: 'Quitar bloqueo', confirmarQuitar: '¿Quitar este bloqueo? El día volverá a estar disponible según tu horario semanal.',
    tipoDia: 'Día completo', tipoRango: 'Rango de fechas', tipoHoras: 'Horas puntuales', motivoDefault: 'Sin motivo especificado',
    bloquearDia: 'Bloquear todo el día', motivoOpcional: 'Motivo (opcional)', placeholderMotivo: 'Ej. Vacaciones, cita médica…',
    bloquearBtn: 'Bloquear', bloquearRango: 'Bloquear un rango desde este día', hastaFecha: 'Hasta',
    bloquearRangoBtn: 'Bloquear rango', bloquearHoras: 'Bloquear solo unas horas', desde: 'Desde', hasta: 'Hasta',
    bloquearHorasBtn: 'Bloquear horas', cerrar: 'Cerrar', panelTitulo: 'Gestionar este día',
    conflictoTitulo: 'Este período tiene citas confirmadas', conflictoSubtitulo: 'Resuelve cada cita antes de continuar con el bloqueo.',
    reprogramar: 'Reprogramar', cancelarCita: 'Cancelar', confirmCancelarCita: '¿Cancelar esta cita? El paciente será notificado.',
    fecha: 'Fecha', hora: 'Hora', guardarCambio: 'Guardar', cancelarAccion: 'Cerrar',
    resolverPendientes: 'Resuelve las citas pendientes para continuar', confirmarBloqueo: 'Confirmar bloqueo y notificar a los pacientes',
    cancelarModal: 'Cancelar', avisoEnviado: (nombres: string) => `Aviso enviado a ${nombres} sobre el cambio en su cita.`,
    bloqueoGuardado: 'Bloqueo guardado ✓',
    diasCortos: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    meses: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  },
  en: {
    volverPortal: 'Back to panel',
    titulo: 'Schedule / Availability', subtitulo: 'Set your working days and hours, and block whatever time you need.',
    diasLaborables: 'Working days', horasDisponibles: 'Hours available this week',
    proximoBloqueo: 'Next time off', citasEstaSemana: 'Appointments this week', sinBloqueos: 'None',
    tabSemanal: 'Weekly schedule', tabCalendario: 'Calendar & time off',
    activo: 'Active', inactivo: 'Inactive', noLaborable: 'Not working',
    duracionSesiones: 'Session settings', duracionCita: 'Session duration', descansoCitas: 'Break between sessions',
    min: 'min', guardarHorario: 'Save schedule', guardadoOk: 'Saved ✓',
    hoyLabel: 'Today', noLaborableCorta: 'Not working', citasCorta: 'appts', citaCorta: 'appt',
    bloqueado: 'Blocked', proximosBloqueos: 'Upcoming time off', sinBloqueosProximos: 'You have no time off scheduled.',
    quitarBloqueo: 'Remove', confirmarQuitar: 'Remove this block? The day will be available again according to your weekly schedule.',
    tipoDia: 'Full day', tipoRango: 'Date range', tipoHoras: 'Specific hours', motivoDefault: 'No reason given',
    bloquearDia: 'Block the whole day', motivoOpcional: 'Reason (optional)', placeholderMotivo: 'E.g. Vacation, doctor\'s appointment…',
    bloquearBtn: 'Block', bloquearRango: 'Block a range starting this day', hastaFecha: 'Until',
    bloquearRangoBtn: 'Block range', bloquearHoras: 'Block only a few hours', desde: 'From', hasta: 'To',
    bloquearHorasBtn: 'Block hours', cerrar: 'Close', panelTitulo: 'Manage this day',
    conflictoTitulo: 'This period has confirmed appointments', conflictoSubtitulo: 'Resolve each appointment before continuing with the block.',
    reprogramar: 'Reschedule', cancelarCita: 'Cancel', confirmCancelarCita: 'Cancel this appointment? The patient will be notified.',
    fecha: 'Date', hora: 'Time', guardarCambio: 'Save', cancelarAccion: 'Close',
    resolverPendientes: 'Resolve the pending appointments to continue', confirmarBloqueo: 'Confirm block and notify patients',
    cancelarModal: 'Cancel', avisoEnviado: (nombres: string) => `Notice sent to ${nombres} about the change to their appointment.`,
    bloqueoGuardado: 'Block saved ✓',
    diasCortos: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    meses: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
} as const;

const TIPO_LABEL_KEY: Record<TipoBloqueo, 'tipoDia' | 'tipoRango' | 'tipoHoras'> = {
  dia: 'tipoDia', rango: 'tipoRango', horas: 'tipoHoras',
};

const DIA_INDEX_JS: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function diaSemanaDe(fechaISO: string): DiaSemana {
  const d = new Date(`${fechaISO}T00:00:00`);
  return DIA_INDEX_JS[d.getDay()];
}

function diffDias(fechaISO: string, base: string) {
  const a = new Date(`${fechaISO}T00:00:00`);
  const b = new Date(`${base}T00:00:00`);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function horaAMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function horasEntre(inicio: string, fin: string) {
  return Math.max(0, (horaAMin(fin) - horaAMin(inicio)) / 60);
}

function horasSeSolapan(horaCita: string, duracionMin: number, horaInicio: string, horaFin: string) {
  const inicioCita = horaAMin(horaCita);
  const finCita = inicioCita + duracionMin;
  return inicioCita < horaAMin(horaFin) && finCita > horaAMin(horaInicio);
}

interface CandidatoBloqueo {
  tipo: TipoBloqueo;
  fechaInicio: string;
  fechaFin?: string;
  horaInicio?: string;
  horaFin?: string;
  motivo?: string;
}

function citasEnConflicto(citas: CitaInstructor[], candidato: CandidatoBloqueo): CitaInstructor[] {
  const fin = candidato.fechaFin ?? candidato.fechaInicio;
  return citas.filter((c) => {
    if (c.estado !== 'Programada') return false;
    if (c.fechaISO < candidato.fechaInicio || c.fechaISO > fin) return false;
    if (candidato.tipo === 'horas' && candidato.horaInicio && candidato.horaFin) {
      return horasSeSolapan(c.hora, c.duracionMin, candidato.horaInicio, candidato.horaFin);
    }
    return true;
  });
}

function bloqueoCompletoEnFecha(b: BloqueoAgenda, fechaISO: string): boolean {
  if (b.tipo === 'dia') return b.fechaInicio === fechaISO;
  if (b.tipo === 'rango') return fechaISO >= b.fechaInicio && fechaISO <= (b.fechaFin ?? b.fechaInicio);
  return false;
}

function bloqueoParcialEnFecha(b: BloqueoAgenda, fechaISO: string): boolean {
  return b.tipo === 'horas' && b.fechaInicio === fechaISO;
}

function generarCeldasMes(anio: number, mes: number): (string | null)[] {
  const primerDia = new Date(anio, mes, 1);
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const offset = (primerDia.getDay() + 6) % 7; // semana empieza en lunes
  const celdas: (string | null)[] = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) {
    celdas.push(`${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return celdas;
}

export default function AgendaDisponibilidadPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const navItems = buildInstructorNav(INSTRUCTOR_NAV_LABELS, ['agenda'], ['constructor', 'citas', 'cursos', 'vivo', 'evaluaciones', 'notif', 'agenda', 'perfil']);

  const { horarioSemanal, configSesiones, bloqueos, actualizarDia, actualizarConfigSesiones, agregarBloqueo, quitarBloqueo } = useInstructorSchedule();
  const { citas, reagendarCita, cambiarEstado } = useInstructorAgenda();

  const [tab, setTab] = useState<Tab>('semanal');
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [avisoTexto, setAvisoTexto] = useState<string | null>(null);

  function mostrarAviso(msg: string) {
    setAvisoTexto(msg);
    window.setTimeout(() => setAvisoTexto(null), 3200);
  }

  // ===== KPIs =====
  const diasLaborables = DIAS_SEMANA.filter((d) => horarioSemanal[d].activo).length;
  const horasDisponibles = DIAS_SEMANA.reduce((acc, d) => acc + (horarioSemanal[d].activo ? horasEntre(horarioSemanal[d].inicio, horarioSemanal[d].fin) : 0), 0);
  const bloqueosFuturos = [...bloqueos]
    .filter((b) => (b.fechaFin ?? b.fechaInicio) >= AGENDA_INSTRUCTOR_HOY)
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  const proximoBloqueo = bloqueosFuturos[0] ?? null;
  const citasEstaSemana = citas.filter((c) => c.estado === 'Programada' && diffDias(c.fechaISO, AGENDA_INSTRUCTOR_HOY) >= 0 && diffDias(c.fechaISO, AGENDA_INSTRUCTOR_HOY) <= 6).length;

  function etiquetaBloqueo(b: BloqueoAgenda) {
    const motivo = b.motivo || t.motivoDefault;
    if (b.tipo === 'dia') return `${b.fechaInicio} · ${motivo}`;
    if (b.tipo === 'rango') return `${b.fechaInicio} → ${b.fechaFin} · ${motivo}`;
    return `${b.fechaInicio} · ${b.horaInicio}–${b.horaFin} · ${motivo}`;
  }

  function guardarHorarioClick() {
    setGuardadoOk(true);
    window.setTimeout(() => setGuardadoOk(false), 1800);
  }

  function quitarBloqueoConfirm(id: string) {
    if (!window.confirm(t.confirmarQuitar)) return;
    quitarBloqueo(id);
  }

  // ===== Calendario =====
  const hoyDate = new Date(`${AGENDA_INSTRUCTOR_HOY}T00:00:00`);
  const [anioMes, setAnioMes] = useState({ anio: hoyDate.getFullYear(), mes: hoyDate.getMonth() });
  const celdasMes = generarCeldasMes(anioMes.anio, anioMes.mes);

  function mesAnterior() {
    setAnioMes((am) => (am.mes === 0 ? { anio: am.anio - 1, mes: 11 } : { anio: am.anio, mes: am.mes - 1 }));
  }
  function mesSiguiente() {
    setAnioMes((am) => (am.mes === 11 ? { anio: am.anio + 1, mes: 0 } : { anio: am.anio, mes: am.mes + 1 }));
  }

  function citasProgramadasDe(fechaISO: string) {
    return citas.filter((c) => c.fechaISO === fechaISO && c.estado === 'Programada');
  }

  // ===== Panel de un día =====
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [motivoDia, setMotivoDia] = useState('');
  const [fechaFinRango, setFechaFinRango] = useState('');
  const [motivoRango, setMotivoRango] = useState('');
  const [horaInicioBloqueo, setHoraInicioBloqueo] = useState('14:00');
  const [horaFinBloqueo, setHoraFinBloqueo] = useState('15:00');
  const [motivoHoras, setMotivoHoras] = useState('');

  function abrirDiaPanel(fechaISO: string) {
    setSelectedDay(fechaISO);
    setMotivoDia('');
    setFechaFinRango(fechaISO);
    setMotivoRango('');
    setHoraInicioBloqueo('14:00');
    setHoraFinBloqueo('15:00');
    setMotivoHoras('');
  }

  // ===== Modal de conflicto =====
  const [conflictModal, setConflictModal] = useState<{ candidato: CandidatoBloqueo; citasOriginales: CitaInstructor[] } | null>(null);
  const [reagendarId, setReagendarId] = useState<string | null>(null);
  const [draftFecha, setDraftFecha] = useState('');
  const [draftHora, setDraftHora] = useState('');

  const citasEnConflictoActual = conflictModal ? citasEnConflicto(citas, conflictModal.candidato) : [];

  function intentarBloqueo(candidato: CandidatoBloqueo) {
    const afectadas = citasEnConflicto(citas, candidato);
    if (afectadas.length > 0) {
      setConflictModal({ candidato, citasOriginales: afectadas });
      setSelectedDay(null);
    } else {
      agregarBloqueo(candidato);
      setSelectedDay(null);
      mostrarAviso(t.bloqueoGuardado);
    }
  }

  function abrirReagendar(cita: CitaInstructor) {
    setReagendarId(cita.id);
    setDraftFecha(cita.fechaISO);
    setDraftHora(cita.hora);
  }
  function confirmarReagendo(id: string) {
    if (!draftFecha || !draftHora) return;
    reagendarCita(id, draftFecha, draftHora);
    setReagendarId(null);
  }
  function cancelarCitaConflicto(id: string) {
    if (!window.confirm(t.confirmCancelarCita)) return;
    cambiarEstado(id, 'Cancelada');
  }

  function confirmarBloqueoConflicto() {
    if (!conflictModal || citasEnConflictoActual.length > 0) return;
    agregarBloqueo(conflictModal.candidato);
    const nombres = Array.from(new Set(conflictModal.citasOriginales.map((c) => c.paciente))).join(', ');
    mostrarAviso(t.avisoEnviado(nombres));
    setConflictModal(null);
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="agenda"
      onNavigate={() => {}}
      roleBadge={{ es: 'Instructor', en: 'Instructor' }}
      profileTo="/instructor/perfil"
      backTo="/instructor"
      backLabel={{ es: t.volverPortal, en: t.volverPortal }}
    >
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.titulo}</h1>
        <p className="text-sm text-ink/50">{t.subtitulo}</p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.diasLaborables}</p>
          <p className="font-display text-2xl font-semibold text-ink">{diasLaborables} / 7</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.horasDisponibles}</p>
          <p className="font-display text-2xl font-semibold text-ink">{horasDisponibles}h</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.proximoBloqueo}</p>
          <p className="truncate font-display text-base font-semibold text-lilac-700">
            {proximoBloqueo ? etiquetaBloqueo(proximoBloqueo) : t.sinBloqueos}
          </p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.citasEstaSemana}</p>
          <p className="font-display text-2xl font-semibold text-ink">{citasEstaSemana}</p>
        </div>
      </section>

      <div className="flex gap-2">
        <button onClick={() => setTab('semanal')} className={`rounded-full border px-4 py-2 text-sm font-semibold ${tab === 'semanal' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'}`}>
          {t.tabSemanal}
        </button>
        <button onClick={() => setTab('calendario')} className={`rounded-full border px-4 py-2 text-sm font-semibold ${tab === 'calendario' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'}`}>
          {t.tabCalendario}
        </button>
      </div>

      {/* ===== HORARIO SEMANAL ===== */}
      {tab === 'semanal' && (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="divide-y divide-brand-50 rounded-2xl border border-brand-100 bg-white lg:col-span-2">
            {DIAS_SEMANA.map((dia) => {
              const h = horarioSemanal[dia];
              return (
                <div key={dia} className="flex flex-wrap items-center gap-3 p-4">
                  <button
                    onClick={() => actualizarDia(dia, { activo: !h.activo })}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${h.activo ? 'bg-brand-500' : 'bg-brand-100'}`}
                    aria-label={h.activo ? t.activo : t.inactivo}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${h.activo ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <span className="w-24 shrink-0 text-sm font-semibold text-ink">{DIA_LABEL[dia][language]}</span>
                  {h.activo ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={h.inicio}
                        onChange={(e) => actualizarDia(dia, { inicio: e.target.value })}
                        className="rounded-lg border border-brand-200 px-2 py-1.5 text-ink"
                      />
                      <span className="text-ink/40">–</span>
                      <input
                        type="time"
                        value={h.fin}
                        onChange={(e) => actualizarDia(dia, { fin: e.target.value })}
                        className="rounded-lg border border-brand-200 px-2 py-1.5 text-ink"
                      />
                    </div>
                  ) : (
                    <span className="flex-1 text-sm text-ink/35">{t.noLaborable}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4 rounded-2xl border border-brand-100 bg-white p-5">
            <h3 className="font-display font-semibold text-ink">{t.duracionSesiones}</h3>
            <div>
              <label className="mb-1 block text-xs text-ink/45">{t.duracionCita}</label>
              <select
                value={configSesiones.duracionMin}
                onChange={(e) => actualizarConfigSesiones({ duracionMin: Number(e.target.value) })}
                className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink"
              >
                {[30, 45, 50, 60, 90].map((n) => <option key={n} value={n}>{n} {t.min}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink/45">{t.descansoCitas}</label>
              <select
                value={configSesiones.descansoMin}
                onChange={(e) => actualizarConfigSesiones({ descansoMin: Number(e.target.value) })}
                className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink"
              >
                {[0, 5, 10, 15].map((n) => <option key={n} value={n}>{n} {t.min}</option>)}
              </select>
            </div>
            <button onClick={guardarHorarioClick} className="w-full rounded-full bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90">
              {guardadoOk ? t.guardadoOk : t.guardarHorario}
            </button>
          </div>
        </div>
      )}

      {/* ===== CALENDARIO Y BLOQUEOS ===== */}
      {tab === 'calendario' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-brand-100 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <button onClick={mesAnterior} className="rounded-full border border-brand-200 p-1.5 text-ink/60 hover:bg-brand-50" aria-label="anterior"><ChevronLeft size={16} /></button>
              <p className="font-display text-lg font-semibold text-ink">{t.meses[anioMes.mes]} {anioMes.anio}</p>
              <button onClick={mesSiguiente} className="rounded-full border border-brand-200 p-1.5 text-ink/60 hover:bg-brand-50" aria-label="siguiente"><ChevronRight size={16} /></button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-ink/40">
              {t.diasCortos.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {celdasMes.map((fechaISO, i) => {
                if (!fechaISO) return <div key={`b${i}`} />;
                const diaSem = diaSemanaDe(fechaISO);
                const esHoy = fechaISO === AGENDA_INSTRUCTOR_HOY;
                const bloqueoCompleto = bloqueos.find((b) => bloqueoCompletoEnFecha(b, fechaISO));
                const bloqueoParcial = bloqueos.find((b) => bloqueoParcialEnFecha(b, fechaISO));
                const noLaborable = !horarioSemanal[diaSem].activo;
                const citasDia = citasProgramadasDe(fechaISO);

                let cls = 'border-brand-100 bg-white text-ink hover:bg-brand-50/60';
                if (bloqueoCompleto) cls = 'border-lilac-200 bg-lilac-50 text-lilac-700';
                else if (noLaborable) cls = 'border-brand-50 bg-brand-50/40 text-ink/30';
                else if (citasDia.length > 0) cls = 'border-brand-200 bg-brand-50 text-ink hover:bg-brand-100/60';

                return (
                  <button
                    key={fechaISO}
                    onClick={() => abrirDiaPanel(fechaISO)}
                    className={`relative flex min-h-[3.2rem] flex-col items-center justify-center gap-0.5 rounded-xl border p-1 text-xs transition ${cls} ${esHoy ? 'ring-2 ring-brand-400' : ''}`}
                  >
                    <span className="font-semibold">{Number(fechaISO.slice(-2))}</span>
                    {bloqueoCompleto && <Lock size={11} className="text-lilac-600" />}
                    {!bloqueoCompleto && citasDia.length > 0 && (
                      <span className="rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-white">{citasDia.length} {citasDia.length === 1 ? t.citaCorta : t.citasCorta}</span>
                    )}
                    {bloqueoParcial && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-white p-5">
            <h3 className="mb-3 font-display font-semibold text-ink">{t.proximosBloqueos}</h3>
            {bloqueosFuturos.length === 0 ? (
              <p className="text-sm text-ink/40">{t.sinBloqueosProximos}</p>
            ) : (
              <div className="space-y-2">
                {bloqueosFuturos.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-lilac-50/60 p-3 text-sm">
                    <div className="flex items-center gap-2 text-lilac-700">
                      <Lock size={14} />
                      <span>{etiquetaBloqueo(b)}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-lilac-600">{t[TIPO_LABEL_KEY[b.tipo]]}</span>
                    </div>
                    <button onClick={() => quitarBloqueoConfirm(b.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:underline">
                      <Trash2 size={13} /> {t.quitarBloqueo}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== PANEL DE UN DÍA ===== */}
      {selectedDay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-lift">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={18} className="text-brand-600" />
                <h3 className="font-display text-lg font-semibold text-ink">{t.panelTitulo} · {selectedDay}</h3>
              </div>
              <button onClick={() => setSelectedDay(null)} className="rounded-lg p-1 text-ink/40 hover:bg-brand-50 hover:text-ink"><X size={18} /></button>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-brand-100 p-4">
                <p className="mb-2 text-sm font-semibold text-ink">{t.bloquearDia}</p>
                <label className="mb-1 block text-xs text-ink/45">{t.motivoOpcional}</label>
                <input value={motivoDia} onChange={(e) => setMotivoDia(e.target.value)} placeholder={t.placeholderMotivo} className="focus-ring mb-3 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink" />
                <button onClick={() => intentarBloqueo({ tipo: 'dia', fechaInicio: selectedDay, motivo: motivoDia.trim() || undefined })} className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90">
                  {t.bloquearBtn}
                </button>
              </div>

              <div className="rounded-2xl border border-brand-100 p-4">
                <p className="mb-2 text-sm font-semibold text-ink">{t.bloquearRango}</p>
                <label className="mb-1 block text-xs text-ink/45">{t.hastaFecha}</label>
                <input type="date" value={fechaFinRango} min={selectedDay} onChange={(e) => setFechaFinRango(e.target.value)} className="focus-ring mb-2 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink" />
                <input value={motivoRango} onChange={(e) => setMotivoRango(e.target.value)} placeholder={t.placeholderMotivo} className="focus-ring mb-3 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink" />
                <button onClick={() => intentarBloqueo({ tipo: 'rango', fechaInicio: selectedDay, fechaFin: fechaFinRango, motivo: motivoRango.trim() || undefined })} className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90">
                  {t.bloquearRangoBtn}
                </button>
              </div>

              <div className="rounded-2xl border border-brand-100 p-4">
                <p className="mb-2 text-sm font-semibold text-ink">{t.bloquearHoras}</p>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-ink/45">{t.desde}</label>
                    <input type="time" value={horaInicioBloqueo} onChange={(e) => setHoraInicioBloqueo(e.target.value)} className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink" />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-ink/45">{t.hasta}</label>
                    <input type="time" value={horaFinBloqueo} onChange={(e) => setHoraFinBloqueo(e.target.value)} className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink" />
                  </div>
                </div>
                <input value={motivoHoras} onChange={(e) => setMotivoHoras(e.target.value)} placeholder={t.placeholderMotivo} className="focus-ring mb-3 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink" />
                <button onClick={() => intentarBloqueo({ tipo: 'horas', fechaInicio: selectedDay, horaInicio: horaInicioBloqueo, horaFin: horaFinBloqueo, motivo: motivoHoras.trim() || undefined })} className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90">
                  {t.bloquearHorasBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE CONFLICTO ===== */}
      {conflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-amber-200 bg-white p-6 shadow-lift">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600"><AlertTriangle size={18} /></span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{t.conflictoTitulo}</h3>
                <p className="text-sm text-ink/50">{t.conflictoSubtitulo}</p>
              </div>
            </div>

            <div className="space-y-2">
              {citasEnConflictoActual.map((c) => (
                <div key={c.id} className="rounded-2xl bg-brand-50/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{c.paciente}</p>
                      <p className="text-xs text-ink/45">{c.fechaISO} · {c.hora} · {c.servicio}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => abrirReagendar(c)} className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                        {t.reprogramar}
                      </button>
                      <button onClick={() => cancelarCitaConflicto(c.id)} className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50">
                        {t.cancelarCita}
                      </button>
                    </div>
                  </div>
                  {reagendarId === c.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brand-100 pt-3">
                      <input type="date" value={draftFecha} onChange={(e) => setDraftFecha(e.target.value)} className="rounded-lg border border-brand-200 px-2 py-1.5 text-sm text-ink" />
                      <input type="time" value={draftHora} onChange={(e) => setDraftHora(e.target.value)} className="rounded-lg border border-brand-200 px-2 py-1.5 text-sm text-ink" />
                      <button onClick={() => confirmarReagendo(c.id)} className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white">
                        <Check size={13} /> {t.guardarCambio}
                      </button>
                      <button onClick={() => setReagendarId(null)} className="text-xs font-semibold text-ink/45 hover:underline">{t.cancelarAccion}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-brand-50 pt-4">
              <button onClick={() => setConflictModal(null)} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-brand-50">
                {t.cancelarModal}
              </button>
              <button
                onClick={confirmarBloqueoConflicto}
                disabled={citasEnConflictoActual.length > 0}
                className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {citasEnConflictoActual.length > 0 ? t.resolverPendientes : t.confirmarBloqueo}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== AVISO/TOAST ===== */}
      {avisoTexto && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lift">
          {avisoTexto}
        </div>
      )}
    </PortalLayout>
  );
}
