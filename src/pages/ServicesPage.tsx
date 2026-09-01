import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, MonitorSmartphone, Search } from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { SERVICIOS_PUBLICOS, type CategoriaServicio } from '@/data/servicesPageData';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const text = {
  es: {
    breadcrumbHome: 'Inicio', breadcrumbCurrent: 'Servicios',
    title: 'Nuestros servicios',
    subtitle: 'Explora todas las modalidades de acompañamiento psicológico. Elige el servicio que mejor se adapte a ti y agenda con un profesional certificado.',
    searchPlaceholder: 'Buscar servicio…',
    filters: { '': 'Todos', individual: 'Individual', pareja: 'Pareja y familia', infantil: 'Infantil', orientacion: 'Orientación' } as Record<'' | CategoriaServicio, string>,
    empty: 'No se encontraron servicios.',
    learnMore: 'Ver más',
    ctaTitle: '¿No sabes qué servicio elegir?',
    ctaText: 'Cuéntanos cómo te sientes y te orientamos hacia el acompañamiento adecuado.',
    ctaButton: 'Hablar con nosotros',
  },
  en: {
    breadcrumbHome: 'Home', breadcrumbCurrent: 'Services',
    title: 'Our services',
    subtitle: 'Explore all our psychological support options. Choose the service that best fits you and book with a certified professional.',
    searchPlaceholder: 'Search service…',
    filters: { '': 'All', individual: 'Individual', pareja: 'Couples & family', infantil: 'Children', orientacion: 'Guidance' } as Record<'' | CategoriaServicio, string>,
    empty: 'No services found.',
    learnMore: 'Learn more',
    ctaTitle: 'Not sure which service to choose?',
    ctaText: "Tell us how you feel and we'll guide you to the right support.",
    ctaButton: 'Talk to us',
  },
} as const;

export default function ServicesPage() {
  const { language } = useSiteLanguage();
  const t = text[language];

  const [dbServices, setDbServices] = useState(SERVICIOS_PUBLICOS);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState<'' | CategoriaServicio>('');

  useEffect(() => {
    const fetchDbData = async () => {
      const { getSupabaseClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        // Fetch services and their modalities for duration and price
        const { data: servs } = await supabase
          .from('servicios')
          .select('id, nombre, categoria, descripcion, slug, imagen, servicio_modalidad(duracion_minutos, precio)')
          .eq('estado', 'activo');

        if (servs && servs.length > 0) {
          setDbServices(servs.map((s) => {
            // Find minimum duration and price among its modalities, or use defaults
            let minDur = 60;
            let minPrice = 50;
            if (s.servicio_modalidad && s.servicio_modalidad.length > 0) {
               minDur = s.servicio_modalidad[0].duracion_minutos;
               minPrice = s.servicio_modalidad[0].precio; // Asumiendo que está guardado en dolares o hacer / 100 si son centavos
            }

            return {
              key: s.slug || s.id.toString(),
              categoria: (s.categoria as CategoriaServicio) || 'individual',
              icon: SERVICIOS_PUBLICOS[0].icon, // No tenemos iconos en BD, usamos default
              colorClases: SERVICIOS_PUBLICOS[0].colorClases,
              imagen: s.imagen || SERVICIOS_PUBLICOS[0].imagen,
              titulo: { es: s.nombre, en: s.nombre },
              descripcion: { es: s.descripcion || '', en: s.descripcion || '' },
              duracionMin: minDur,
              precio: minPrice,
              modalidad: { es: 'Online / Presencial', en: 'Online / In-person' },
            };
          }));
        }
      } catch (e) {
        console.error('Error fetching data from Supabase:', e);
      }
    };
    fetchDbData();
  }, []);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dbServices.filter((s) => {
      const matchCat = !categoria || s.categoria === categoria;
      const matchQ = !q || s.titulo[language].toLowerCase().includes(q) || s.descripcion[language].toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [search, categoria, language, dbServices]);

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
              {(Object.keys(t.filters) as Array<'' | CategoriaServicio>).map((cat) => (
                <button
                  key={cat || 'todos'}
                  onClick={() => setCategoria(cat)}
                  className={`h-9 rounded-full border px-4 font-semibold transition ${
                    categoria === cat ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 text-ink/60 hover:bg-brand-50'
                  }`}
                >
                  {t.filters[cat]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="container-wide py-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((s) => {
              const Icon = s.icon;
              return (
                <article key={s.key} className="group flex flex-col overflow-hidden rounded-[28px] border border-lilac-100 bg-lilac-50 shadow-soft transition duration-500 hover:-translate-y-1">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={s.imagen}
                      alt={s.titulo[language]}
                      className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.05] ${s.imagenPosicion ?? ''}`}
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl ring-4 ring-white ${s.colorClases}`}>
                      <Icon size={22} strokeWidth={1.6} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-ink">{s.titulo[language]}</h3>
                    <p className="mt-1 flex-1 text-sm leading-6 text-ink/60">{s.descripcion[language]}</p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-ink/50">
                      <span className="inline-flex items-center gap-1"><Clock3 size={13} />{s.duracionMin} min</span>
                      <span className="inline-flex items-center gap-1"><MonitorSmartphone size={13} />{s.modalidad[language]}</span>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-lilac-200 pt-4">
                      <span className="font-display text-lg font-semibold text-brand-700">
                        ${s.precio} <span className="text-xs font-normal text-ink/40">USD</span>
                      </span>
                       <Link to={`/servicios/${s.key}`} className="group/link inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700">
                         {t.learnMore}
                         <ArrowRight size={14} className="transition-transform group-hover/link:translate-x-1" />
                       </Link>
                    </div>
                  </div>
                </article>
              );
            })}
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
