import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { ModuloBuilder } from '@/data/courseBuilderData';
import { CURSOS_INFO_DEMO, CURSOS_META, MODULOS_POR_CURSO, type CursoBuilderInfo, type CursoInstructorMeta } from '@/data/instructorCoursesData';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { sesionProfesionalProbable } from '@/lib/supabase/sesionLocal';
import { cargarPerfil } from '@/lib/api/perfil';
import { cargarMisCursos, guardarInfoCurso, guardarEstructuraCurso, crearCursoBorrador } from '@/lib/api/cursosProfesional';

const STORAGE_KEY = 'psiqueCursosInstructor';
// Espera tras la última edición antes de guardar en la base (el Constructor
// aplica cambios en cada tecla).
const ESPERA_GUARDADO_MS = 800;
const COLORES = ['bg-brand-600', 'bg-lilac-500', 'bg-brand-300', 'bg-lilac-300', 'bg-brand-400'];

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

export type EstadoGuardadoCursos = 'guardado' | 'guardando' | 'error';

interface InstructorCoursesContextValue {
  cursos: Record<string, CursoBuilderInfo>;
  modulosPorCurso: Record<string, ModuloBuilder[]>;
  // Lista de cursos del profesional (demo: CURSOS_META; base: sus cursos reales).
  metaCursos: CursoInstructorMeta[];
  // true cuando los cursos se leen/escriben en Supabase (profesional con sesión real).
  enBase: boolean;
  cargando: boolean;
  estadoGuardado: EstadoGuardadoCursos;
  errorCursos: string | null;
  actualizarInfo: (key: string, fields: Partial<CursoBuilderInfo>) => void;
  actualizarModulos: (key: string, modulos: ModuloBuilder[]) => void;
  // Crea un curso en borrador y devuelve su key (null si falla).
  crearCurso: () => Promise<string | null>;
}

const InstructorCoursesContext = createContext<InstructorCoursesContextValue | undefined>(undefined);

function metaDesde(key: string, modulos: ModuloBuilder[], estudiantes: number, indice: number): CursoInstructorMeta {
  const lecciones = modulos.reduce((acc, m) => acc + m.items.filter((i) => i.tipo === 'clase').length, 0);
  return {
    key,
    duracion: { es: `${modulos.length} ${modulos.length === 1 ? 'módulo' : 'módulos'}`, en: `${modulos.length} ${modulos.length === 1 ? 'module' : 'modules'}` },
    lecciones,
    estudiantes,
    rating: 0,
    color: COLORES[indice % COLORES.length],
  };
}

export function InstructorCoursesProvider({ children }: { children: ReactNode }) {
  // Con una sesión real de profesional guardada en el navegador se arranca
  // vacío y "cargando" (no con el demo); si al validar no lo es, vuelve al demo.
  // Mientras tanto no se guarda nada en localStorage.
  const [esperandoBase, setEsperandoBase] = useState(sesionProfesionalProbable);
  const [cursos, setCursos] = useState<Record<string, CursoBuilderInfo>>(() => (sesionProfesionalProbable() ? {} : readStored()?.info ?? CURSOS_INFO_DEMO));
  const [modulosPorCurso, setModulosPorCurso] = useState<Record<string, ModuloBuilder[]>>(() => (sesionProfesionalProbable() ? {} : readStored()?.modulos ?? MODULOS_POR_CURSO));
  const [metaCursos, setMetaCursos] = useState<CursoInstructorMeta[]>(() => (sesionProfesionalProbable() ? [] : CURSOS_META));
  const [profesionalId, setProfesionalId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(esperandoBase);
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardadoCursos>('guardado');
  const [errorCursos, setErrorCursos] = useState<string | null>(null);
  const idPorKey = useRef<Record<string, number>>({});
  const estudiantesPorKey = useRef<Record<string, number>>({});
  const pendientes = useRef<Record<string, { info?: Partial<CursoBuilderInfo>; modulos?: ModuloBuilder[]; timer?: number }>>({});
  const enBase = profesionalId !== null;

  const esperandoRef = useRef(esperandoBase);
  const volverADemo = useCallback(() => {
    if (!esperandoRef.current) return;
    esperandoRef.current = false;
    const guardado = readStored();
    setCursos(guardado?.info ?? CURSOS_INFO_DEMO);
    setModulosPorCurso(guardado?.modulos ?? MODULOS_POR_CURSO);
    setMetaCursos(CURSOS_META);
    setCargando(false);
    setEsperandoBase(false);
  }, []);

  // Con sesión real de un profesional, sus cursos salen de la base.
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
      setCargando(true);
      const res = await cargarMisCursos();
      if (cancelado) return;
      setCargando(false);
      if (res.error) {
        setErrorCursos(res.error.message);
        return;
      }
      const info: Record<string, CursoBuilderInfo> = {};
      const modulos: Record<string, ModuloBuilder[]> = {};
      res.data.forEach((c) => {
        idPorKey.current[c.key] = c.id;
        estudiantesPorKey.current[c.key] = c.estudiantes;
        info[c.key] = c.info;
        modulos[c.key] = c.modulos;
      });
      setProfesionalId(perfil.data.profesionalId);
      setCursos(info);
      setModulosPorCurso(modulos);
      setMetaCursos(res.data.map((c, i) => metaDesde(c.key, c.modulos, c.estudiantes, i)));
    })();
    return () => { cancelado = true; };
  }, [volverADemo]);

  // Modo demo: se sincroniza a localStorage en cada cambio, así "Mis cursos"
  // y el Constructor (montados por separado al navegar) ven el mismo estado.
  useEffect(() => {
    if (enBase || esperandoBase) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ info: cursos, modulos: modulosPorCurso }));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [cursos, modulosPorCurso, enBase, esperandoBase]);

  // Las lecciones y módulos de la lista se recalculan al editar el árbol.
  useEffect(() => {
    if (!enBase) return;
    setMetaCursos((prev) => prev.map((m, i) => metaDesde(m.key, modulosPorCurso[m.key] ?? [], estudiantesPorKey.current[m.key] ?? 0, i)));
  }, [modulosPorCurso, enBase]);

  // Guarda ya los cambios acumulados de un curso.
  const guardarPendiente = useCallback(async (key: string) => {
    const p = pendientes.current[key];
    const cursoId = idPorKey.current[key];
    if (!p || cursoId === undefined) return;
    if (p.timer) window.clearTimeout(p.timer);
    delete pendientes.current[key];
    const resInfo = p.info ? await guardarInfoCurso(cursoId, p.info) : null;
    const resArbol = p.modulos ? await guardarEstructuraCurso(cursoId, p.modulos) : null;
    const error = resInfo?.error ?? resArbol?.error ?? null;
    setErrorCursos(error ? error.message : null);
    setEstadoGuardado(error ? 'error' : Object.keys(pendientes.current).length > 0 ? 'guardando' : 'guardado');
  }, []);

  // Junta los cambios de un curso y los guarda tras una pausa en la edición.
  const programarGuardado = useCallback((key: string, cambio: { info?: Partial<CursoBuilderInfo>; modulos?: ModuloBuilder[] }) => {
    if (idPorKey.current[key] === undefined) return;
    const p = pendientes.current[key] ?? {};
    if (cambio.info) p.info = { ...p.info, ...cambio.info };
    if (cambio.modulos) p.modulos = cambio.modulos;
    if (p.timer) window.clearTimeout(p.timer);
    setEstadoGuardado('guardando');
    p.timer = window.setTimeout(() => void guardarPendiente(key), ESPERA_GUARDADO_MS);
    pendientes.current[key] = p;
  }, [guardarPendiente]);

  // Al salir de la página (el provider se monta por ruta) no se pierde lo pendiente.
  useEffect(() => () => {
    Object.keys(pendientes.current).forEach((key) => void guardarPendiente(key));
  }, [guardarPendiente]);

  const actualizarInfo = useCallback((key: string, fields: Partial<CursoBuilderInfo>) => {
    setCursos((prev) => ({ ...prev, [key]: { ...(prev[key] ?? CURSOS_INFO_DEMO.nuevo), ...fields } }));
    if (enBase) programarGuardado(key, { info: fields });
  }, [enBase, programarGuardado]);

  const actualizarModulos = useCallback((key: string, modulos: ModuloBuilder[]) => {
    setModulosPorCurso((prev) => ({ ...prev, [key]: modulos }));
    if (enBase) programarGuardado(key, { modulos });
  }, [enBase, programarGuardado]);

  const crearCurso = useCallback(async () => {
    if (profesionalId === null) return 'nuevo';
    const info = { ...CURSOS_INFO_DEMO.nuevo, titulo: 'Nuevo curso' };
    const res = await crearCursoBorrador(profesionalId, info);
    if (res.error) {
      setErrorCursos(res.error.message);
      return null;
    }
    idPorKey.current[res.data.key] = res.data.id;
    estudiantesPorKey.current[res.data.key] = 0;
    setCursos((prev) => ({ ...prev, [res.data.key]: info }));
    setModulosPorCurso((prev) => ({ ...prev, [res.data.key]: [] }));
    setMetaCursos((prev) => [...prev, metaDesde(res.data.key, [], 0, prev.length)]);
    return res.data.key;
  }, [profesionalId]);

  return (
    <InstructorCoursesContext.Provider
      value={{
        cursos, modulosPorCurso, metaCursos, enBase, cargando, estadoGuardado, errorCursos,
        actualizarInfo, actualizarModulos, crearCurso,
      }}
    >
      {children}
    </InstructorCoursesContext.Provider>
  );
}

export function useInstructorCourses() {
  const ctx = useContext(InstructorCoursesContext);
  if (!ctx) throw new Error('useInstructorCourses debe usarse dentro de <InstructorCoursesProvider>');
  return ctx;
}
