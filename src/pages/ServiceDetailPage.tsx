import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MonitorSmartphone } from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { SERVICIOS_PUBLICOS } from '@/data/servicesPageData';

const text = {
  es: {
    back: 'Volver a servicios',
    duration: 'Duración',
    modality: 'Modalidad',
    includes: 'Este servicio incluye',
    includesItems: ['Espacio confidencial y seguro', 'Acompañamiento profesional personalizado', 'Orientación para definir los siguientes pasos'],
    book: 'Agendar este servicio',
    contact: '¿Tienes preguntas? Contáctanos',
    notFound: 'Servicio no encontrado',
    notFoundText: 'El servicio que buscas no está disponible.',
  },
  en: {
    back: 'Back to services',
    duration: 'Duration',
    modality: 'Modality',
    includes: 'This service includes',
    includesItems: ['A safe and confidential space', 'Personalized professional support', 'Guidance to define the next steps'],
    book: 'Book this service',
    contact: 'Have questions? Contact us',
    notFound: 'Service not found',
    notFoundText: 'The service you are looking for is not available.',
  },
} as const;

export default function ServiceDetailPage() {
  const { key } = useParams<{ key: string }>();
  const { language } = useSiteLanguage();
  const t = text[language];
  const servicio = SERVICIOS_PUBLICOS.find((item) => item.key === key);

  if (!servicio) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteHeader />
        <main className="container-wide flex flex-1 flex-col items-center justify-center py-32 text-center">
          <h1 className="font-display text-3xl font-semibold text-ink">{t.notFound}</h1>
          <p className="mt-3 text-sm text-ink/60">{t.notFoundText}</p>
          <Link to="/servicios" className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-3 text-sm font-bold text-white">
            <ArrowLeft size={15} /> {t.back}
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const Icon = servicio.icon;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1 pt-[82px] sm:pt-[86px]">
        <section className="relative overflow-hidden bg-mist-gradient py-12 sm:py-20">
          <div className="container-wide">
            <Link to="/servicios" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/55 hover:text-brand-600">
              <ArrowLeft size={15} /> {t.back}
            </Link>
            <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
              <div>
                <div className={`grid h-14 w-14 place-items-center rounded-2xl ${servicio.colorClases}`}>
                  <Icon size={26} />
                </div>
                <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                  {servicio.titulo[language]}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-ink/65">{servicio.descripcion[language]}</p>
                <div className="mt-7 flex flex-wrap gap-3 text-sm text-ink/60">
                  <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-2"><Clock3 size={15} className="text-brand-600" />{t.duration}: {servicio.duracionMin} min</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-2"><MonitorSmartphone size={15} className="text-brand-600" />{servicio.modalidad[language]}</span>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to={`/agendar?servicio=${servicio.key}`}
                    className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5"
                  >
                    <CalendarDays size={16} /> {t.book} <ArrowRight size={15} />
                  </Link>
                  <Link to="/contacto" className="text-sm font-semibold text-brand-600 hover:underline">{t.contact}</Link>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[32px] shadow-lift">
                <img src={servicio.imagen} alt={servicio.titulo[language]} className={`h-[320px] w-full object-cover sm:h-[390px] ${servicio.imagenPosicion ?? ''}`} />
              </div>
            </div>
          </div>
        </section>

        <section className="container-wide py-16 sm:py-24">
          <div className="max-w-2xl rounded-3xl border border-brand-100 bg-brand-50/60 p-7 sm:p-10">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.includes}</h2>
            <ul className="mt-6 space-y-4">
              {t.includesItems.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-ink/70">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm"><Check size={14} /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
