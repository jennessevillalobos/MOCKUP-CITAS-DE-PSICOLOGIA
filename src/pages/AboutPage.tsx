import { Link } from 'react-router-dom';
import {
  ArrowRight, Heart, ShieldCheck, Award, Users, Sparkles, Eye,
} from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { professionals } from '@/data/homeData';

const text = {
  es: {
    badge: 'Quiénes somos',
    title: 'Acompañarte es nuestra razón de ser.',
    intro: 'Psique Amor nació de la convicción de que toda persona merece un espacio seguro para entenderse, crecer y sanar. Somos un equipo de profesionales comprometidos con la salud mental, la escucha empática y el acompañamiento humano.',
    storyLabel: 'Nuestra historia',
    storyTitle: 'Cómo comenzó todo',
    storyText: 'Psique Amor fue fundada en 2018 por un grupo de psicólogos que compartían una misma inquietud: la salud emocional seguía siendo un terreno inaccesible para muchas personas, ya sea por el estigma, la distancia geográfica o los costos. Decidimos crear una plataforma que uniera la rigurosidad clínica con la calidez humana, haciendo que el cuidado emocional fuera cercano, flexible y confiable.',
    missionLabel: 'Nuestra misión',
    missionText: 'Brindar acompañamiento psicológico profesional, accesible y confidencial, adaptado a cada historia y a cada momento de vida.',
    visionLabel: 'Nuestra visión',
    visionText: 'Ser la plataforma de referencia en salud emocional en Latinoamérica, donde cada persona encuentre el apoyo que necesita sin barreras.',
    valuesLabel: 'Nuestros valores',
    values: [
      { icon: Heart, title: 'Empatía', desc: 'Nos ponemos en el lugar de quien acude a nosotros y construimos desde ahí.' },
      { icon: ShieldCheck, title: 'Confidencialidad', desc: 'Tu historia es tuya. Nuestro compromiso ético es absoluto.' },
      { icon: Award, title: 'Excelencia clínica', desc: 'Profesionales certificados y en formación continua.' },
      { icon: Eye, title: 'Transparencia', desc: 'Claridad en cada proceso, desde la tarifa hasta el enfoque terapéutico.' },
      { icon: Sparkles, title: 'Innovación', desc: 'Tecnología al servicio del bienestar, sin perder lo esencial: el ser humano.' },
      { icon: Users, title: 'Diversidad', desc: 'Un equipo plural que atiende todas las realidades y contextos.' },
    ],
    teamLabel: 'Nuestro equipo',
    teamTitle: 'Personas detrás del proceso',
    teamText: 'Conoce a algunos de los profesionales que hacen posible Psique Amor.',
    viewProfile: 'Ver perfil',
    ctaTitle: 'Comienza tu proceso hoy.',
    ctaText: 'Un primer paso, aunque pequeño, ya es un avance. Estamos aquí para acompañarte.',
    ctaBtn: 'Agendar una cita',
    ctaBtnSec: 'Conocer nuestros servicios',
  },
  en: {
    badge: 'About us',
    title: 'Supporting you is our reason for being.',
    intro: 'Psique Amor was born from the conviction that every person deserves a safe space to understand themselves, grow and heal. We are a team of professionals committed to mental health, empathetic listening and human support.',
    storyLabel: 'Our story',
    storyTitle: 'How it all began',
    storyText: 'Psique Amor was founded in 2018 by a group of psychologists who shared a common concern: emotional health was still out of reach for many people, due to stigma, geographic distance or cost. We decided to create a platform that combined clinical rigour with human warmth, making emotional care close, flexible and trustworthy.',
    missionLabel: 'Our mission',
    missionText: 'To provide professional, accessible and confidential psychological support, tailored to each story and each moment in life.',
    visionLabel: 'Our vision',
    visionText: 'To be the reference platform for emotional health in Latin America, where everyone finds the support they need without barriers.',
    valuesLabel: 'Our values',
    values: [
      { icon: Heart, title: 'Empathy', desc: 'We put ourselves in the shoes of those who come to us and build from there.' },
      { icon: ShieldCheck, title: 'Confidentiality', desc: 'Your story is yours. Our ethical commitment is absolute.' },
      { icon: Award, title: 'Clinical excellence', desc: 'Certified professionals in continuous training.' },
      { icon: Eye, title: 'Transparency', desc: 'Clarity in every process, from fees to therapeutic approach.' },
      { icon: Sparkles, title: 'Innovation', desc: 'Technology at the service of wellbeing, without losing the essential: the human being.' },
      { icon: Users, title: 'Diversity', desc: 'A diverse team that serves all realities and contexts.' },
    ],
    teamLabel: 'Our team',
    teamTitle: 'The people behind the process',
    teamText: 'Meet some of the professionals who make Psique Amor possible.',
    viewProfile: 'View profile',
    ctaTitle: 'Start your journey today.',
    ctaText: 'A first step, however small, is already progress. We are here to support you.',
    ctaBtn: 'Book an appointment',
    ctaBtnSec: 'Explore our services',
  },
} as const;

const stats = [
  { value: '2018', labelEs: 'Año de fundación', labelEn: 'Founded' },
  { value: '1200+', labelEs: 'Pacientes acompañados', labelEn: 'Patients supported' },
  { value: '98%', labelEs: 'Satisfacción reportada', labelEn: 'Reported satisfaction' },
  { value: '3', labelEs: 'Modalidades de atención', labelEn: 'Care modalities' },
];

export default function AboutPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const team = professionals.slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1 pt-[82px] sm:pt-[86px]">

        {/* ===== HERO ===== */}
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-lilac-700 py-24 sm:py-32">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,.12),transparent_60%)]" />
          <div className="container-wide">
            <span className="eyebrow text-brand-200">{t.badge}</span>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {t.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/75">{t.intro}</p>
          </div>

          {/* Stats bar */}
          <div className="container-wide mt-16">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.value} className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-sm">
                  <p className="font-display text-3xl font-bold text-white">{s.value}</p>
                  <p className="mt-1 text-xs font-semibold text-white/65">
                    {language === 'es' ? s.labelEs : s.labelEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== HISTORIA ===== */}
        <section className="container-wide py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="eyebrow">{t.storyLabel}</span>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {t.storyTitle}
              </h2>
              <p className="mt-5 text-base leading-8 text-ink/65">{t.storyText}</p>
            </div>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-100 to-lilac-100 p-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white p-5 shadow-soft">
                  <Heart size={22} className="mb-3 text-brand-500" />
                  <p className="text-sm font-semibold text-ink">{t.missionLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-ink/60">{t.missionText}</p>
                </div>
                <div className="rounded-2xl bg-brand-gradient p-5 text-white shadow-soft">
                  <Eye size={22} className="mb-3 text-white/80" />
                  <p className="text-sm font-semibold">{t.visionLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-white/75">{t.visionText}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-white p-5 shadow-soft">
                <Sparkles size={22} className="mb-3 text-lilac-500" />
                <p className="text-sm leading-6 text-ink/65 italic">
                  {language === 'es'
                    ? '"La salud emocional no es un lujo. Es un derecho fundamental."'
                    : '"Emotional health is not a luxury. It is a fundamental right."'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== VALORES ===== */}
        <section className="bg-brand-50/50 py-20 sm:py-24">
          <div className="container-wide">
            <span className="eyebrow">{t.valuesLabel}</span>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {t.values.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.title}
                    className="group rounded-3xl border border-brand-100 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
                  >
                    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-gradient group-hover:text-white">
                      <Icon size={22} />
                    </div>
                    <h3 className="font-display text-base font-semibold text-ink">{v.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-ink/60">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== EQUIPO ===== */}
        <section className="container-wide py-20 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">{t.teamLabel}</span>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {t.teamTitle}
              </h2>
              <p className="mt-3 max-w-lg text-base text-ink/60">{t.teamText}</p>
            </div>
            <Link
              to="/profesionales"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-brand-300 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              {language === 'es' ? 'Ver todo el equipo' : 'View full team'} <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((p) => (
              <div
                key={p.name}
                className="group overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="relative overflow-hidden bg-gradient-to-br from-brand-100 to-lilac-100">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <p className="font-display text-base font-semibold text-ink">{p.name}</p>
                  <p className="text-xs text-brand-600">{p.specialty}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/55">{p.description}</p>
                  <Link
                    to="/profesionales"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
                  >
                    {t.viewProfile} <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="bg-gradient-to-br from-brand-600 via-brand-700 to-lilac-700 py-20 sm:py-24">
          <div className="container-wide text-center">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">{t.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-md text-base text-white/75">{t.ctaText}</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/agendar"
                className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-brand-700 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                {t.ctaBtn} <ArrowRight size={16} />
              </Link>
              <Link
                to="/servicios"
                className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                {t.ctaBtnSec}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
