import { useMemo, useState } from 'react';
import {
  Radio, CalendarDays, Users, Video as VideoIcon, Mic, Hand, ScreenShare, PhoneOff, Send,
  Play, ArrowLeft, Copy, Pencil, XCircle, Bell, BellOff, RefreshCw,
} from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { INSTRUCTOR_NAV_LABELS, buildInstructorNav } from '@/components/site/instructorNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useInstructorLiveClasses, type NuevaClaseInput } from '@/context/InstructorLiveClassesContext';
import { CLASES_VIVO_DEMO, CHAT_DEMO_INSTRUCTOR, HOY_VIVO, type ClaseEnVivo, type ClaseVivoEstado, type DestinatarioTipo } from '@/data/clasesVivoInstructorData';
import { CURSOS_META, CURSOS_INFO_DEMO } from '@/data/instructorCoursesData';
import { CITAS_INSTRUCTOR_DEMO } from '@/data/citasInstructorData';

type Vista = 'lista' | 'sala' | 'grabacion';
type Tab = 'agenda' | 'grabaciones';
type Ambito = 'todas' | 'mias' | 'colegas';

interface MensajeLocal {
  autor: string;
  hora: string;
  texto: string;
  esInstructor?: boolean;
}

const DURACIONES = [30, 45, 60, 90, 120];

const text = {
  es: {
    volverPortal: 'Volver al panel',
    titulo: 'Clases en vivo', subtitulo: 'Programa tus sesiones, únete a las tuyas y a las de tus colegas.',
    enVivoAhora: 'En vivo ahora', tusProximas: 'Tus próximas', estaSemana: 'Esta semana', grabacionesLabel: 'Grabaciones',
    tabAgenda: 'Agenda', tabGrabaciones: 'Grabaciones',
    nuevaClase: 'Nueva clase en vivo', editarClaseTitulo: 'Editar clase en vivo',
    campoTitulo: 'Título', tituloPlaceholder: 'Ej. Taller: técnicas de respiración',
    campoCurso: 'Curso', sinCurso: 'Sin curso (abierta)',
    campoFecha: 'Fecha', campoHora: 'Hora', campoDuracion: 'Duración',
    campoEnlace: 'Enlace de la reunión', generarEnlace: 'Generar enlace automático',
    destinatarios: 'Destinatarios', destCurso: 'Inscritos del curso', destPacientes: 'Pacientes específicos',
    destResumenCurso: (n: number, curso: string) => `Se notificará a los ${n} inscritos en "${curso}".`,
    destResumenSinCurso: 'Elige un curso o cambia a "Pacientes específicos".',
    seleccionados: 'seleccionados', buscarPaciente: 'Buscar paciente…',
    grabarSesion: 'Grabar la sesión', recordatorioCheck: 'Avisarme 1 h antes',
    guardarCambios: 'Guardar cambios', programarClase: 'Programar clase', cancelarEdicion: 'Cancelar edición',
    ambitoTodas: 'Todas', ambitoMias: 'Mis clases', ambitoColegas: 'De mis colegas',
    fTodas: 'Todas', fProgramadas: 'Programadas', fVivo: 'En vivo', fFinalizadas: 'Finalizadas', fCanceladas: 'Canceladas',
    estProgramada: 'Programada', estVivo: 'En vivo', estFinalizada: 'Finalizada', estCancelada: 'Cancelada',
    sinClases: 'No hay clases en esta categoría.',
    abierta: 'Abierta', pacientesN: (n: number) => `${n} pacientes invitados`,
    copiarEnlace: 'Copiar enlace', enlaceCopiado: 'Enlace copiado ✓', editar: 'Editar', cancelar: 'Cancelar', iniciar: 'Iniciar', unirseAhora: 'Unirse ahora',
    recordarme: 'Recordarme', yaRecordado: 'Te avisaremos',
    verGrabacion: 'Ver grabación', sinGrabacion: 'Sin grabación', asistieron: 'asistieron', conectados: 'conectados',
    confirmCancelar: '¿Cancelar esta clase en vivo? Se notificará a los inscritos.',
    sinGrabacionesAviso: 'Aún no hay grabaciones disponibles.',
    salirSala: 'Salir de la sala', salir: 'Salir', finalizarClase: 'Finalizar clase',
    chat: 'Chat', participantes: 'Participantes', escribeMensaje: 'Escribe un mensaje…',
    volverListado: 'Volver a clases en vivo',
    tuClase: 'Tu clase', claseDe: 'Clase de',
  },
  en: {
    volverPortal: 'Back to panel',
    titulo: 'Live classes', subtitulo: 'Schedule your sessions, join your own and your colleagues’.',
    enVivoAhora: 'Live now', tusProximas: 'Your upcoming', estaSemana: 'This week', grabacionesLabel: 'Recordings',
    tabAgenda: 'Schedule', tabGrabaciones: 'Recordings',
    nuevaClase: 'New live class', editarClaseTitulo: 'Edit live class',
    campoTitulo: 'Title', tituloPlaceholder: 'E.g. Workshop: breathing techniques',
    campoCurso: 'Course', sinCurso: 'No course (open)',
    campoFecha: 'Date', campoHora: 'Time', campoDuracion: 'Duration',
    campoEnlace: 'Meeting link', generarEnlace: 'Generate link automatically',
    destinatarios: 'Recipients', destCurso: 'Course students', destPacientes: 'Specific patients',
    destResumenCurso: (n: number, curso: string) => `${n} students enrolled in "${curso}" will be notified.`,
    destResumenSinCurso: 'Pick a course or switch to "Specific patients".',
    seleccionados: 'selected', buscarPaciente: 'Search patient…',
    grabarSesion: 'Record session', recordatorioCheck: 'Remind me 1h before',
    guardarCambios: 'Save changes', programarClase: 'Schedule class', cancelarEdicion: 'Cancel editing',
    ambitoTodas: 'All', ambitoMias: 'My classes', ambitoColegas: 'From colleagues',
    fTodas: 'All', fProgramadas: 'Scheduled', fVivo: 'Live', fFinalizadas: 'Finished', fCanceladas: 'Cancelled',
    estProgramada: 'Scheduled', estVivo: 'Live', estFinalizada: 'Finished', estCancelada: 'Cancelled',
    sinClases: 'No classes in this category.',
    abierta: 'Open', pacientesN: (n: number) => `${n} patients invited`,
    copiarEnlace: 'Copy link', enlaceCopiado: 'Link copied ✓', editar: 'Edit', cancelar: 'Cancel', iniciar: 'Start', unirseAhora: 'Join now',
    recordarme: 'Remind me', yaRecordado: 'We’ll remind you',
    verGrabacion: 'View recording', sinGrabacion: 'No recording', asistieron: 'attended', conectados: 'online',
    confirmCancelar: 'Cancel this live class? Enrolled patients will be notified.',
    sinGrabacionesAviso: 'No recordings available yet.',
    salirSala: 'Leave room', salir: 'Leave', finalizarClase: 'End class',
    chat: 'Chat', participantes: 'People', escribeMensaje: 'Write a message…',
    volverListado: 'Back to live classes',
    tuClase: 'Your class', claseDe: 'Class by',
  },
} as const;

const ESTADO_LABEL_KEY: Record<ClaseVivoEstado, 'estProgramada' | 'estVivo' | 'estFinalizada' | 'estCancelada'> = {
  programada: 'estProgramada', vivo: 'estVivo', finalizada: 'estFinalizada', cancelada: 'estCancelada',
};
const ESTADO_CHIP_CLS: Record<ClaseVivoEstado, string> = {
  programada: 'bg-brand-50 text-brand-700',
  vivo: 'bg-rose-50 text-rose-600',
  finalizada: 'bg-emerald-50 text-emerald-700',
  cancelada: 'bg-ink/10 text-ink/45',
};

function diffDias(fechaISO: string, base: string) {
  const a = new Date(`${fechaISO}T00:00:00`);
  const b = new Date(`${base}T00:00:00`);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

let enlaceSeq = 1000;
function nuevoEnlaceDemo() {
  enlaceSeq += 7;
  return `https://zoom.us/j/${enlaceSeq}${enlaceSeq}`;
}

const FORM_INICIAL = {
  titulo: '',
  cursoKey: CURSOS_META[0]?.key ?? '',
  fechaISO: '2026-08-20',
  hora: '18:00',
  duracionMin: 60,
  enlace: '',
  destinatarioTipo: 'curso' as DestinatarioTipo,
  pacientesCorreos: [] as string[],
  grabar: true,
  recordatorio: true,
};

export default function ClasesVivoPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const { clases, crearClase, actualizarClase, cancelarClase, iniciarClase, finalizarClase, toggleRecordarme, recordatoriosColegas } = useInstructorLiveClasses();

  const navItems = buildInstructorNav(INSTRUCTOR_NAV_LABELS, ['vivo'], ['constructor', 'citas', 'cursos', 'vivo', 'evaluaciones', 'notif', 'agenda', 'perfil']);

  const [vista, setVista] = useState<Vista>('lista');
  const [tab, setTab] = useState<Tab>('agenda');
  const [ambito, setAmbito] = useState<Ambito>('todas');
  const [filtroEstado, setFiltroEstado] = useState<'' | ClaseVivoEstado>('');

  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [enlaceCopiadoId, setEnlaceCopiadoId] = useState<string | null>(null);

  const [salaClaseId, setSalaClaseId] = useState<string | null>(null);
  const [grabacionId, setGrabacionId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<MensajeLocal[]>(
    CHAT_DEMO_INSTRUCTOR.map((m) => ({ autor: m.autor, hora: m.hora, texto: m.texto[language], esInstructor: m.esInstructor }))
  );
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [busquedaPaciente, setBusquedaPaciente] = useState('');

  const pacientesUnicos = useMemo(() => {
    const vistos = new Map<string, string>();
    CITAS_INSTRUCTOR_DEMO.forEach((c) => {
      if (!vistos.has(c.correo)) vistos.set(c.correo, c.paciente);
    });
    return Array.from(vistos.entries()).map(([correo, nombre]) => ({ correo, nombre }));
  }, []);

  const claseSala = salaClaseId ? clases.find((c) => c.id === salaClaseId) ?? null : null;
  const grabacionActual = grabacionId ? clases.find((c) => c.id === grabacionId) ?? null : null;

  const enVivoAhora = clases.filter((c) => c.estado === 'vivo').length;
  const misProgramadas = clases.filter((c) => c.esPropia && c.estado === 'programada');
  const misEstaSemana = misProgramadas.filter((c) => {
    const d = diffDias(c.fechaISO, HOY_VIVO);
    return d >= 0 && d <= 6;
  }).length;
  const grabacionesDisponibles = clases.filter((c) => c.estado === 'finalizada' && c.grabar);

  const listaFiltrada = useMemo(() => {
    return clases
      .filter((c) => (ambito === 'todas' ? true : ambito === 'mias' ? c.esPropia : !c.esPropia))
      .filter((c) => !filtroEstado || c.estado === filtroEstado)
      .sort((a, b) => (a.fechaISO + a.hora).localeCompare(b.fechaISO + b.hora));
  }, [clases, ambito, filtroEstado]);

  function resetForm() {
    setForm(FORM_INICIAL);
    setEditandoId(null);
  }

  function tituloCurso(cursoKey: string) {
    return CURSOS_INFO_DEMO[cursoKey]?.titulo || CLASES_VIVO_DEMO.find((c) => c.cursoKey === cursoKey)?.cursoTitulo || '';
  }

  function guardarClase() {
    if (!form.titulo.trim()) return;
    const cursoMeta = CURSOS_META.find((m) => m.key === form.cursoKey);
    const input: NuevaClaseInput = {
      titulo: form.titulo.trim(),
      cursoKey: cursoMeta?.key,
      cursoTitulo: cursoMeta ? tituloCurso(cursoMeta.key) : undefined,
      fechaISO: form.fechaISO,
      hora: form.hora,
      duracionMin: form.duracionMin,
      enlace: form.enlace,
      destinatarioTipo: form.destinatarioTipo,
      pacientesCorreos: form.destinatarioTipo === 'pacientes' ? form.pacientesCorreos : undefined,
      grabar: form.grabar,
      recordatorio: form.recordatorio,
    };
    if (editandoId) {
      actualizarClase(editandoId, input);
    } else {
      crearClase(input);
    }
    resetForm();
  }

  function editarClase(c: ClaseEnVivo) {
    setEditandoId(c.id);
    setForm({
      titulo: c.titulo,
      cursoKey: c.cursoKey ?? '',
      fechaISO: c.fechaISO,
      hora: c.hora,
      duracionMin: c.duracionMin,
      enlace: c.enlace,
      destinatarioTipo: c.destinatario?.tipo ?? 'curso',
      pacientesCorreos: c.destinatario?.pacientesCorreos ?? [],
      grabar: c.grabar,
      recordatorio: c.recordatorio,
    });
  }

  function togglePacienteForm(correo: string) {
    setForm((f) => ({
      ...f,
      pacientesCorreos: f.pacientesCorreos.includes(correo) ? f.pacientesCorreos.filter((c) => c !== correo) : [...f.pacientesCorreos, correo],
    }));
  }

  function cancelarClic(id: string) {
    if (!window.confirm(t.confirmCancelar)) return;
    cancelarClase(id);
  }

  function copiarEnlace(c: ClaseEnVivo) {
    if (c.enlace) {
      navigator.clipboard?.writeText(c.enlace).catch(() => {});
    }
    setEnlaceCopiadoId(c.id);
    window.setTimeout(() => setEnlaceCopiadoId(null), 1600);
  }

  function iniciarClic(c: ClaseEnVivo) {
    if (c.estado !== 'vivo') iniciarClase(c.id);
    setSalaClaseId(c.id);
    setVista('sala');
  }

  function unirseColegaClic(c: ClaseEnVivo) {
    setSalaClaseId(c.id);
    setVista('sala');
  }

  function salirSala() {
    setVista('lista');
    setSalaClaseId(null);
  }

  function finalizarClic() {
    if (claseSala) finalizarClase(claseSala.id);
    setVista('lista');
    setSalaClaseId(null);
  }

  function enviarMensaje() {
    if (!nuevoMensaje.trim()) return;
    setMensajes((m) => [...m, { autor: 'Dra. Ana Rivas', hora: 'ahora', texto: nuevoMensaje.trim(), esInstructor: true }]);
    setNuevoMensaje('');
  }

  function verGrabacion(c: ClaseEnVivo) {
    setGrabacionId(c.id);
    setVista('grabacion');
  }

  function destinatarioResumen(c: ClaseEnVivo) {
    if (!c.destinatario) return '';
    if (c.destinatario.tipo === 'curso') {
      if (!c.cursoKey) return t.abierta;
      const meta = CURSOS_META.find((m) => m.key === c.cursoKey);
      return `${meta?.estudiantes ?? 0} · ${c.cursoTitulo ?? ''}`;
    }
    return t.pacientesN(c.destinatario.pacientesCorreos?.length ?? 0);
  }

  function claseRow(c: ClaseEnVivo) {
    const estKey = ESTADO_LABEL_KEY[c.estado];
    return (
      <div key={c.id} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${c.estado === 'vivo' ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'}`}>
            <Radio size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight text-ink">{c.titulo}</h3>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_CHIP_CLS[c.estado]}`}>
                {c.estado === 'vivo' && <span className="mr-1 inline-block animate-pulse">●</span>}
                {t[estKey]}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-ink/50">
              {c.cursoTitulo ? `${c.cursoTitulo} · ` : ''}{c.instructor}
              {!c.esPropia && <span className="ml-1 text-ink/35">· {t.claseDe} {c.instructor}</span>}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/45">
              <span className="flex items-center gap-1.5"><CalendarDays size={13} /> {c.fechaISO} · {c.hora}</span>
              {c.esPropia && c.destinatario && <span className="flex items-center gap-1.5"><Users size={13} /> {destinatarioResumen(c)}</span>}
              {c.estado === 'vivo' && c.conectados !== undefined && <span className="flex items-center gap-1.5">👥 {c.conectados} {t.conectados}</span>}
              {c.estado === 'finalizada' && c.asistieron !== undefined && <span>{c.asistieron} {t.asistieron}</span>}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {c.esPropia && (c.estado === 'programada' || c.estado === 'vivo') && (
                <button
                  onClick={() => iniciarClic(c)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-soft hover:opacity-90 ${c.estado === 'vivo' ? 'bg-rose-600' : 'bg-brand-gradient'}`}
                >
                  <Play size={12} /> {t.iniciar}
                </button>
              )}
              {!c.esPropia && c.estado === 'vivo' && (
                <button onClick={() => unirseColegaClic(c)} className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-soft hover:opacity-90">
                  <Play size={12} /> {t.unirseAhora}
                </button>
              )}
              {c.esPropia && c.estado === 'programada' && (
                <>
                  <button onClick={() => copiarEnlace(c)} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-brand-50">
                    <Copy size={12} /> {enlaceCopiadoId === c.id ? t.enlaceCopiado : t.copiarEnlace}
                  </button>
                  <button onClick={() => editarClase(c)} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-brand-50">
                    <Pencil size={12} /> {t.editar}
                  </button>
                  <button onClick={() => cancelarClic(c.id)} className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                    <XCircle size={12} /> {t.cancelar}
                  </button>
                </>
              )}
              {!c.esPropia && c.estado === 'programada' && (
                <button
                  onClick={() => toggleRecordarme(c.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    recordatoriosColegas.includes(c.id) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-brand-200 text-ink/70 hover:bg-brand-50'
                  }`}
                >
                  {recordatoriosColegas.includes(c.id) ? <Bell size={12} /> : <BellOff size={12} />}
                  {recordatoriosColegas.includes(c.id) ? t.yaRecordado : t.recordarme}
                </button>
              )}
              {c.estado === 'finalizada' && (
                c.grabar ? (
                  <button onClick={() => verGrabacion(c)} className="inline-flex items-center gap-1.5 rounded-full bg-lilac-100 px-3 py-1.5 text-xs font-semibold text-lilac-700 hover:bg-lilac-200">
                    <Play size={12} /> {t.verGrabacion}
                  </button>
                ) : (
                  <span className="text-xs text-ink/40">{t.sinGrabacion}</span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="vivo"
      onNavigate={() => {}}
      roleBadge={{ es: 'Instructor', en: 'Instructor' }}
      profileTo="/instructor/perfil"
      backTo={vista === 'lista' ? '/instructor' : undefined}
      backLabel={{ es: t.volverPortal, en: t.volverPortal }}
    >
      {vista === 'lista' && (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{t.titulo}</h1>
            <p className="text-sm text-ink/50">{t.subtitulo}</p>
          </div>

          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.enVivoAhora}</p>
              <p className="font-display text-2xl font-semibold text-rose-600">{enVivoAhora}</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.tusProximas}</p>
              <p className="font-display text-2xl font-semibold text-ink">{misProgramadas.length}</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.estaSemana}</p>
              <p className="font-display text-2xl font-semibold text-ink">{misEstaSemana}</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.grabacionesLabel}</p>
              <p className="font-display text-2xl font-semibold text-ink">{grabacionesDisponibles.length}</p>
            </div>
          </section>

          <div className="flex gap-2">
            <button
              onClick={() => setTab('agenda')}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${tab === 'agenda' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'}`}
            >
              {t.tabAgenda}
            </button>
            <button
              onClick={() => setTab('grabaciones')}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${tab === 'grabaciones' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'}`}
            >
              {t.tabGrabaciones}
            </button>
          </div>

          {tab === 'agenda' ? (
            <div className="grid gap-5 lg:grid-cols-5">
              {/* ===== FORM ===== */}
              <section className="lg:col-span-2">
                <div className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
                  <h2 className="font-display text-lg font-semibold text-ink">{editandoId ? t.editarClaseTitulo : t.nuevaClase}</h2>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/40">{t.campoTitulo}</label>
                    <input
                      value={form.titulo}
                      onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                      placeholder={t.tituloPlaceholder}
                      className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm text-ink"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/40">{t.campoCurso}</label>
                    <select
                      value={form.cursoKey}
                      onChange={(e) => setForm((f) => ({ ...f, cursoKey: e.target.value, destinatarioTipo: e.target.value ? f.destinatarioTipo : 'pacientes' }))}
                      className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm text-ink"
                    >
                      {CURSOS_META.map((m) => (
                        <option key={m.key} value={m.key}>{tituloCurso(m.key)}</option>
                      ))}
                      <option value="">{t.sinCurso}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/40">{t.campoFecha}</label>
                      <input type="date" value={form.fechaISO} onChange={(e) => setForm((f) => ({ ...f, fechaISO: e.target.value }))} className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm text-ink" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/40">{t.campoHora}</label>
                        <input type="time" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))} className="focus-ring w-full rounded-xl border border-brand-200 px-2 py-2.5 text-sm text-ink" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/40">{t.campoDuracion}</label>
                        <select value={form.duracionMin} onChange={(e) => setForm((f) => ({ ...f, duracionMin: Number(e.target.value) }))} className="focus-ring w-full rounded-xl border border-brand-200 px-1 py-2.5 text-sm text-ink">
                          {DURACIONES.map((d) => <option key={d} value={d}>{d}m</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/40">{t.campoEnlace}</label>
                    <div className="flex gap-2">
                      <input
                        value={form.enlace}
                        onChange={(e) => setForm((f) => ({ ...f, enlace: e.target.value }))}
                        placeholder="https://zoom.us/j/…"
                        className="focus-ring flex-1 rounded-xl border border-brand-200 px-3 py-2.5 text-sm text-ink"
                      />
                    </div>
                    <button
                      onClick={() => setForm((f) => ({ ...f, enlace: nuevoEnlaceDemo() }))}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                    >
                      <RefreshCw size={12} /> {t.generarEnlace}
                    </button>
                  </div>

                  <div className="border-t border-brand-50 pt-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink/40">{t.destinatarios}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!form.cursoKey}
                        onClick={() => setForm((f) => ({ ...f, destinatarioTipo: 'curso' }))}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                          form.destinatarioTipo === 'curso' ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-brand-100 text-ink/60 hover:bg-brand-50/50'
                        }`}
                      >
                        {t.destCurso}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, destinatarioTipo: 'pacientes' }))}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
                          form.destinatarioTipo === 'pacientes' ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-brand-100 text-ink/60 hover:bg-brand-50/50'
                        }`}
                      >
                        {t.destPacientes}
                      </button>
                    </div>

                    {form.destinatarioTipo === 'curso' ? (
                      <p className="mt-2 text-xs text-emerald-700">
                        {form.cursoKey
                          ? t.destResumenCurso(CURSOS_META.find((m) => m.key === form.cursoKey)?.estudiantes ?? 0, tituloCurso(form.cursoKey))
                          : t.destResumenSinCurso}
                      </p>
                    ) : (
                      <div className="mt-2">
                        <input
                          value={busquedaPaciente}
                          onChange={(e) => setBusquedaPaciente(e.target.value)}
                          placeholder={t.buscarPaciente}
                          className="focus-ring mb-2 w-full rounded-xl border border-brand-200 px-3 py-2 text-xs text-ink"
                        />
                        <div className="max-h-40 space-y-1.5 overflow-y-auto">
                          {pacientesUnicos
                            .filter((p) => p.nombre.toLowerCase().includes(busquedaPaciente.toLowerCase()))
                            .map((p) => (
                              <label key={p.correo} className="flex items-center gap-2 rounded-xl border border-brand-100 px-2.5 py-2 text-xs text-ink hover:bg-brand-50/50">
                                <input
                                  type="checkbox"
                                  checked={form.pacientesCorreos.includes(p.correo)}
                                  onChange={() => togglePacienteForm(p.correo)}
                                  className="accent-brand-600"
                                />
                                {p.nombre}
                              </label>
                            ))}
                        </div>
                        <p className="mt-2 text-[11px] text-ink/40">{form.pacientesCorreos.length} {t.seleccionados}</p>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2.5 text-sm text-ink">
                    <span>{t.grabarSesion}</span>
                    <input type="checkbox" checked={form.grabar} onChange={(e) => setForm((f) => ({ ...f, grabar: e.target.checked }))} className="accent-brand-600" />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2.5 text-sm text-ink">
                    <span>{t.recordatorioCheck}</span>
                    <input type="checkbox" checked={form.recordatorio} onChange={(e) => setForm((f) => ({ ...f, recordatorio: e.target.checked }))} className="accent-brand-600" />
                  </label>

                  <div className="flex justify-end gap-2 pt-1">
                    {editandoId && (
                      <button onClick={resetForm} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-brand-50">
                        {t.cancelarEdicion}
                      </button>
                    )}
                    <button onClick={guardarClase} className="rounded-full bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90">
                      {editandoId ? t.guardarCambios : t.programarClase}
                    </button>
                  </div>
                </div>
              </section>

              {/* ===== LISTADO ===== */}
              <section className="space-y-4 lg:col-span-3">
                <div className="flex flex-wrap gap-2">
                  {(['todas', 'mias', 'colegas'] as Ambito[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAmbito(a)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${ambito === a ? 'border-transparent bg-ink text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'}`}
                    >
                      {a === 'todas' ? t.ambitoTodas : a === 'mias' ? t.ambitoMias : t.ambitoColegas}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {([['', t.fTodas], ['programada', t.fProgramadas], ['vivo', t.fVivo], ['finalizada', t.fFinalizadas], ['cancelada', t.fCanceladas]] as [string, string][]).map(([f, label]) => (
                    <button
                      key={f}
                      onClick={() => setFiltroEstado(f as '' | ClaseVivoEstado)}
                      className={`rounded-full border px-3 py-1.5 font-semibold ${filtroEstado === f ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {listaFiltrada.length === 0 ? (
                    <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center text-sm text-ink/45">{t.sinClases}</div>
                  ) : (
                    listaFiltrada.map((c) => claseRow(c))
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {grabacionesDisponibles.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-brand-100 bg-white p-8 text-center text-sm text-ink/45">{t.sinGrabacionesAviso}</div>
              ) : (
                grabacionesDisponibles.map((g) => (
                  <article key={g.id} className="group overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-soft">
                    <div className="relative">
                      <img src={g.grabacionImagen} alt={g.titulo} className="h-36 w-full object-cover" />
                      <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">{g.grabacionDuracion}</span>
                      <button onClick={() => verGrabacion(g)} className="absolute inset-0 grid place-items-center" aria-label="Play">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-brand-700 shadow-lift transition group-hover:scale-105">
                          <Play size={18} className="ml-0.5" fill="currentColor" />
                        </span>
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-ink">{g.titulo}</h3>
                      <p className="text-xs text-ink/45">{g.instructor} · {g.fechaISO}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </>
      )}

      {vista === 'sala' && claseSala && (
        <>
          <button onClick={claseSala.esPropia ? finalizarClic : salirSala} className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
            <ArrowLeft size={15} /> {t.salirSala}
          </button>
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="min-w-0 flex-1">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-brand-100 bg-ink shadow-soft">
                <div className="absolute inset-0 grid place-items-center text-white/30"><VideoIcon size={48} /></div>
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                  <span className="animate-pulse">●</span> {t.estVivo.toUpperCase()}
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white">👥 {claseSala.conectados ?? 1}</span>
                <span className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs text-white">{claseSala.instructor}</span>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Mic"><Mic size={18} /></button>
                  <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Camera"><VideoIcon size={18} /></button>
                  {claseSala.esPropia ? (
                    <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Share"><ScreenShare size={18} /></button>
                  ) : (
                    <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Hand"><Hand size={18} /></button>
                  )}
                  <button
                    onClick={claseSala.esPropia ? finalizarClic : salirSala}
                    className="flex h-11 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    <PhoneOff size={15} /> {claseSala.esPropia ? t.finalizarClase : t.salir}
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <h1 className="font-display text-xl font-semibold text-ink">{claseSala.titulo}</h1>
                <p className="text-sm text-ink/50">{claseSala.instructor}{claseSala.cursoTitulo ? ` · ${claseSala.cursoTitulo}` : ''}</p>
              </div>
            </div>

            <aside className="flex shrink-0 flex-col rounded-2xl border border-brand-100 bg-white lg:w-80" style={{ height: 'min(70vh, 560px)' }}>
              <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
                <div className="flex gap-4 text-sm">
                  <button className="border-b-2 border-brand-600 pb-1 font-semibold text-ink">{t.chat}</button>
                  <button className="pb-1 text-ink/45 hover:text-ink">{t.participantes} ({claseSala.conectados ?? 1})</button>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
                {mensajes.map((m, i) => (
                  <div key={i}>
                    <p className={`text-xs font-semibold ${m.esInstructor ? 'text-brand-600' : 'text-lilac-600'}`}>
                      {m.autor} <span className="font-normal text-ink/40">· {m.hora}</span>
                    </p>
                    <p className="text-ink">{m.texto}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-brand-100 p-3">
                <input
                  type="text"
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
                  placeholder={t.escribeMensaje}
                  className="flex-1 rounded-full border border-brand-200 px-4 py-2 text-sm text-ink focus:border-brand-400"
                />
                <button onClick={enviarMensaje} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-white" aria-label="Send">
                  <Send size={15} />
                </button>
              </div>
            </aside>
          </div>
        </>
      )}

      {vista === 'grabacion' && grabacionActual && (
        <>
          <button onClick={() => setVista('lista')} className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
            <ArrowLeft size={15} /> {t.volverListado}
          </button>
          <div className="max-w-3xl">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-brand-100 bg-ink shadow-soft">
              <img src={grabacionActual.grabacionImagen} alt={grabacionActual.titulo} className="absolute inset-0 h-full w-full object-cover opacity-70" />
              <button className="absolute inset-0 grid place-items-center" aria-label="Play">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-brand-700 shadow-2xl transition hover:scale-105">
                  <Play size={32} className="ml-1" fill="currentColor" />
                </span>
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <div className="mb-2 h-1 rounded-full bg-white/25"><div className="h-1 w-1/4 rounded-full bg-white" /></div>
                <div className="flex items-center justify-between text-xs text-white">
                  <span>00:00 / {grabacionActual.grabacionDuracion}</span>
                  <span>1.0x</span>
                </div>
              </div>
            </div>
            <h1 className="mt-4 font-display text-xl font-semibold text-ink">{grabacionActual.titulo}</h1>
            <p className="text-sm text-ink/50">{grabacionActual.instructor} · {grabacionActual.fechaISO}</p>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
