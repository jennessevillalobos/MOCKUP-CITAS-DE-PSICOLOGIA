import { useRef, createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { NOTIFICACIONES_INSTRUCTOR_DEMO, type NotificacionInstructor } from '@/data/notificacionesInstructorData';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { sesionProfesionalProbable } from '@/lib/supabase/sesionLocal';
import { cargarPerfil } from '@/lib/api/perfil';
import { cargarNotificaciones, marcarNotificacionesLeidas } from '@/lib/api/notificaciones';

const STORAGE_KEY = 'psiqueNotificacionesInstructor';

function readStored(): NotificacionInstructor[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NotificacionInstructor[]) : null;
  } catch {
    return null;
  }
}

interface InstructorNotificationsContextValue {
  notificaciones: NotificacionInstructor[];
  // true cuando las notificaciones son las reales del profesional (Supabase).
  enBase: boolean;
  errorNotificaciones: string | null;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
}

const InstructorNotificationsContext = createContext<InstructorNotificationsContextValue | undefined>(undefined);

export function InstructorNotificationsProvider({ children }: { children: ReactNode }) {
  // Con una sesión real de profesional guardada en el navegador se arranca
  // vacío y "cargando" (no con el demo); si al validar no lo es, vuelve al demo.
  // Mientras tanto no se guarda nada en localStorage.
  const [esperandoBase, setEsperandoBase] = useState(sesionProfesionalProbable);
  const [notificaciones, setNotificaciones] = useState<NotificacionInstructor[]>(() => (sesionProfesionalProbable() ? [] : readStored() ?? NOTIFICACIONES_INSTRUCTOR_DEMO));
  const [enBase, setEnBase] = useState(false);
  const [errorNotificaciones, setErrorNotificaciones] = useState<string | null>(null);

  // Con sesión real de un profesional, el feed sale de la base (lo generan
  // triggers ante eventos reales: reservas, intentos, inscripciones, pagos…).
  const esperandoRef = useRef(esperandoBase);
  const volverADemo = useCallback(() => {
    if (!esperandoRef.current) return;
    esperandoRef.current = false;
    setNotificaciones(readStored() ?? NOTIFICACIONES_INSTRUCTOR_DEMO);
    setEsperandoBase(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelado = false;
    (async () => {
      const perfil = await cargarPerfil();
      if (cancelado) return;
      if (perfil.error || !perfil.data?.profesionalId) {
        volverADemo();
        return;
      }
      const res = await cargarNotificaciones();
      if (cancelado) return;
      if (res.error) {
        setErrorNotificaciones(res.error.message);
        return;
      }
      setEnBase(true);
      setNotificaciones(res.data);
    })();
    return () => { cancelado = true; };
  }, [volverADemo]);

  // Modo demo: se sincroniza a localStorage en cada cambio, así el estado
  // leído/no leído sobrevive a navegar fuera y volver a esta sección.
  useEffect(() => {
    if (enBase || esperandoBase) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notificaciones));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [notificaciones, enBase, esperandoBase]);

  const guardarLeidas = useCallback((ids: string[] | null) => {
    if (!enBase) return;
    marcarNotificacionesLeidas(ids).then((res) => setErrorNotificaciones(res.error ? res.error.message : null));
  }, [enBase]);

  const marcarLeida = useCallback((id: string) => {
    setNotificaciones((ns) => ns.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    guardarLeidas([id]);
  }, [guardarLeidas]);

  const marcarTodasLeidas = useCallback(() => {
    setNotificaciones((ns) => ns.map((n) => ({ ...n, leida: true })));
    guardarLeidas(null);
  }, [guardarLeidas]);

  return (
    <InstructorNotificationsContext.Provider value={{ notificaciones, enBase, errorNotificaciones, marcarLeida, marcarTodasLeidas }}>
      {children}
    </InstructorNotificationsContext.Provider>
  );
}

export function useInstructorNotifications() {
  const ctx = useContext(InstructorNotificationsContext);
  if (!ctx) throw new Error('useInstructorNotifications debe usarse dentro de <InstructorNotificationsProvider>');
  return ctx;
}
