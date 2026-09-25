import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { signIn as supabaseSignIn, signUp as supabaseSignUp, signOut as supabaseSignOut, ensureRole } from '@/lib/api/auth';
import {
  cargarPerfil, guardarPerfil, subirFotoPerfil, cambiarContrasena as cambiarContrasenaApi, cerrarTodasLasSesiones,
  type PerfilReal, type PreferenciasUsuario,
} from '@/lib/api/perfil';
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
  foto?: string; // URL pública (sesión real) o data URL de la foto subida (modo demo, en localStorage)
  preferencias?: PreferenciasUsuario;
}

function nombreDesdeCorreo(correo: string) {
  return correo.split('@')[0].split(/[._-]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// SiteUser a partir del perfil guardado en la base (nombre y rol reales).
function usuarioDesdePerfil(perfil: PerfilReal): SiteUser {
  return {
    nombre: perfil.nombre || nombreDesdeCorreo(perfil.correo),
    correo: perfil.correo,
    rol: perfil.esProfesional ? 'profesional' : 'paciente',
    telefono: perfil.telefono ?? undefined,
    sobreMi: perfil.sobreMi ?? undefined,
    foto: perfil.foto ?? undefined,
    preferencias: perfil.preferencias,
  };
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
  // Con sesión real también los guarda en la base; devuelve el error si falla.
  updateProfile: (fields: Partial<Omit<SiteUser, 'rol'>>) => Promise<{ error: string | null }>;
  // true si la sesión actual es una cuenta real de Supabase (no demo).
  esSesionReal: boolean;
  cambiarContrasena: (actual: string, nueva: string) => Promise<{ error: string | null }>;
  cerrarOtrasSesiones: () => Promise<{ error: string | null }>;
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
  // Ids del perfil real (usuario y ficha de profesional) para escribir en la base.
  const perfilRef = useRef<PerfilReal | null>(null);
  const [esSesionReal, setEsSesionReal] = useState(false);

  const persist = useCallback((next: SiteUser | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage no disponible; la sesión sigue viva en memoria durante esta visita.
    }
  }, []);

  // Lee el perfil real (nombre, rol, foto…) desde la base y lo refleja en la sesión.
  const sincronizarPerfil = useCallback(async (): Promise<SiteUser | null> => {
    const res = await cargarPerfil();
    if (res.error || !res.data) return null;
    perfilRef.current = res.data;
    setEsSesionReal(true);
    const next = usuarioDesdePerfil(res.data);
    persist(next);
    return next;
  }, [persist]);

  // Si hay una sesión real de Supabase (p. ej. al refrescar la página), el
  // perfil y el rol salen de la base. En modo demo no se hace nada.
  useEffect(() => {
    if (!realAuth) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void sincronizarPerfil();
    });
    // Cierre de sesión desde otro dispositivo ("Cerrar todas las sesiones").
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT' && perfilRef.current) {
        perfilRef.current = null;
        setEsSesionReal(false);
        persist(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [realAuth, sincronizarPerfil, persist]);

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

      const desdeBase = await sincronizarPerfil();
      if (desdeBase) return { data: desdeBase, error: null };

      // Sin perfil legible (no debería pasar): se entra como paciente con el nombre del correo.
      const next: SiteUser = { nombre: nombreDesdeCorreo(correo), correo: res.data.email, rol: 'paciente' };
      persist(next);
      return { data: next, error: null };
    },
    [persist, sincronizarPerfil]
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
    perfilRef.current = null;
    setEsSesionReal(false);
    persist(null);
    // En modo real también se cierra la sesión de Supabase; si falla no se
    // bloquea el cierre local.
    if (realAuth) {
      void supabaseSignOut();
    }
  }, [persist, realAuth]);

  const updateProfile = useCallback(
    async (fields: Partial<Omit<SiteUser, 'rol'>>): Promise<{ error: string | null }> => {
      const cambios = { ...fields };
      const perfil = perfilRef.current;
      if (perfil) {
        // El correo de la cuenta no se cambia desde aquí (requiere confirmación por email).
        delete cambios.correo;
        if (cambios.foto?.startsWith('data:')) {
          const subida = await subirFotoPerfil(perfil.userId, cambios.foto);
          if (subida.error) return { error: subida.error.message };
          cambios.foto = subida.data;
        }
        const res = await guardarPerfil(perfil, cambios);
        if (res.error) return { error: res.error.message };
      }
      setUser((prev) => {
        if (!prev) return prev;
        const next: SiteUser = { ...prev, ...cambios };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // localStorage no disponible; el cambio sigue vivo en memoria durante esta visita.
        }
        return next;
      });
      return { error: null };
    },
    []
  );

  const cambiarContrasena = useCallback(async (actual: string, nueva: string) => {
    const perfil = perfilRef.current;
    if (!perfil) return { error: null }; // modo demo: no hay contraseña real que cambiar
    const res = await cambiarContrasenaApi(perfil.correo, actual, nueva);
    return { error: res.error?.message ?? null };
  }, []);

  const cerrarOtrasSesiones = useCallback(async () => {
    if (!perfilRef.current) return { error: null };
    const res = await cerrarTodasLasSesiones();
    return { error: res.error?.message ?? null };
  }, []);

  return (
    <SiteAuthContext.Provider
      value={{
        user, isRealAuth: realAuth, login, loginAs, loginWithPassword, registerWithPassword, logout, updateProfile,
        esSesionReal, cambiarContrasena, cerrarOtrasSesiones,
      }}
    >
      {children}
    </SiteAuthContext.Provider>
  );
}

export function useSiteAuth() {
  const ctx = useContext(SiteAuthContext);
  if (!ctx) throw new Error('useSiteAuth debe usarse dentro de <SiteAuthProvider>');
  return ctx;
}
