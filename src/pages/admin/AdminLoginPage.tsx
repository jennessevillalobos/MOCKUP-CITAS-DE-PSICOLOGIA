import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ArrowLeft, Languages } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useAdminLanguage } from '@/context/AdminLanguageContext';

const logo = '/src/assets/logos/1_(1).png';
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const loginText = {
  es: {
    backoffice: 'Backoffice', title: 'Panel administrativo',
    subtitle: 'Acceso exclusivo para el equipo de PsiqueAmor. Si no trabajas aquí, esta sección no es para ti.',
    wrongCreds: 'Correo o contraseña incorrectos.', emailPh: 'Correo electrónico', passPh: 'Contraseña',
    emailErr: 'Correo no válido.', passErr: 'Ingresa tu contraseña.', enter: 'Entrar al panel', or: 'o',
    demo: 'Entrar con cuenta demo', hint: 'Prueba: cualquier correo válido y contraseña de 6+ caracteres, o usa la cuenta demo.',
    back: 'Volver al sitio', showPass: 'Mostrar contraseña', hidePass: 'Ocultar contraseña',
  },
  en: {
    backoffice: 'Backoffice', title: 'Admin panel',
    subtitle: 'Exclusive access for the PsiqueAmor team. If you don’t work here, this section isn’t for you.',
    wrongCreds: 'Incorrect email or password.', emailPh: 'Email address', passPh: 'Password',
    emailErr: 'Invalid email.', passErr: 'Enter your password.', enter: 'Sign in', or: 'or',
    demo: 'Sign in with demo account', hint: 'Try: any valid email and a 6+ character password, or use the demo account.',
    back: 'Back to site', showPass: 'Show password', hidePass: 'Hide password',
  },
} as const;

export default function AdminLoginPage() {
  const { login, loginDemo } = useAdminAuth();
  const { lang, toggle } = useAdminLanguage();
  const t = loginText[lang];
  const navigate = useNavigate();

  const [correo, setCorreo] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errores, setErrores] = useState<{ correo?: string; pass?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState(false);
  const [cargando, setCargando] = useState<'form' | 'demo' | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(false);

    const correoValido = emailRe.test(correo.trim());
    const passValido = pass.length > 0;
    setErrores({
      correo: correoValido ? undefined : t.emailErr,
      pass: passValido ? undefined : t.passErr,
    });
    if (!correoValido || !passValido) return;

    setCargando('form');
    setTimeout(() => {
      setCargando(null);
      if (pass.length >= 6) {
        login(correo.trim());
        navigate('/admin/dashboard');
      } else {
        setErrorGeneral(true);
      }
    }, 600);
  }

  function handleDemo() {
    setCargando('demo');
    setTimeout(() => {
      setCargando(null);
      loginDemo();
      navigate('/admin/dashboard');
    }, 600);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-mist-gradient px-4 py-10">
      <div className="pointer-events-none absolute -right-32 top-10 -z-10 h-[420px] w-[420px] rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute left-[10%] bottom-10 -z-10 h-72 w-72 rounded-full bg-lilac-300/30 blur-3xl" />

      <button
        type="button"
        onClick={toggle}
        className="absolute right-5 top-5 z-10 flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-brand-700 shadow-soft hover:bg-brand-50"
        aria-label="ES / EN"
      >
        <Languages size={14} />
        {lang === 'es' ? 'ES' : 'EN'}
      </button>

      <div className="mb-7 flex items-center gap-2">
        <div className="inline-flex rounded-xl bg-white px-3 py-2 shadow-soft">
          <img src={logo} alt="Psique Amor" className="w-[120px]" />
        </div>
        <span className="ml-1 rounded-full border border-brand-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-600">
          {t.backoffice}
        </span>
      </div>

      <div className="w-full max-w-md">
        <section className="rounded-[32px] border border-white/60 bg-white/90 p-7 shadow-lift backdrop-blur">
          <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
          <p className="mt-1 mb-6 text-sm leading-6 text-ink/60">
            {t.subtitle}
          </p>

          {errorGeneral && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>⚠️</span>
              <span>{t.wrongCreds}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <div>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder={t.emailPh}
                className={`focus-ring w-full rounded-2xl border px-4 py-2.5 text-sm text-ink transition ${
                  errores.correo ? 'border-rose-300' : 'border-brand-200'
                }`}
              />
              {errores.correo && <p className="mt-1 text-xs text-rose-600">{errores.correo}</p>}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder={t.passPh}
                  className={`focus-ring w-full rounded-2xl border px-4 py-2.5 pr-10 text-sm text-ink transition ${
                    errores.pass ? 'border-rose-300' : 'border-brand-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70"
                  aria-label={showPass ? t.hidePass : t.showPass}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errores.pass && <p className="mt-1 text-xs text-rose-600">{errores.pass}</p>}
            </div>

            <button
              type="submit"
              disabled={cargando !== null}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {cargando === 'form' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : t.enter}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
            <span className="h-px flex-1 bg-brand-100" />
            <span>{t.or}</span>
            <span className="h-px flex-1 bg-brand-100" />
          </div>

          <button
            type="button"
            onClick={handleDemo}
            disabled={cargando !== null}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-full border border-brand-200 bg-brand-50 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {cargando === 'demo' ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
            ) : (
              <>
                <KeyRound size={16} />
                {t.demo}
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[11px] text-ink/40">
            {t.hint}
          </p>
        </section>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-ink/50">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-ink/80">
            <ArrowLeft size={13} />
            {t.back}
          </Link>
        </div>
      </div>
    </div>
  );
}
