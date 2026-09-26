import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, HelpCircle, Unlock, ChevronLeft, ChevronRight, Lock,
} from 'lucide-react';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useSiteAuth } from '@/context/SiteAuthContext';
import {
  EVALUACION_INFO, PREGUNTAS, RESULTADO_DEMO, HISTORIAL_INTENTOS, type EstadoFeedback,
} from '@/data/assessmentData';
import { cargarEvaluacionEstudiante, type EvaluacionEstudiante } from '@/lib/api/cursosEstudiante';
import { submitEvaluation } from '@/lib/api/edgeFunctions';

const logo = '/src/assets/logos/1_(1).png';

type Vista = 'intro' | 'quiz' | 'resultado' | 'historial';

const text = {
  es: {
    back: 'Volver a la clase',
    tituloHeader: 'Evaluación · Módulo', question: 'Pregunta',
    tituloIntro: 'Evaluación del Módulo', preguntas: 'Preguntas', tiempo: 'Tiempo', paraAprobar: 'Para aprobar', intentos: 'Intentos',
    instrucciones: 'Instrucciones',
    instr1: (min: number) => `Tienes ${min} minutos desde que inicias.`,
    instr1SinLimite: 'No tiene límite de tiempo.',
    instr2: (n: number) => `Puedes usar ${n} intentos; se guarda el mejor puntaje.`,
    instr3: (pct: number) => `Debes obtener ${pct}% para desbloquear el siguiente módulo.`,
    instr3Aprobar: (pct: number) => `Debes obtener ${pct}% para aprobar.`,
    instrAbiertas: 'Las preguntas abiertas las califica tu profesional; hasta entonces el intento queda en revisión.',
    comenzar: 'Comenzar evaluación', verHistorial: 'Ver historial de intentos',
    anterior: 'Anterior', siguiente: 'Siguiente', enviar: 'Enviar evaluación', enviando: 'Enviando…',
    respuestaPlaceholder: 'Escribe tu respuesta…',
    aprobado: '¡Aprobado!', noAprobado: 'No aprobado', enRevision: 'En revisión',
    obtuviste: (c: number, t: number) => `Obtuviste ${c} de ${t} correctas`,
    infoIntento: (n: number, max: number, min: number) => `Intento ${n} de ${max} · ${min} min usados`,
    desbloqueado: '¡Siguiente módulo desbloqueado!',
    desbloqueadoDetalle: 'Ya puedes continuar con la próxima clase.',
    pendienteDetalle: 'Tu profesional calificará las preguntas abiertas. Te avisaremos cuando tengas la nota.',
    retroalimentacion: 'Retroalimentación',
    continuarClase: 'Continuar a la clase', verHistorialBtn: 'Ver historial',
    intentosRestantes: (n: number) => `Te queda${n === 1 ? '' : 'n'} ${n} intento${n === 1 ? '' : 's'} si deseas mejorar tu puntaje.`,
    volverHist: 'Volver', historialTitle: 'Historial de intentos',
    mejorPuntaje: 'Mejor puntaje', intentosUsados: 'Intentos usados', estado: 'Estado',
    colIntento: 'Intento', colFecha: 'Fecha', colPuntaje: 'Puntaje',
    verDetalle: 'Ver detalle',
    reintentar: (n: number) => `Reintentar (${n} intento${n === 1 ? '' : 's'} restante${n === 1 ? '' : 's'})`,
    chipAprobado: 'Aprobado', chipReprobado: 'Reprobado', chipPendiente: 'En revisión', sinIntentos: 'Sin intentos',
    etiquetaOpcion: 'Opción múltiple', etiquetaVf: 'Verdadero / Falso', etiquetaAbierta: 'Respuesta abierta',
    fbCorrecta: 'Correcta.', fbIncorrecta: 'Incorrecta.', fbRevision: 'En revisión por tu profesional.',
    cargando: 'Cargando la evaluación…', elige: 'Abre la evaluación desde el temario de tu curso.', irAula: 'Ir al Aula Virtual',
    bloqueada: 'Completa las clases de este módulo para habilitar la evaluación.',
    agotados: 'Ya usaste todos tus intentos.',
    sinResponder: (n: number) => `Tienes ${n} pregunta${n === 1 ? '' : 's'} sin responder. ¿Enviar de todas formas?`,
    tiempoAgotado: 'Se acabó el tiempo: enviamos tus respuestas.',
  },
  en: {
    back: 'Back to lesson',
    tituloHeader: 'Quiz · Module', question: 'Question',
    tituloIntro: 'Module quiz', preguntas: 'Questions', tiempo: 'Time', paraAprobar: 'To pass', intentos: 'Attempts',
    instrucciones: 'Instructions',
    instr1: (min: number) => `You have ${min} minutes once you start.`,
    instr1SinLimite: 'There is no time limit.',
    instr2: (n: number) => `You get ${n} attempts; the best score is kept.`,
    instr3: (pct: number) => `You need ${pct}% to unlock the next module.`,
    instr3Aprobar: (pct: number) => `You need ${pct}% to pass.`,
    instrAbiertas: 'Open questions are graded by your professional; until then the attempt stays under review.',
    comenzar: 'Start quiz', verHistorial: 'View attempt history',
    anterior: 'Previous', siguiente: 'Next', enviar: 'Submit quiz', enviando: 'Submitting…',
    respuestaPlaceholder: 'Write your answer…',
    aprobado: 'Passed!', noAprobado: 'Not passed', enRevision: 'Under review',
    obtuviste: (c: number, t: number) => `You got ${c} of ${t} correct`,
    infoIntento: (n: number, max: number, min: number) => `Attempt ${n} of ${max} · ${min} min used`,
    desbloqueado: 'Next module unlocked!',
    desbloqueadoDetalle: "You can now continue with the next lesson.",
    pendienteDetalle: 'Your professional will grade the open questions. We will notify you when your grade is ready.',
    retroalimentacion: 'Feedback',
    continuarClase: 'Continue to lesson', verHistorialBtn: 'View history',
    intentosRestantes: (n: number) => `You have ${n} attempt${n === 1 ? '' : 's'} left to improve your score.`,
    volverHist: 'Back', historialTitle: 'Attempt history',
    mejorPuntaje: 'Best score', intentosUsados: 'Attempts used', estado: 'Status',
    colIntento: 'Attempt', colFecha: 'Date', colPuntaje: 'Score',
    verDetalle: 'Details',
    reintentar: (n: number) => `Retry (${n} attempt${n === 1 ? '' : 's'} left)`,
    chipAprobado: 'Passed', chipReprobado: 'Failed', chipPendiente: 'Under review', sinIntentos: 'No attempts',
    etiquetaOpcion: 'Multiple choice', etiquetaVf: 'True / False', etiquetaAbierta: 'Open answer',
    fbCorrecta: 'Correct.', fbIncorrecta: 'Incorrect.', fbRevision: 'Under review by your professional.',
    cargando: 'Loading the quiz…', elige: 'Open the quiz from your course contents.', irAula: 'Go to Virtual Classroom',
    bloqueada: 'Complete this module’s lessons to enable the quiz.',
    agotados: 'You have used all your attempts.',
    sinResponder: (n: number) => `You have ${n} unanswered question${n === 1 ? '' : 's'}. Submit anyway?`,
    tiempoAgotado: 'Time is up: we submitted your answers.',
  },
} as const;

const badgeCls: Record<string, string> = {
  opcion: 'bg-lilac-50 text-lilac-700',
  vf: 'bg-emerald-50 text-emerald-700',
  abierta: 'bg-brand-50 text-brand-700',
};

const feedbackIcon: Record<EstadoFeedback, typeof CheckCircle2> = {
  correcta: CheckCircle2,
  incorrecta: XCircle,
  revision: HelpCircle,
};

const feedbackColor: Record<EstadoFeedback, string> = {
  correcta: 'text-emerald-600',
  incorrecta: 'text-rose-500',
  revision: 'text-brand-500',
};

type Bilingue = { es: string; en: string };
const ambos = (s: string): Bilingue => ({ es: s, en: s });

// Modelo común para demo y datos reales.
interface PreguntaVista {
  id?: number;
  tipo: 'opcion' | 'vf' | 'abierta';
  etiqueta: Bilingue;
  enunciado: Bilingue;
  opciones: { id?: number; texto: Bilingue }[];
  ayuda?: Bilingue;
}
interface ResultadoVista {
  porcentaje: number | null;
  correctas: number;
  total: number;
  intentoActual: number;
  intentosMax: number;
  minutosUsados: number;
  aprobado: boolean;
  pendiente: boolean;
  desbloquea: boolean;
  feedback: { pregunta: Bilingue; estado: EstadoFeedback; detalle: Bilingue }[];
}
interface IntentoVista {
  numero: number;
  fecha: Bilingue;
  puntaje: number | null;
  estado: 'aprobado' | 'reprobado' | 'pendiente';
}

function mezclar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function fechaBilingue(iso: string): Bilingue {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return { es: d.toLocaleString('es-ES', opts), en: d.toLocaleString('en-US', opts) };
}

export default function AssessmentPage() {
  const { language, setLanguage } = useSiteLanguage();
  const { esSesionReal } = useSiteAuth();
  const t = text[language];
  const [params] = useSearchParams();
  const evaluacionId = Number(params.get('evaluacion')) || null;
  const real = esSesionReal;

  const [vista, setVista] = useState<Vista>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [abiertas, setAbiertas] = useState<Record<number, string>>({});
  const [segundosRestantes, setSegundosRestantes] = useState(EVALUACION_INFO.tiempoMin * 60);
  const timerRef = useRef<number | null>(null);

  // ── Datos reales ──
  const [evaluacion, setEvaluacion] = useState<EvaluacionEstudiante | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [orden, setOrden] = useState<PreguntaVista[]>([]);
  const [resultadoReal, setResultadoReal] = useState<ResultadoVista | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const inicioRef = useRef<number>(0);

  const recargar = useCallback(async () => {
    if (!evaluacionId) return;
    const res = await cargarEvaluacionEstudiante(evaluacionId);
    if (res.error) setErrorCarga(res.error.message);
    else setEvaluacion(res.data);
  }, [evaluacionId]);

  useEffect(() => {
    if (real && evaluacionId) void recargar();
  }, [real, evaluacionId, recargar]);

  // ── Modelo de vista ──
  const etiquetas: Record<PreguntaVista['tipo'], Bilingue> = {
    opcion: { es: text.es.etiquetaOpcion, en: text.en.etiquetaOpcion },
    vf: { es: text.es.etiquetaVf, en: text.en.etiquetaVf },
    abierta: { es: text.es.etiquetaAbierta, en: text.en.etiquetaAbierta },
  };
  const preguntasBase: PreguntaVista[] = useMemo(() => (real
    ? (evaluacion?.preguntas ?? []).map((q) => ({
        id: q.id, tipo: q.tipo, etiqueta: etiquetas[q.tipo], enunciado: ambos(q.texto),
        opciones: q.opciones.map((o) => ({ id: o.id, texto: ambos(o.texto) })),
      }))
    : PREGUNTAS.map((p) => ({
        tipo: p.tipo, etiqueta: p.etiqueta, enunciado: p.enunciado, ayuda: p.ayuda,
        opciones: (p.opciones ?? []).map((o) => ({ texto: o })),
      }))
  ), [real, evaluacion]); // eslint-disable-line react-hooks/exhaustive-deps
  const preguntas = real && orden.length ? orden : preguntasBase;

  const info = real && evaluacion
    ? {
        curso: ambos(evaluacion.curso.nombre),
        modulo: evaluacion.moduloNumero ?? 1,
        tituloModulo: ambos(evaluacion.moduloTitulo ?? evaluacion.titulo),
        preguntasTotal: evaluacion.preguntas.length,
        tiempoMin: evaluacion.tiempoLimiteMin,
        notaAprobar: evaluacion.notaMinima,
        intentosMax: evaluacion.intentosMax ?? 0,
        intentosUsados: evaluacion.intentos.length,
      }
    : EVALUACION_INFO;

  const historial: IntentoVista[] = real
    ? [...(evaluacion?.intentos ?? [])].reverse().map((i) => ({
        numero: i.numero,
        fecha: fechaBilingue(i.fecha),
        puntaje: i.nota,
        estado: i.estado === 'pendiente' ? 'pendiente' : i.aprobado ? 'aprobado' : 'reprobado',
      }))
    : HISTORIAL_INTENTOS;

  const resultado: ResultadoVista = real && resultadoReal ? resultadoReal : {
    ...RESULTADO_DEMO, pendiente: false, desbloquea: RESULTADO_DEMO.aprobado,
  };

  const sinLimiteIntentos = real && !info.intentosMax;
  const intentosRestantes = real
    ? (sinLimiteIntentos ? 1 : Math.max(0, info.intentosMax - info.intentosUsados))
    : RESULTADO_DEMO.intentosMax - RESULTADO_DEMO.intentoActual;
  const puntajes = historial.map((h) => h.puntaje).filter((p): p is number => p !== null);
  const mejor = puntajes.length ? Math.max(...puntajes) : null;
  const estadoGeneral = historial.some((h) => h.estado === 'aprobado') ? 'aprobado'
    : historial.some((h) => h.estado === 'pendiente') ? 'pendiente'
    : historial.length ? 'reprobado' : null;
  const volverClase = real && evaluacion ? `/aula-virtual/clase?curso=${evaluacion.curso.slug}` : '/aula-virtual/clase';
  const conTiempo = !real || info.tiempoMin > 0;

  // ── Temporizador ──
  useEffect(() => {
    if (vista !== 'quiz' || !conTiempo) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setSegundosRestantes((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [vista, conTiempo]);

  function iniciar() {
    setQIndex(0);
    setRespuestas({});
    setAbiertas({});
    setAviso(null);
    setSegundosRestantes((real ? info.tiempoMin : EVALUACION_INFO.tiempoMin) * 60);
    if (real) {
      setOrden(evaluacion?.barajar ? mezclar(preguntasBase) : preguntasBase);
      inicioRef.current = Date.now();
    }
    setVista('quiz');
  }

  function seleccionar(i: number) {
    setRespuestas((r) => ({ ...r, [qIndex]: i }));
  }

  const enviar = useCallback(async (porTiempo = false) => {
    if (!evaluacion) return;
    const respuestasApi = preguntas.map((p, i) => (p.tipo === 'abierta'
      ? { pregunta_id: p.id as number, texto: abiertas[i] ?? '' }
      : { pregunta_id: p.id as number, opcion_id: respuestas[i] !== undefined ? p.opciones[respuestas[i]]?.id : undefined }));
    const minutos = Math.max(1, Math.ceil((Date.now() - inicioRef.current) / 60000));
    setEnviando(true);
    const res = await submitEvaluation(
      evaluacion.id, respuestasApi, info.tiempoMin ? Math.min(minutos, info.tiempoMin) : minutos,
    );
    setEnviando(false);
    if (res.error) {
      setAviso(res.error.message);
      return;
    }
    const r = res.data;
    const nombre = (id: number) => {
      const idx = preguntas.findIndex((p) => p.id === id);
      return `P${idx + 1} · ${preguntas[idx]?.enunciado.es ?? ''}`;
    };
    setResultadoReal({
      porcentaje: r.nota,
      correctas: r.correctas,
      total: r.autocalificables,
      intentoActual: r.numero_intento,
      intentosMax: r.intentos_max ?? r.numero_intento,
      minutosUsados: minutos,
      aprobado: r.aprobado,
      pendiente: r.estado === 'pendiente',
      desbloquea: r.aprobado && evaluacion.desbloqueaSiguiente,
      feedback: (r.retroalimentacion ?? []).map((f) => ({
        pregunta: ambos(nombre(f.pregunta_id)),
        estado: f.estado,
        detalle: f.estado === 'correcta' ? { es: text.es.fbCorrecta, en: text.en.fbCorrecta }
          : f.estado === 'incorrecta' ? { es: text.es.fbIncorrecta, en: text.en.fbIncorrecta }
          : { es: text.es.fbRevision, en: text.en.fbRevision },
      })),
    });
    setAviso(porTiempo ? t.tiempoAgotado : null);
    setVista('resultado');
    void recargar();
  }, [evaluacion, preguntas, abiertas, respuestas, info.tiempoMin, recargar, t.tiempoAgotado]);

  // Tiempo agotado: se envía solo.
  useEffect(() => {
    if (real && vista === 'quiz' && conTiempo && segundosRestantes === 0 && !enviando) void enviar(true);
  }, [real, vista, conTiempo, segundosRestantes, enviando, enviar]);

  function siguiente() {
    if (qIndex === preguntas.length - 1) {
      if (!real) {
        setVista('resultado');
        return;
      }
      const sinResponder = preguntas.filter((p, i) => (p.tipo === 'abierta' ? !abiertas[i]?.trim() : respuestas[i] === undefined)).length;
      if (sinResponder > 0 && aviso !== t.sinResponder(sinResponder)) {
        // Primer clic: avisa; el segundo envía.
        setAviso(t.sinResponder(sinResponder));
        return;
      }
      void enviar();
      return;
    }
    setQIndex((q) => Math.min(preguntas.length - 1, q + 1));
  }

  function anterior() {
    setQIndex((q) => Math.max(0, q - 1));
  }

  // Pantallas de estado (solo con datos reales).
  if (real && (!evaluacionId || errorCarga)) {
    return (
      <div className="grid min-h-screen place-items-center bg-brand-50/40 p-6">
        <div className="max-w-sm rounded-3xl border border-brand-100 bg-white p-6 text-center shadow-soft">
          <p className="mb-4 text-sm text-ink/70">{errorCarga ?? t.elige}</p>
          <Link to="/aula-virtual" className="inline-block rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white">{t.irAula}</Link>
        </div>
      </div>
    );
  }
  if (real && !evaluacion) {
    return <div className="grid min-h-screen place-items-center bg-brand-50/40 text-sm text-ink/50">{t.cargando}</div>;
  }

  const mm = String(Math.floor(segundosRestantes / 60)).padStart(2, '0');
  const ss = String(segundosRestantes % 60).padStart(2, '0');
  const pregunta = preguntas[qIndex];
  const circ = 2 * Math.PI * 16;
  const puedeIniciar = !real || (!evaluacion?.bloqueado && intentosRestantes > 0 && preguntas.length > 0);
  const hayAbiertas = preguntasBase.some((p) => p.tipo === 'abierta');

  const chipResultado = resultado.pendiente
    ? { cls: 'bg-brand-50 text-brand-700', Icon: HelpCircle, label: t.enRevision, color: '#6366f1' }
    : resultado.aprobado
      ? { cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2, label: t.aprobado, color: '#059669' }
      : { cls: 'bg-rose-50 text-rose-600', Icon: XCircle, label: t.noAprobado, color: '#e11d48' };

  return (
    <div className="min-h-screen bg-brand-50/40">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link to={volverClase} className="shrink-0 text-ink/50 hover:text-ink" aria-label={t.back}>
            <ArrowLeft size={18} />
          </Link>
          <Link to="/" className="hidden shrink-0 items-center sm:flex">
            <img src={logo} alt="Psique Amor" className="h-7 w-auto" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{t.tituloHeader} {info.modulo}</p>
            <p className="truncate text-xs text-ink/45">{info.curso[language]}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {vista === 'quiz' && conTiempo && (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                <Clock size={14} /> {mm}:{ss}
              </div>
            )}
            <div className="flex items-center rounded-full border border-brand-100 overflow-hidden text-xs font-bold">
              <button onClick={() => setLanguage('es')} className={`px-2.5 py-1.5 ${language === 'es' ? 'bg-brand-gradient text-white' : 'text-ink/45'}`}>ES</button>
              <button onClick={() => setLanguage('en')} className={`px-2.5 py-1.5 ${language === 'en' ? 'bg-brand-gradient text-white' : 'text-ink/45'}`}>EN</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* ===== INTRO ===== */}
        {vista === 'intro' && (
          <div className="rounded-3xl border border-brand-100 bg-white p-6 text-center shadow-soft sm:p-8">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-3xl text-brand-600">📝</div>
            <h1 className="font-display text-2xl font-semibold text-ink">{real ? evaluacion?.titulo : `${t.tituloIntro} ${info.modulo}`}</h1>
            <p className="mb-6 text-sm text-ink/50">{info.tituloModulo[language]}</p>

            <div className="mb-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div className="rounded-2xl bg-brand-50/60 p-3">
                <p className="font-display text-lg font-semibold text-ink">{info.preguntasTotal || '—'}</p>
                <p className="text-xs text-ink/45">{t.preguntas}</p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-3">
                <p className="font-display text-lg font-semibold text-ink">{info.tiempoMin ? `${info.tiempoMin}:00` : '∞'}</p>
                <p className="text-xs text-ink/45">{t.tiempo}</p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-3">
                <p className="font-display text-lg font-semibold text-ink">{info.notaAprobar}%</p>
                <p className="text-xs text-ink/45">{t.paraAprobar}</p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-3">
                <p className="font-display text-lg font-semibold text-ink">{info.intentosUsados}/{sinLimiteIntentos ? '∞' : info.intentosMax}</p>
                <p className="text-xs text-ink/45">{t.intentos}</p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl bg-brand-50/60 p-4 text-left text-sm text-ink/70">
              <p className="mb-2 font-medium text-ink">{t.instrucciones}</p>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span className="text-brand-500">•</span>{info.tiempoMin ? t.instr1(info.tiempoMin) : t.instr1SinLimite}</li>
                {!sinLimiteIntentos && <li className="flex gap-2"><span className="text-brand-500">•</span>{t.instr2(info.intentosMax)}</li>}
                <li className="flex gap-2"><span className="text-brand-500">•</span>
                  {!real || evaluacion?.desbloqueaSiguiente ? t.instr3(info.notaAprobar) : t.instr3Aprobar(info.notaAprobar)}
                </li>
                {real && hayAbiertas && <li className="flex gap-2"><span className="text-brand-500">•</span>{t.instrAbiertas}</li>}
              </ul>
            </div>

            {real && evaluacion?.bloqueado && (
              <p className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700"><Lock size={15} /> {t.bloqueada}</p>
            )}
            {real && !evaluacion?.bloqueado && intentosRestantes === 0 && (
              <p className="mb-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-ink/60">{t.agotados}</p>
            )}
            <button
              onClick={iniciar}
              disabled={!puedeIniciar}
              className="w-full rounded-full bg-brand-gradient py-3 text-sm font-semibold text-white shadow-soft hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.comenzar}
            </button>
            <button onClick={() => setVista('historial')} className="mt-4 text-sm font-semibold text-brand-600 hover:underline">
              {t.verHistorial}
            </button>
          </div>
        )}

        {/* ===== QUIZ ===== */}
        {vista === 'quiz' && pregunta && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-ink/50">{t.question} <span className="font-semibold text-ink">{qIndex + 1}</span>/{preguntas.length}</p>
              <div className="h-1.5 w-40 rounded-full bg-brand-100">
                <div className="h-1.5 rounded-full bg-brand-gradient" style={{ width: `${((qIndex + 1) / preguntas.length) * 100}%` }} />
              </div>
            </div>

            <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeCls[pregunta.tipo]}`}>{pregunta.etiqueta[language]}</span>
              <h2 className="mt-3 mb-4 font-display text-lg font-semibold text-ink">{pregunta.enunciado[language]}</h2>

              {pregunta.tipo === 'vf' && (
                <div className="grid grid-cols-2 gap-3">
                  {pregunta.opciones.map((op, i) => (
                    <button
                      key={i}
                      onClick={() => seleccionar(i)}
                      className={`flex items-center justify-center gap-2 rounded-2xl border py-4 text-sm font-medium transition ${
                        respuestas[qIndex] === i ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-brand-100 bg-white text-ink hover:border-brand-200'
                      }`}
                    >
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${respuestas[qIndex] === i ? 'border-brand-500' : 'border-brand-200'}`}>
                        {respuestas[qIndex] === i && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                      </span>
                      {op.texto[language]}
                    </button>
                  ))}
                </div>
              )}

              {pregunta.tipo === 'opcion' && (
                <div className="space-y-2">
                  {pregunta.opciones.map((op, i) => (
                    <button
                      key={i}
                      onClick={() => seleccionar(i)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        respuestas[qIndex] === i ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-brand-100 bg-white text-ink hover:border-brand-200'
                      }`}
                    >
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${respuestas[qIndex] === i ? 'border-brand-500' : 'border-brand-200'}`}>
                        {respuestas[qIndex] === i && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                      </span>
                      {op.texto[language]}
                    </button>
                  ))}
                </div>
              )}

              {pregunta.tipo === 'abierta' && (
                <div>
                  {pregunta.ayuda && <p className="mb-3 text-xs text-ink/45">{pregunta.ayuda[language]}</p>}
                  <textarea
                    rows={5}
                    value={abiertas[qIndex] ?? ''}
                    maxLength={4000}
                    onChange={(e) => setAbiertas((a) => ({ ...a, [qIndex]: e.target.value }))}
                    placeholder={t.respuestaPlaceholder}
                    className="focus-ring w-full rounded-2xl border border-brand-200 p-4 text-sm text-ink"
                  />
                </div>
              )}
            </div>

            {aviso && <p role="alert" className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{aviso}</p>}

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={anterior}
                className={`inline-flex items-center gap-2 rounded-full border border-brand-200 px-6 py-2.5 text-sm font-semibold text-ink/60 hover:bg-brand-50 ${qIndex === 0 ? 'invisible' : ''}`}
              >
                <ChevronLeft size={16} /> {t.anterior}
              </button>
              <button
                onClick={siguiente}
                disabled={enviando}
                className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-8 py-3 text-sm font-semibold text-white shadow-soft hover:opacity-90 disabled:opacity-60"
              >
                {qIndex === preguntas.length - 1 ? (enviando ? t.enviando : t.enviar) : t.siguiente} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ===== RESULTADO ===== */}
        {vista === 'resultado' && (
          <div className="rounded-3xl border border-brand-100 bg-white p-6 text-center shadow-soft sm:p-8">
            {aviso && <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{aviso}</p>}
            <div className="relative mx-auto mb-4 h-24 w-24">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(23,50,75,.08)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="16" fill="none" stroke={chipResultado.color} strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={circ - (circ * (resultado.porcentaje ?? 0)) / 100}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-display text-2xl font-semibold text-ink">{resultado.porcentaje === null ? '—' : `${resultado.porcentaje}%`}</span>
              </div>
            </div>
            <span className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${chipResultado.cls}`}>
              <chipResultado.Icon size={15} /> {chipResultado.label}
            </span>
            <h1 className="font-display text-2xl font-semibold text-ink">{t.obtuviste(resultado.correctas, resultado.total)}</h1>
            <p className="mb-6 text-sm text-ink/50">{t.infoIntento(resultado.intentoActual, resultado.intentosMax, resultado.minutosUsados)}</p>

            {resultado.desbloquea && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm text-ink">
                <Unlock size={22} className="shrink-0 text-emerald-600" />
                <p><b>{t.desbloqueado}</b> {t.desbloqueadoDetalle}</p>
              </div>
            )}
            {resultado.pendiente && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-left text-sm text-ink">
                <HelpCircle size={22} className="shrink-0 text-brand-600" />
                <p>{t.pendienteDetalle}</p>
              </div>
            )}

            {resultado.feedback.length > 0 && (
              <div className="mb-6 space-y-2 text-left">
                <p className="mb-1 text-sm font-medium text-ink">{t.retroalimentacion}</p>
                {resultado.feedback.map((f, i) => {
                  const Icon = feedbackIcon[f.estado];
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-2xl bg-brand-50/60 p-3">
                      <Icon size={16} className={`mt-0.5 shrink-0 ${feedbackColor[f.estado]}`} />
                      <div>
                        <p className="text-sm text-ink">{f.pregunta[language]}</p>
                        <p className="text-xs text-ink/45">{f.detalle[language]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to={volverClase} className="flex-1 rounded-full bg-brand-gradient py-3 text-center text-sm font-semibold text-white shadow-soft hover:opacity-90">
                {t.continuarClase}
              </Link>
              <button onClick={() => setVista('historial')} className="flex-1 rounded-full border border-brand-200 py-3 text-sm font-semibold text-ink hover:bg-brand-50">
                {t.verHistorialBtn}
              </button>
            </div>
            {intentosRestantes > 0 && !sinLimiteIntentos && <p className="mt-4 text-xs text-ink/45">{t.intentosRestantes(intentosRestantes)}</p>}
          </div>
        )}

        {/* ===== HISTORIAL ===== */}
        {vista === 'historial' && (
          <div>
            <button onClick={() => setVista('intro')} className="mb-4 flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
              <ArrowLeft size={15} /> {t.volverHist}
            </button>
            <h1 className="font-display text-2xl font-semibold text-ink">{t.historialTitle}</h1>
            <p className="mb-6 text-sm text-ink/50">{real ? evaluacion?.titulo : `${t.tituloIntro} ${info.modulo}`} · {info.curso[language]}</p>

            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center shadow-soft">
                <p className="font-display text-2xl font-semibold text-ink">{mejor === null ? '—' : `${mejor}%`}</p>
                <p className="text-xs text-ink/45">{t.mejorPuntaje}</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center shadow-soft">
                <p className="font-display text-2xl font-semibold text-ink">{info.intentosUsados}/{sinLimiteIntentos ? '∞' : info.intentosMax}</p>
                <p className="text-xs text-ink/45">{t.intentosUsados}</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center shadow-soft">
                <p className={`font-display text-2xl font-semibold ${estadoGeneral === 'aprobado' ? 'text-emerald-600' : estadoGeneral === 'reprobado' ? 'text-rose-600' : 'text-brand-600'}`}>
                  {estadoGeneral === 'aprobado' ? t.chipAprobado : estadoGeneral === 'reprobado' ? t.chipReprobado : estadoGeneral === 'pendiente' ? t.chipPendiente : t.sinIntentos}
                </p>
                <p className="text-xs text-ink/45">{t.estado}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white">
              <div className="hidden grid-cols-12 gap-2 border-b border-brand-100 px-5 py-3 text-xs text-ink/45 sm:grid">
                <span className="col-span-2">{t.colIntento}</span>
                <span className="col-span-3">{t.colFecha}</span>
                <span className="col-span-2">{t.colPuntaje}</span>
                <span className="col-span-3">{t.estado}</span>
                <span className="col-span-2 text-right" />
              </div>
              <div className="divide-y divide-brand-50 text-sm">
                {historial.map((h) => (
                  <div key={h.numero} className="grid items-center gap-2 px-5 py-4 sm:grid-cols-12">
                    <span className="col-span-2 font-medium text-ink">#{h.numero}</span>
                    <span className="col-span-3 text-ink/50">{h.fecha[language]}</span>
                    <span className="col-span-2 font-semibold text-ink">{h.puntaje === null ? '—' : `${h.puntaje}%`}</span>
                    <span className="col-span-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        h.estado === 'aprobado' ? 'bg-emerald-50 text-emerald-700' : h.estado === 'pendiente' ? 'bg-brand-50 text-brand-700' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {h.estado === 'aprobado' ? t.chipAprobado : h.estado === 'pendiente' ? t.chipPendiente : t.chipReprobado}
                      </span>
                    </span>
                    <span className="col-span-2 text-right">
                      {/* El detalle por intento solo existe en la demo. */}
                      {!real && (
                        <button onClick={() => setVista('resultado')} className="text-xs font-semibold text-brand-600 hover:underline">
                          {t.verDetalle}
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {intentosRestantes > 0 && puedeIniciar && (
              <div className="mt-6 text-center">
                <button onClick={iniciar} className="rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-soft hover:opacity-90">
                  {sinLimiteIntentos ? t.comenzar : t.reintentar(intentosRestantes)}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
