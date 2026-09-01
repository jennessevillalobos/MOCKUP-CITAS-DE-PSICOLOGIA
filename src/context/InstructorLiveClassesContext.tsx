import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { CLASES_VIVO_DEMO, type ClaseEnVivo, type DestinatarioTipo } from '@/data/clasesVivoInstructorData';

const STORAGE_KEY = 'psiqueClasesVivoInstructor';

function readStored(): ClaseEnVivo[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ClaseEnVivo[]) : null;
  } catch {
    return null;
  }
}

export interface NuevaClaseInput {
  titulo: string;
  cursoKey?: string;
  cursoTitulo?: string;
  fechaISO: string;
  hora: string;
  duracionMin: number;
  enlace: string;
  destinatarioTipo: DestinatarioTipo;
  pacientesCorreos?: string[];
  grabar: boolean;
  recordatorio: boolean;
}

interface InstructorLiveClassesContextValue {
  clases: ClaseEnVivo[];
  crearClase: (input: NuevaClaseInput) => string;
  actualizarClase: (id: string, input: NuevaClaseInput) => void;
  cancelarClase: (id: string) => void;
  iniciarClase: (id: string) => void;
  finalizarClase: (id: string) => void;
  toggleRecordarme: (id: string) => void;
  recordatoriosColegas: string[];
}

const InstructorLiveClassesContext = createContext<InstructorLiveClassesContextValue | undefined>(undefined);

let idSeq = 100;
function nextId() {
  idSeq += 1;
  return `cv${idSeq}`;
}

export function InstructorLiveClassesProvider({ children }: { children: ReactNode }) {
  const [clases, setClases] = useState<ClaseEnVivo[]>(() => readStored() ?? CLASES_VIVO_DEMO);
  const [recordatoriosColegas, setRecordatoriosColegas] = useState<string[]>([]);

  // Igual que InstructorAgendaContext/InstructorCoursesContext: se
  // sincroniza a localStorage en cada cambio, así el Dashboard y "Clases en
  // vivo" (montados por separado al navegar) siempre ven el mismo estado
  // sin necesitar un provider global.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clases));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [clases]);

  const crearClase = useCallback((input: NuevaClaseInput) => {
    const id = nextId();
    setClases((cs) => [
      ...cs,
      {
        id,
        titulo: input.titulo,
        instructor: 'Dra. Ana Rivas',
        esPropia: true,
        cursoKey: input.cursoKey,
        cursoTitulo: input.cursoTitulo,
        fechaISO: input.fechaISO,
        hora: input.hora,
        duracionMin: input.duracionMin,
        enlace: input.enlace,
        destinatario: { tipo: input.destinatarioTipo, pacientesCorreos: input.pacientesCorreos },
        grabar: input.grabar,
        recordatorio: input.recordatorio,
        estado: 'programada',
      },
      ]);
    return id;
  }, []);

  const actualizarClase = useCallback((id: string, input: NuevaClaseInput) => {
    setClases((cs) =>
      cs.map((c) =>
        c.id === id
          ? {
              ...c,
              titulo: input.titulo,
              cursoKey: input.cursoKey,
              cursoTitulo: input.cursoTitulo,
              fechaISO: input.fechaISO,
              hora: input.hora,
              duracionMin: input.duracionMin,
              enlace: input.enlace,
              destinatario: { tipo: input.destinatarioTipo, pacientesCorreos: input.pacientesCorreos },
              grabar: input.grabar,
              recordatorio: input.recordatorio,
            }
          : c
      )
    );
  }, []);

  const cancelarClase = useCallback((id: string) => {
    setClases((cs) => cs.map((c) => (c.id === id ? { ...c, estado: 'cancelada' } : c)));
  }, []);

  const iniciarClase = useCallback((id: string) => {
    setClases((cs) => cs.map((c) => (c.id === id ? { ...c, estado: 'vivo', conectados: c.conectados ?? 1 } : c)));
  }, []);

  const finalizarClase = useCallback((id: string) => {
    setClases((cs) => cs.map((c) => (c.id === id ? { ...c, estado: 'finalizada', asistieron: c.conectados ?? 0 } : c)));
  }, []);

  const toggleRecordarme = useCallback((id: string) => {
    setRecordatoriosColegas((rs) => (rs.includes(id) ? rs.filter((r) => r !== id) : [...rs, id]));
  }, []);

  return (
    <InstructorLiveClassesContext.Provider
      value={{ clases, crearClase, actualizarClase, cancelarClase, iniciarClase, finalizarClase, toggleRecordarme, recordatoriosColegas }}
    >
      {children}
    </InstructorLiveClassesContext.Provider>
  );
}

export function useInstructorLiveClasses() {
  const ctx = useContext(InstructorLiveClassesContext);
  if (!ctx) throw new Error('useInstructorLiveClasses debe usarse dentro de <InstructorLiveClassesProvider>');
  return ctx;
}
