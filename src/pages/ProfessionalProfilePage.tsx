import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Star, MapPin, Video, User, CalendarDays, Check,
  Award, Clock, ChevronRight,
} from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { PROFESIONALES_PUBLICOS } from '@/data/professionalsPageData';

// Extended mock data per professional
const PROFILES: Record<string, {
  rating: number; reviewCount: number;
  bioLong: { es: string; en: string };
  experience: { es: string; en: string };
  services: { es: string; en: string }[];
  certifications: string[];
  availability: { es: string; en: string };
  sessionDuration: string;
  price: { es: string; en: string };
  approaches: { es: string; en: string }[];
}> = {
  'laura-mendez': {
    rating: 4.9, reviewCount: 87,
    bioLong: {
      es: 'La Dra. Laura Méndez es psicóloga clínica con más de 10 años de experiencia acompañando a personas adultas en procesos de autoconocimiento, gestión emocional y superación de crisis vitales. Su enfoque combina la terapia cognitivo-conductual con elementos de psicología humanista para ofrecer un espacio cálido, seguro y orientado a resultados concretos.',
      en: 'Dr. Laura Méndez is a clinical psychologist with over 10 years of experience supporting adults through self-discovery, emotional management and overcoming life crises. Her approach combines cognitive-behavioural therapy with humanistic psychology to offer a warm, safe, results-oriented space.',
    },
    experience: { es: '10+ años de experiencia', en: '10+ years of experience' },
    services: [
      { es: 'Terapia individual adultos', en: 'Individual adult therapy' },
      { es: 'Gestión de ansiedad y estrés', en: 'Anxiety & stress management' },
      { es: 'Duelo y pérdida', en: 'Grief and loss' },
      { es: 'Autoestima y desarrollo personal', en: 'Self-esteem & personal growth' },
    ],
    certifications: ['Psicóloga Clínica (UCV)', 'Máster TCC (Universidad de Barcelona)', 'Certificada EMDR'],
    availability: { es: 'Lun – Vie, 8:00 am – 6:00 pm', en: 'Mon – Fri, 8:00 am – 6:00 pm' },
    sessionDuration: '50 min',
    price: { es: 'Desde $50 USD / sesión', en: 'From $50 USD / session' },
    approaches: [
      { es: 'Cognitivo-Conductual (TCC)', en: 'Cognitive-Behavioural (CBT)' },
      { es: 'Humanista-Existencial', en: 'Humanistic-Existential' },
      { es: 'EMDR', en: 'EMDR' },
    ],
  },
  'valentina-rios': {
    rating: 4.8, reviewCount: 64,
    bioLong: {
      es: 'Valentina Ríos es especialista en psicología de parejas y vínculos afectivos. Con un enfoque sistémico y empático, acompaña a personas y parejas en la mejora de la comunicación, la resolución de conflictos y la construcción de relaciones más sanas y conscientes.',
      en: 'Valentina Ríos specialises in couple psychology and affective bonds. With a systemic and empathetic approach, she supports individuals and couples in improving communication, resolving conflicts and building healthier, more conscious relationships.',
    },
    experience: { es: '8 años de experiencia', en: '8 years of experience' },
    services: [
      { es: 'Terapia de pareja', en: 'Couples therapy' },
      { es: 'Comunicación y conflicto', en: 'Communication & conflict' },
      { es: 'Crisis de pareja', en: 'Couple crisis' },
      { es: 'Terapia individual', en: 'Individual therapy' },
    ],
    certifications: ['Psicóloga (UCAB)', 'Especialista en Terapia Sistémica', 'Posgrado Mediación Familiar'],
    availability: { es: 'Mar – Sáb, 9:00 am – 5:00 pm', en: 'Tue – Sat, 9:00 am – 5:00 pm' },
    sessionDuration: '60 min',
    price: { es: 'Desde $55 USD / sesión', en: 'From $55 USD / session' },
    approaches: [
      { es: 'Sistémica', en: 'Systemic' },
      { es: 'Narrativa', en: 'Narrative' },
      { es: 'Centrada en soluciones', en: 'Solution-focused' },
    ],
  },
  'sofia-herrera': {
    rating: 4.9, reviewCount: 52,
    bioLong: {
      es: 'Sofía Herrera se dedica al acompañamiento integral del bienestar emocional, con especial énfasis en el manejo del estrés, la regulación emocional y el desarrollo de la inteligencia emocional en adultos y jóvenes. Su estilo cercano y directo facilita procesos profundos en un ambiente de plena confianza.',
      en: 'Sofía Herrera is dedicated to comprehensive emotional wellbeing support, with a special focus on stress management, emotional regulation and the development of emotional intelligence in adults and young people. Her approachable, direct style facilitates deep processes in an environment of complete trust.',
    },
    experience: { es: '6 años de experiencia', en: '6 years of experience' },
    services: [
      { es: 'Bienestar emocional', en: 'Emotional wellbeing' },
      { es: 'Manejo del estrés', en: 'Stress management' },
      { es: 'Inteligencia emocional', en: 'Emotional intelligence' },
      { es: 'Regulación emocional', en: 'Emotional regulation' },
    ],
    certifications: ['Psicóloga (USB)', 'Certificada en Mindfulness MBSR', 'Posgrado Neuropsicología'],
    availability: { es: 'Lun – Jue, 10:00 am – 7:00 pm', en: 'Mon – Thu, 10:00 am – 7:00 pm' },
    sessionDuration: '50 min',
    price: { es: 'Desde $45 USD / sesión', en: 'From $45 USD / session' },
    approaches: [
      { es: 'Mindfulness', en: 'Mindfulness' },
      { es: 'Aceptación y Compromiso (ACT)', en: 'Acceptance & Commitment (ACT)' },
      { es: 'Cognitivo-Conductual', en: 'Cognitive-Behavioural' },
    ],
  },
};

// Fallback for professionals without extended profiles
const DEFAULT_PROFILE = {
  rating: 4.7, reviewCount: 30,
  bioLong: {
    es: 'Profesional comprometida con el bienestar emocional de sus pacientes, con un enfoque centrado en la persona y orientado a resultados. Ofrece un espacio de escucha segura, respetuosa y confidencial.',
    en: 'A professional committed to the emotional wellbeing of her patients, with a person-centred, results-oriented approach. Offers a safe, respectful and confidential listening space.',
  },
  experience: { es: '5+ años de experiencia', en: '5+ years of experience' },
  services: [
    { es: 'Terapia individual', en: 'Individual therapy' },
    { es: 'Acompañamiento emocional', en: 'Emotional support' },
  ],
  certifications: ['Psicóloga certificada', 'Formación continua'],
  availability: { es: 'Lun – Vie, 9:00 am – 5:00 pm', en: 'Mon – Fri, 9:00 am – 5:00 pm' },
  sessionDuration: '50 min',
  price: { es: 'Desde $45 USD / sesión', en: 'From $45 USD / session' },
  approaches: [{ es: 'Humanista', en: 'Humanistic' }, { es: 'Cognitivo-Conductual', en: 'Cognitive-Behavioural' }],
};

const text = {
  es: {
    back: 'Volver a profesionales', bookBtn: 'Agendar cita', contactBtn: 'Enviar mensaje',
    about: 'Sobre mí', services: 'Servicios que ofrece', approach: 'Enfoque terapéutico',
    certifications: 'Formación y certificaciones', availability: 'Disponibilidad',
    sessionDuration: 'Duración de la sesión', price: 'Precio', rating: 'Calificación',
    reviews: 'reseñas', otherProfs: 'Otros profesionales',
    modalityLabel: 'Modalidad', experienceLabel: 'Experiencia',
    notFound: 'Profesional no encontrado.', backHome: 'Ir al inicio',
  },
  en: {
    back: 'Back to professionals', bookBtn: 'Book appointment', contactBtn: 'Send message',
    about: 'About me', services: 'Services offered', approach: 'Therapeutic approach',
    certifications: 'Training & certifications', availability: 'Availability',
    sessionDuration: 'Session duration', price: 'Price', rating: 'Rating',
    reviews: 'reviews', otherProfs: 'Other professionals',
    modalityLabel: 'Modality', experienceLabel: 'Experience',
    notFound: 'Professional not found.', backHome: 'Go to home',
  },
} as const;

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={14} className={n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-ink/15 text-ink/15'} />
        ))}
      </div>
      <span className="text-sm font-semibold text-ink">{rating}</span>
      <span className="text-xs text-ink/45">({count})</span>
    </div>
  );
}

export default function ProfessionalProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useSiteLanguage();
  const t = text[language];

  const professional = PROFESIONALES_PUBLICOS.find((p) => p.key === slug);
  const profile = (slug && PROFILES[slug]) ? PROFILES[slug] : DEFAULT_PROFILE;
  const others = PROFESIONALES_PUBLICOS.filter((p) => p.key !== slug).slice(0, 3);

  if (!professional) {
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

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1 pt-[82px] sm:pt-[86px]">
        {/* Breadcrumb */}
        <div className="border-b border-brand-100 bg-brand-50/50 py-3">
          <div className="container-wide flex items-center gap-1.5 text-xs text-ink/50">
            <Link to="/" className="hover:text-brand-600">Inicio</Link>
            <ChevronRight size={12} />
            <Link to="/profesionales" className="hover:text-brand-600">{language === 'es' ? 'Profesionales' : 'Professionals'}</Link>
            <ChevronRight size={12} />
            <span className="font-semibold text-ink">{professional.name}</span>
          </div>
        </div>

        {/* ===== PERFIL HERO ===== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-lilac-50 py-12 sm:py-16">
          <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="container-wide">
            <Link to="/profesionales" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
              <ArrowLeft size={15} /> {t.back}
            </Link>

            <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
              {/* Photo */}
              <div className="shrink-0">
                <div className="relative h-56 w-56 overflow-hidden rounded-3xl shadow-lift sm:h-64 sm:w-64">
                  <img
                    src={professional.image}
                    alt={professional.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
                  <Award size={12} /> {professional.specialty[language]}
                </span>
                <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">{professional.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-ink/60">
                  <StarRow rating={profile.rating} count={profile.reviewCount} />
                  <span className="flex items-center gap-1.5"><Clock size={14} /> {profile.sessionDuration}</span>
                  <span className="flex items-center gap-1.5">
                    {professional.modality[language].toLowerCase().includes('online') || professional.modality[language].toLowerCase().includes('virtual')
                      ? <Video size={14} />
                      : <MapPin size={14} />}
                    {professional.modality[language]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.approaches.map((a) => (
                    <span key={a.es} className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700">
                      {a[language]}
                    </span>
                  ))}
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-ink/65">
                  {profile.bioLong[language]}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/agendar"
                    className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <CalendarDays size={16} /> {t.bookBtn}
                  </Link>
                  <Link
                    to="/contacto"
                    className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-full border border-brand-300 bg-white px-6 text-sm font-bold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50"
                  >
                    {t.contactBtn}
                  </Link>
                </div>
              </div>

              {/* Sidebar card */}
              <div className="w-full shrink-0 rounded-3xl border border-brand-100 bg-white p-6 shadow-soft lg:w-64">
                <div className="space-y-4 divide-y divide-brand-50">
                  {[
                    { label: t.price, value: profile.price[language], icon: null },
                    { label: t.sessionDuration, value: profile.sessionDuration, icon: Clock },
                    { label: t.modalityLabel, value: professional.modality[language], icon: Video },
                    { label: t.experienceLabel, value: profile.experience[language], icon: Award },
                    { label: t.availability, value: profile.availability[language], icon: CalendarDays },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="pt-4 first:pt-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                        {Icon && <Icon size={14} className="text-brand-500" />}
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== DETAIL SECTIONS ===== */}
        <section className="container-wide py-14">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* Services */}
            <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <User size={18} className="text-brand-500" /> {t.services}
              </h2>
              <ul className="space-y-2.5">
                {profile.services.map((s) => (
                  <li key={s.es} className="flex items-center gap-2.5 text-sm text-ink/70">
                    <Check size={15} className="shrink-0 text-brand-500" />
                    {s[language]}
                  </li>
                ))}
              </ul>
            </div>

            {/* Certifications */}
            <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Award size={18} className="text-brand-500" /> {t.certifications}
              </h2>
              <ul className="space-y-2.5">
                {profile.certifications.map((c) => (
                  <li key={c} className="flex items-center gap-2.5 text-sm text-ink/70">
                    <Check size={15} className="shrink-0 text-emerald-500" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ===== OTROS PROFESIONALES ===== */}
        <section className="bg-brand-50/50 py-14">
          <div className="container-wide">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-ink">{t.otherProfs}</h2>
              <Link to="/profesionales" className="text-sm font-semibold text-brand-600 hover:underline flex items-center gap-1">
                {language === 'es' ? 'Ver todos' : 'View all'} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((p) => (
                <Link
                  key={p.key}
                  to={`/profesionales/${p.key}`}
                  className="group flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <img src={p.image} alt={p.name} className="h-14 w-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">{p.name}</p>
                    <p className="text-xs text-brand-600">{p.specialty[language]}</p>
                    <p className="text-xs text-ink/50">{p.modality[language]}</p>
                  </div>
                  <ArrowRight size={15} className="shrink-0 text-ink/30 transition group-hover:text-brand-500" />
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
