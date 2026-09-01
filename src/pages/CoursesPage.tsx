import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Search } from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { CURSOS_PUBLICOS } from '@/data/coursesPageData';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const text = {
  es: {
    breadcrumbHome: 'Inicio', breadcrumbCurrent: 'Cursos',
    title: 'Catálogo de cursos',
    subtitle: 'Cursos de bienestar y salud mental creados por nuestros profesionales, a tu ritmo y con certificado al finalizar.',
    searchPlaceholder: 'Buscar curso…',
    allFilter: 'Todos',
    empty: 'No se encontraron cursos.',
    lessons: 'clases',
    viewCourse: 'Ver curso',
    comingSoon: 'Próximamente',
    ctaTitle: '¿No sabes por dónde empezar?',
    ctaText: 'Cuéntanos qué te gustaría trabajar y te recomendamos el curso ideal para ti.',
    ctaButton: 'Hablar con nosotros',
  },
  en: {
    breadcrumbHome: 'Home', breadcrumbCurrent: 'Courses',
    title: 'Course catalog',
    subtitle: 'Wellbeing and mental health courses created by our professionals, at your own pace, with a certificate on completion.',
    searchPlaceholder: 'Search course…',
    allFilter: 'All',
    empty: 'No courses found.',
    lessons: 'lessons',
    viewCourse: 'View course',
    comingSoon: 'Coming soon',
    ctaTitle: "Not sure where to start?",
    ctaText: "Tell us what you'd like to work on and we'll recommend the right course for you.",
    ctaButton: 'Talk to us',
  },
} as const;

export default function CoursesPage() {
  const { language } = useSiteLanguage();
  const t = text[language];

  const [dbCourses, setDbCourses] = useState(CURSOS_PUBLICOS);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');

  useEffect(() => {
    const fetchDbData = async () => {
      const { getSupabaseClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        const { data: cur } = await supabase
          .from('cursos')
          .select('*')
          .eq('estado', 'publicado');

        if (cur && cur.length > 0) {
          setDbCourses(cur.map((c) => ({
            key: c.slug || c.id.toString(),
            title: { es: c.nombre, en: c.nombre }, // TODO: i18n real DB
            category: { es: 'Curso', en: 'Course' }, // Se puede extraer de otra tabla o campo si existiera
            description: { es: c.descripcion || '', en: c.descripcion || '' },
            duration: { es: 'A tu ritmo', en: 'At your own pace' },
            modality: { es: 'Online', en: 'Online' },
            price: c.precio ? c.precio : undefined,
            image: c.imagen || CURSOS_PUBLICOS[0].image,
          })));
        }
      } catch (e) {
        console.error('Error fetching data from Supabase:', e);
      }
    };
    fetchDbData();
  }, []);

  const categorias = useMemo(() => {
    const seen = new Set<string>();
    return dbCourses.filter((c) => {
      const label = c.category[language];
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    }).map((c) => c.category[language]);
  }, [language]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dbCourses.filter((c) => {
      const matchCat = !categoria || c.category[language] === categoria;
      const matchQ = !q || c.title[language].toLowerCase().includes(q) || c.description[language].toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [search, categoria, language]);

  return (
    <div className="overflow-hidden bg-white">
      <SiteHeader />

      <main className="pt-[82px] sm:pt-[86px]">
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-mist-gradient py-16 sm:py-20">
          <div className="pointer-events-none absolute -right-32 top-0 -z-10 h-[420px] w-[420px] rounded-full bg-brand-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-[-120px] -z-10 h-[360px] w-[360px] rounded-full bg-lilac-300/30 blur-3xl" />
          <div className="container-wide text-center">
            <nav className="mb-4 text-sm text-ink/45">
              <a href="/" className="hover:text-brand-600">{t.breadcrumbHome}</a>
              <span className="mx-1.5">/</span>
              <span className="font-semibold text-ink">{t.breadcrumbCurrent}</span>
            </nav>
            <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{t.title}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink/60">{t.subtitle}</p>
          </div>
        </section>

        {/* Toolbar */}
        <section className="container-wide pt-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-brand-100 bg-white px-4 shadow-sm">
              <Search size={16} className="text-ink/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                onClick={() => setCategoria('')}
                className={`h-9 rounded-full border px-4 font-semibold transition ${
                  categoria === '' ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 text-ink/60 hover:bg-brand-50'
                }`}
              >
                {t.allFilter}
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat)}
                  className={`h-9 rounded-full border px-4 font-semibold transition ${
                    categoria === cat ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 text-ink/60 hover:bg-brand-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="container-wide py-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((c) => (
              <Link to={`/cursos/${c.key}`} key={c.key} className="group flex flex-col overflow-hidden rounded-[28px] border border-brand-100 bg-white shadow-soft transition duration-500 hover:-translate-y-1">
                <div className="relative h-44 overflow-hidden">
                  <img src={c.image} alt={c.title[language]} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">
                    {c.category[language]}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold text-ink">{c.title[language]}</h3>
                  <p className="mt-1 flex-1 text-sm leading-6 text-ink/60">{c.description[language]}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/50">
                    {c.instructor && <span>{c.instructor}</span>}
                    {c.instructor && <span>·</span>}
                    {c.lessons && <span>{c.lessons} {t.lessons}</span>}
                    {c.lessons && <span>·</span>}
                    <span className="inline-flex items-center gap-1"><Clock3 size={13} />{c.duration[language]}</span>
                    {c.modality && <span>· {c.modality[language]}</span>}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-brand-100 pt-4">
                    {c.price ? (
                      <span className="font-display text-lg font-semibold text-brand-700">
                        ${c.price} <span className="text-xs font-normal text-ink/40">USD</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink/40">{t.comingSoon}</span>
                    )}
                    <span className="group/link inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
                      {t.viewCourse}
                      <ArrowRight size={14} className="transition-transform group-hover/link:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {filtrados.length === 0 && (
            <p className="py-16 text-center text-sm text-ink/40">{t.empty}</p>
          )}
        </section>

        {/* CTA */}
        <section className="pb-16 sm:pb-20">
          <div className="container-wide">
            <div className="mx-auto max-w-3xl rounded-[28px] border border-brand-100 bg-brand-50/70 p-8 text-center shadow-soft sm:p-10">
              <h2 className="text-2xl font-semibold text-ink">{t.ctaTitle}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink/60">{t.ctaText}</p>
              <a href="/#contact" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                {t.ctaButton}
                <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
