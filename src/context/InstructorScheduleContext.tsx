import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  HORARIO_SEMANAL_DEMO, CONFIG_SESIONES_DEMO, BLOQUEOS_INSTRUCTOR_DEMO,
  type HorarioSemanal, type HorarioDia, type DiaSemana, type ConfiguracionSesiones, type BloqueoAgenda,
} from '@/data/agendaDisponibilidadInstructorData';

const STORAGE_KEY = 'psiqueAgendaInstructor';

interface StoredState {
  horarioSemanal: HorarioSemanal;
  configSesiones: ConfiguracionSesiones;
  bloqueos: BloqueoAgenda[];
}

function readStored(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.horarioSemanal === 'object' && typeof parsed.configSesiones === 'object' && Array.isArray(parsed.bloqueos)) {
      return parsed as StoredState;
    }
    return null;
  } catch {
    return null;
  }
}

interface InstructorScheduleContextValue {
  horarioSemanal: HorarioSemanal;
  configSesiones: ConfiguracionSesiones;
  bloqueos: BloqueoAgenda[];
  actualizarDia: (dia: DiaSemana, campos: Partial<HorarioDia>) => void;
  actualizarConfigSesiones: (campos: Partial<ConfiguracionSesiones>) => void;
  agregarBloqueo: (bloqueo: Omit<BloqueoAgenda, 'id'>) => void;
  quitarBloqueo: (id: string) => void;
}

const InstructorScheduleContext = createContext<InstructorScheduleContextValue | undefined>(undefined);

let bloqueoSeq = 100;
function nextBloqueoId() {
  bloqueoSeq += 1;
  return `bl${bloqueoSeq}`;
}

export function InstructorScheduleProvider({ children }: { children: ReactNode }) {
  const [horarioSemanal, setHorarioSemanal] = useState<HorarioSemanal>(() => readStored()?.horarioSemanal ?? HORARIO_SEMANAL_DEMO);
  const [configSesiones, setConfigSesiones] = useState<ConfiguracionSesiones>(() => readStored()?.configSesiones ?? CONFIG_SESIONES_DEMO);
  const [bloqueos, setBloqueos] = useState<BloqueoAgenda[]>(() => readStored()?.bloqueos ?? BLOQUEOS_INSTRUCTOR_DEMO);

  // Mismo patrón que los demás contextos del instructor: se sincroniza a
  // localStorage en cada cambio, así "Agenda / Disponibilidad" mantiene el
  // horario y los bloqueos aunque se navegue fuera y se vuelva.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ horarioSemanal, configSesiones, bloqueos }));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [horarioSemanal, configSesiones, bloqueos]);

  const actualizarDia = useCallback((dia: DiaSemana, campos: Partial<HorarioDia>) => {
    setHorarioSemanal((h) => ({ ...h, [dia]: { ...h[dia], ...campos } }));
  }, []);

  const actualizarConfigSesiones = useCallback((campos: Partial<ConfiguracionSesiones>) => {
    setConfigSesiones((c) => ({ ...c, ...campos }));
  }, []);

  const agregarBloqueo = useCallback((bloqueo: Omit<BloqueoAgenda, 'id'>) => {
    setBloqueos((bs) => [...bs, { ...bloqueo, id: nextBloqueoId() }]);
  }, []);

  const quitarBloqueo = useCallback((id: string) => {
    setBloqueos((bs) => bs.filter((b) => b.id !== id));
  }, []);

  return (
    <InstructorScheduleContext.Provider
      value={{ horarioSemanal, configSesiones, bloqueos, actualizarDia, actualizarConfigSesiones, agregarBloqueo, quitarBloqueo }}
    >
      {children}
    </InstructorScheduleContext.Provider>
  );
}

export function useInstructorSchedule() {
  const ctx = useContext(InstructorScheduleContext);
  if (!ctx) throw new Error('useInstructorSchedule debe usarse dentro de <InstructorScheduleProvider>');
  return ctx;
}
