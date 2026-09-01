import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, HelpCircle, Unlock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import {
  EVALUACION_INFO, PREGUNTAS, RESULTADO_DEMO, HISTORIAL_INTENTOS, type EstadoFeedback,
} from '@/data/assessmentData';

const logo = '/src/assets/logos/1_(1).png';

type Vista = 'intro' | 'quiz' | 'resultado' | 'historial';

const text = {
  es: {
    back: 'Volver a la clase',
    tituloHeader: 'Evaluación · Módulo', question: 'Pregunta',
    tituloIntro: 'Evaluación del Módulo', preguntas: 'Preguntas', tiempo: 'Tiempo', paraAprobar: 'Para aprobar', intentos: 'Intentos',
    instrucciones: 'Instrucciones',
    instr1: (min: number) => `Tienes ${min} minutos desde que inicias.`,
    instr2: (n: number) => `Puedes usar ${n} intentos; se guarda el mejor puntaje.`,
    instr3: (pct: number) => `Debes obtener ${pct}% para desbloquear el siguiente módulo.`,
    comenzar: 'Comenzar evaluación', verHistorial: 'Ver historial de intentos',
    anterior: 'Anterior', siguiente: 'Siguiente', enviar: 'Enviar evaluación',
    respuestaPlaceholder: 'Escribe tu respuesta…',
    aprobado: '¡Aprobado!', noAprobado: 'No aprobado',
    obtuviste: (c: number, t: number) => `Obtuviste ${c} de ${t} correctas`,
    infoIntento: (n: number, max: number, min: number) => `Intento ${n} de ${max} · ${min} min usados`,
    desbloqueado: '¡Siguiente módulo desbloqueado!',
    desbloqueadoDetalle: 'Ya puedes continuar con la próxima clase.',
    retroalimentacion: 'Retroalimentación',
    continuarClase: 'Continuar a la clase', verHistorialBtn: 'Ver historial',
    intentosRestantes: (n: number) => `Te queda${n === 1 ? '' : 'n'} ${n} intento${n === 1 ? '' : 's'} si deseas mejorar tu puntaje.`,
    volverHist: 'Volver', historialTitle: 'Historial de intentos',
    mejorPuntaje: 'Mejor puntaje', intentosUsados: 'Intentos usados', estado: 'Estado',
    colIntento: 'Intento', colFecha: 'Fecha', colPuntaje: 'Puntaje',
    verDetalle: 'Ver detalle',
    reintentar: (n: number) => `Reintentar (${n} intento${n === 1 ? '' : 's'} restante${n === 1 ? '' : 's'})`,
    chipAprobado: 'Aprobado', chipReprobado: 'Reprobado',
  },
  en: {
    back: 'Back to lesson',
    tituloHeader: 'Quiz · Module', question: 'Question',
    tituloIntro: 'Module quiz', preguntas: 'Questions', tiempo: 'Time', paraAprobar: 'To pass', intentos: 'Attempts',
    instrucciones: 'Instructions',
    instr1: (min: number) => `You have ${min} minutes once you start.`,
    instr2: (n: number) => `You get ${n} attempts; the best score is kept.`,
    instr3: (pct: number) => `You need ${pct}% to unlock the next module.`,
    comenzar: 'Start quiz', verHistorial: 'View attempt history',
    anterior: 'Previous', siguiente: 'Next', enviar: 'Submit quiz',
    respuestaPlaceholder: 'Write your answer…',
    aprobado: 'Passed!', noAprobado: 'Not passed',
    obtuviste: (c: number, t: number) => `You got ${c} of ${t} correct`,
    infoIntento: (n: number, max: number, min: number) => `Attempt ${n} of ${max} · ${min} min used`,
    desbloqueado: 'Next module unlocked!',
    desbloqueadoDetalle: "You can now continue with the next lesson.",
    retroalimentacion: 'Feedback',
    continuarClase: 'Continue to lesson', verHistorialBtn: 'View history',
    intentosRestantes: (n: number) => `You have ${n} attempt${n === 1 ? '' : 's'} left to improve your score.`,
    volverHist: 'Back', historialTitle: 'Attempt history',
    mejorPuntaje: 'Best score', intentosUsados: 'Attempts used', estado: 'Status',
    colIntento: 'Attempt', colFecha: 'Date', colPuntaje: 'Score',
    verDetalle: 'Details',
    reintentar: (n: number) => `Retry (${n} attempt${n === 1 ? '' : 's'} left)`,
    chipAprobado: 'Passed', chipReprobado: 'Failed',
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

export default function AssessmentPage() {
  const { language, setLanguage } = useSiteLanguage();
  const t = text[language];

  const [vista, setVista] = useState<Vista>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [segundosRestantes, setSegundosRestantes] = useState(EVALUACION_INFO.tiempoMin * 60);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (vista !== 'quiz') {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setSegundosRestantes((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [vista]);

  function iniciar() {
    setQIndex(0);
    setRespuestas({});
    setSegundosRestantes(EVALUACION_INFO.tiempoMin * 60);
    setVista('quiz');
  }

  function seleccionar(i: number) {
    setRespuestas((r) => ({ ...r, [qIndex]: i }));
  }

  function siguiente() {
    if (qIndex === PREGUNTAS.length - 1) {
      setVista('resultado');
      return;
    }
    setQIndex((q) => Math.min(PREGUNTAS.length - 1, q + 1));
  }

  function anterior() {
    setQIndex((q) => Math.max(0, q - 1));
  }

  const mm = String(Math.floor(segundosRestantes / 60)).padStart(2, '0');
  const ss = String(segundosRestantes % 60).padStart(2, '0');
  const pregunta = PREGUNTAS[qIndex];
  const circ = 2 * Math.PI * 16;
  const intentosRestantes = RESULTADO_DEMO.intentosMax - RESULTADO_DEMO.intentoActual;

  return (
    <div className="min-h-screen bg-brand-50/40">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link to="/aula-virtual/clase" className="shrink-0 text-ink/50 hover:text-ink" aria-label={t.back}>
            <ArrowLeft size={18} />
          </Link>
          <Link to="/" className="hidden shrink-0 items-center sm:flex">
            <img src={logo} alt="Psique Amor" className="h-7 w-auto" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{t.tituloHeader} {EVALUACION_INFO.modulo}</p>
            <p className="truncate text-xs text-ink/45">{EVALUACION_INFO.curso[language]}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {vista === 'quiz' && (
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
            <h1 className="font-display text-2xl font-semibold text-ink">{t.tituloIntro} {EVALUACION_INFO.modulo}</h1>
            <p className="mb-6 text-sm text-ink/50">{EVALUACION_INFO.tituloModulo[language]}</p>

            <div className="mb-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div className="rounded-2xl bg-brand-50/60 p-3">
                <p className="font-display text-lg font-semibold text-ink">{EVALUACION_INFO.preguntasTotal}</p>
                <p className="text-xs text-ink/45">{t.preguntas}</p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-3">
                <p className="font-display text-lg font-semibold text-ink">{EVALUACION_INFO.tiempoMin}:00</p>
                <p className="text-xs text-ink/45">{t.tiempo}</p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-3">
                <p className="font-display text-lg font-semibold text-ink">{EVALUACION_INFO.notaAprobar}%</p>
                <p className="text-xs text-ink/45">{t.paraAprobar}</p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-3">
                <p className="font-display text-lg font-semibold text-ink">{EVALUACION_INFO.intentosUsados}/{EVALUACION_INFO.intentosMax}</p>
                <p className="text-xs text-ink/45">{t.intentos}</p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl bg-brand-50/60 p-4 text-left text-sm text-ink/70">
              <p className="mb-2 font-medium text-ink">{t.instrucciones}</p>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span className="text-brand-500">•</span>{t.instr1(EVALUACION_INFO.tiempoMin)}</li>
                <li className="flex gap-2"><span className="text-brand-500">•</span>{t.instr2(EVALUACION_INFO.intentosMax)}</li>
                <li className="flex gap-2"><span className="text-brand-500">•</span>{t.instr3(EVALUACION_INFO.notaAprobar)}</li>
              </ul>
            </div>

            <button onClick={iniciar} className="w-full rounded-full bg-brand-gradient py-3 text-sm font-semibold text-white shadow-soft hover:opacity-90">
              {t.comenzar}
            </button>
            <button onClick={() => setVista('historial')} className="mt-4 text-sm font-semibold text-brand-600 hover:underline">
              {t.verHistorial}
            </button>
          </div>
        )}

        {/* ===== QUIZ ===== */}
        {vista === 'quiz' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-ink/50">{t.question} <span className="font-semibold text-ink">{qIndex + 1}</span>/{PREGUNTAS.length}</p>
              <div className="h-1.5 w-40 rounded-full bg-brand-100">
                <div className="h-1.5 rounded-full bg-brand-gradient" style={{ width: `${((qIndex + 1) / PREGUNTAS.length) * 100}%` }} />
              </div>
            </div>

            <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeCls[pregunta.tipo]}`}>{pregunta.etiqueta[language]}</span>
              <h2 className="mt-3 mb-4 font-display text-lg font-semibold text-ink">{pregunta.enunciado[language]}</h2>

              {pregunta.tipo === 'vf' && pregunta.opciones && (
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
                      {op[language]}
                    </button>
                  ))}
                </div>
              )}

              {pregunta.tipo === 'opcion' && pregunta.opciones && (
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
                      {op[language]}
                    </button>
                  ))}
                </div>
              )}

              {pregunta.tipo === 'abierta' && (
                <div>
                  {pregunta.ayuda && <p className="mb-3 text-xs text-ink/45">{pregunta.ayuda[language]}</p>}
                  <textarea
                    rows={5}
                    placeholder={t.respuestaPlaceholder}
                    className="focus-ring w-full rounded-2xl border border-brand-200 p-4 text-sm text-ink"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={anterior}
                className={`inline-flex items-center gap-2 rounded-full border border-brand-200 px-6 py-2.5 text-sm font-semibold text-ink/60 hover:bg-brand-50 ${qIndex === 0 ? 'invisible' : ''}`}
              >
                <ChevronLeft size={16} /> {t.anterior}
              </button>
              <button
                onClick={siguiente}
                className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-8 py-3 text-sm font-semibold text-white shadow-soft hover:opacity-90"
              >
                {qIndex === PREGUNTAS.length - 1 ? t.enviar : t.siguiente} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ===== RESULTADO ===== */}
        {vista === 'resultado' && (
          <div className="rounded-3xl border border-brand-100 bg-white p-6 text-center shadow-soft sm:p-8">
            <div className="relative mx-auto mb-4 h-24 w-24">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(23,50,75,.08)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="16" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={circ - (circ * RESULTADO_DEMO.porcentaje) / 100}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-display text-2xl font-semibold text-ink">{RESULTADO_DEMO.porcentaje}%</span>
              </div>
            </div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={15} /> {RESULTADO_DEMO.aprobado ? t.aprobado : t.noAprobado}
            </span>
            <h1 className="font-display text-2xl font-semibold text-ink">{t.obtuviste(RESULTADO_DEMO.correctas, RESULTADO_DEMO.total)}</h1>
            <p className="mb-6 text-sm text-ink/50">{t.infoIntento(RESULTADO_DEMO.intentoActual, RESULTADO_DEMO.intentosMax, RESULTADO_DEMO.minutosUsados)}</p>

            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm text-ink">
              <Unlock size={22} className="shrink-0 text-emerald-600" />
              <p><b>{t.desbloqueado}</b> {t.desbloqueadoDetalle}</p>
            </div>

            <div className="mb-6 space-y-2 text-left">
              <p className="mb-1 text-sm font-medium text-ink">{t.retroalimentacion}</p>
              {RESULTADO_DEMO.feedback.map((f, i) => {
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/aula-virtual/clase" className="flex-1 rounded-full bg-brand-gradient py-3 text-center text-sm font-semibold text-white shadow-soft hover:opacity-90">
                {t.continuarClase}
              </Link>
              <button onClick={() => setVista('historial')} className="flex-1 rounded-full border border-brand-200 py-3 text-sm font-semibold text-ink hover:bg-brand-50">
                {t.verHistorialBtn}
              </button>
            </div>
            {intentosRestantes > 0 && <p className="mt-4 text-xs text-ink/45">{t.intentosRestantes(intentosRestantes)}</p>}
          </div>
        )}

        {/* ===== HISTORIAL ===== */}
        {vista === 'historial' && (
          <div>
            <button onClick={() => setVista('intro')} className="mb-4 flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
              <ArrowLeft size={15} /> {t.volverHist}
            </button>
            <h1 className="font-display text-2xl font-semibold text-ink">{t.historialTitle}</h1>
            <p className="mb-6 text-sm text-ink/50">{t.tituloIntro} {EVALUACION_INFO.modulo} · {EVALUACION_INFO.curso[language]}</p>

            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center shadow-soft">
                <p className="font-display text-2xl font-semibold text-ink">{Math.max(...HISTORIAL_INTENTOS.map((h) => h.puntaje))}%</p>
                <p className="text-xs text-ink/45">{t.mejorPuntaje}</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center shadow-soft">
                <p className="font-display text-2xl font-semibold text-ink">{EVALUACION_INFO.intentosUsados}/{EVALUACION_INFO.intentosMax}</p>
                <p className="text-xs text-ink/45">{t.intentosUsados}</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center shadow-soft">
                <p className="font-display text-2xl font-semibold text-emerald-600">{t.chipAprobado}</p>
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
                {HISTORIAL_INTENTOS.map((h) => (
                  <div key={h.numero} className="grid items-center gap-2 px-5 py-4 sm:grid-cols-12">
                    <span className="col-span-2 font-medium text-ink">#{h.numero}</span>
                    <span className="col-span-3 text-ink/50">{h.fecha[language]}</span>
                    <span className="col-span-2 font-semibold text-ink">{h.puntaje}%</span>
                    <span className="col-span-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${h.estado === 'aprobado' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                        {h.estado === 'aprobado' ? t.chipAprobado : t.chipReprobado}
                      </span>
                    </span>
                    <span className="col-span-2 text-right">
                      <button onClick={() => setVista('resultado')} className="text-xs font-semibold text-brand-600 hover:underline">
                        {t.verDetalle}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {intentosRestantes > 0 && (
              <div className="mt-6 text-center">
                <button onClick={iniciar} className="rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-soft hover:opacity-90">
                  {t.reintentar(intentosRestantes)}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
