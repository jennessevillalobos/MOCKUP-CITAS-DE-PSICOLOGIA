import { useState, type ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Bell, LogOut, ArrowLeft, type LucideIcon } from 'lucide-react';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const logo = '/src/assets/logos/1_(1).png';

export interface PortalNavItem {
  key: string;
  label: { es: string; en: string };
  icon: LucideIcon;
  // Secciones que aún no tienen contenido propio en esta etapa — se
  // muestran deshabilitadas con una etiqueta "Próximamente" en vez de un
  // enlace roto, igual que en el panel administrativo.
  disponible: boolean;
  // Si se define, el ítem navega a esta ruta (otra página) en vez de
  // disparar onNavigate (cambio de pestaña dentro de la misma página).
  to?: string;
}

function initials(nombreOCorreo: string) {
  const base = nombreOCorreo.trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

const text = {
  es: { menu: 'Menú', notifications: 'Notificaciones', logout: 'Cerrar sesión', logoutConfirm: '¿Cerrar sesión?', soon: 'Pronto', backToSite: 'Volver al sitio', miPerfil: 'Mi perfil' },
  en: { menu: 'Menu', notifications: 'Notifications', logout: 'Log out', logoutConfirm: 'Log out?', soon: 'Soon', backToSite: 'Back to site', miPerfil: 'My profile' },
};

export default function PortalLayout({
  navItems,
  activeKey,
  onNavigate,
  roleBadge,
  sidebarExtra,
  backTo,
  backLabel,
  profileTo,
  children,
}: {
  navItems: PortalNavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  roleBadge: { es: string; en: string };
  sidebarExtra?: ReactNode;
  // Enlace de "volver" fijo en la barra superior — siempre visible sin
  // necesidad de hacer scroll dentro del contenido de la página.
  backTo?: string;
  backLabel?: { es: string; en: string };
  // Si se define, el avatar+nombre de la barra superior se vuelve un
  // enlace a la página de "Mi perfil" de ese rol (ej. /instructor/perfil).
  // Si se omite, el bloque queda como texto no clicable (comportamiento
  // anterior) — así una página que aún no tiene perfil propio no rompe.
  profileTo?: string;
  children: ReactNode;
}) {
  const { user, logout } = useSiteAuth();
  const { language, setLanguage } = useSiteLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = text[language];

  function handleLogout() {
    if (!confirm(t.logoutConfirm)) return;
    logout();
    navigate('/iniciar-sesion');
  }

  const primerNombre = (user?.nombre || '').trim().split(/\s+/)[0] || (language === 'es' ? 'Usuario' : 'User');

  return (
    <div className="min-h-screen bg-brand-50/40">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-lg p-2 text-ink/60 hover:bg-brand-50 lg:hidden"
            aria-label={t.menu}
          >
            <Menu size={20} />
          </button>

          {backTo && (
            <Link
              to={backTo}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-100 py-2 pl-2 pr-3 text-sm font-semibold text-ink/60 hover:bg-brand-50 hover:text-ink"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">{backLabel ? backLabel[language] : t.backToSite}</span>
            </Link>
          )}

          <a href="/" className="flex items-center gap-2">
            <img src={logo} alt="Psique Amor" className="h-8 w-auto" />
            <span className="hidden font-display text-lg font-semibold text-ink lg:block">Psique Amor</span>
            <span className="ml-1 hidden rounded-full border border-brand-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-600 lg:inline-block">
              {roleBadge[language]}
            </span>
          </a>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex gap-1 rounded-full border border-brand-100 bg-brand-50/60 p-1 text-[10px] font-bold">
              <button onClick={() => setLanguage('es')} className={`rounded-full px-2 py-1 ${language === 'es' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink/45'}`}>ES</button>
              <button onClick={() => setLanguage('en')} className={`rounded-full px-2 py-1 ${language === 'en' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink/45'}`}>EN</button>
            </div>
            <button className="relative rounded-lg p-2 text-ink/60 hover:bg-brand-50" aria-label={t.notifications}>
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-lilac-500 ring-2 ring-white" />
            </button>
            <div className="ml-1 flex items-center gap-2 border-l border-brand-100 pl-3">
              {profileTo ? (
                <Link
                  to={profileTo}
                  className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-brand-50"
                  title={t.miPerfil}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient bg-cover bg-center text-sm font-semibold text-white"
                    style={user?.foto ? { backgroundImage: `url(${user.foto})` } : undefined}
                  >
                    {!user?.foto && initials(user?.nombre || user?.correo || '?')}
                  </span>
                  <div className="hidden leading-tight sm:block">
                    <p className="text-sm font-semibold text-ink">{primerNombre}</p>
                    <p className="text-[11px] text-ink/45">{roleBadge[language]}</p>
                  </div>
                </Link>
              ) : (
                <>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                    {initials(user?.nombre || user?.correo || '?')}
                  </span>
                  <div className="hidden leading-tight sm:block">
                    <p className="text-sm font-semibold text-ink">{primerNombre}</p>
                    <p className="text-[11px] text-ink/45">{roleBadge[language]}</p>
                  </div>
                </>
              )}
              <button
                onClick={handleLogout}
                className="ml-1 rounded-lg p-2 text-ink/45 hover:bg-brand-50 hover:text-ink"
                title={t.logout}
                aria-label={t.logout}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed z-50 h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-brand-900/40 bg-brand-800 transition-transform duration-200 lg:sticky lg:top-16 lg:z-0 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ top: '4rem' }}
        >
          <nav className="py-4 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (!item.disponible) {
                return (
                  <span
                    key={item.key}
                    className="flex cursor-not-allowed select-none items-center gap-3 px-5 py-2.5 text-brand-300/60"
                    title={t.soon}
                  >
                    <Icon size={17} />
                    <span className="flex-1 truncate">{item.label[language]}</span>
                    <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
                      {t.soon}
                    </span>
                  </span>
                );
              }
              const isActive = item.key === activeKey;
              const cls = `flex w-full items-center gap-3 border-l-[3px] px-5 py-2.5 text-left transition ${
                isActive
                  ? 'border-white bg-white/12 font-semibold text-white'
                  : 'border-transparent text-brand-100/80 hover:bg-white/8 hover:text-white'
              }`;
              if (item.to) {
                return (
                  <Link key={item.key} to={item.to} onClick={() => setSidebarOpen(false)} className={cls}>
                    <Icon size={17} />
                    <span className="truncate">{item.label[language]}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    onNavigate(item.key);
                    setSidebarOpen(false);
                  }}
                  className={cls}
                >
                  <Icon size={17} />
                  <span className="truncate">{item.label[language]}</span>
                </button>
              );
            })}

            {sidebarExtra && <div className="mx-5 my-4">{sidebarExtra}</div>}

            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 px-5 py-2.5 text-sm text-brand-100/70 hover:bg-white/8 hover:text-white"
            >
              <LogOut size={16} />
              {t.logout}
            </button>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
