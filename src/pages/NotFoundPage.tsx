import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Home, Search } from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const text = {
  es: {
    badge: 'Error 404',
    title: 'Página no encontrada',
    subtitle: 'Lo sentimos, la página que buscas no existe o fue movida a otra dirección.',
    home: 'Volver al inicio',
    back: 'Regresar',
    suggest: 'Quizás te interesa',
    links: [
      { label: 'Ver nuestros servicios', href: '/servicios' },
      { label: 'Conocer a los profesionales', href: '/profesionales' },
      { label: 'Explorar cursos', href: '/cursos' },
      { label: 'Agendar una cita', href: '/agendar' },
    ],
  },
  en: {
    badge: 'Error 404',
    title: 'Page not found',
    subtitle: "Sorry, the page you're looking for doesn't exist or has been moved.",
    home: 'Back to home',
    back: 'Go back',
    suggest: 'You might be interested in',
    links: [
      { label: 'View our services', href: '/servicios' },
      { label: 'Meet the professionals', href: '/profesionales' },
      { label: 'Explore courses', href: '/cursos' },
      { label: 'Book an appointment', href: '/agendar' },
    ],
  },
} as const;

export default function NotFoundPage() {
  const { language } = useSiteLanguage();
  const t = text[language];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center pt-[82px] sm:pt-[86px]">
        <section className="relative isolate w-full overflow-hidden py-24 sm:py-32">
          {/* Blobs de fondo */}
          <div className="pointer-events-none absolute -right-32 top-0 -z-10 h-[480px] w-[480px] rounded-full bg-brand-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 -z-10 h-[360px] w-[360px] rounded-full bg-lilac-200/40 blur-3xl" />

          <div className="container-wide flex flex-col items-center text-center">
            {/* Número animado */}
            <div className="relative mb-8 select-none">
              <span className="font-display text-[140px] font-black leading-none text-brand-100 sm:text-[200px]">
                404
              </span>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-lift sm:h-20 sm:w-20">
                  <Search size={28} strokeWidth={1.8} />
                </span>
              </div>
            </div>

            {/* Badge */}
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-600">
              {t.badge}
            </span>

            {/* Título y subtítulo */}
            <h1 className="max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {t.title}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-7 text-ink/60">
              {t.subtitle}
            </p>

            {/* CTAs principales */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/"
                className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <Home size={16} />
                {t.home}
              </Link>
              <button
                onClick={() => window.history.back()}
                className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-full border border-brand-300 bg-white px-6 text-sm font-bold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50"
              >
                <ArrowLeft size={16} />
                {t.back}
              </button>
            </div>

            {/* Sugerencias de navegación */}
            <div className="mt-16 w-full max-w-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-ink/40">{t.suggest}</p>
              <ul className="space-y-2">
                {t.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="flex items-center justify-between rounded-2xl border border-brand-100 bg-white px-5 py-3.5 text-sm font-semibold text-ink/70 shadow-soft transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {link.label}
                      <ArrowRight size={15} className="text-brand-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
