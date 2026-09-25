import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  HORARIO_SEMANAL_DEMO, CONFIG_SESIONES_DEMO, BLOQUEOS_INSTRUCTOR_DEMO,
  type HorarioSemanal, type HorarioDia, type DiaSemana, type ConfiguracionSesiones, type BloqueoAgenda,
} from '@/data/agendaDisponibilidadInstructorData';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  obtenerMiProfesionalId, cargarAgenda, guardarHorarioSemanal, crearBloqueo, eliminarBloqueo,
} from '@/lib/api/agenda';

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
  // true cuando el horario y los bloqueos se leen/escriben en Supabase
  // (profesional con sesión real); false en modo demo (localStorage).
  enBase: boolean;
  errorAgenda: string | null;
  actualizarDia: (dia: DiaSemana, campos: Partial<HorarioDia>) => void;
  actualizarConfigSesiones: (campos: Partial<ConfiguracionSesiones>) => void;
  guardarHorario: () => Promise<boolean>;
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
  const [profesionalId, setProfesionalId] = useState<number | null>(null);
  const [errorAgenda, setErrorAgenda] = useState<string | null>(null);
  const enBase = profesionalId !== null;

  // Si la sesión real pertenece a un profesional registrado, la agenda sale de
  // la base (tablas `horarios` y `excepciones_horario`), que es lo que consulta
  // /agendar al ofrecer horarios. Si no, se queda con los datos de demo.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelado = false;
    (async () => {
      const prof = await obtenerMiProfesionalId();
      if (cancelado || prof.error || prof.data === null) return;
      const agenda = await cargarAgenda(prof.data);
      if (cancelado) return;
      if (agenda.error) {
        setErrorAgenda(agenda.error.message);
        return;
      }
      setProfesionalId(prof.data);
      setHorarioSemanal(agenda.data.horarioSemanal);
      setBloqueos(agenda.data.bloqueos);
    })();
    return () => { cancelado = true; };
  }, []);

  // Mismo patrón que los demás contextos del instructor: se sincroniza a
  // localStorage en cada cambio, así "Agenda / Disponibilidad" mantiene el
  // horario y los bloqueos aunque se navegue fuera y se vuelva. Con la base
  // solo se guarda configSesiones (la duración real sale de cada servicio).
  useEffect(() => {
    try {
      const previo = readStored();
      const estado: StoredState = enBase && previo
        ? { ...previo, configSesiones }
        : { horarioSemanal, configSesiones, bloqueos };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [horarioSemanal, configSesiones, bloqueos, enBase]);

  const actualizarDia = useCallback((dia: DiaSemana, campos: Partial<HorarioDia>) => {
    setHorarioSemanal((h) => ({ ...h, [dia]: { ...h[dia], ...campos } }));
  }, []);

  const actualizarConfigSesiones = useCallback((campos: Partial<ConfiguracionSesiones>) => {
    setConfigSesiones((c) => ({ ...c, ...campos }));
  }, []);

  // En la base, el horario semanal se escribe al pulsar "Guardar horario"
  // (no en cada cambio de un input de hora).
  const guardarHorario = useCallback(async () => {
    if (profesionalId === null) return true;
    const res = await guardarHorarioSemanal(profesionalId, horarioSemanal);
    setErrorAgenda(res.error ? res.error.message : null);
    return !res.error;
  }, [profesionalId, horarioSemanal]);

  const agregarBloqueo = useCallback((bloqueo: Omit<BloqueoAgenda, 'id'>) => {
    if (profesionalId === null) {
      setBloqueos((bs) => [...bs, { ...bloqueo, id: nextBloqueoId() }]);
      return;
    }
    const idTemporal = nextBloqueoId();
    setBloqueos((bs) => [...bs, { ...bloqueo, id: idTemporal }]);
    crearBloqueo(profesionalId, bloqueo).then((res) => {
      if (res.error) {
        setBloqueos((bs) => bs.filter((b) => b.id !== idTemporal));
        setErrorAgenda(res.error.message);
        return;
      }
      setErrorAgenda(null);
      setBloqueos((bs) => bs.map((b) => (b.id === idTemporal ? { ...b, id: res.data } : b)));
    });
  }, [profesionalId]);

  const quitarBloqueo = useCallback((id: string) => {
    const quitado = bloqueos.find((b) => b.id === id);
    setBloqueos((bs) => bs.filter((b) => b.id !== id));
    if (profesionalId === null || !quitado) return;
    eliminarBloqueo(profesionalId, id).then((res) => {
      if (res.error) {
        setBloqueos((bs) => [...bs, quitado]);
        setErrorAgenda(res.error.message);
        return;
      }
      setErrorAgenda(null);
    });
  }, [profesionalId, bloqueos]);

  return (
    <InstructorScheduleContext.Provider
      value={{
        horarioSemanal, configSesiones, bloqueos, enBase, errorAgenda,
        actualizarDia, actualizarConfigSesiones, guardarHorario, agregarBloqueo, quitarBloqueo,
      }}
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
