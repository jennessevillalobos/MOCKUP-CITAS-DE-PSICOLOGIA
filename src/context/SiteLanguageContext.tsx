import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type Language } from '@/i18n/translations';

interface SiteLanguageContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  toggle: () => void;
}

const SiteLanguageContext = createContext<SiteLanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'psique-language';

export function SiteLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'es';
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'en' ? 'en' : 'es';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<SiteLanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      toggle: () => setLanguageState((l) => (l === 'es' ? 'en' : 'es')),
    }),
    [language],
  );

  return <SiteLanguageContext.Provider value={value}>{children}</SiteLanguageContext.Provider>;
}

export function useSiteLanguage() {
  const ctx = useContext(SiteLanguageContext);
  if (!ctx) throw new Error('useSiteLanguage debe usarse dentro de SiteLanguageProvider');
  return ctx;
}
