import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Loader2, Mail, CheckCircle2, Lock } from 'lucide-react';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

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
    sendErr: 'No pudimos enviar el correo en este momento. Inténtalo más tarde o escríbenos desde Contacto.',
    newTitle: 'Crea una nueva contraseña',
    newSubtitle: 'Escribe la contraseña que usarás a partir de ahora.',
    passPh: 'Nueva contraseña', confPh: 'Confirmar contraseña',
    passErr: 'Mínimo 6 caracteres.', confErr: 'Las contraseñas no coinciden.',
    save: 'Guardar contraseña', saving: 'Guardando...',
    expired: 'El enlace venció o ya se usó. Pide uno nuevo.',
    savedTitle: 'Contraseña actualizada',
    savedMsg: 'Ya puedes usar tu nueva contraseña.',
    goAccount: 'Ir a mi cuenta',
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
    sendErr: "We couldn't send the email right now. Try again later or write to us from Contact.",
    newTitle: 'Create a new password',
    newSubtitle: 'Type the password you will use from now on.',
    passPh: 'New password', confPh: 'Confirm password',
    passErr: 'Minimum 6 characters.', confErr: "Passwords don't match.",
    save: 'Save password', saving: 'Saving...',
    expired: 'The link expired or was already used. Request a new one.',
    savedTitle: 'Password updated',
    savedMsg: 'You can now use your new password.',
    goAccount: 'Go to my account',
  },
} as const;

export default function RecoverPasswordPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { user } = useSiteAuth();
  const real = isSupabaseConfigured();
  // El enlace del correo vuelve aquí con ?nueva=1 y una sesión de recuperación.
  const [searchParams] = useSearchParams();
  const modoNueva = real && searchParams.get('nueva') === '1';
  const [pass, setPass] = useState('');
  const [conf, setConf] = useState('');
  const [guardada, setGuardada] = useState(false);
  // Solo se permite cambiar la contraseña si se llegó desde el enlace del
  // correo (hash con type=recovery o ?code=). Se lee en el primer render, antes
  // de que el cliente de Supabase limpie la URL, y se recuerda en la pestaña.
  const [enlaceValido] = useState(() => {
    const valido = window.location.hash.includes('type=recovery') || searchParams.has('code');
    try {
      if (valido) sessionStorage.setItem('psiqueRecuperacion', '1');
      return valido || sessionStorage.getItem('psiqueRecuperacion') === '1';
    } catch {
      return valido;
    }
  });

  useEffect(() => {
    if (modoNueva && !enlaceValido) setError(t.expired);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (modoNueva && (searchParams.get('error_description') || hash.get('error_description'))) setError(t.expired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoNueva]);

  const handleNueva = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (pass.length < 6) return setError(t.passErr);
    if (pass !== conf) return setError(t.confErr);
    if (!enlaceValido) return setError(t.expired);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsProcessing(true);
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setIsProcessing(false);
      return setError(t.expired);
    }
    const { error: err } = await supabase.auth.updateUser({ password: pass });
    setIsProcessing(false);
    if (err) return setError(/different from the old/i.test(err.message) ? err.message : t.expired);
    try {
      sessionStorage.removeItem('psiqueRecuperacion');
    } catch {
      // sin sessionStorage
    }
    setGuardada(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const mail = email.trim();
    if (!emailRe.test(mail)) {
      setError(t.emailErr);
      return;
    }

    setIsProcessing(true);
    const supabase = getSupabaseClient();
    if (real && supabase) {
      const { error: err } = await supabase.auth.resetPasswordForEmail(mail.toLowerCase(), {
        redirectTo: `${window.location.origin}/recuperar-password?nueva=1`,
      });
      setIsProcessing(false);
      if (err) return setError(t.sendErr);
      setIsSuccess(true);
      return;
    }
    // Modo demo: no hay correo real.
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
              {modoNueva ? (guardada ? t.savedTitle : t.newTitle) : isSuccess ? t.successTitle : t.title}
            </h2>
            <p className="mt-2 text-sm text-ink/60">
              {modoNueva ? (guardada ? t.savedMsg : t.newSubtitle) : isSuccess ? t.successMsg : t.subtitle}
            </p>
          </div>

          <div className="mt-10">
            {modoNueva ? (
              guardada ? (
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
                  <p className="text-sm font-semibold text-ink">{t.savedTitle}</p>
                  <Link
                    to={user?.rol === 'profesional' ? '/instructor' : user ? '/portal-paciente' : '/iniciar-sesion'}
                    className="focus-ring mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5"
                  >
                    {user ? t.goAccount : t.backToLogin}
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleNueva} className="space-y-4">
                  {[
                    { id: 'pass', value: pass, set: setPass, ph: t.passPh },
                    { id: 'conf', value: conf, set: setConf, ph: t.confPh },
                  ].map((c) => (
                    <div key={c.id} className="relative">
                      <Lock className="absolute left-3.5 top-3.5 text-ink/40" size={18} />
                      <input
                        type="password"
                        value={c.value}
                        onChange={(e) => c.set(e.target.value)}
                        placeholder={c.ph}
                        aria-label={c.ph}
                        className="block w-full rounded-xl border border-brand-200 bg-white py-3 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                      />
                    </div>
                  ))}
                  {error && (
                    <p className="text-xs font-semibold text-red-500">
                      {error}{' '}
                      {error === t.expired && <Link to="/recuperar-password" className="underline">{t.submit}</Link>}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 disabled:opacity-70"
                  >
                    {isProcessing ? <><Loader2 size={16} className="animate-spin" /> {t.saving}</> : t.save}
                  </button>
                </form>
              )
            ) : isSuccess ? (
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
