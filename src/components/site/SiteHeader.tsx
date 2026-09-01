import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { translations } from '@/i18n/translations';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const logo = '/src/assets/logos/1_(1).png';

// Ítems del menú principal del sitio público. `route` = página propia ya
// construida (usa React Router); si no tiene `route`, el enlace apunta de
// vuelta al home con un ancla (`/#id`) — funciona desde cualquier página y
// se actualiza a `route` en cuanto esa sección se convierta en página propia.
const navIds = ['top', 'services', 'professionals', 'courses', 'store', 'resources', 'contact'];
const navRoutes: Record<number, string> = { 1: '/servicios', 2: '/profesionales', 3: '/cursos', 4: '/tienda', 5: '/recursos', 6: '/contacto' };

export default function SiteHeader() {
  const location = useLocation();
  const { language, setLanguage } = useSiteLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = translations[language];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 shadow-[0_8px_30px_rgba(45,72,95,.08)] backdrop-blur-lg' : 'bg-white/75 backdrop-blur-sm'}`}>
      <div className="container-wide flex h-[82px] items-center justify-between gap-5 transition-all duration-300 sm:h-[86px]">
        <Link to="/" aria-label="Psique Amor" className="focus-ring shrink-0">
          <img src={logo} alt="Psique Amor" className="w-[106px] sm:w-[124px]" />
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary navigation">
          {t.nav.map((item, i) => {
            const route = navRoutes[i];
            const isActive = route ? location.pathname === route : false;
            const cls = `focus-ring relative py-3 text-[12px] font-semibold transition-colors after:absolute after:bottom-0 after:left-0 after:h-px after:bg-brand-600 after:transition-all ${
              isActive ? 'text-brand-700 after:w-full' : 'text-ink/65 after:w-0 hover:text-brand-600 hover:after:w-full'
            }`;
            return route ? (
              <Link key={item} to={route} className={cls}>{item}</Link>
            ) : (
              <a key={item} href={`/#${navIds[i]}`} className={cls}>{item}</a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex gap-1 rounded-full bg-brand-50 p-1 text-[10px] font-bold">
            <button onClick={() => setLanguage('es')} className={`rounded-full px-2 py-1 ${language === 'es' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink/45'}`}>ES</button>
            <button onClick={() => setLanguage('en')} className={`rounded-full px-2 py-1 ${language === 'en' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink/45'}`}>EN</button>
          </div>
          <Link to="/iniciar-sesion" className="text-xs font-bold text-ink/65 hover:text-brand-600">{language === 'es' ? 'Iniciar sesión' : 'Log in'}</Link>
          <Link to="/agendar" className="focus-ring inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-[0_12px_28px_rgba(93,131,167,.28)] transition duration-300 hover:-translate-y-1 hover:shadow-lift">
            {t.primary}<ArrowRight size={15} />
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex gap-1 rounded-full bg-brand-50 p-1 text-[10px] font-bold">
            <button onClick={() => setLanguage('es')} className={`rounded-full px-2 py-1 ${language === 'es' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink/45'}`}>ES</button>
            <button onClick={() => setLanguage('en')} className={`rounded-full px-2 py-1 ${language === 'en' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink/45'}`}>EN</button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="focus-ring grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div className={`lg:hidden ${menuOpen ? 'max-h-[460px] border-t border-brand-100' : 'max-h-0'} overflow-hidden bg-white transition-all duration-500`}>
        <nav className="container-wide flex flex-col gap-1 py-4">
          {t.nav.map((item, i) => {
            const route = navRoutes[i];
            return route ? (
              <Link key={item} to={route} onClick={() => setMenuOpen(false)} className="focus-ring rounded-xl px-4 py-3 text-sm font-semibold text-ink/75 hover:bg-brand-50 hover:text-brand-700">{item}</Link>
            ) : (
              <a key={item} href={`/#${navIds[i]}`} onClick={() => setMenuOpen(false)} className="focus-ring rounded-xl px-4 py-3 text-sm font-semibold text-ink/75 hover:bg-brand-50 hover:text-brand-700">{item}</a>
            );
          })}
          <div className="mt-3 flex flex-wrap gap-3 border-t border-brand-100 pt-4">
            <Link to="/iniciar-sesion" onClick={() => setMenuOpen(false)} className="rounded-full border border-brand-300 px-4 py-3 text-sm font-bold text-brand-700">{language === 'es' ? 'Iniciar sesión' : 'Log in'}</Link>
            <Link to="/agendar" onClick={() => setMenuOpen(false)} className="focus-ring inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-[0_12px_28px_rgba(93,131,167,.28)]">
              {t.primary}<ArrowRight size={15} />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
