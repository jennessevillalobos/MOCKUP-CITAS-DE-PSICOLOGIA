import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, LogOut, Lock, Languages } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import { adminT } from '@/i18n/adminTranslations';
import { adminNavGroups } from '@/config/adminNav';

const logo = '/src/assets/logos/1_(1).png';

function initials(nombreOCorreo: string) {
  const base = nombreOCorreo.trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAdminAuth();
  const { lang, toggle } = useAdminLanguage();
  const t = adminT[lang];
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    if (!confirm(t.logoutConfirm)) return;
    logout();
    navigate('/admin');
  }

  const primerNombre = (user?.nombre || '').trim().split(/\s+/)[0] || 'Admin';

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

          <a href="/" className="flex items-center gap-2">
            <img src={logo} alt="Psique Amor" className="h-8 w-auto" />
            <span className="font-display text-lg font-semibold text-ink">Psique Amor</span>
            <span className="ml-1 rounded-full border border-brand-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-600">
              {t.brandTag}
            </span>
          </a>

          <div className="ml-4 hidden h-10 w-72 items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/60 px-3 md:flex">
            <Search size={15} className="text-ink/35" />
            <input
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
              placeholder={t.searchPlaceholder}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 rounded-lg border border-brand-100 px-2.5 py-2 text-xs font-bold text-ink/60 hover:bg-brand-50"
              title={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
              aria-label="ES / EN"
            >
              <Languages size={16} />
              {t.langToggleLabel}
            </button>
            <button className="relative rounded-lg p-2 text-ink/60 hover:bg-brand-50" aria-label={t.notifications}>
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-lilac-500 ring-2 ring-white" />
            </button>
            <div className="ml-1 flex items-center gap-2 border-l border-brand-100 pl-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                {initials(user?.nombre || user?.correo || '?')}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-ink">{primerNombre}</p>
                <p className="text-[11px] text-ink/45">{t.role}</p>
              </div>
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
            {adminNavGroups.map((group) => (
              <div key={group.title}>
                <p className="px-5 pb-2 pt-4 text-[11px] font-bold uppercase tracking-widest text-brand-300">
                  {t.navGroups[group.title] ?? group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const label = t.navItems[item.label] ?? item.label;
                  if (!item.disponible) {
                    return (
                      <span
                        key={item.path}
                        className="flex cursor-not-allowed select-none items-center gap-3 px-5 py-2.5 text-brand-300/60"
                        title={t.soon}
                      >
                        <Icon size={17} />
                        <span className="flex-1 truncate">{label}</span>
                        <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
                          {t.soon}
                        </span>
                      </span>
                    );
                  }
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 border-l-[3px] px-5 py-2.5 transition ${
                          isActive
                            ? 'border-white bg-white/12 font-semibold text-white'
                            : 'border-transparent text-brand-100/80 hover:bg-white/8 hover:text-white'
                        }`
                      }
                    >
                      <Icon size={17} />
                      <span className="truncate">{label}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}

            <div className="mx-5 my-4 rounded-2xl border border-white/15 bg-white/8 p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-brand-100/70">
                <Lock size={12} />
                {t.demoData}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t.allOk}
              </p>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
