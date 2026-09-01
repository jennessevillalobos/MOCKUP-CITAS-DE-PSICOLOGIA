import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { AULA_NAV_LABELS, buildAulaVirtualNav } from '@/components/site/aulaVirtualNav';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { CALIFICACIONES } from '@/data/gradesData';

const text = {
  es: {
    clases: 'Clases', evaluaciones: 'Evaluaciones', calificaciones: 'Calificaciones', progreso: 'Progreso',
    pagosCuotas: 'Pagos y cuotas', videosComprados: 'Videos comprados', librosComprados: 'Libros comprados',
    clasesEnVivo: 'Clases en vivo', notificaciones: 'Notificaciones',
    misCalificaciones: 'Mis calificaciones', subtitulo: 'Resultados de tus evaluaciones y certificados obtenidos.',
    promedioGeneral: 'Promedio general', evaluacionesAprobadas: 'Evaluaciones aprobadas', certificadosObtenidos: 'Certificados obtenidos',
    todosCursos: 'Todos los cursos',
    colCurso: 'Curso', colEvaluacion: 'Evaluación', colNota: 'Nota', colEstado: 'Estado',
    chipAprobada: 'Aprobada', chipPendiente: 'Pendiente', chipReprobada: 'Reprobada',
    certificado: 'Certificado', sinRegistros: 'Aún no has completado ninguna evaluación.', irEvaluaciones: 'Ir a Evaluaciones',
    volverLista: 'Volver a calificaciones',
    certLabel: 'PsiqueAmor · Certificado de finalización', certSeCertifica: 'Se certifica que',
    certCompleto: 'completó satisfactoriamente la evaluación de', certCon: 'con una calificación de',
    certEmitido: 'Emitido el', certFooter: 'Certificado digital de la plataforma · no descargable en este mockup',
    volverPortal: 'Volver al portal',
  },
  en: {
    clases: 'Classes', evaluaciones: 'Assessments', calificaciones: 'Grades', progreso: 'Progress',
    pagosCuotas: 'Payments & installments', videosComprados: 'My videos', librosComprados: 'My books',
    clasesEnVivo: 'Live classes', notificaciones: 'Notifications',
    misCalificaciones: 'My grades', subtitulo: 'Your quiz results and certificates earned.',
    promedioGeneral: 'Overall average', evaluacionesAprobadas: 'Passed quizzes', certificadosObtenidos: 'Certificates earned',
    todosCursos: 'All courses',
    colCurso: 'Course', colEvaluacion: 'Quiz', colNota: 'Score', colEstado: 'Status',
    chipAprobada: 'Passed', chipPendiente: 'Pending', chipReprobada: 'Failed',
    certificado: 'Certificate', sinRegistros: "You haven't completed any quizzes yet.", irEvaluaciones: 'Go to Assessments',
    volverLista: 'Back to grades',
    certLabel: 'PsiqueAmor · Certificate of completion', certSeCertifica: 'This certifies that',
    certCompleto: 'successfully completed the assessment for', certCon: 'with a score of',
    certEmitido: 'Issued on', certFooter: 'Digital platform certificate · not downloadable in this mockup',
    volverPortal: 'Back to portal',
  },
} as const;

const chipCls: Record<string, string> = {
  aprobada: 'bg-emerald-50 text-emerald-700',
  pendiente: 'bg-amber-50 text-amber-700',
  reprobada: 'bg-rose-50 text-rose-600',
};

export default function GradesPage() {
  const { user } = useSiteAuth();
  const { language } = useSiteLanguage();
  const t = text[language];

  const [vista, setVista] = useState<'lista' | 'certificado'>('lista');
  const [certIndex, setCertIndex] = useState<number | null>(null);
  const [filtroCurso, setFiltroCurso] = useState('');

  const navItems = buildAulaVirtualNav(AULA_NAV_LABELS[language], ['calificaciones']);

  const cursos = useMemo(() => Array.from(new Set(CALIFICACIONES.map((c) => c.curso[language]))), [language]);
  const lista = filtroCurso ? CALIFICACIONES.filter((c) => c.curso[language] === filtroCurso) : CALIFICACIONES;

  const aprobadas = CALIFICACIONES.filter((c) => c.estado === 'aprobada');
  const promedio = aprobadas.length
    ? Math.round(aprobadas.reduce((acc, c) => acc + ((c.nota || 0) / c.notaMax) * 100, 0) / aprobadas.length)
    : null;
  const certificados = CALIFICACIONES.filter((c) => c.certificado).length;

  const cert = certIndex !== null ? CALIFICACIONES[certIndex] : null;
  const nombreEstudiante = (user?.nombre || '').trim() || (language === 'es' ? 'Estudiante' : 'Student');

  function verCertificado(index: number) {
    setCertIndex(index);
    setVista('certificado');
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="calificaciones"
      onNavigate={() => {}}
      roleBadge={{ es: 'Aula Virtual', en: 'Classroom' }}
      backTo="/aula-virtual"
      backLabel={{ es: text.es.volverPortal, en: text.en.volverPortal }}
    >
      {vista === 'lista' ? (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{t.misCalificaciones}</h1>
            <p className="text-sm text-ink/50">{t.subtitulo}</p>
          </div>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.promedioGeneral}</p>
              <p className="font-display text-2xl font-semibold text-ink">{promedio !== null ? `${promedio}%` : '—'}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.evaluacionesAprobadas}</p>
              <p className="font-display text-2xl font-semibold text-emerald-600">{aprobadas.length}/{CALIFICACIONES.length}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
              <p className="text-xs text-ink/50">{t.certificadosObtenidos}</p>
              <p className="font-display text-2xl font-semibold text-brand-600">{certificados}</p>
            </div>
          </section>

          <div className="flex items-center justify-between gap-3">
            <select
              value={filtroCurso}
              onChange={(e) => setFiltroCurso(e.target.value)}
              className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm text-ink focus:border-brand-400"
            >
              <option value="">{t.todosCursos}</option>
              {cursos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="hidden grid-cols-12 gap-2 border-b border-brand-100 px-5 py-3 text-xs text-ink/45 sm:grid">
              <span className="col-span-4">{t.colCurso}</span>
              <span className="col-span-3">{t.colEvaluacion}</span>
              <span className="col-span-2">{t.colNota}</span>
              <span className="col-span-2">{t.colEstado}</span>
              <span className="col-span-1 text-right" />
            </div>
            {lista.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink/45">
                {t.sinRegistros} <Link to="/aula-virtual/evaluacion" className="font-semibold text-brand-600 hover:underline">{t.irEvaluaciones}</Link>
              </div>
            ) : (
              <div className="divide-y divide-brand-50 text-sm">
                {lista.map((c) => {
                  const idxReal = CALIFICACIONES.indexOf(c);
                  const pct = c.nota !== null ? Math.round((c.nota / c.notaMax) * 100) : null;
                  return (
                    <div key={idxReal} className="grid items-center gap-2 px-5 py-4 sm:grid-cols-12">
                      <span className="col-span-4 text-ink">{c.curso[language]}</span>
                      <span className="col-span-3 text-ink/50">
                        {c.evaluacion[language]} {c.fecha && <span className="text-xs">· {c.fecha[language]}</span>}
                      </span>
                      <span className="col-span-2 font-semibold text-ink">
                        {c.nota !== null ? <>{c.nota}/{c.notaMax} <span className="font-normal text-ink/45">({pct}%)</span></> : '—'}
                      </span>
                      <span className="col-span-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${chipCls[c.estado]}`}>
                          {c.estado === 'aprobada' ? t.chipAprobada : c.estado === 'pendiente' ? t.chipPendiente : t.chipReprobada}
                        </span>
                      </span>
                      <span className="col-span-1 text-right">
                        {c.estado === 'aprobada' && (
                          <button onClick={() => verCertificado(idxReal)} className="text-xs font-semibold text-brand-600 hover:underline">
                            {t.certificado}
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        cert && (
          <div className="max-w-2xl">
            <button onClick={() => setVista('lista')} className="mb-4 flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
              <ArrowLeft size={15} /> {t.volverLista}
            </button>
            <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-white to-brand-50 p-10 text-center shadow-lift">
              <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.06]">
                <span className="rotate-[-12deg] font-display text-4xl font-semibold text-ink">PsiqueAmor</span>
              </div>
              <p className="mb-4 text-xs uppercase tracking-widest text-brand-600">{t.certLabel}</p>
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-2xl text-brand-600">🏆</div>
              <p className="mb-1 text-sm text-ink/70">{t.certSeCertifica}</p>
              <h1 className="mb-3 font-display text-3xl font-semibold text-ink">{nombreEstudiante}</h1>
              <p className="mb-1 text-sm text-ink/70">{t.certCompleto}</p>
              <h2 className="mb-4 font-display text-xl font-semibold text-ink">{cert.curso[language]} · {cert.evaluacion[language]}</h2>
              <p className="mb-6 text-sm text-ink/70">
                {t.certCon} <b>{cert.nota}/{cert.notaMax} ({Math.round(((cert.nota || 0) / cert.notaMax) * 100)}%)</b>
              </p>
              <p className="text-xs text-brand-600">{t.certEmitido} {cert.fecha ? cert.fecha[language] : '—'}</p>
            </div>
            <p className="mt-4 text-center text-xs text-ink/45">🛡️ {t.certFooter}</p>
          </div>
        )
      )}
    </PortalLayout>
  );
}
