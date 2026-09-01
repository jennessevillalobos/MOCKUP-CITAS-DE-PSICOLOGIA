import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ModuloBuilder } from '@/data/courseBuilderData';
import { CURSOS_INFO_DEMO, MODULOS_POR_CURSO, type CursoBuilderInfo } from '@/data/instructorCoursesData';

const STORAGE_KEY = 'psiqueCursosInstructor';

interface StoredState {
  info: Record<string, CursoBuilderInfo>;
  modulos: Record<string, ModuloBuilder[]>;
}

function readStored(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.info === 'object' && typeof parsed.modulos === 'object') return parsed as StoredState;
    return null;
  } catch {
    return null;
  }
}

interface InstructorCoursesContextValue {
  cursos: Record<string, CursoBuilderInfo>;
  modulosPorCurso: Record<string, ModuloBuilder[]>;
  actualizarInfo: (key: string, fields: Partial<CursoBuilderInfo>) => void;
  actualizarModulos: (key: string, modulos: ModuloBuilder[]) => void;
}

const InstructorCoursesContext = createContext<InstructorCoursesContextValue | undefined>(undefined);

export function InstructorCoursesProvider({ children }: { children: ReactNode }) {
  const [cursos, setCursos] = useState<Record<string, CursoBuilderInfo>>(() => readStored()?.info ?? CURSOS_INFO_DEMO);
  const [modulosPorCurso, setModulosPorCurso] = useState<Record<string, ModuloBuilder[]>>(() => readStored()?.modulos ?? MODULOS_POR_CURSO);

  // Igual que InstructorAgendaContext: se sincroniza a localStorage en cada
  // cambio, así "Mis cursos" y el Constructor (montados por separado al
  // navegar) siempre ven el mismo estado sin un provider global.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ info: cursos, modulos: modulosPorCurso }));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [cursos, modulosPorCurso]);

  const actualizarInfo = useCallback((key: string, fields: Partial<CursoBuilderInfo>) => {
    setCursos((prev) => ({ ...prev, [key]: { ...(prev[key] ?? CURSOS_INFO_DEMO.nuevo), ...fields } }));
  }, []);

  const actualizarModulos = useCallback((key: string, modulos: ModuloBuilder[]) => {
    setModulosPorCurso((prev) => ({ ...prev, [key]: modulos }));
  }, []);

  return (
    <InstructorCoursesContext.Provider value={{ cursos, modulosPorCurso, actualizarInfo, actualizarModulos }}>
      {children}
    </InstructorCoursesContext.Provider>
  );
}

export function useInstructorCourses() {
  const ctx = useContext(InstructorCoursesContext);
  if (!ctx) throw new Error('useInstructorCourses debe usarse dentro de <InstructorCoursesProvider>');
  return ctx;
}
