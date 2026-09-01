import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ArrowLeft, Languages, UserRound, GraduationCap } from 'lucide-react';
import { useSiteAuth, type SiteRole } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const logo = '/src/assets/logos/1_(1).png';
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const text = {
  es: {
    tag: 'Acceso', roleQuestion: '¿Cómo quieres ingresar?',
    rolePaciente: 'Soy paciente', roleProfesional: 'Soy profesional',
    tabLogin: 'Iniciar sesión', tabRegistro: 'Crear cuenta',
    titleLogin: 'Bienvenid@ de vuelta', subtitleLogin: 'Accede a tu espacio de bienestar.',
    titleRegistro: 'Crea tu cuenta', subtitleRegistro: 'Empieza a cuidar tu bienestar hoy.',
    google: 'Continuar con Google', or: 'o con tu correo', orShort: 'o',
    nombrePh: 'Nombre completo', correoPh: 'Correo electrónico', passPh: 'Contraseña', confPh: 'Confirmar contraseña',
    nombreErr: 'Ingresa tu nombre.', correoErr: 'Correo no válido.', passErr: 'Mínimo 6 caracteres.', confErr: 'Las contraseñas no coinciden.',
    termsErr: 'Debes aceptar para continuar.', terms1: 'Acepto los ', terms2: 'Términos', terms3: ' y la ', terms4: 'Política de Privacidad', terms5: '.',
    wrongCreds: 'Correo o contraseña incorrectos.',
    enterLogin: 'Iniciar sesión', enterRegistro: 'Crear cuenta',
    demo: 'Entrar con cuenta demo', hint: 'Prueba: cualquier correo válido y contraseña de 6+ caracteres, o usa la cuenta demo.',
    switchToRegistro: '¿No tienes cuenta?', switchToRegistroLink: 'Regístrate',
    switchToLogin: '¿Ya tienes cuenta?', switchToLoginLink: 'Inicia sesión',
    back: 'Volver al inicio', showPass: 'Mostrar contraseña', hidePass: 'Ocultar contraseña',
    forgotPass: '¿Olvidaste tu contraseña?',
  },
  en: {
    tag: 'Access', roleQuestion: 'How do you want to sign in?',
    rolePaciente: "I'm a patient", roleProfesional: "I'm a professional",
    tabLogin: 'Log in', tabRegistro: 'Create account',
    titleLogin: 'Welcome back', subtitleLogin: 'Access your wellbeing space.',
    titleRegistro: 'Create your account', subtitleRegistro: 'Start caring for your wellbeing today.',
    google: 'Continue with Google', or: 'or with your email', orShort: 'or',
    nombrePh: 'Full name', correoPh: 'Email address', passPh: 'Password', confPh: 'Confirm password',
    nombreErr: 'Enter your name.', correoErr: 'Invalid email.', passErr: 'Minimum 6 characters.', confErr: "Passwords don't match.",
    termsErr: 'You must accept to continue.', terms1: 'I accept the ', terms2: 'Terms', terms3: ' and the ', terms4: 'Privacy Policy', terms5: '.',
    wrongCreds: 'Incorrect email or password.',
    enterLogin: 'Log in', enterRegistro: 'Create account',
    demo: 'Sign in with demo account', hint: 'Try: any valid email and a 6+ character password, or use the demo account.',
    switchToRegistro: 'No account?', switchToRegistroLink: 'Sign up',
    switchToLogin: 'Already have an account?', switchToLoginLink: 'Log in',
    back: 'Back to site', showPass: 'Show password', hidePass: 'Hide password',
    forgotPass: 'Forgot your password?',
  },
} as const;

function destinoDe(rol: SiteRole) {
  return rol === 'paciente' ? '/portal-paciente' : '/instructor';
}

export default function AuthPage() {
  const { login, loginAs, isRealAuth, loginWithPassword, registerWithPassword } = useSiteAuth();
  const { language, setLanguage } = useSiteLanguage();
  const t = text[language];
  const navigate = useNavigate();

  const [role, setRole] = useState<SiteRole>('paciente');
  const [view, setView] = useState<'login' | 'registro'>('login');

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [pass, setPass] = useState('');
  const [conf, setConf] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errores, setErrores] = useState<{ nombre?: string; correo?: string; pass?: string; conf?: string; terms?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cargando, setCargando] = useState<'form' | 'google' | 'demo' | null>(null);

  function irAlPortal(rol: SiteRole) {
    navigate(destinoDe(rol));
  }

  function handleGoogle() {
    setCargando('google');
    setTimeout(() => {
      setCargando(null);
      loginAs(role);
      irAlPortal(role);
    }, 800);
  }

  function handleDemo() {
    setCargando('demo');
    setTimeout(() => {
      setCargando(null);
      loginAs(role);
      irAlPortal(role);
    }, 600);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    setInfo(null);
    const correoValido = emailRe.test(correo.trim());
    const passValido = pass.length > 0;
    setErrores({ correo: correoValido ? undefined : t.correoErr, pass: passValido ? undefined : t.passErr });
    if (!correoValido || !passValido) return;

    setCargando('form');

    if (isRealAuth) {
      const res = await loginWithPassword(correo.trim(), pass);
      setCargando(null);
      if (res.error) {
        setErrorGeneral(res.error.message || t.wrongCreds);
        return;
      }
      irAlPortal(res.data.rol);
    } else {
      setTimeout(() => {
        setCargando(null);
        if (pass.length >= 6) {
          login(correo.trim(), role);
          irAlPortal(role);
        } else {
          setErrorGeneral(t.wrongCreds);
        }
      }, 600);
    }
  }

  async function handleRegistro(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    setInfo(null);
    const nombreValido = nombre.trim().length > 1;
    const correoValido = emailRe.test(correo.trim());
    const passValido = pass.length >= 6;
    const confValido = conf === pass && conf !== '';
    setErrores({
      nombre: nombreValido ? undefined : t.nombreErr,
      correo: correoValido ? undefined : t.correoErr,
      pass: passValido ? undefined : t.passErr,
      conf: confValido ? undefined : t.confErr,
      terms: terms ? undefined : t.termsErr,
    });
    if (!nombreValido || !correoValido || !passValido || !confValido || !terms) return;

    setCargando('form');

    if (isRealAuth) {
      const res = await registerWithPassword(correo.trim(), pass, nombre.trim(), role);
      setCargando(null);
      if (res.error) {
        setErrorGeneral(res.error.message || t.wrongCreds);
        return;
      }
      if (res.data.needsEmailConfirmation) {
        setInfo('Cuenta creada. Revisa tu correo para confirmar antes de iniciar sesión.');
        setView('login');
        return;
      }
      irAlPortal(res.data.user.rol);
    } else {
      setTimeout(() => {
        setCargando(null);
        login(correo.trim(), role, nombre.trim());
        irAlPortal(role);
      }, 600);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-4 py-10">
      <div className="pointer-events-none absolute -right-32 top-10 -z-10 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute left-[10%] bottom-10 -z-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <button
        type="button"
        onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
        className="absolute right-5 top-5 z-10 flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-brand-700 shadow-soft hover:bg-brand-50"
        aria-label="ES / EN"
      >
        <Languages size={14} />
        {language === 'es' ? 'ES' : 'EN'}
      </button>

      <Link
        to="/"
        aria-label={t.back}
        className="mb-7 inline-flex rounded-2xl bg-white px-5 py-3.5 shadow-lift transition duration-300 hover:-translate-y-1"
      >
        <img src={logo} alt="Psique Amor" className="w-[150px]" />
      </Link>

      <div className="w-full max-w-md">
        {/* Selector de rol */}
        <div className="mb-4 rounded-[28px] border border-white/60 bg-white/90 p-2 shadow-soft backdrop-blur">
          <p className="mb-2 px-2 pt-1 text-center text-xs font-bold uppercase tracking-widest text-ink/45">{t.roleQuestion}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('paciente')}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                role === 'paciente' ? 'bg-brand-gradient text-white shadow-soft' : 'bg-brand-50 text-ink/60 hover:bg-brand-100'
              }`}
            >
              <UserRound size={17} />
              {t.rolePaciente}
            </button>
            <button
              type="button"
              onClick={() => setRole('profesional')}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                role === 'profesional' ? 'bg-brand-gradient text-white shadow-soft' : 'bg-brand-50 text-ink/60 hover:bg-brand-100'
              }`}
            >
              <GraduationCap size={17} />
              {t.roleProfesional}
            </button>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/60 bg-white/90 p-7 shadow-lift backdrop-blur">
          <div className="mb-5 flex gap-1 rounded-full bg-brand-50 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setView('login')}
              className={`flex-1 rounded-full py-2 transition ${view === 'login' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink/50'}`}
            >
              {t.tabLogin}
            </button>
            <button
              type="button"
              onClick={() => setView('registro')}
              className={`flex-1 rounded-full py-2 transition ${view === 'registro' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink/50'}`}
            >
              {t.tabRegistro}
            </button>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink">{view === 'login' ? t.titleLogin : t.titleRegistro}</h1>
          <p className="mt-1 mb-6 text-sm leading-6 text-ink/60">{view === 'login' ? t.subtitleLogin : t.subtitleRegistro}</p>

          {errorGeneral && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>⚠️</span>
              <span>{errorGeneral}</span>
            </div>
          )}

          {info && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <span>ℹ️</span>
              <span>{info}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogle}
            disabled={cargando !== null}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-white border border-brand-100 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {cargando === 'google' ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.1 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.8-9.8 6.8-17.4z"/><path fill="#FBBC05" d="M10.4 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3l-7.8-6.1C.9 16.9 0 20.3 0 24s.9 7.1 2.6 10.4l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.6l-7.3-5.7c-2 1.4-4.7 2.3-8 2.3-6.3 0-11.7-3.6-13.6-8.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
                {t.google}
              </>
            )}
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
            <span className="h-px flex-1 bg-brand-100" />
            <span>{t.or}</span>
            <span className="h-px flex-1 bg-brand-100" />
          </div>

          {view === 'login' ? (
            <form onSubmit={handleLogin} noValidate className="space-y-3">
              <div>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder={t.correoPh}
                  className={`focus-ring w-full rounded-2xl border px-4 py-2.5 text-sm text-ink transition ${errores.correo ? 'border-rose-300' : 'border-brand-200'}`}
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
                    className={`focus-ring w-full rounded-2xl border px-4 py-2.5 pr-10 text-sm text-ink transition ${errores.pass ? 'border-rose-300' : 'border-brand-200'}`}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70" aria-label={showPass ? t.hidePass : t.showPass}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errores.pass && <p className="mt-1 text-xs text-rose-600">{errores.pass}</p>}
                <div className="mt-2 flex justify-end">
                  <Link to="/recuperar-password" className="text-xs font-semibold text-brand-600 hover:underline">
                    {t.forgotPass}
                  </Link>
                </div>
              </div>
              <button
                type="submit"
                disabled={cargando !== null}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cargando === 'form' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : t.enterLogin}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistro} noValidate className="space-y-3">
              <div>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={t.nombrePh}
                  className={`focus-ring w-full rounded-2xl border px-4 py-2.5 text-sm text-ink transition ${errores.nombre ? 'border-rose-300' : 'border-brand-200'}`}
                />
                {errores.nombre && <p className="mt-1 text-xs text-rose-600">{errores.nombre}</p>}
              </div>
              <div>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder={t.correoPh}
                  className={`focus-ring w-full rounded-2xl border px-4 py-2.5 text-sm text-ink transition ${errores.correo ? 'border-rose-300' : 'border-brand-200'}`}
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
                    className={`focus-ring w-full rounded-2xl border px-4 py-2.5 pr-10 text-sm text-ink transition ${errores.pass ? 'border-rose-300' : 'border-brand-200'}`}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70" aria-label={showPass ? t.hidePass : t.showPass}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errores.pass && <p className="mt-1 text-xs text-rose-600">{errores.pass}</p>}
              </div>
              <div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={conf}
                  onChange={(e) => setConf(e.target.value)}
                  placeholder={t.confPh}
                  className={`focus-ring w-full rounded-2xl border px-4 py-2.5 text-sm text-ink transition ${errores.conf ? 'border-rose-300' : 'border-brand-200'}`}
                />
                {errores.conf && <p className="mt-1 text-xs text-rose-600">{errores.conf}</p>}
              </div>
              <label className="flex items-start gap-2 text-xs text-ink/60">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                <span>
                  {t.terms1}<a href="#" className="font-semibold text-brand-600 hover:underline">{t.terms2}</a>{t.terms3}<a href="#" className="font-semibold text-brand-600 hover:underline">{t.terms4}</a>{t.terms5}
                </span>
              </label>
              {errores.terms && <p className="text-xs text-rose-600">{errores.terms}</p>}
              <button
                type="submit"
                disabled={cargando !== null}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cargando === 'form' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : t.enterRegistro}
              </button>
            </form>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
            <span className="h-px flex-1 bg-brand-100" />
            <span>{t.orShort}</span>
            <span className="h-px flex-1 bg-brand-100" />
          </div>

          <button
            type="button"
            onClick={handleDemo}
            disabled={cargando !== null}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-brand-200 bg-brand-50 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
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
          <p className="mt-3 text-center text-[11px] text-ink/40">{t.hint}</p>

          <p className="mt-4 text-center text-sm text-ink/55">
            {view === 'login' ? (
              <>{t.switchToRegistro} <button type="button" onClick={() => setView('registro')} className="font-semibold text-brand-600 hover:underline">{t.switchToRegistroLink}</button></>
            ) : (
              <>{t.switchToLogin} <button type="button" onClick={() => setView('login')} className="font-semibold text-brand-600 hover:underline">{t.switchToLoginLink}</button></>
            )}
          </p>
        </section>

        <div className="mt-6 flex items-center justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20"
          >
            <ArrowLeft size={13} />
            {t.back}
          </Link>
        </div>
      </div>
    </div>
  );
}
