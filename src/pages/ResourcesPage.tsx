import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Clock3, Play, Search } from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { RECURSOS_PUBLICOS, type TipoRecurso } from '@/data/resourcesPageData';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const text = {
  es: {
    breadcrumbHome: 'Inicio', breadcrumbCurrent: 'Recursos',
    title: 'Recursos para acompañarte',
    subtitle: 'Libros y videos de bienestar creados por nuestros profesionales, para leer y ver a tu ritmo.',
    searchPlaceholder: 'Buscar recurso…',
    filters: { '': 'Todos', libro: 'Libros', video: 'Videos' } as Record<'' | TipoRecurso, string>,
    empty: 'No se encontraron recursos.',
    view: 'Ver',
    featured: 'Destacado',
    book: 'Libro',
    video: 'Video',
    ctaTitle: '¿Buscas algo más específico?',
    ctaText: 'Cuéntanos qué te gustaría trabajar y te recomendamos el recurso ideal para ti.',
    ctaButton: 'Hablar con nosotros',
  },
  en: {
    breadcrumbHome: 'Home', breadcrumbCurrent: 'Resources',
    title: 'Resources to support you',
    subtitle: 'Wellbeing books and videos created by our professionals, to read and watch at your own pace.',
    searchPlaceholder: 'Search resource…',
    filters: { '': 'All', libro: 'Books', video: 'Videos' } as Record<'' | TipoRecurso, string>,
    empty: 'No resources found.',
    view: 'View',
    featured: 'Featured',
    book: 'Book',
    video: 'Video',
    ctaTitle: 'Looking for something more specific?',
    ctaText: "Tell us what you'd like to work on and we'll recommend the right resource for you.",
    ctaButton: 'Talk to us',
  },
} as const;

export default function ResourcesPage() {
  const { language } = useSiteLanguage();
  const t = text[language];

  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<'' | TipoRecurso>('');

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return RECURSOS_PUBLICOS.filter((r) => {
      const matchTipo = !tipo || r.tipo === tipo;
      const matchQ = !q || r.titulo[language].toLowerCase().includes(q) || r.autor.toLowerCase().includes(q);
      return matchTipo && matchQ;
    });
  }, [search, tipo, language]);

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
              {(Object.keys(t.filters) as Array<'' | TipoRecurso>).map((k) => (
                <button
                  key={k || 'todos'}
                  onClick={() => setTipo(k)}
                  className={`h-9 rounded-full border px-4 font-semibold transition ${
                    tipo === k ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 text-ink/60 hover:bg-brand-50'
                  }`}
                >
                  {t.filters[k]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="container-wide py-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filtrados.map((r) => (
              <article key={r.key} className="group flex flex-col overflow-hidden rounded-[28px] border border-brand-100 bg-white shadow-soft transition duration-500 hover:-translate-y-1">
                <div className={`relative flex h-48 flex-col justify-between overflow-hidden p-4 text-white ${r.colorClases}`}>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
                      {r.tipo === 'libro' ? <BookOpen size={12} /> : <Play size={12} />}
                      {r.tipo === 'libro' ? t.book : t.video}
                    </span>
                    {r.duracion && (
                      <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold">{r.duracion}</span>
                    )}
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <p className="font-display text-lg font-semibold leading-tight">{r.titulo[language]}</p>
                    {r.tipo === 'libro' ? (
                      <BookOpen size={26} strokeWidth={1.4} className="shrink-0 opacity-70" />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20"><Play size={15} fill="currentColor" /></span>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold text-ink/50">{r.autor}</p>
                  {r.descripcion && <p className="mt-2 flex-1 text-sm leading-6 text-ink/60">{r.descripcion[language]}</p>}
                  {!r.descripcion && <div className="flex-1" />}
                  <div className="mt-4 flex items-center justify-between border-t border-brand-100 pt-4">
                    {r.destacado ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-lilac-600">
                        <Clock3 size={13} />{t.featured}
                      </span>
                    ) : (
                      <span className="font-display text-lg font-semibold text-brand-700">
                        ${r.precio} <span className="text-xs font-normal text-ink/40">USD</span>
                      </span>
                    )}
                    <a href="/#contact" className="group/link inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
                      {t.view}
                      <ArrowRight size={14} className="transition-transform group-hover/link:translate-x-1" />
                    </a>
                  </div>
                </div>
              </article>
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
