import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { INTENTOS_DEMO, type IntentoEvaluacion } from '@/data/evaluacionesInstructorData';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { sesionProfesionalProbable } from '@/lib/supabase/sesionLocal';
import { cargarPerfil } from '@/lib/api/perfil';
import { cargarIntentos, calificarRespuesta, publicarCalificacionIntento } from '@/lib/api/calificaciones';

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
  // true cuando los intentos son los reales de los cursos del profesional (Supabase).
  enBase: boolean;
  errorCalificacion: string | null;
  calificarPregunta: (intentoId: string, preguntaId: string, puntaje: number, retroalimentacion: string) => void;
  publicarCalificacion: (intentoId: string, notaFinalPct: number) => void;
}

const InstructorGradingContext = createContext<InstructorGradingContextValue | undefined>(undefined);

export function InstructorGradingProvider({ children }: { children: ReactNode }) {
  // Con una sesión real de profesional guardada en el navegador se arranca
  // vacío y "cargando" (no con el demo); si al validar no lo es, vuelve al demo.
  // Mientras tanto no se guarda nada en localStorage.
  const [esperandoBase, setEsperandoBase] = useState(sesionProfesionalProbable);
  const [intentos, setIntentos] = useState<IntentoEvaluacion[]>(() => (sesionProfesionalProbable() ? [] : readStored() ?? INTENTOS_DEMO));
  const [enBase, setEnBase] = useState(false);
  const [errorCalificacion, setErrorCalificacion] = useState<string | null>(null);
  const intentosRef = useRef(intentos);
  intentosRef.current = intentos;

  // Con sesión real de un profesional, los intentos salen de sus cursos en la base.
  const esperandoRef = useRef(esperandoBase);
  const volverADemo = useCallback(() => {
    if (!esperandoRef.current) return;
    esperandoRef.current = false;
    setIntentos(readStored() ?? INTENTOS_DEMO);
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
      const res = await cargarIntentos();
      if (cancelado) return;
      if (res.error) {
        setErrorCalificacion(res.error.message);
        return;
      }
      setEnBase(true);
      setIntentos(res.data);
    })();
    return () => { cancelado = true; };
  }, [volverADemo]);

  // Mismo patrón que los demás contextos del instructor: en modo demo se
  // sincroniza a localStorage en cada cambio, así el Dashboard y
  // "Evaluaciones" (montados por separado al navegar) ven el mismo estado.
  useEffect(() => {
    if (enBase || esperandoBase) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(intentos));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [intentos, enBase, esperandoBase]);

  // Aplica el cambio en pantalla y, con la base, lo guarda; si falla se revierte.
  const aplicar = useCallback((intentoId: string, cambio: (i: IntentoEvaluacion) => IntentoEvaluacion, guardar: () => Promise<{ error: { message: string } | null }>) => {
    const anterior = intentosRef.current.find((i) => i.id === intentoId);
    setIntentos((is) => is.map((i) => (i.id === intentoId ? cambio(i) : i)));
    if (!enBase) return;
    guardar().then((res) => {
      if (!res.error) {
        setErrorCalificacion(null);
        return;
      }
      setErrorCalificacion(res.error.message);
      if (anterior) setIntentos((is) => is.map((i) => (i.id === intentoId ? anterior : i)));
    });
  }, [enBase]);

  const calificarPregunta = useCallback((intentoId: string, preguntaId: string, puntaje: number, retroalimentacion: string) => {
    aplicar(
      intentoId,
      (i) => ({ ...i, respuestas: i.respuestas.map((r) => (r.preguntaId === preguntaId ? { ...r, puntajeObtenido: puntaje, retroalimentacion } : r)) }),
      () => calificarRespuesta(intentoId, preguntaId, puntaje, retroalimentacion)
    );
  }, [aplicar]);

  const publicarCalificacion = useCallback((intentoId: string, notaFinalPct: number) => {
    aplicar(
      intentoId,
      (i) => ({ ...i, estado: 'calificado', notaFinalPct }),
      () => publicarCalificacionIntento(intentoId, notaFinalPct)
    );
  }, [aplicar]);

  return (
    <InstructorGradingContext.Provider value={{ intentos, enBase, errorCalificacion, calificarPregunta, publicarCalificacion }}>
      {children}
    </InstructorGradingContext.Provider>
  );
}

export function useInstructorGrading() {
  const ctx = useContext(InstructorGradingContext);
  if (!ctx) throw new Error('useInstructorGrading debe usarse dentro de <InstructorGradingProvider>');
  return ctx;
}
