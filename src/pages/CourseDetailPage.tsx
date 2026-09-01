import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Clock3, Users, Star, Play, Check,
  BookOpen, ChevronRight, Lock,
} from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { CURSOS_PUBLICOS } from '@/data/coursesPageData';

// Extended module/syllabus data per course
const SYLLABI: Record<string, { title: { es: string; en: string }; lessons: number; free?: boolean }[]> = {
  'manejo-ansiedad': [
    { title: { es: 'Introducción: ¿qué es la ansiedad?', en: 'Introduction: What is anxiety?' }, lessons: 2, free: true },
    { title: { es: 'El ciclo de la ansiedad', en: 'The anxiety cycle' }, lessons: 2 },
    { title: { es: 'Técnicas de respiración y relajación', en: 'Breathing & relaxation techniques' }, lessons: 3 },
    { title: { es: 'Reestructuración cognitiva', en: 'Cognitive restructuring' }, lessons: 3 },
    { title: { es: 'Plan de mantenimiento', en: 'Maintenance plan' }, lessons: 2 },
  ],
  'inteligencia-emocional': [
    { title: { es: '¿Qué es la inteligencia emocional?', en: 'What is emotional intelligence?' }, lessons: 2, free: true },
    { title: { es: 'Autoconciencia emocional', en: 'Emotional self-awareness' }, lessons: 2 },
    { title: { es: 'Autogestión y regulación', en: 'Self-management & regulation' }, lessons: 2 },
    { title: { es: 'Empatía y habilidades sociales', en: 'Empathy & social skills' }, lessons: 2 },
  ],
  'comunicacion-pareja': [
    { title: { es: 'Bases de la comunicación efectiva', en: 'Foundations of effective communication' }, lessons: 2, free: true },
    { title: { es: 'Escucha activa', en: 'Active listening' }, lessons: 2 },
    { title: { es: 'Gestión de conflictos', en: 'Conflict management' }, lessons: 2 },
    { title: { es: 'Conversaciones difíciles', en: 'Difficult conversations' }, lessons: 2 },
  ],
};

const DEFAULT_SYLLABUS = [
  { title: { es: 'Módulo 1: Introducción', en: 'Module 1: Introduction' }, lessons: 2, free: true },
  { title: { es: 'Módulo 2: Conceptos clave', en: 'Module 2: Key concepts' }, lessons: 3 },
  { title: { es: 'Módulo 3: Práctica y herramientas', en: 'Module 3: Practice & tools' }, lessons: 3 },
  { title: { es: 'Módulo 4: Cierre y reflexión', en: 'Module 4: Wrap-up & reflection' }, lessons: 2 },
];

const WHAT_YOULL_LEARN: Record<string, { es: string; en: string }[]> = {
  'manejo-ansiedad': [
    { es: 'Entender los mecanismos de la ansiedad', en: 'Understand the mechanisms of anxiety' },
    { es: 'Aplicar técnicas de regulación inmediata', en: 'Apply immediate regulation techniques' },
    { es: 'Identificar y modificar pensamientos automáticos', en: 'Identify and modify automatic thoughts' },
    { es: 'Construir un plan personal de manejo de la ansiedad', en: 'Build a personal anxiety management plan' },
  ],
};
const DEFAULT_LEARN = [
  { es: 'Comprender los fundamentos teóricos del tema', en: 'Understand the theoretical foundations of the topic' },
  { es: 'Aplicar estrategias prácticas en tu día a día', en: 'Apply practical strategies in your daily life' },
  { es: 'Desarrollar herramientas de autogestión emocional', en: 'Develop emotional self-management tools' },
  { es: 'Obtener un certificado de finalización', en: 'Obtain a certificate of completion' },
];

const text = {
  es: {
    back: 'Volver a cursos', enroll: 'Inscribirme ahora', free: 'Gratis',
    whatYoullLearn: 'Lo que aprenderás', instructor: 'Instructor', duration: 'Duración',
    lessons: 'clases', modality: 'Modalidad', price: 'Precio',
    syllabus: 'Contenido del curso', freeLesson: 'Clase gratuita',
    locked: 'Requiere inscripción', relatedCourses: 'También te puede interesar',
    viewCourse: 'Ver curso', usd: 'USD', notFound: 'Curso no encontrado.',
    backHome: 'Ir al inicio', includes: 'Este curso incluye',
    certificate: 'Certificado al finalizar', lifetime: 'Acceso de por vida', mobile: 'Acceso desde móvil y PC',
  },
  en: {
    back: 'Back to courses', enroll: 'Enroll now', free: 'Free',
    whatYoullLearn: "What you'll learn", instructor: 'Instructor', duration: 'Duration',
    lessons: 'lessons', modality: 'Modality', price: 'Price',
    syllabus: 'Course content', freeLesson: 'Free lesson',
    locked: 'Requires enrollment', relatedCourses: 'You might also like',
    viewCourse: 'View course', usd: 'USD', notFound: 'Course not found.',
    backHome: 'Go to home', includes: 'This course includes',
    certificate: 'Certificate on completion', lifetime: 'Lifetime access', mobile: 'Access on mobile & PC',
  },
} as const;

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useSiteLanguage();
  const t = text[language];

  const course = CURSOS_PUBLICOS.find((c) => c.key === slug);
  const syllabus = (slug && SYLLABI[slug]) ? SYLLABI[slug] : DEFAULT_SYLLABUS;
  const learn = (slug && WHAT_YOULL_LEARN[slug]) ? WHAT_YOULL_LEARN[slug] : DEFAULT_LEARN;
  const related = CURSOS_PUBLICOS.filter((c) => c.key !== slug).slice(0, 3);

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 pt-20 text-center">
          <p className="text-lg font-semibold text-ink/60">{t.notFound}</p>
          <Link to="/" className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white">{t.backHome}</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const totalLessons = syllabus.reduce((acc, m) => acc + m.lessons, 0);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1 pt-[82px] sm:pt-[86px]">
        {/* Breadcrumb */}
        <div className="border-b border-brand-100 bg-brand-50/50 py-3">
          <div className="container-wide flex items-center gap-1.5 text-xs text-ink/50">
            <Link to="/" className="hover:text-brand-600">Inicio</Link>
            <ChevronRight size={12} />
            <Link to="/cursos" className="hover:text-brand-600">{language === 'es' ? 'Cursos' : 'Courses'}</Link>
            <ChevronRight size={12} />
            <span className="font-semibold text-ink">{course.title[language]}</span>
          </div>
        </div>

        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-lilac-700 py-14 sm:py-20">
          <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,.1),transparent_55%)]" />
          <div className="container-wide relative flex flex-col gap-10 lg:flex-row lg:items-center">
            {/* Text */}
            <div className="flex-1">
              <Link to="/cursos" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
                <ArrowLeft size={15} /> {t.back}
              </Link>
              <span className="mb-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                {course.category[language]}
              </span>
              <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">
                {course.title[language]}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/75">
                {course.description[language]}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/70">
                {course.instructor && (
                  <span className="flex items-center gap-1.5"><Users size={14} /> {course.instructor}</span>
                )}
                <span className="flex items-center gap-1.5"><Clock3 size={14} /> {course.duration[language]}</span>
                <span className="flex items-center gap-1.5"><BookOpen size={14} /> {totalLessons} {t.lessons}</span>
                <span className="flex items-center gap-1.5">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} size={12} className="fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-xs text-white/60">(4.8)</span>
                </span>
              </div>
            </div>

            {/* Card */}
            <div className="w-full shrink-0 overflow-hidden rounded-3xl bg-white shadow-2xl lg:w-80">
              <div className="relative aspect-video overflow-hidden">
                <img src={course.image} alt={course.title[language]} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-ink/30">
                  <button className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-brand-700 shadow-lift transition hover:scale-110">
                    <Play size={22} fill="currentColor" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className="mb-4 flex items-baseline gap-2">
                  {course.price ? (
                    <span className="font-display text-3xl font-bold text-ink">${course.price} <span className="text-sm font-normal text-ink/50">{t.usd}</span></span>
                  ) : (
                    <span className="font-display text-2xl font-bold text-emerald-600">{t.free}</span>
                  )}
                </div>
                <Link
                  to="/iniciar-sesion"
                  className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  {t.enroll} <ArrowRight size={16} />
                </Link>
                <div className="mt-5 space-y-2 border-t border-brand-100 pt-4 text-xs text-ink/60">
                  <p className="font-bold text-ink/80">{t.includes}</p>
                  {[t.certificate, t.lifetime, t.mobile].map((item) => (
                    <p key={item} className="flex items-center gap-2"><Check size={13} className="text-brand-500" /> {item}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== CONTENT ===== */}
        <section className="container-wide grid gap-10 py-14 lg:grid-cols-[1fr_320px]">
          <div className="space-y-10">
            {/* What you'll learn */}
            <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
              <h2 className="mb-5 font-display text-xl font-semibold text-ink">{t.whatYoullLearn}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {learn.map((item) => (
                  <div key={item.es} className="flex items-start gap-2.5 text-sm text-ink/70">
                    <Check size={15} className="mt-0.5 shrink-0 text-brand-500" />
                    {item[language]}
                  </div>
                ))}
              </div>
            </div>

            {/* Syllabus */}
            <div>
              <h2 className="mb-5 font-display text-xl font-semibold text-ink">{t.syllabus}</h2>
              <div className="divide-y divide-brand-50 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
                {syllabus.map((mod, idx) => (
                  <div key={idx} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{mod.title[language]}</p>
                        <p className="text-xs text-ink/50">{mod.lessons} {t.lessons}</p>
                      </div>
                    </div>
                    {mod.free ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">{t.freeLesson}</span>
                    ) : (
                      <Lock size={14} className="text-ink/25" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar summary */}
          <div className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
              <h3 className="mb-4 font-display font-semibold text-ink">{language === 'es' ? 'Detalles' : 'Details'}</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: t.instructor, value: course.instructor || '—' },
                  { label: t.duration, value: course.duration[language] },
                  { label: t.lessons, value: `${totalLessons} ${t.lessons}` },
                  { label: t.modality, value: course.modality?.[language] || 'Online' },
                  { label: t.price, value: course.price ? `$${course.price} USD` : t.free },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-2 border-b border-brand-50 pb-3 last:border-0">
                    <span className="text-ink/50">{label}</span>
                    <span className="text-right font-semibold text-ink">{value}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/iniciar-sesion"
                className="focus-ring mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5"
              >
                {t.enroll}
              </Link>
            </div>
          </div>
        </section>

        {/* ===== RELATED COURSES ===== */}
        <section className="bg-brand-50/50 py-14">
          <div className="container-wide">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-ink">{t.relatedCourses}</h2>
              <Link to="/cursos" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
                {language === 'es' ? 'Ver todos' : 'View all'} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <Link
                  key={c.key}
                  to={`/cursos/${c.key}`}
                  className="group overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img src={c.image} alt={c.title[language]} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-brand-500">{c.category[language]}</span>
                    <p className="mt-1 font-semibold text-ink line-clamp-1">{c.title[language]}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-ink/50">
                      <span className="flex items-center gap-1"><Clock3 size={11} /> {c.duration[language]}</span>
                      {c.price ? <span className="font-bold text-brand-700">${c.price}</span> : <span className="font-bold text-emerald-600">{t.free}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
