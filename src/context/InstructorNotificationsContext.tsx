import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { NOTIFICACIONES_INSTRUCTOR_DEMO, type NotificacionInstructor } from '@/data/notificacionesInstructorData';

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
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
}

const InstructorNotificationsContext = createContext<InstructorNotificationsContextValue | undefined>(undefined);

export function InstructorNotificationsProvider({ children }: { children: ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<NotificacionInstructor[]>(() => readStored() ?? NOTIFICACIONES_INSTRUCTOR_DEMO);

  // Mismo patrón que los demás contextos del instructor: se sincroniza a
  // localStorage en cada cambio, así el estado leído/no leído sobrevive a
  // navegar fuera y volver a esta sección.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notificaciones));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [notificaciones]);

  const marcarLeida = useCallback((id: string) => {
    setNotificaciones((ns) => ns.map((n) => (n.id === id ? { ...n, leida: true } : n)));
  }, []);

  const marcarTodasLeidas = useCallback(() => {
    setNotificaciones((ns) => ns.map((n) => ({ ...n, leida: true })));
  }, []);

  return (
    <InstructorNotificationsContext.Provider value={{ notificaciones, marcarLeida, marcarTodasLeidas }}>
      {children}
    </InstructorNotificationsContext.Provider>
  );
}

export function useInstructorNotifications() {
  const ctx = useContext(InstructorNotificationsContext);
  if (!ctx) throw new Error('useInstructorNotifications debe usarse dentro de <InstructorNotificationsProvider>');
  return ctx;
}
