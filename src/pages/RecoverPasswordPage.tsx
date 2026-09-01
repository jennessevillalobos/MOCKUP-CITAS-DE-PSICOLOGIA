import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const logo = '/src/assets/logos/1_(1).png';
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const text = {
  es: {
    back: 'Volver a inicio de sesión',
    title: 'Recuperar contraseña',
    subtitle: 'Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.',
    emailPh: 'Correo electrónico',
    emailErr: 'Ingresa un correo electrónico válido.',
    submit: 'Enviar enlace de recuperación',
    processing: 'Enviando...',
    successTitle: 'Correo enviado',
    successMsg: 'Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña en los próximos minutos.',
    backToLogin: 'Ir a iniciar sesión',
  },
  en: {
    back: 'Back to login',
    title: 'Recover password',
    subtitle: 'Enter your email address and we will send you instructions to reset your password.',
    emailPh: 'Email address',
    emailErr: 'Enter a valid email address.',
    submit: 'Send recovery link',
    processing: 'Sending...',
    successTitle: 'Email sent',
    successMsg: 'If an account is associated with that email, you will receive a password reset link in the next few minutes.',
    backToLogin: 'Go to login',
  },
} as const;

export default function RecoverPasswordPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const mail = email.trim();
    if (!emailRe.test(mail)) {
      setError(t.emailErr);
      return;
    }

    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen bg-brand-50/50">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          
          <Link to="/iniciar-sesion" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-brand-600 transition">
            <ArrowLeft size={16} /> {t.back}
          </Link>

          <Link to="/" className="inline-block">
            <img src={logo} alt="Psique Amor" className="h-10 w-auto" />
          </Link>

          <div className="mt-8">
            <div className="mb-2 flex items-center gap-2 text-brand-600">
              <KeyRound size={20} />
            </div>
            <h2 className="font-display text-3xl font-semibold text-ink">
              {isSuccess ? t.successTitle : t.title}
            </h2>
            <p className="mt-2 text-sm text-ink/60">
              {isSuccess ? t.successMsg : t.subtitle}
            </p>
          </div>

          <div className="mt-10">
            {isSuccess ? (
              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
                <p className="text-sm font-semibold text-ink">{t.successTitle}</p>
                <p className="mt-1 text-xs leading-5 text-ink/65">{t.successMsg}</p>
                <Link
                  to="/iniciar-sesion"
                  className="focus-ring mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5"
                >
                  {t.backToLogin}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-ink">
                    {t.emailPh}
                  </label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3.5 top-3.5 text-ink/40" size={18} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`block w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-ink outline-none transition focus:ring-4 ${
                        error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-brand-200 focus:border-brand-400 focus:ring-brand-100'
                      }`}
                      placeholder="nombre@ejemplo.com"
                    />
                  </div>
                  {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {isProcessing ? (
                    <><Loader2 size={16} className="animate-spin" /> {t.processing}</>
                  ) : (
                    t.submit
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Decorative side panel */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-brand-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,.15),transparent_60%)]" />
        <img
          className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-30 grayscale"
          src="https://images.pexels.com/photos/33231556/pexels-photo-33231556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt=""
        />
        <div className="absolute inset-0 flex items-center justify-center p-20">
          <div className="max-w-lg rounded-3xl border border-white/20 bg-white/10 p-10 backdrop-blur-md">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white/20 text-white shadow-soft">
              <KeyRound size={28} />
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white">
              {language === 'es' ? 'Recupera tu acceso' : 'Recover your access'}
            </h2>
            <p className="mt-4 text-base leading-7 text-white/80">
              {language === 'es'
                ? 'Entendemos que puedes olvidar tu contraseña. En Psique Amor, aseguramos que siempre puedas retomar tu camino hacia el bienestar sin complicaciones.'
                : 'We understand you might forget your password. At Psique Amor, we make sure you can always resume your path to wellbeing without complications.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
