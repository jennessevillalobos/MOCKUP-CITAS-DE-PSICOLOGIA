import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { INTENTOS_DEMO, type IntentoEvaluacion } from '@/data/evaluacionesInstructorData';

const STORAGE_KEY = 'psiqueEvaluacionesInstructor';

function readStored(): IntentoEvaluacion[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IntentoEvaluacion[]) : null;
  } catch {
    return null;
  }
}

interface InstructorGradingContextValue {
  intentos: IntentoEvaluacion[];
  calificarPregunta: (intentoId: string, preguntaId: string, puntaje: number, retroalimentacion: string) => void;
  publicarCalificacion: (intentoId: string, notaFinalPct: number) => void;
}

const InstructorGradingContext = createContext<InstructorGradingContextValue | undefined>(undefined);

export function InstructorGradingProvider({ children }: { children: ReactNode }) {
  const [intentos, setIntentos] = useState<IntentoEvaluacion[]>(() => readStored() ?? INTENTOS_DEMO);

  // Mismo patrón que los demás contextos del instructor: se sincroniza a
  // localStorage en cada cambio, así el Dashboard y "Evaluaciones" (montados
  // por separado al navegar) siempre ven el mismo estado.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(intentos));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [intentos]);

  const calificarPregunta = useCallback((intentoId: string, preguntaId: string, puntaje: number, retroalimentacion: string) => {
    setIntentos((is) =>
      is.map((i) =>
        i.id === intentoId
          ? { ...i, respuestas: i.respuestas.map((r) => (r.preguntaId === preguntaId ? { ...r, puntajeObtenido: puntaje, retroalimentacion } : r)) }
          : i
      )
    );
  }, []);

  const publicarCalificacion = useCallback((intentoId: string, notaFinalPct: number) => {
    setIntentos((is) => is.map((i) => (i.id === intentoId ? { ...i, estado: 'calificado', notaFinalPct } : i)));
  }, []);

  return (
    <InstructorGradingContext.Provider value={{ intentos, calificarPregunta, publicarCalificacion }}>
      {children}
    </InstructorGradingContext.Provider>
  );
}

export function useInstructorGrading() {
  const ctx = useContext(InstructorGradingContext);
  if (!ctx) throw new Error('useInstructorGrading debe usarse dentro de <InstructorGradingProvider>');
  return ctx;
}
