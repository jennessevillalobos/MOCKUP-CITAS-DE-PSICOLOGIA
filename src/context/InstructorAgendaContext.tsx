import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { CitaEstado } from '@/data/admin/agendaData';
import { CITAS_INSTRUCTOR_DEMO, NOTAS_PACIENTE_DEMO, type CitaInstructor, type NotaPaciente } from '@/data/citasInstructorData';

const STORAGE_KEY = 'psiqueCitasInstructor';

interface StoredState {
  citas: CitaInstructor[];
  notas: NotaPaciente[];
}

function readStored(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.citas) && Array.isArray(parsed.notas)) return parsed as StoredState;
    return null;
  } catch {
    return null;
  }
}

interface InstructorAgendaContextValue {
  citas: CitaInstructor[];
  notas: NotaPaciente[];
  reagendarCita: (id: string, fechaISO: string, hora: string) => void;
  cambiarEstado: (id: string, estado: CitaEstado) => void;
  actualizarNotaSesion: (id: string, texto: string) => void;
  agregarNotaPaciente: (correo: string, paciente: string, texto: string) => void;
  // Crea una cita nueva (usada por el wizard público de reserva en
  // /agendar) y devuelve el id generado.
  agregarCita: (cita: Omit<CitaInstructor, 'id'>) => string;
}

const InstructorAgendaContext = createContext<InstructorAgendaContextValue | undefined>(undefined);

let citaSeq = 1000;
function nextCitaId() {
  citaSeq += 1;
  return `ci${citaSeq}`;
}

export function InstructorAgendaProvider({ children }: { children: ReactNode }) {
  const [citas, setCitas] = useState<CitaInstructor[]>(() => readStored()?.citas ?? CITAS_INSTRUCTOR_DEMO);
  const [notas, setNotas] = useState<NotaPaciente[]>(() => readStored()?.notas ?? NOTAS_PACIENTE_DEMO);

  // Sincroniza cada cambio a localStorage — así "Mis citas" y el Dashboard
  // (montados por separado al navegar entre rutas) siempre ven el mismo
  // estado, sin necesidad de un provider global montado en toda la app.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ citas, notas }));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [citas, notas]);

  const reagendarCita = useCallback((id: string, fechaISO: string, hora: string) => {
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, fechaISO, hora, estado: 'Programada' as CitaEstado } : c)));
  }, []);

  const cambiarEstado = useCallback((id: string, estado: CitaEstado) => {
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, estado } : c)));
  }, []);

  const actualizarNotaSesion = useCallback((id: string, texto: string) => {
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, notas: texto } : c)));
  }, []);

  const agregarNotaPaciente = useCallback((correo: string, paciente: string, texto: string) => {
    if (!texto.trim()) return;
    setNotas((prev) => [
      { id: `np${Date.now()}`, correo, paciente, fecha: 'Hoy', texto: texto.trim() },
      ...prev,
    ]);
  }, []);

  const agregarCita = useCallback((cita: Omit<CitaInstructor, 'id'>) => {
    const id = nextCitaId();
    setCitas((prev) => [...prev, { ...cita, id }]);
    return id;
  }, []);

  return (
    <InstructorAgendaContext.Provider value={{ citas, notas, reagendarCita, cambiarEstado, actualizarNotaSesion, agregarNotaPaciente, agregarCita }}>
      {children}
    </InstructorAgendaContext.Provider>
  );
}

export function useInstructorAgenda() {
  const ctx = useContext(InstructorAgendaContext);
  if (!ctx) throw new Error('useInstructorAgenda debe usarse dentro de <InstructorAgendaProvider>');
  return ctx;
}
