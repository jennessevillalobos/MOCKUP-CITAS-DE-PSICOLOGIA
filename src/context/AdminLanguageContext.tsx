import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AdminLang = 'es' | 'en';

interface AdminLanguageContextValue {
  lang: AdminLang;
  toggle: () => void;
  setLang: (l: AdminLang) => void;
}

const AdminLanguageContext = createContext<AdminLanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'psique-admin-lang';

export function AdminLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>(() => {
    if (typeof window === 'undefined') return 'es';
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'en' ? 'en' : 'es';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const value = useMemo<AdminLanguageContextValue>(
    () => ({
      lang,
      toggle: () => setLangState((l) => (l === 'es' ? 'en' : 'es')),
      setLang: setLangState,
    }),
    [lang],
  );

  return <AdminLanguageContext.Provider value={value}>{children}</AdminLanguageContext.Provider>;
}

export function useAdminLanguage() {
  const ctx = useContext(AdminLanguageContext);
  if (!ctx) throw new Error('useAdminLanguage debe usarse dentro de AdminLanguageProvider');
  return ctx;
}

/** Selecciona es/en de un par según el idioma activo. */
export function pick<T>(lang: AdminLang, es: T, en: T): T {
  return lang === 'es' ? es : en;
}
