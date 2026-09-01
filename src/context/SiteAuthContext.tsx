import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { signIn as supabaseSignIn, signUp as supabaseSignUp, signOut as supabaseSignOut, getRoles, ensureRole } from '@/lib/api/auth';
import { toServiceError, type Result } from '@/lib/supabase/errors';
import type { RolNombre } from '@/lib/supabase/types';

export type SiteRole = 'paciente' | 'profesional';

export interface SiteUser {
  nombre: string;
  correo: string;
  rol: SiteRole;
  // Campos opcionales de "Mi perfil" — no todos los usuarios los llenan.
  telefono?: string;
  sobreMi?: string;
  foto?: string; // data URL de la foto subida (sin backend real, se guarda en localStorage)
}

// Mapeo entre el rol seleccionado en la UI y el rol real de la base de datos.
const roleToDb: Record<SiteRole, RolNombre> = {
  paciente: 'estudiante',
  profesional: 'instructor',
};

const STORAGE_KEY = 'psiqueUser';

// Cuentas de demostración para esta etapa de frontend (sin backend real
// todavía) — se usan cuando alguien entra por el acceso rápido "Soy
// paciente" / "Soy profesional" sin llenar el formulario.
export const PATIENT_DEMO: SiteUser = { nombre: 'Valentina Torres', correo: 'valentina.torres@correo.com', rol: 'paciente' };
export const PROFESSIONAL_DEMO: SiteUser = { nombre: 'Dra. Ana Rivas', correo: 'ana.rivas@psiqueamor.com', rol: 'profesional' };

interface SiteAuthContextValue {
  user: SiteUser | null;
  // Indica si la autenticación real de Supabase está disponible (variables
  // de entorno configuradas). Si es false, la app opera en modo demo.
  isRealAuth: boolean;
  // Inicia sesión con un correo (y opcionalmente nombre) para el rol indicado.
  login: (correo: string, rol: SiteRole, nombre?: string) => SiteUser;
  // Acceso rápido de demostración: entra directo con la cuenta demo del rol.
  loginAs: (rol: SiteRole) => SiteUser;
  // Autenticación real de Supabase (email + contraseña). Devuelve el usuario
  // mapeado a la sesión, o el error del proveedor.
  loginWithPassword: (correo: string, password: string) => Promise<Result<SiteUser>>;
  registerWithPassword: (correo: string, password: string, nombre?: string, rol?: SiteRole) => Promise<Result<{ user: SiteUser; needsEmailConfirmation: boolean }>>;
  logout: () => void;
  // Actualiza campos del perfil de la sesión activa (Mi perfil). No cambia el rol.
  updateProfile: (fields: Partial<Omit<SiteUser, 'rol'>>) => void;
}

const SiteAuthContext = createContext<SiteAuthContextValue | undefined>(undefined);

function readStoredUser(): SiteUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.rol === 'paciente' || parsed.rol === 'profesional') && typeof parsed.correo === 'string') {
      return parsed as SiteUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function SiteAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SiteUser | null>(() => readStoredUser());
  const realAuth = isSupabaseConfigured();

  const persist = useCallback((next: SiteUser | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage no disponible; la sesión sigue viva en memoria durante esta visita.
    }
  }, []);

  // Si hay una sesión real de Supabase (p. ej. al refrescar la página), se
  // refleja en el estado local. En modo demo no se hace nada.
  useEffect(() => {
    if (!realAuth) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (sessionUser?.email && !readStoredUser()) {
        const nombre =
          (sessionUser.user_metadata?.full_name as string | undefined) ??
          sessionUser.email.split('@')[0];
        setUser({ nombre, correo: sessionUser.email, rol: 'paciente' });
      }
    });
  }, [realAuth]);

  const login = useCallback(
    (correo: string, rol: SiteRole, nombre?: string) => {
      // Si ya había una sesión con ese mismo correo, conserva su nombre.
      const prev = readStoredUser();
      const derivedNombre =
        nombre ||
        (prev && prev.correo === correo ? prev.nombre : undefined) ||
        correo
          .split('@')[0]
          .split(/[._-]/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      const next: SiteUser = { nombre: derivedNombre, correo, rol };
      persist(next);
      return next;
    },
    [persist]
  );

  const loginAs = useCallback(
    (rol: SiteRole) => {
      const demo = rol === 'paciente' ? PATIENT_DEMO : PROFESSIONAL_DEMO;
      persist(demo);
      return demo;
    },
    [persist]
  );

  const loginWithPassword = useCallback(
    async (correo: string, password: string): Promise<Result<SiteUser>> => {
      const res = await supabaseSignIn({ email: correo, password });
      if (res.error) return res;

      const nombre = correo.split('@')[0].split(/[._-]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      let rol: SiteRole = 'paciente';
      const roles = await getRoles();
      if (!roles.error && roles.data) {
        if (roles.data.includes('instructor')) rol = 'profesional';
        else if (roles.data.includes('administrador')) rol = 'profesional';
      }

      const next: SiteUser = { nombre, correo: res.data.email, rol };
      persist(next);
      return { data: next, error: null };
    },
    [persist]
  );

  const registerWithPassword = useCallback(
    async (correo: string, password: string, nombreParam?: string, rolParam?: SiteRole): Promise<Result<{ user: SiteUser; needsEmailConfirmation: boolean }>> => {
      const derivedNombre = nombreParam || correo.split('@')[0].split(/[._-]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      const res = await supabaseSignUp({ email: correo, password, nombre: derivedNombre });
      if (res.error) return res;

      // Asignar el rol seleccionado al nuevo usuario (upsert en usuario_roles).
      // Si la sesión no quedó activa (requiere confirmación de email), este
      // paso se completará en el siguiente login.
      const dbRole = roleToDb[rolParam || 'paciente'];
      const roleRes = await ensureRole(res.data.id, dbRole);
      if (roleRes.error) {
        // No abortamos el registro: el usuario fue creado, pero el rol no.
        // Lo logueamos para que el equipo lo detecte.
        console.warn('No se pudo asignar el rol automáticamente:', toServiceError(roleRes.error).message);
      }

      const next: SiteUser = { nombre: derivedNombre, correo, rol: rolParam || 'paciente' };
      const needsEmailConfirmation = !res.data.sessionEstablished;

      if (!needsEmailConfirmation) {
        persist(next);
      }
      return { data: { user: next, needsEmailConfirmation }, error: null };
    },
    [persist]
  );

  const logout = useCallback(() => {
    persist(null);
    // En modo real también se cierra la sesión de Supabase; si falla no se
    // bloquea el cierre local.
    if (realAuth) {
      void supabaseSignOut();
    }
  }, [persist, realAuth]);

  const updateProfile = useCallback(
    (fields: Partial<Omit<SiteUser, 'rol'>>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next: SiteUser = { ...prev, ...fields };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // localStorage no disponible; el cambio sigue vivo en memoria durante esta visita.
        }
        return next;
      });
    },
    []
  );

  return (
    <SiteAuthContext.Provider value={{ user, isRealAuth: realAuth, login, loginAs, loginWithPassword, registerWithPassword, logout, updateProfile }}>
      {children}
    </SiteAuthContext.Provider>
  );
}

export function useSiteAuth() {
  const ctx = useContext(SiteAuthContext);
  if (!ctx) throw new Error('useSiteAuth debe usarse dentro de <SiteAuthProvider>');
  return ctx;
}
