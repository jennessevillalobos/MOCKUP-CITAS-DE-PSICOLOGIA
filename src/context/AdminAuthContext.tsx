import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { esAdmin } from '@/lib/api/admin';

export interface AdminUser {
  nombre: string;
  correo: string;
  rol: 'admin';
}

const STORAGE_KEY = 'psique-admin-user';

// Cuenta de prueba del modo demo (sin Supabase configurado).
export const ADMIN_DEMO: AdminUser = {
  nombre: 'Jennesse Villalobos',
  correo: 'admin@psiqueamor.com',
  rol: 'admin',
};

export type ErrorLoginAdmin = 'credenciales' | 'no_admin' | 'red';

interface AdminAuthContextValue {
  user: AdminUser | null;
  // true con Supabase configurado: acceso real (rol `administrador`), sin demo.
  esReal: boolean;
  // Mientras se comprueba una sesión guardada (evita mandar al login antes de tiempo).
  verificando: boolean;
  // Modo demo: cualquier correo. Modo real: correo + contraseña de Supabase y rol administrador.
  login: (correo: string, contrasena: string) => Promise<ErrorLoginAdmin | null>;
  loginDemo: () => void;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

function readStoredUser(): AdminUser | null {
  // Con Supabase la sesión del admin no se toma de localStorage: se valida en la base.
  if (isSupabaseConfigured()) return null;
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

function nombreDesdeCorreo(correo: string) {
  return correo.split('@')[0].split(/[._-]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Datos del admin con sesión real: nombre de `usuarios` (o del correo).
async function adminDesdeSesion(): Promise<AdminUser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const authUser = data.session?.user;
  if (!authUser || !(await esAdmin())) return null;
  const { data: fila } = await supabase.from('usuarios').select('nombre').eq('id', authUser.id).maybeSingle();
  const correo = authUser.email ?? '';
  return { nombre: fila?.nombre || nombreDesdeCorreo(correo), correo, rol: 'admin' };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const esReal = isSupabaseConfigured();
  const [user, setUser] = useState<AdminUser | null>(() => readStoredUser());
  const [verificando, setVerificando] = useState(esReal);

  const persist = useCallback((next: AdminUser | null) => {
    setUser(next);
    if (esReal) return;
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage no disponible; la sesión seguirá viva solo en memoria durante esta visita.
    }
  }, [esReal]);

  // Modo real: al cargar, una sesión guardada solo vale si es de un administrador.
  useEffect(() => {
    if (!esReal) return;
    try {
      localStorage.removeItem(STORAGE_KEY); // restos del modo demo
    } catch {
      // sin localStorage
    }
    let vigente = true;
    void adminDesdeSesion().then((admin) => {
      if (!vigente) return;
      setUser(admin);
      setVerificando(false);
    });
    const supabase = getSupabaseClient();
    const sub = supabase?.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') setUser(null);
    });
    return () => {
      vigente = false;
      sub?.data.subscription.unsubscribe();
    };
  }, [esReal]);

  const login = useCallback(async (correo: string, contrasena: string): Promise<ErrorLoginAdmin | null> => {
    if (!esReal) {
      if (contrasena.length < 6) return 'credenciales';
      persist({ nombre: nombreDesdeCorreo(correo), correo, rol: 'admin' });
      return null;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return 'red';
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
    if (error) return /network|fetch/i.test(error.message) ? 'red' : 'credenciales';
    const admin = await adminDesdeSesion();
    if (!admin) {
      // Cuenta válida pero sin rol de administrador: no se deja la sesión abierta aquí.
      await supabase.auth.signOut();
      return 'no_admin';
    }
    setUser(admin);
    return null;
  }, [esReal, persist]);

  const loginDemo = useCallback(() => {
    if (!esReal) persist(ADMIN_DEMO);
  }, [esReal, persist]);

  const logout = useCallback(async () => {
    if (esReal) await getSupabaseClient()?.auth.signOut();
    persist(null);
  }, [esReal, persist]);

  return (
    <AdminAuthContext.Provider value={{ user, esReal, verificando, login, loginDemo, logout }}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth debe usarse dentro de AdminAuthProvider');
  return ctx;
}
