import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { AULA_NAV_LABELS, buildAulaVirtualNav } from '@/components/site/aulaVirtualNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useMisCursosAula, calcularRacha, haceCuanto } from '@/hooks/useMisCursosAula';
import { cargarActividadReciente } from '@/lib/api/cursosEstudiante';
import { ACTIVIDAD_CURSOS, RACHA_DIAS } from '@/data/progressData';

const text = {
  es: {
    volverPortal: 'Volver al portal',
    titulo: 'Tu progreso', subtitulo: "Cómo vas avanzando en todos tus cursos.",
    progresoGeneral: 'Progreso general',
    resumen: (pct: number, n: number) => `Vas en ${pct}% de promedio en ${n} curso(s). ¡Sigue así!`,
    promedio: 'Promedio',
    cursosActivos: 'Cursos activos', clasesCompletadas: 'Clases completadas', cursosCompletos: 'Cursos al 100%', rachaActiva: 'Racha activa',
    dias: 'días', dia: 'día',
    cursoPorCurso: 'Curso por curso',
    clase: 'Clase', ultimaActividad: 'última actividad',
    continuar: 'Continuar', completado: 'Completado',
    cargando: 'Cargando tu progreso…', sinCursos: 'Aún no estás inscrito en ningún curso.', verCatalogo: 'Ver catálogo',
  },
  en: {
    volverPortal: 'Back to portal',
    titulo: 'Your progress', subtitulo: "How you're advancing across all your courses.",
    progresoGeneral: 'Overall progress',
    resumen: (pct: number, n: number) => `You're at ${pct}% average across ${n} course(s). Keep going!`,
    promedio: 'Average',
    cursosActivos: 'Active courses', clasesCompletadas: 'Lessons done', cursosCompletos: 'Courses at 100%', rachaActiva: 'Active streak',
    dias: 'days', dia: 'day',
    cursoPorCurso: 'Course by course',
    clase: 'Lesson', ultimaActividad: 'last activity',
    continuar: 'Continue', completado: 'Completed',
    cargando: 'Loading your progress…', sinCursos: 'You are not enrolled in any course yet.', verCatalogo: 'Browse courses',
  },
} as const;

export default function ProgressPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const navItems = buildAulaVirtualNav(AULA_NAV_LABELS[language], ['progreso']);

  const { real, cursos: cursosCargados } = useMisCursosAula();
  const cursos = cursosCargados ?? [];
  const [racha, setRacha] = useState(real ? 0 : RACHA_DIAS);
  useEffect(() => {
    if (real) void cargarActividadReciente().then((res) => { if (!res.error) setRacha(calcularRacha(res.data)); });
  }, [real]);

  const progresoPromedio = cursos.length ? Math.round(cursos.reduce((acc, c) => acc + c.progreso, 0) / cursos.length) : 0;
  const clasesCompletadas = cursos.reduce((acc, c) => acc + c.leccionActual, 0);
  const cursosCompletos = cursos.filter((c) => c.completado).length;
  const circ = 2 * Math.PI * 16;

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="progreso"
      onNavigate={() => {}}
      roleBadge={{ es: 'Aula Virtual', en: 'Classroom' }}
      backTo="/aula-virtual"
      backLabel={{ es: text.es.volverPortal, en: text.en.volverPortal }}
    >
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.titulo}</h1>
        <p className="text-sm text-ink/50">{t.subtitulo}</p>
      </div>

      <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-brand-gradient p-6 shadow-soft sm:flex-row sm:p-8">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">{t.progresoGeneral}</h2>
          <p className="mt-1 text-sm text-white/85">{t.resumen(progresoPromedio, cursos.length)}</p>
        </div>
        <div className="shrink-0 text-center">
          <div className="relative h-24 w-24">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="16" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ - (circ * progresoPromedio) / 100}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display text-2xl font-semibold text-white">{progresoPromedio}%</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-white/85">{t.promedio}</p>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
          <p className="text-xs text-ink/50">{t.cursosActivos}</p>
          <p className="font-display text-2xl font-semibold text-ink">{cursos.length}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
          <p className="text-xs text-ink/50">{t.clasesCompletadas}</p>
          <p className="font-display text-2xl font-semibold text-ink">{clasesCompletadas}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
          <p className="text-xs text-ink/50">{t.cursosCompletos}</p>
          <p className="font-display text-2xl font-semibold text-emerald-600">{cursosCompletos}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
          <p className="text-xs text-ink/50">{t.rachaActiva}</p>
          <p className="font-display text-2xl font-semibold text-brand-600">{racha} <span className="text-sm font-normal text-ink/45">{racha === 1 ? t.dia : t.dias}</span></p>
        </div>
      </section>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t.cursoPorCurso}</h2>
        {real && cursosCargados === null && <p className="text-sm text-ink/45">{t.cargando}</p>}
        {real && cursosCargados?.length === 0 && (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white p-6 text-center text-sm text-ink/55">
            <p className="mb-3">{t.sinCursos}</p>
            <Link to="/cursos" className="inline-block rounded-full bg-brand-gradient px-5 py-2 text-xs font-semibold text-white">{t.verCatalogo}</Link>
          </div>
        )}
        <div className="space-y-4">
          {cursos.map((c) => {
            const actividad = real
              ? (c.ultimaActividad ? { ultimaActividad: { es: haceCuanto(c.ultimaActividad, 'es'), en: haceCuanto(c.ultimaActividad, 'en') } } : undefined)
              : ACTIVIDAD_CURSOS.find((a) => a.key === c.key);
            return (
              <div key={c.key} className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">{c.title[language]}</h3>
                    <span className="text-sm font-semibold text-ink">{c.progreso}%</span>
                  </div>
                  <p className="mb-2 text-xs text-ink/45">
                    {c.instructor} · {t.clase} {c.leccionActual}/{c.totalLecciones}
                    {actividad && ` · ${t.ultimaActividad} ${actividad.ultimaActividad[language]}`}
                  </p>
                  <div className="h-1.5 rounded-full bg-brand-50">
                    <div className={`h-1.5 rounded-full ${c.completado ? 'bg-emerald-500' : 'bg-brand-gradient'}`} style={{ width: `${c.progreso}%` }} />
                  </div>
                </div>
                {c.completado ? (
                  <span className="shrink-0 rounded-full border border-emerald-200 px-4 py-2 text-center text-xs font-semibold text-emerald-700">
                    <Check size={13} className="mr-1 inline -mt-0.5" />{t.completado}
                  </span>
                ) : (
                  <Link to={real ? `/aula-virtual/clase?curso=${c.key}` : '/aula-virtual/clase'} className="shrink-0 rounded-full bg-brand-gradient px-5 py-2.5 text-center text-xs font-semibold text-white hover:opacity-90">
                    {t.continuar} →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PortalLayout>
  );
}
