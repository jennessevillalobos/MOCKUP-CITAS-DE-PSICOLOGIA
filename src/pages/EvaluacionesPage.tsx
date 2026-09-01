import { useMemo, useState } from 'react';
import {
  Trash2, Check, Download, ChevronRight,
} from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { INSTRUCTOR_NAV_LABELS, buildInstructorNav } from '@/components/site/instructorNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useInstructorCourses } from '@/context/InstructorCoursesContext';
import { useInstructorGrading } from '@/context/InstructorGradingContext';
import { CURSOS_META, CURSOS_INFO_DEMO } from '@/data/instructorCoursesData';
import type { ModuloBuilder, EvaluacionBuilder, PreguntaEvaluacion, TipoPregunta, OpcionPregunta } from '@/data/courseBuilderData';
import type { IntentoEvaluacion } from '@/data/evaluacionesInstructorData';

type Tab = 'editor' | 'bandeja' | 'reporte';

const text = {
  es: {
    volverPortal: 'Volver al panel',
    titulo: 'Evaluaciones', subtitulo: 'Crea evaluaciones, califica intentos y revisa resultados por curso.',
    tabEditor: 'Editor', tabBandeja: 'Por calificar', tabReporte: 'Reporte',
    curso: 'Curso', modulo: 'Módulo', evaluacionSel: 'Evaluación',
    tituloEval: 'Título', puntaje: 'Puntaje', eliminar: 'Eliminar',
    multiple: 'Opción múltiple', vf: 'Verdadero / Falso', abierta: 'Respuesta abierta',
    correcta: 'Correcta', añadirOpcion: '+ Añadir opción', añadirPregunta: '+ Añadir pregunta',
    requiereManual: 'Requiere calificación manual del instructor.',
    configuracion: 'Configuración', moduloAsociado: 'Módulo asociado',
    intentosLabel: 'Intentos', notaMinima: 'Nota mínima', tiempoLimite: 'Tiempo límite (min)',
    barajar: 'Barajar preguntas', mostrarRetro: 'Mostrar retroalimentación', desbloquea: 'Desbloquea siguiente módulo',
    totalExamen: 'Total del examen', pts: 'pts',
    guardarEvaluacion: 'Guardar evaluación', guardadoOk: 'Guardado ✓',
    intentosEnviados: 'Intentos enviados', pendiente: 'Pendiente', calificado: 'Calificado',
    sinIntentos: 'No hay intentos enviados todavía.',
    intento: 'Intento', enviado: 'enviado', autoCalificado: 'Auto-calificado',
    respondio: 'Respondió', verdadero: 'Verdadero',
    abiertaRequiere: 'Respuesta abierta · requiere calificación', completa: 'Completa', parcial: 'Parcial',
    retroalimentacion: 'Retroalimentación', retroPlaceholder: 'Escribe un comentario para el estudiante…',
    notaFinal: 'Nota final', guardarBorrador: 'Guardar borrador', publicarCalificacion: 'Publicar calificación',
    exportarCsv: 'Exportar CSV', evaluacionTodas: 'Todas',
    promedio: 'Promedio', aprobados: 'Aprobados', intentosLbl: 'Intentos', porCalificar: 'Por calificar',
    estudiante: 'Estudiante', evaluacionCol: 'Evaluación', mejorNota: 'Mejor nota', intentosCol: 'Intentos',
    enRevision: 'En revisión', ver: 'Ver', calificar: 'Calificar',
    sinDatosReporte: 'Aún no hay intentos para este curso/evaluación.',
    seleccionaEvaluacion: 'Selecciona un intento de la izquierda para calificarlo.',
  },
  en: {
    volverPortal: 'Back to panel',
    titulo: 'Assessments', subtitulo: 'Create quizzes, grade attempts and review results by course.',
    tabEditor: 'Editor', tabBandeja: 'To grade', tabReporte: 'Report',
    curso: 'Course', modulo: 'Module', evaluacionSel: 'Quiz',
    tituloEval: 'Title', puntaje: 'Points', eliminar: 'Delete',
    multiple: 'Multiple choice', vf: 'True / False', abierta: 'Open answer',
    correcta: 'Correct', añadirOpcion: '+ Add option', añadirPregunta: '+ Add question',
    requiereManual: 'Requires manual grading by the instructor.',
    configuracion: 'Settings', moduloAsociado: 'Linked module',
    intentosLabel: 'Attempts', notaMinima: 'Pass mark', tiempoLimite: 'Time limit (min)',
    barajar: 'Shuffle questions', mostrarRetro: 'Show feedback', desbloquea: 'Unlocks next module',
    totalExamen: 'Exam total', pts: 'pts',
    guardarEvaluacion: 'Save quiz', guardadoOk: 'Saved ✓',
    intentosEnviados: 'Submitted attempts', pendiente: 'Pending', calificado: 'Graded',
    sinIntentos: 'No attempts submitted yet.',
    intento: 'Attempt', enviado: 'sent', autoCalificado: 'Auto-graded',
    respondio: 'Answered', verdadero: 'True',
    abiertaRequiere: 'Open answer · needs grading', completa: 'Full', parcial: 'Partial',
    retroalimentacion: 'Feedback', retroPlaceholder: 'Write a comment for the student…',
    notaFinal: 'Final grade', guardarBorrador: 'Save draft', publicarCalificacion: 'Publish grade',
    exportarCsv: 'Export CSV', evaluacionTodas: 'All',
    promedio: 'Average', aprobados: 'Passed', intentosLbl: 'Attempts', porCalificar: 'To grade',
    estudiante: 'Student', evaluacionCol: 'Quiz', mejorNota: 'Best', intentosCol: 'Attempts',
    enRevision: 'Reviewing', ver: 'View', calificar: 'Grade',
    sinDatosReporte: 'No attempts yet for this course/quiz.',
    seleccionaEvaluacion: 'Select an attempt on the left to grade it.',
  },
} as const;

let idSeq = 500;
function nextId(prefix: string) {
  idSeq += 1;
  return `${prefix}${idSeq}`;
}

function preguntaVacia(tipo: TipoPregunta): PreguntaEvaluacion {
  const opciones: OpcionPregunta[] =
    tipo === 'multiple'
      ? [
          { id: nextId('op'), texto: '', correcta: true },
          { id: nextId('op'), texto: '', correcta: false },
        ]
      : tipo === 'vf'
        ? [
            { id: nextId('op'), texto: 'Verdadero', correcta: true },
            { id: nextId('op'), texto: 'Falso', correcta: false },
          ]
        : [];
  return { id: nextId('p'), tipo, enunciado: '', puntaje: 1, opciones };
}

function evaluacionesDeModulo(modulos: ModuloBuilder[]): EvaluacionBuilder[] {
  return modulos.flatMap((m) => m.items.filter((it): it is EvaluacionBuilder => it.tipo === 'evaluacion'));
}

export default function EvaluacionesPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const { modulosPorCurso, actualizarModulos } = useInstructorCourses();
  const { intentos, calificarPregunta, publicarCalificacion } = useInstructorGrading();

  const navItems = buildInstructorNav(INSTRUCTOR_NAV_LABELS, ['evaluaciones'], ['constructor', 'citas', 'cursos', 'vivo', 'evaluaciones', 'notif', 'agenda', 'perfil']);

  const [tab, setTab] = useState<Tab>('editor');

  // ===== Editor: selección en cascada curso > módulo > evaluación =====
  const [cursoKey, setCursoKey] = useState('manejo-ansiedad');
  const modulosCurso = modulosPorCurso[cursoKey] ?? [];
  const [moduloId, setModuloId] = useState('m1');
  const moduloActual = modulosCurso.find((m) => m.id === moduloId) ?? modulosCurso[0] ?? null;
  const evaluacionesModulo = moduloActual ? evaluacionesDeModulo([moduloActual]) : [];
  const [evaluacionId, setEvaluacionId] = useState('q1');
  const evalOriginal = evaluacionesModulo.find((e) => e.id === evaluacionId) ?? evaluacionesModulo[0] ?? null;

  const [formTitulo, setFormTitulo] = useState(evalOriginal?.tituloEval ?? '');
  const [preguntasForm, setPreguntasForm] = useState<PreguntaEvaluacion[]>(evalOriginal?.preguntasDetalle ?? []);
  const [fIntentos, setFIntentos] = useState(evalOriginal?.intentos ?? 3);
  const [fNotaMinima, setFNotaMinima] = useState(evalOriginal?.notaMinimaPct ?? 70);
  const [fTiempoLimite, setFTiempoLimite] = useState(evalOriginal?.tiempoLimiteMin ?? 10);
  const [fBarajar, setFBarajar] = useState(evalOriginal?.barajar ?? true);
  const [fMostrarRetro, setFMostrarRetro] = useState(evalOriginal?.mostrarRetroalimentacion ?? true);
  const [fDesbloquea, setFDesbloquea] = useState(evalOriginal?.desbloqueaSiguiente ?? true);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [seedKey, setSeedKey] = useState(`${cursoKey}:${moduloId}:${evaluacionId}`);

  // Cuando cambia la selección curso/módulo/evaluación, re-sembramos el
  // formulario desde los datos reales de esa evaluación (patrón simple sin
  // useEffect: comparamos una clave derivada y reseedeamos en el render).
  const claveActual = `${cursoKey}:${moduloId}:${evaluacionId}`;
  if (claveActual !== seedKey) {
    setSeedKey(claveActual);
    setFormTitulo(evalOriginal?.tituloEval ?? '');
    setPreguntasForm(evalOriginal?.preguntasDetalle ?? []);
    setFIntentos(evalOriginal?.intentos ?? 3);
    setFNotaMinima(evalOriginal?.notaMinimaPct ?? 70);
    setFTiempoLimite(evalOriginal?.tiempoLimiteMin ?? 10);
    setFBarajar(evalOriginal?.barajar ?? true);
    setFMostrarRetro(evalOriginal?.mostrarRetroalimentacion ?? true);
    setFDesbloquea(evalOriginal?.desbloqueaSiguiente ?? true);
  }

  const totalPuntos = preguntasForm.reduce((acc, p) => acc + (Number.isFinite(p.puntaje) ? p.puntaje : 0), 0);

  function tituloCurso(key: string) {
    return CURSOS_INFO_DEMO[key]?.titulo || key;
  }

  function cambiarCurso(key: string) {
    setCursoKey(key);
    const primerModulo = (modulosPorCurso[key] ?? [])[0];
    setModuloId(primerModulo?.id ?? '');
    const primerEval = primerModulo ? evaluacionesDeModulo([primerModulo])[0] : undefined;
    setEvaluacionId(primerEval?.id ?? '');
  }

  function cambiarModulo(id: string) {
    setModuloId(id);
    const mod = modulosCurso.find((m) => m.id === id);
    const primerEval = mod ? evaluacionesDeModulo([mod])[0] : undefined;
    setEvaluacionId(primerEval?.id ?? '');
  }

  function actualizarPregunta(id: string, fields: Partial<PreguntaEvaluacion>) {
    setPreguntasForm((ps) => ps.map((p) => (p.id === id ? { ...p, ...fields } : p)));
  }

  function cambiarTipoPregunta(id: string, tipo: TipoPregunta) {
    setPreguntasForm((ps) => ps.map((p) => (p.id === id ? { ...preguntaVacia(tipo), id: p.id, enunciado: p.enunciado, puntaje: p.puntaje } : p)));
  }

  function actualizarOpcion(preguntaId: string, opcionId: string, fields: Partial<OpcionPregunta>) {
    setPreguntasForm((ps) =>
      ps.map((p) => (p.id === preguntaId ? { ...p, opciones: p.opciones.map((o) => (o.id === opcionId ? { ...o, ...fields } : o)) } : p))
    );
  }

  function marcarCorrecta(preguntaId: string, opcionId: string) {
    setPreguntasForm((ps) =>
      ps.map((p) => (p.id === preguntaId ? { ...p, opciones: p.opciones.map((o) => ({ ...o, correcta: o.id === opcionId })) } : p))
    );
  }

  function añadirOpcion(preguntaId: string) {
    setPreguntasForm((ps) =>
      ps.map((p) => (p.id === preguntaId ? { ...p, opciones: [...p.opciones, { id: nextId('op'), texto: '', correcta: false }] } : p))
    );
  }

  function eliminarOpcion(preguntaId: string, opcionId: string) {
    setPreguntasForm((ps) => ps.map((p) => (p.id === preguntaId ? { ...p, opciones: p.opciones.filter((o) => o.id !== opcionId) } : p)));
  }

  function añadirPregunta() {
    setPreguntasForm((ps) => [...ps, preguntaVacia('multiple')]);
  }

  function eliminarPregunta(id: string) {
    setPreguntasForm((ps) => ps.filter((p) => p.id !== id));
  }

  function guardarEvaluacion() {
    if (!moduloActual || !evalOriginal) return;
    const nuevos = modulosCurso.map((m) =>
      m.id !== moduloActual.id
        ? m
        : {
            ...m,
            items: m.items.map((it) =>
              it.id === evalOriginal.id && it.tipo === 'evaluacion'
                ? {
                    ...it,
                    tituloEval: formTitulo,
                    preguntas: preguntasForm.length,
                    intentos: fIntentos,
                    notaMinimaPct: fNotaMinima,
                    tiempoLimiteMin: fTiempoLimite,
                    barajar: fBarajar,
                    mostrarRetroalimentacion: fMostrarRetro,
                    desbloqueaSiguiente: fDesbloquea,
                    preguntasDetalle: preguntasForm,
                  }
                : it
            ),
          }
    );
    actualizarModulos(cursoKey, nuevos);
    setGuardadoOk(true);
    window.setTimeout(() => setGuardadoOk(false), 1800);
  }

  // ===== Bandeja de calificación =====
  const [intentoSelId, setIntentoSelId] = useState<string | null>(intentos[0]?.id ?? null);
  const intentoSel = intentos.find((i) => i.id === intentoSelId) ?? null;
  const [drafts, setDrafts] = useState<Record<string, { puntaje: number; retro: string }>>({});

  function preguntasDe(intento: IntentoEvaluacion): PreguntaEvaluacion[] {
    const modulos = modulosPorCurso[intento.cursoKey] ?? [];
    const mod = modulos.find((m) => m.id === intento.moduloId);
    const ev = mod ? evaluacionesDeModulo([mod]).find((e) => e.id === intento.evaluacionId) : undefined;
    return ev?.preguntasDetalle ?? [];
  }

  function draftFor(preguntaId: string, defaultPuntaje: number, defaultRetro: string) {
    return drafts[preguntaId] ?? { puntaje: defaultPuntaje, retro: defaultRetro };
  }

  function setDraft(preguntaId: string, fields: Partial<{ puntaje: number; retro: string }>) {
    setDrafts((d) => ({ ...d, [preguntaId]: { ...draftFor(preguntaId, 0, ''), ...fields } }));
  }

  function guardarBorradorPregunta(intentoId: string, preguntaId: string, puntajeMax: number) {
    const d = draftFor(preguntaId, 0, '');
    calificarPregunta(intentoId, preguntaId, Math.min(d.puntaje, puntajeMax), d.retro);
  }

  function publicar(intento: IntentoEvaluacion) {
    const preguntasEval = preguntasDe(intento);
    let obtenido = 0;
    let posible = 0;
    intento.respuestas.forEach((r) => {
      const preg = preguntasEval.find((p) => p.id === r.preguntaId);
      posible += preg?.puntaje ?? 0;
      const d = drafts[r.preguntaId];
      const puntajeFinal = r.tipo === 'abierta' ? (d ? d.puntaje : r.puntajeObtenido ?? 0) : r.puntajeObtenido ?? 0;
      obtenido += puntajeFinal;
      if (r.tipo === 'abierta' && d) calificarPregunta(intento.id, r.preguntaId, d.puntaje, d.retro);
    });
    const pct = posible > 0 ? Math.round((obtenido / posible) * 100) : 0;
    publicarCalificacion(intento.id, pct);
  }

  const intentosOrdenados = useMemo(
    () => [...intentos].sort((a, b) => (a.estado === b.estado ? 0 : a.estado === 'pendiente' ? -1 : 1)),
    [intentos]
  );
  const pendientesCount = intentos.filter((i) => i.estado === 'pendiente').length;

  // ===== Reporte =====
  const [repCursoKey, setRepCursoKey] = useState('manejo-ansiedad');
  const [repEvaluacionId, setRepEvaluacionId] = useState('');
  const intentosReporte = intentos.filter(
    (i) => i.cursoKey === repCursoKey && (!repEvaluacionId || i.evaluacionId === repEvaluacionId)
  );
  const calificados = intentosReporte.filter((i) => i.estado === 'calificado');
  const promedioReporte = calificados.length ? Math.round(calificados.reduce((acc, i) => acc + (i.notaFinalPct ?? 0), 0) / calificados.length) : 0;
  const evalReporteInfo = (() => {
    const modulos = modulosPorCurso[repCursoKey] ?? [];
    for (const m of modulos) {
      const ev = evaluacionesDeModulo([m]).find((e) => e.id === repEvaluacionId);
      if (ev) return ev;
    }
    return null;
  })();
  const notaMinimaReporte = evalReporteInfo?.notaMinimaPct ?? 70;
  const aprobadosPct = calificados.length ? Math.round((calificados.filter((i) => (i.notaFinalPct ?? 0) >= notaMinimaReporte).length / calificados.length) * 100) : 0;

  function irACalificar(intentoId: string) {
    setIntentoSelId(intentoId);
    setTab('bandeja');
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="evaluaciones"
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

      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setTab('editor')} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${tab === 'editor' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'}`}>
          {t.tabEditor}
        </button>
        <button onClick={() => setTab('bandeja')} className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${tab === 'bandeja' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'}`}>
          {t.tabBandeja}
          {pendientesCount > 0 && <span className="rounded-full bg-amber-400/80 px-1.5 text-xs text-white">{pendientesCount}</span>}
        </button>
        <button onClick={() => setTab('reporte')} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${tab === 'reporte' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'}`}>
          {t.tabReporte}
        </button>
      </div>

      {/* ===== EDITOR ===== */}
      {tab === 'editor' && (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <select value={cursoKey} onChange={(e) => cambiarCurso(e.target.value)} className="focus-ring rounded-full border border-brand-200 px-3 py-2 text-sm text-ink">
                {CURSOS_META.map((m) => <option key={m.key} value={m.key}>{tituloCurso(m.key)}</option>)}
              </select>
              <select value={moduloId} onChange={(e) => cambiarModulo(e.target.value)} className="focus-ring rounded-full border border-brand-200 px-3 py-2 text-sm text-ink">
                {modulosCurso.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}
              </select>
              <select value={evaluacionId} onChange={(e) => setEvaluacionId(e.target.value)} className="focus-ring rounded-full border border-brand-200 px-3 py-2 text-sm text-ink">
                {evaluacionesModulo.map((e) => <option key={e.id} value={e.id}>{e.tituloEval || e.id}</option>)}
              </select>
            </div>

            {!evalOriginal ? (
              <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-10 text-center text-sm text-ink/45">{t.seleccionaEvaluacion}</div>
            ) : (
              <>
                <input
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full rounded bg-transparent px-1 -mx-1 font-display text-2xl font-semibold text-ink focus:bg-brand-50 focus:outline-none"
                />

                {preguntasForm.map((p, i) => (
                  <div key={p.id} className="rounded-2xl border border-brand-100 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <select
                        value={p.tipo}
                        onChange={(e) => cambiarTipoPregunta(p.id, e.target.value as TipoPregunta)}
                        className="rounded-full border border-brand-200 px-3 py-1.5 text-xs text-ink"
                      >
                        <option value="multiple">{t.multiple}</option>
                        <option value="vf">{t.vf}</option>
                        <option value="abierta">{t.abierta}</option>
                      </select>
                      <div className="flex items-center gap-2 text-xs text-ink/45">
                        {t.puntaje}
                        <input
                          type="number"
                          value={p.puntaje}
                          onChange={(e) => actualizarPregunta(p.id, { puntaje: Number(e.target.value) })}
                          className="w-14 rounded-lg border border-brand-200 px-2 py-1 text-center text-ink"
                        />
                        <button onClick={() => eliminarPregunta(p.id)} className="text-rose-400 hover:text-rose-600" aria-label={t.eliminar}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <input
                      value={p.enunciado}
                      onChange={(e) => actualizarPregunta(p.id, { enunciado: e.target.value })}
                      placeholder={`${t.tituloEval} ${i + 1}`}
                      className="focus-ring mb-3 w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink"
                    />
                    {p.tipo === 'abierta' ? (
                      <p className="flex items-center gap-1.5 text-xs text-lilac-600">✍️ {t.requiereManual}</p>
                    ) : (
                      <div className="space-y-2">
                        {p.opciones.map((o) => (
                          <div key={o.id} className="flex items-center gap-3">
                            <input type="radio" checked={o.correcta} onChange={() => marcarCorrecta(p.id, o.id)} className="accent-brand-600" />
                            <input
                              value={o.texto}
                              onChange={(e) => actualizarOpcion(p.id, o.id, { texto: e.target.value })}
                              disabled={p.tipo === 'vf'}
                              className="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm text-ink disabled:bg-brand-50/60"
                            />
                            {o.correcta ? (
                              <span className="text-xs text-emerald-600">{t.correcta}</span>
                            ) : p.tipo === 'multiple' ? (
                              <button onClick={() => eliminarOpcion(p.id, o.id)} className="text-ink/30 hover:text-rose-500" aria-label="remove">✕</button>
                            ) : null}
                          </div>
                        ))}
                        {p.tipo === 'multiple' && (
                          <button onClick={() => añadirOpcion(p.id)} className="text-xs font-semibold text-brand-600 hover:underline">{t.añadirOpcion}</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <button onClick={añadirPregunta} className="rounded-xl border border-dashed border-brand-200 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50">
                  {t.añadirPregunta}
                </button>
              </>
            )}
          </div>

          {evalOriginal && (
            <aside className="space-y-4 rounded-2xl border border-brand-100 bg-white p-5 lg:sticky lg:top-20">
              <h3 className="font-display font-semibold text-ink">{t.configuracion}</h3>
              <div>
                <label className="mb-1 block text-xs text-ink/45">{t.moduloAsociado}</label>
                <p className="rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2 text-sm text-ink">{moduloActual?.titulo}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-ink/45">{t.intentosLabel}</label>
                  <input type="number" value={fIntentos} onChange={(e) => setFIntentos(Number(e.target.value))} className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-ink/45">{t.notaMinima}</label>
                  <div className="relative">
                    <input type="number" value={fNotaMinima} onChange={(e) => setFNotaMinima(Number(e.target.value))} className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40">%</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink/45">{t.tiempoLimite}</label>
                <input type="number" value={fTiempoLimite} onChange={(e) => setFTiempoLimite(Number(e.target.value))} className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink" />
              </div>
              <div className="space-y-2 text-sm">
                <label className="flex items-center justify-between text-ink"><span>{t.barajar}</span><input type="checkbox" checked={fBarajar} onChange={(e) => setFBarajar(e.target.checked)} className="accent-brand-600" /></label>
                <label className="flex items-center justify-between text-ink"><span>{t.mostrarRetro}</span><input type="checkbox" checked={fMostrarRetro} onChange={(e) => setFMostrarRetro(e.target.checked)} className="accent-brand-600" /></label>
                <label className="flex items-center justify-between text-ink"><span>{t.desbloquea}</span><input type="checkbox" checked={fDesbloquea} onChange={(e) => setFDesbloquea(e.target.checked)} className="accent-brand-600" /></label>
              </div>
              <div className="flex justify-between border-t border-brand-50 pt-3 text-xs text-ink/45">
                <span>{t.totalExamen}</span>
                <span className="font-semibold text-ink">{totalPuntos} {t.pts}</span>
              </div>
              <button onClick={guardarEvaluacion} className="w-full rounded-full bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90">
                {guardadoOk ? t.guardadoOk : t.guardarEvaluacion}
              </button>
            </aside>
          )}
        </div>
      )}

      {/* ===== BANDEJA ===== */}
      {tab === 'bandeja' && (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white lg:col-span-1">
            <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
              <span className="text-sm font-medium text-ink">{t.intentosEnviados}</span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">{pendientesCount}</span>
            </div>
            <div className="max-h-[60vh] divide-y divide-brand-50 overflow-y-auto">
              {intentosOrdenados.length === 0 ? (
                <p className="p-4 text-sm text-ink/40">{t.sinIntentos}</p>
              ) : (
                intentosOrdenados.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => setIntentoSelId(i.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-brand-50/60 ${intentoSelId === i.id ? 'bg-brand-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">{i.estudiante}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${i.estado === 'pendiente' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {i.estado === 'pendiente' ? t.pendiente : `${t.calificado} · ${i.notaFinalPct}%`}
                      </span>
                    </div>
                    <p className="text-xs text-ink/45">{moduloActual?.titulo ?? i.moduloId} · {i.enviadoHace[language]}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!intentoSel ? (
              <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-10 text-center text-sm text-ink/45">{t.seleccionaEvaluacion}</div>
            ) : (
              (() => {
                const preguntasEval = preguntasDe(intentoSel);
                const totalPosible = preguntasEval.reduce((acc, p) => acc + p.puntaje, 0);
                const obtenidoActual = intentoSel.respuestas.reduce((acc, r) => {
                  const d = drafts[r.preguntaId];
                  return acc + (r.tipo === 'abierta' ? (d ? d.puntaje : r.puntajeObtenido ?? 0) : r.puntajeObtenido ?? 0);
                }, 0);
                const pctActual = totalPosible > 0 ? Math.round((obtenidoActual / totalPosible) * 100) : 0;
                return (
                  <div className="rounded-2xl border border-brand-100 bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-lilac-100 font-semibold text-lilac-700">
                          {intentoSel.estudiante.split(' ').filter((w) => w.length > 1).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-ink">{intentoSel.estudiante}</p>
                          <p className="text-xs text-ink/45">{t.intento} {intentoSel.numeroIntento} · {t.enviado} {intentoSel.enviadoHace[language]}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-ink/45">{intentoSel.estado === 'calificado' ? '' : t.autoCalificado}</p>
                        <p className="font-display font-semibold text-ink">{obtenidoActual} / {totalPosible} <span className="text-sm text-ink/40">{t.pts}</span></p>
                      </div>
                    </div>

                    <div className="mb-4 space-y-2">
                      {intentoSel.respuestas.filter((r) => r.tipo !== 'abierta').map((r) => {
                        const preg = preguntasEval.find((p) => p.id === r.preguntaId);
                        const opcionElegida = preg?.opciones.find((o) => o.id === r.opcionElegidaId);
                        const correcta = opcionElegida?.correcta;
                        return (
                          <div key={r.preguntaId} className="flex items-start gap-3 rounded-xl bg-brand-50/40 p-3 text-sm">
                            <span className={correcta ? 'mt-0.5 text-emerald-600' : 'mt-0.5 text-rose-500'}>{correcta ? '✓' : '✕'}</span>
                            <div className="flex-1">
                              <p className="text-ink">{preg?.enunciado}</p>
                              <p className="text-xs text-ink/45">{t.respondio}: {opcionElegida?.texto}</p>
                            </div>
                            <span className={`text-xs ${correcta ? 'text-emerald-600' : 'text-rose-500'}`}>{r.puntajeObtenido}/{preg?.puntaje}</span>
                          </div>
                        );
                      })}
                    </div>

                    {intentoSel.respuestas.filter((r) => r.tipo === 'abierta').map((r) => {
                      const preg = preguntasEval.find((p) => p.id === r.preguntaId);
                      const d = draftFor(r.preguntaId, r.puntajeObtenido ?? 0, r.retroalimentacion ?? '');
                      return (
                        <div key={r.preguntaId} className="mb-3 rounded-2xl border border-lilac-200 bg-lilac-50/40 p-4">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-lilac-700">✍️ {t.abiertaRequiere}</p>
                          <p className="mb-1 text-sm font-medium text-ink">{preg?.enunciado}</p>
                          <div className="mb-3 rounded-xl bg-white p-3 text-sm text-ink">"{r.textoRespuesta}"</div>
                          <div className="mb-3 flex flex-wrap items-center gap-3">
                            <label className="text-xs text-ink/45">{t.puntaje}</label>
                            <input
                              type="number"
                              value={d.puntaje}
                              onChange={(e) => setDraft(r.preguntaId, { puntaje: Number(e.target.value) })}
                              className="w-16 rounded-lg border border-brand-200 px-2 py-1.5 text-center text-sm text-ink"
                            />
                            <span className="text-sm text-ink/40">/ {preg?.puntaje}</span>
                            <div className="ml-auto flex gap-1 text-xs">
                              <button onClick={() => setDraft(r.preguntaId, { puntaje: preg?.puntaje ?? 0 })} className="rounded-full border border-brand-200 px-3 py-1.5 text-brand-600 hover:bg-brand-50">
                                ✓ {t.completa}
                              </button>
                              <button onClick={() => setDraft(r.preguntaId, { puntaje: Math.round((preg?.puntaje ?? 0) / 2) })} className="rounded-full border border-brand-200 px-3 py-1.5 text-ink/60 hover:bg-brand-50">
                                {t.parcial}
                              </button>
                            </div>
                          </div>
                          <label className="mb-1 block text-xs text-ink/45">{t.retroalimentacion}</label>
                          <textarea
                            rows={2}
                            value={d.retro}
                            onChange={(e) => setDraft(r.preguntaId, { retro: e.target.value })}
                            placeholder={t.retroPlaceholder}
                            className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink"
                          />
                          <button
                            onClick={() => guardarBorradorPregunta(intentoSel.id, r.preguntaId, preg?.puntaje ?? 0)}
                            className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
                          >
                            {t.guardarBorrador}
                          </button>
                        </div>
                      );
                    })}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-ink">
                        {t.notaFinal}: <span className="font-display text-lg font-semibold">{pctActual}%</span>
                      </p>
                      <button
                        onClick={() => publicar(intentoSel)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90"
                      >
                        <Check size={14} /> {t.publicarCalificacion}
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* ===== REPORTE ===== */}
      {tab === 'reporte' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={repCursoKey}
                onChange={(e) => { setRepCursoKey(e.target.value); setRepEvaluacionId(''); }}
                className="focus-ring rounded-full border border-brand-200 px-3 py-2 text-sm text-ink"
              >
                {CURSOS_META.map((m) => <option key={m.key} value={m.key}>{tituloCurso(m.key)}</option>)}
              </select>
              <select value={repEvaluacionId} onChange={(e) => setRepEvaluacionId(e.target.value)} className="focus-ring rounded-full border border-brand-200 px-3 py-2 text-sm text-ink">
                <option value="">{t.evaluacionSel}: {t.evaluacionTodas}</option>
                {(modulosPorCurso[repCursoKey] ?? []).flatMap((m) => evaluacionesDeModulo([m])).map((e) => (
                  <option key={e.id} value={e.id}>{e.tituloEval || e.id}</option>
                ))}
              </select>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-50">
              <Download size={14} /> {t.exportarCsv}
            </button>
          </div>

          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.promedio}</p>
              <p className="font-display text-2xl font-semibold text-ink">{promedioReporte}%</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.aprobados}</p>
              <p className="font-display text-2xl font-semibold text-emerald-600">{aprobadosPct}%</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.intentosLbl}</p>
              <p className="font-display text-2xl font-semibold text-ink">{intentosReporte.length}</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-ink/50">{t.porCalificar}</p>
              <p className="font-display text-2xl font-semibold text-amber-600">{intentosReporte.filter((i) => i.estado === 'pendiente').length}</p>
            </div>
          </section>

          <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white">
            {intentosReporte.length === 0 ? (
              <p className="p-8 text-center text-sm text-ink/45">{t.sinDatosReporte}</p>
            ) : (
              <>
                <div className="hidden grid-cols-12 gap-2 border-b border-brand-100 px-5 py-3 text-xs text-ink/40 sm:grid">
                  <span className="col-span-4">{t.estudiante}</span>
                  <span className="col-span-3">{t.evaluacionCol}</span>
                  <span className="col-span-2">{t.mejorNota}</span>
                  <span className="col-span-2">{t.intentosCol}</span>
                  <span className="col-span-1" />
                </div>
                <div className="divide-y divide-brand-50 text-sm">
                  {intentosReporte.map((i) => (
                    <div key={i.id} className="grid grid-cols-2 items-center gap-2 px-5 py-3 sm:grid-cols-12">
                      <span className="col-span-1 text-ink sm:col-span-4">{i.estudiante}</span>
                      <span className="col-span-1 text-ink/50 sm:col-span-3">{moduloActual?.titulo ?? i.moduloId}</span>
                      <span className={`col-span-1 font-semibold sm:col-span-2 ${i.estado === 'calificado' ? ((i.notaFinalPct ?? 0) >= notaMinimaReporte ? 'text-emerald-600' : 'text-rose-500') : 'text-lilac-600'}`}>
                        {i.estado === 'calificado' ? `${i.notaFinalPct}%` : t.enRevision}
                      </span>
                      <span className="col-span-1 text-ink/50 sm:col-span-2">{i.numeroIntento}/{evalReporteInfo?.intentos ?? '—'}</span>
                      <span className="col-span-2 text-right sm:col-span-1">
                        <button onClick={() => irACalificar(i.id)} className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600 hover:underline">
                          {i.estado === 'pendiente' ? t.calificar : t.ver} <ChevronRight size={12} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
