import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { PROFESIONALES_PUBLICOS } from '@/data/professionalsPageData';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const text = {
  es: {
    breadcrumbHome: 'Inicio', breadcrumbCurrent: 'Profesionales',
    title: 'Nuestros profesionales',
    subtitle: 'Conoce al equipo de especialistas certificados listos para acompañarte en tu proceso, en modalidad online y presencial.',
    profile: 'Ver perfil',
    ctaTitle: '¿No sabes con quién agendar?',
    ctaText: 'Cuéntanos qué necesitas y te ayudamos a encontrar al profesional adecuado para ti.',
    ctaButton: 'Hablar con nosotros',
  },
  en: {
    breadcrumbHome: 'Home', breadcrumbCurrent: 'Professionals',
    title: 'Our professionals',
    subtitle: 'Meet the team of certified specialists ready to support your process, online and in person.',
    profile: 'View profile',
    ctaTitle: 'Not sure who to book with?',
    ctaText: "Tell us what you need and we'll help you find the right professional for you.",
    ctaButton: 'Talk to us',
  },
} as const;

export default function ProfessionalsPage() {
  const { language } = useSiteLanguage();
  const t = text[language];

  const [dbProfessionals, setDbProfessionals] = useState(PROFESIONALES_PUBLICOS);

  useEffect(() => {
    const fetchDbData = async () => {
      const { getSupabaseClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        // Obtenemos todos los profesionales activos (y sus nombres/fotos de la tabla usuarios)
        const { data: profs } = await supabase
          .from('profesionales')
          .select('id, especialidad, descripcion, usuarios(nombre, foto)')
          .eq('estado', 'activo');

        if (profs && profs.length > 0) {
          setDbProfessionals(profs.map((p) => {
            const usuario = (p as unknown as { usuarios?: { nombre: string | null; foto: string | null }[] | null }).usuarios?.[0];
            return {
              key: p.id.toString(), // o algún slug real si existiera
              name: usuario?.nombre || 'Profesional',
              specialty: { es: p.especialidad || 'Psicología', en: p.especialidad || 'Psychology' }, // TODO: i18n real DB
              description: { es: p.descripcion || '', en: p.descripcion || '' },
              modality: { es: 'Online y presencial', en: 'Online and in-person' },
              image: usuario?.foto || PROFESIONALES_PUBLICOS[0].image,
            };
          }));
        }
      } catch (e) {
        console.error('Error fetching data from Supabase:', e);
      }
    };
    fetchDbData();
  }, []);

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

        {/* Grid */}
        <section className="container-wide py-14 sm:py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {dbProfessionals.map((p, i) => (
              <Link
                key={p.key}
                to={`/profesionales/${p.key}`}
                className={`group block overflow-hidden rounded-[28px] bg-white shadow-soft transition duration-500 hover:-translate-y-2 ${
                  i % 3 === 1 ? 'md:translate-y-8' : ''
                }`}
                style={{ transitionDelay: `${(i % 3) * 80}ms` }}
              >
                <div className="relative aspect-[.78/1] overflow-hidden">
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-brand-700/0 transition duration-500 group-hover:bg-brand-700/20" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-700">
                    {p.specialty[language]}
                  </span>
                  <span className="absolute bottom-4 right-4 grid h-10 w-10 translate-y-3 place-items-center rounded-full bg-white text-brand-700 opacity-0 shadow-soft transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <ArrowUpRight size={17} />
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-2xl font-semibold text-ink">{p.name}</h3>
                  <p className="mt-2 text-sm text-ink/60">{p.description[language]}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-brand-100 pt-4 text-xs font-semibold text-ink/55">
                    <span>{p.modality[language]}</span>
                    <span className="text-brand-600">{t.profile}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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
