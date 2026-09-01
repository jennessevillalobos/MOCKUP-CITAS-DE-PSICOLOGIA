import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface AdminUser {
  nombre: string;
  correo: string;
  rol: 'admin';
}

const STORAGE_KEY = 'psique-admin-user';

// Cuenta de prueba para esta etapa de frontend (sin backend real todavía).
export const ADMIN_DEMO: AdminUser = {
  nombre: 'Jennesse Villalobos',
  correo: 'admin@psiqueamor.com',
  rol: 'admin',
};

interface AdminAuthContextValue {
  user: AdminUser | null;
  login: (correo: string, nombre?: string) => void;
  loginDemo: () => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

function readStoredUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.rol === 'admin' && typeof parsed.correo === 'string') return parsed as AdminUser;
    return null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => readStoredUser());

  const persist = useCallback((next: AdminUser | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage no disponible; la sesión seguirá viva solo en memoria durante esta visita.
    }
  }, []);

  const login = useCallback(
    (correo: string, nombre?: string) => {
      const derivedNombre =
        nombre ||
        correo
          .split('@')[0]
          .split(/[._-]/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      persist({ nombre: derivedNombre, correo, rol: 'admin' });
    },
    [persist]
  );

  const loginDemo = useCallback(() => {
    persist(ADMIN_DEMO);
  }, [persist]);

  const logout = useCallback(() => {
    persist(null);
  }, [persist]);

  return (
    <AdminAuthContext.Provider value={{ user, login, loginDemo, logout }}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth debe usarse dentro de <AdminAuthProvider>');
  return ctx;
}
