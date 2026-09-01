import { useState, type FormEvent } from 'react';
import {
  ArrowRight, Check, ChevronDown, Clock3, Instagram, Laptop, Linkedin, Mail,
  MapPin, MessageCircle, Phone, Youtube,
} from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { contactConfig } from '@/config/contact';
import { SEDES, FAQ_CATEGORIAS } from '@/data/contactPageData';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const logo = '/src/assets/logos/1_(1).png';
const officeImage = 'https://images.pexels.com/photos/33812025/pexels-photo-33812025.jpeg?auto=compress&cs=tinysrgb&h=800&w=1400';
const contactImage = 'https://images.pexels.com/photos/5991144/pexels-photo-5991144.jpeg?auto=compress&cs=tinysrgb&h=1200&w=900';

const text = {
  es: {
    breadcrumbHome: 'Inicio', breadcrumbCurrent: 'Contacto',
    title: 'Hablemos',
    subtitle: '¿Tienes dudas o quieres agendar? Escríbenos y te responderemos en menos de 24 horas.',
    formName: 'Nombre', formEmail: 'Correo', formPhone: 'Teléfono (opcional)', formSubject: 'Asunto', formMessage: 'Mensaje',
    subjectPlaceholder: 'Selecciona…', subjects: ['Agendar una cita', 'Información de cursos', 'Soporte de pago', 'Otro'],
    messagePlaceholder: 'Cuéntanos cómo podemos ayudarte…',
    privacy: 'Acepto la Política de Privacidad y el tratamiento de mis datos.',
    send: 'Enviar mensaje', sending: 'Enviando…', success: '¡Gracias! Tu mensaje fue enviado. Te responderemos pronto.',
    contactDetails: 'Datos de contacto', message: 'Un primer mensaje también puede ser una forma de cuidarte.',
    whatsapp: 'Escríbenos por WhatsApp', social: 'Redes sociales',
    locationsTitle: 'Lugares de atención',
    onlineCare: 'Atención online', onlineCareText: 'Disponible en todo el país', directions: 'Cómo llegar',
    faqLabel: 'FAQ', faqTitle: 'Preguntas frecuentes',
    required: 'Este campo es obligatorio.', emailError: 'Escribe un correo válido.', messageError: 'Escribe tu mensaje (mín. 10 caracteres).', privacyError: 'Necesitas aceptar la política para continuar.',
  },
  en: {
    breadcrumbHome: 'Home', breadcrumbCurrent: 'Contact',
    title: "Let's talk",
    subtitle: 'Questions or want to book? Write to us and we will reply within 24 hours.',
    formName: 'Name', formEmail: 'Email', formPhone: 'Phone (optional)', formSubject: 'Subject', formMessage: 'Message',
    subjectPlaceholder: 'Select…', subjects: ['Book an appointment', 'Course information', 'Payment support', 'Other'],
    messagePlaceholder: 'Tell us how we can help…',
    privacy: 'I accept the Privacy Policy and the processing of my data.',
    send: 'Send message', sending: 'Sending…', success: 'Thank you! Your message was sent. We will reply soon.',
    contactDetails: 'Contact details', message: 'A first message can also be a way of caring for yourself.',
    whatsapp: 'Chat on WhatsApp', social: 'Social',
    locationsTitle: 'Our locations',
    onlineCare: 'Online care', onlineCareText: 'Available nationwide', directions: 'Directions',
    faqLabel: 'FAQ', faqTitle: 'Frequently asked questions',
    required: 'This field is required.', emailError: 'Enter a valid email.', messageError: 'Write your message (min. 10 characters).', privacyError: 'You need to accept the policy to continue.',
  },
} as const;

export default function ContactPage() {
  const { language } = useSiteLanguage();
  const t = text[language];

  const [form, setForm] = useState({ nombre: '', correo: '', telefono: '', asunto: '', mensaje: '', privacidad: false });
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    nombre: form.nombre.trim().length < 2,
    correo: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo),
    asunto: form.asunto.trim() === '',
    mensaje: form.mensaje.trim().length < 10,
    privacidad: !form.privacidad,
  };
  const isValid = !Object.values(errors).some(Boolean);

  function submitForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setSubmitted(true);
    }, 900);
  }

  const [faqActive, setFaqActive] = useState(0);
  const [faqOpen, setFaqOpen] = useState<string | null>(null);

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

        {/* Form + Info */}
        <section className="container-wide py-14 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <form onSubmit={submitForm} noValidate className="rounded-[32px] border border-brand-100 bg-white p-7 shadow-soft sm:p-9">
              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-bold text-ink/70">{t.formName} *</span>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ana Pérez"
                    className="mt-2 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  />
                  {touched && errors.nombre && <p className="mt-1 text-xs text-red-500">{t.required}</p>}
                </label>
                <label>
                  <span className="text-xs font-bold text-ink/70">{t.formEmail} *</span>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })}
                    placeholder="ana@correo.com"
                    className="mt-2 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  />
                  {touched && errors.correo && <p className="mt-1 text-xs text-red-500">{t.emailError}</p>}
                </label>
                <label>
                  <span className="text-xs font-bold text-ink/70">{t.formPhone}</span>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="+58 412 000 0000"
                    className="mt-2 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  />
                </label>
                <label>
                  <span className="text-xs font-bold text-ink/70">{t.formSubject} *</span>
                  <select
                    value={form.asunto}
                    onChange={(e) => setForm({ ...form, asunto: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  >
                    <option value="">{t.subjectPlaceholder}</option>
                    {t.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {touched && errors.asunto && <p className="mt-1 text-xs text-red-500">{t.required}</p>}
                </label>
              </div>
              <label className="mt-5 block">
                <span className="text-xs font-bold text-ink/70">{t.formMessage} *</span>
                <textarea
                  rows={5}
                  value={form.mensaje}
                  onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                  placeholder={t.messagePlaceholder}
                  className="mt-2 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                />
                {touched && errors.mensaje && <p className="mt-1 text-xs text-red-500">{t.messageError}</p>}
              </label>
              <label className="mt-4 flex items-start gap-2 text-xs text-ink/60">
                <input
                  type="checkbox"
                  checked={form.privacidad}
                  onChange={(e) => setForm({ ...form, privacidad: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-brand-600"
                />
                {t.privacy}
              </label>
              {touched && errors.privacidad && <p className="mt-1 text-xs text-red-500">{t.privacyError}</p>}

              <button
                type="submit"
                disabled={sending || submitted}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? t.sending : submitted ? <><Check size={16} />{t.success}</> : t.send}
                {!sending && !submitted && <ArrowRight size={15} />}
              </button>
              {submitted && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-ink/70">
                  <Check size={16} className="shrink-0 text-brand-600" />
                  {t.success}
                </div>
              )}
            </form>

            <aside className="flex flex-col gap-5">
              <div className="relative overflow-hidden rounded-[32px] p-8 text-white shadow-soft sm:p-9">
                <img src={contactImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-brand-900/50 via-brand-900/75 to-brand-900/90" />
                <div className="relative">
                  <div className="mb-10 inline-flex rounded-xl bg-white px-4 py-3">
                    <img src={logo} alt="Psique Amor" className="w-[130px]" />
                  </div>
                  <p className="max-w-xs font-display text-xl leading-snug">{t.message}</p>
                  <div className="mt-9 space-y-4 text-sm text-white/85">
                    <a href={`mailto:${contactConfig.email}`} className="flex items-center gap-3 hover:text-white"><Mail size={17} />{contactConfig.email}</a>
                    <a href={contactConfig.whatsapp} className="flex items-center gap-3 hover:text-white"><Phone size={17} />{contactConfig.phone}</a>
                    <div className="flex items-center gap-3"><Clock3 size={17} />{contactConfig.hours}</div>
                  </div>
                  <a
                    href={contactConfig.whatsapp}
                    className="mt-8 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white shadow-soft transition hover:opacity-90"
                  >
                    <MessageCircle size={17} />
                    {t.whatsapp}
                  </a>
                </div>
              </div>

              <div className="rounded-[28px] border border-brand-100 bg-white p-6 shadow-soft">
                <h2 className="text-sm font-bold text-ink">{t.social}</h2>
                <div className="mt-4 flex gap-3">
                  <a href="#" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full border border-brand-100 text-ink/60 transition hover:bg-brand-50 hover:text-brand-600"><Instagram size={16} /></a>
                  <a href="#" aria-label="LinkedIn" className="grid h-10 w-10 place-items-center rounded-full border border-brand-100 text-ink/60 transition hover:bg-brand-50 hover:text-brand-600"><Linkedin size={16} /></a>
                  <a href="#" aria-label="Youtube" className="grid h-10 w-10 place-items-center rounded-full border border-brand-100 text-ink/60 transition hover:bg-brand-50 hover:text-brand-600"><Youtube size={16} /></a>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Locations */}
        <section className="bg-brand-50/60 py-14 sm:py-16">
          <div className="container-wide">
            <h2 className="text-2xl font-semibold text-ink sm:text-3xl">{t.locationsTitle}</h2>
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="relative min-h-[280px] overflow-hidden rounded-[32px] border border-brand-100 shadow-soft lg:col-span-2">
                <img src={officeImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
              </div>
              <div className="space-y-4">
                {SEDES.map((s) => (
                  <div key={s.key} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
                    <p className="flex items-center gap-2 font-semibold text-ink"><MapPin size={15} className="text-brand-600" />{s.nombre}</p>
                    <p className="mt-1 text-sm text-ink/60">{s.direccion[language]}</p>
                    <a href="#" className="mt-2 inline-block text-xs font-bold text-brand-600 hover:text-brand-700">{t.directions} →</a>
                  </div>
                ))}
                <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Laptop size={18} /></span>
                  <div>
                    <p className="font-semibold text-ink">{t.onlineCare}</p>
                    <p className="text-sm text-ink/60">{t.onlineCareText}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container-wide py-14 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">{t.faqLabel}</p>
            <h2 className="mt-4 text-3xl font-semibold text-ink">{t.faqTitle}</h2>
          </div>
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {FAQ_CATEGORIAS.map((cat, i) => (
              <button
                key={cat.key}
                onClick={() => { setFaqActive(i); setFaqOpen(null); }}
                className={`h-9 rounded-full border px-4 text-sm font-semibold transition ${
                  faqActive === i ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 text-ink/60 hover:bg-brand-50'
                }`}
              >
                {cat.nombre[language]}
              </button>
            ))}
          </div>
          <div className="mx-auto mt-6 max-w-3xl space-y-3">
            {FAQ_CATEGORIAS[faqActive].preguntas.map((q, i) => {
              const id = `${faqActive}-${i}`;
              const open = faqOpen === id;
              return (
                <div key={id} className="rounded-2xl border border-brand-100 bg-white shadow-sm">
                  <button
                    onClick={() => setFaqOpen(open ? null : id)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left font-semibold text-ink"
                  >
                    {q.pregunta[language]}
                    <ChevronDown size={18} className={`shrink-0 text-brand-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <p className="px-5 pb-5 text-sm leading-6 text-ink/60">{q.respuesta[language]}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
