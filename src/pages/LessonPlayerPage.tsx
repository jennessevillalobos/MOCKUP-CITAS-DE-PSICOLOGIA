import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Play, Check, ChevronLeft, ChevronRight, FileText, Headphones,
  ClipboardList, Download, Lock, Menu, X,
} from 'lucide-react';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { LECCION_ACTUAL, CONTENIDO_CLASE, MATERIALES_CLASE, TEMARIO } from '@/data/lessonPlayerData';

const logo = '/src/assets/logos/1_(1).png';

type TabKey = 'contenido' | 'materiales' | 'notas';

const text = {
  es: {
    back: 'Volver a mis cursos', contents: 'Temario',
    markComplete: 'Marcar como completada', completed: 'Completada',
    previous: 'Anterior', next: 'Siguiente clase',
    tabContenido: 'Contenido', tabMateriales: 'Materiales', tabNotas: 'Mis notas',
    keyPoints: 'Puntos clave', tip: 'Tip:',
    notesPlaceholder: 'Escribe tus notas de esta clase…', saveNote: 'Guardar nota', noteSaved: 'Nota guardada ✓',
    courseContent: 'Contenido del curso', modules: 'módulos', lessons: 'clases',
    close: 'Cerrar',
  },
  en: {
    back: 'Back to my courses', contents: 'Contents',
    markComplete: 'Mark as complete', completed: 'Completed',
    previous: 'Previous', next: 'Next lesson',
    tabContenido: 'Content', tabMateriales: 'Materials', tabNotas: 'My notes',
    keyPoints: 'Key points', tip: 'Tip:',
    notesPlaceholder: "Write your notes for this lesson…", saveNote: 'Save note', noteSaved: 'Note saved ✓',
    courseContent: 'Course content', modules: 'modules', lessons: 'lessons',
    close: 'Close',
  },
} as const;

const materialIcon = { pdf: FileText, audio: Headphones, doc: ClipboardList } as const;

export default function LessonPlayerPage() {
  const { language, setLanguage } = useSiteLanguage();
  const t = text[language];

  const [tab, setTab] = useState<TabKey>('contenido');
  const [completada, setCompletada] = useState(false);
  const [nota, setNota] = useState('');
  const [notaGuardada, setNotaGuardada] = useState(false);
  const [temarioAbierto, setTemarioAbierto] = useState(false);

  const totalLecciones = TEMARIO.reduce((acc, m) => acc + m.lecciones.length, 0);

  function guardarNota() {
    setNotaGuardada(true);
    window.setTimeout(() => setNotaGuardada(false), 2000);
  }

  const Temario = (
    <>
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-ink">{t.courseContent}</h2>
        <p className="text-xs text-ink/45">{TEMARIO.length} {t.modules} · {totalLecciones} {t.lessons} · {LECCION_ACTUAL.progresoCurso}%</p>
      </div>
      <div className="space-y-2">
        {TEMARIO.map((modulo, i) => (
          <details key={i} open={modulo.estado === 'en-curso'} className="rounded-2xl border border-brand-100 bg-white px-3 shadow-soft">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-3 text-sm font-medium text-ink">
              <span className="flex items-center gap-1.5">
                {modulo.estado === 'completado' && <Check size={14} className="text-emerald-600" />}
                {modulo.estado === 'bloqueado' && <Lock size={13} className="text-ink/35" />}
                {modulo.titulo[language]}
              </span>
              <span className="shrink-0 text-xs text-ink/40">
                {modulo.lecciones.filter((l) => l.estado === 'completada').length}/{modulo.lecciones.length}
              </span>
            </summary>
            <div className="space-y-1 pb-3 pl-1">
              {modulo.lecciones.map((leccion, j) => (
                <div
                  key={j}
                  className={`flex items-center gap-2 rounded-xl px-2 py-2 text-xs ${
                    leccion.estado === 'actual' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink/55'
                  }`}
                >
                  {leccion.estado === 'completada' && <Check size={13} className="shrink-0 text-emerald-600" />}
                  {leccion.estado === 'actual' && <Play size={12} className="shrink-0 text-brand-600" />}
                  {leccion.estado === 'bloqueada' && <Lock size={12} className="shrink-0 text-ink/30" />}
                  <span className="flex-1 truncate">{leccion.titulo[language]}</span>
                  {leccion.duracion && <span className="shrink-0 text-ink/40">{leccion.duracion}</span>}
                </div>
              ))}
            </div>
            {modulo.avisoDesbloqueo && (
              <p className="mb-3 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700">{modulo.avisoDesbloqueo[language]}</p>
            )}
          </details>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-brand-50/40">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link to="/aula-virtual" className="shrink-0 text-ink/50 hover:text-ink" aria-label={t.back}>
            <ArrowLeft size={18} />
          </Link>
          <Link to="/" className="hidden shrink-0 items-center sm:flex">
            <img src={logo} alt="Psique Amor" className="h-7 w-auto" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{LECCION_ACTUAL.curso[language]}</p>
            <p className="truncate text-xs text-ink/45">
              {language === 'es' ? `Módulo ${LECCION_ACTUAL.modulo} · Clase ${LECCION_ACTUAL.claseNumero}` : `Module ${LECCION_ACTUAL.modulo} · Lesson ${LECCION_ACTUAL.claseNumero}`}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 text-xs text-ink/45 sm:flex">
              <div className="h-1.5 w-24 rounded-full bg-brand-100">
                <div className="h-1.5 rounded-full bg-brand-gradient" style={{ width: `${LECCION_ACTUAL.progresoCurso}%` }} />
              </div>
              {LECCION_ACTUAL.progresoCurso}%
            </div>
            <div className="flex items-center rounded-full border border-brand-100 overflow-hidden text-xs font-bold">
              <button onClick={() => setLanguage('es')} className={`px-2.5 py-1.5 ${language === 'es' ? 'bg-brand-gradient text-white' : 'text-ink/45'}`}>ES</button>
              <button onClick={() => setLanguage('en')} className={`px-2.5 py-1.5 ${language === 'en' ? 'bg-brand-gradient text-white' : 'text-ink/45'}`}>EN</button>
            </div>
            <button
              onClick={() => setTemarioAbierto(true)}
              className="flex items-center gap-1.5 rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 xl:hidden"
            >
              <Menu size={14} /> {t.contents}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] flex-col xl:flex-row">
        {/* Main */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {/* Video */}
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-brand-100 bg-ink shadow-soft">
            <img src={LECCION_ACTUAL.thumbnail} alt={LECCION_ACTUAL.titulo[language]} className="absolute inset-0 h-full w-full object-cover opacity-70" />
            <button className="absolute inset-0 grid place-items-center" aria-label="Play">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-brand-700 shadow-2xl transition hover:scale-105">
                <Play size={32} className="ml-1" fill="currentColor" />
              </span>
            </button>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <div className="mb-2 h-1 rounded-full bg-white/25"><div className="h-1 w-1/3 rounded-full bg-white" /></div>
              <div className="flex items-center justify-between text-xs text-white">
                <span>04:12 / {LECCION_ACTUAL.duracion}</span>
                <span>1.0x</span>
              </div>
            </div>
          </div>

          {/* Título + acción */}
          <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">{LECCION_ACTUAL.titulo[language]}</h1>
              <p className="text-sm text-ink/50">{LECCION_ACTUAL.instructor} · {LECCION_ACTUAL.duracion} min</p>
            </div>
            <button
              onClick={() => setCompletada(true)}
              disabled={completada}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-soft transition ${
                completada ? 'border border-emerald-300 bg-emerald-50 text-emerald-700' : 'bg-brand-gradient text-white hover:opacity-90'
              }`}
            >
              <Check size={16} />
              {completada ? t.completed : t.markComplete}
            </button>
          </div>

          {/* Prev / Next */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button className="inline-flex flex-1 items-center gap-2 rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-ink/70 hover:bg-brand-50 sm:flex-none">
              <ChevronLeft size={16} /> {t.previous}
            </button>
            <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-ink/70 hover:bg-brand-50 sm:flex-none">
              {t.next} <ChevronRight size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-8 flex gap-6 overflow-x-auto border-b border-brand-100">
            {(['contenido', 'materiales', 'notas'] as TabKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-semibold transition ${
                  tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink/45 hover:text-ink/70'
                }`}
              >
                {k === 'contenido' ? t.tabContenido : k === 'materiales' ? t.tabMateriales : t.tabNotas}
              </button>
            ))}
          </div>

          {tab === 'contenido' && (
            <div className="mt-5 space-y-4 leading-relaxed text-ink/70">
              <p>{CONTENIDO_CLASE.intro[language]}</p>
              <h3 className="font-display font-semibold text-ink">{t.keyPoints}</h3>
              <ul className="space-y-1.5">
                {CONTENIDO_CLASE.puntosClave.map((p, i) => (
                  <li key={i} className="flex gap-2"><span className="text-brand-500">•</span>{p[language]}</li>
                ))}
              </ul>
              <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-ink/70">
                💡 <b>{t.tip}</b> {CONTENIDO_CLASE.tip[language]}
              </div>
            </div>
          )}

          {tab === 'materiales' && (
            <div className="mt-5 space-y-3">
              {MATERIALES_CLASE.map((m, i) => {
                const Icon = materialIcon[m.tipo];
                return (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{m.titulo[language]}</p>
                      <p className="text-xs text-ink/45">{m.detalle}</p>
                    </div>
                    <Download size={16} className="shrink-0 text-brand-600" />
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'notas' && (
            <div className="mt-5">
              <textarea
                rows={6}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder={t.notesPlaceholder}
                className="focus-ring w-full rounded-2xl border border-brand-200 p-4 text-sm text-ink"
              />
              <div className="mt-3 flex items-center gap-3">
                <button onClick={guardarNota} className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
                  {t.saveNote}
                </button>
                {notaGuardada && <span className="text-sm font-semibold text-emerald-600">{t.noteSaved}</span>}
              </div>
            </div>
          )}
        </main>

        {/* Aside temario — desktop */}
        <aside className="hidden w-80 shrink-0 border-l border-brand-100 p-4 sm:p-6 xl:block">
          {Temario}
        </aside>
      </div>

      {/* Aside temario — mobile drawer */}
      {temarioAbierto && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setTemarioAbierto(false)} aria-hidden="true" />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-brand-50/60 p-4 shadow-lift">
            <button onClick={() => setTemarioAbierto(false)} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink">
              <X size={16} /> {t.close}
            </button>
            {Temario}
          </div>
        </div>
      )}
    </div>
  );
}
