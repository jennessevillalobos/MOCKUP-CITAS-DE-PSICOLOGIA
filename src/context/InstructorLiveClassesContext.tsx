import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { CLASES_VIVO_DEMO, HOY_VIVO, type ClaseEnVivo, type DestinatarioTipo } from '@/data/clasesVivoInstructorData';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { cargarPerfil } from '@/lib/api/perfil';
import {
  cargarClasesVivo, crearClaseVivo, actualizarClaseVivo, cambiarRecordatorio, idCursoPorSlug, type DatosClaseVivo,
} from '@/lib/api/clasesVivo';

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

// YYYY-MM-DD en hora local.
function hoyLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  // true cuando las clases son las reales (Supabase) del profesional con sesión.
  enBase: boolean;
  // "Hoy" de referencia: la fecha real con la base, la fija de la demo si no.
  hoy: string;
  errorClases: string | null;
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
  const [profesional, setProfesional] = useState<{ id: number; nombre: string } | null>(null);
  const [errorClases, setErrorClases] = useState<string | null>(null);
  const clasesRef = useRef(clases);
  clasesRef.current = clases;
  const enBase = profesional !== null;

  // Con sesión real de un profesional, sus clases y las de sus colegas salen de la base.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelado = false;
    (async () => {
      const perfil = await cargarPerfil();
      if (cancelado || perfil.error || !perfil.data?.profesionalId) return;
      const res = await cargarClasesVivo();
      if (cancelado) return;
      if (res.error) {
        setErrorClases(res.error.message);
        return;
      }
      setProfesional({ id: perfil.data.profesionalId, nombre: perfil.data.nombre ?? '' });
      // `recordarme` no es parte de ClaseEnVivo: va a recordatoriosColegas.
      setClases(res.data.map((c) => {
        const { recordarme, ...clase } = c;
        void recordarme;
        return clase;
      }));
      setRecordatoriosColegas(res.data.filter((c) => c.recordarme).map((c) => c.id));
    })();
    return () => { cancelado = true; };
  }, []);

  // Igual que InstructorAgendaContext/InstructorCoursesContext: en modo demo
  // se sincroniza a localStorage en cada cambio, así el Dashboard y "Clases en
  // vivo" (montados por separado al navegar) siempre ven el mismo estado.
  useEffect(() => {
    if (enBase) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clases));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [clases, enBase]);

  // Aplica el cambio en pantalla y, con la base, lo guarda; si falla se revierte.
  const aplicar = useCallback((id: string, cambio: Partial<ClaseEnVivo>, guardar: () => Promise<{ error: { message: string } | null }>) => {
    const anterior = clasesRef.current.find((c) => c.id === id);
    setClases((cs) => cs.map((c) => (c.id === id ? { ...c, ...cambio } : c)));
    if (!enBase) return;
    guardar().then((res) => {
      if (!res.error) {
        setErrorClases(null);
        return;
      }
      setErrorClases(res.error.message);
      if (anterior) setClases((cs) => cs.map((c) => (c.id === id ? anterior : c)));
    });
  }, [enBase]);

  const datosDesde = useCallback(async (input: NuevaClaseInput): Promise<DatosClaseVivo> => ({
    titulo: input.titulo,
    cursoId: input.destinatarioTipo === 'curso' ? await idCursoPorSlug(input.cursoKey) : null,
    fechaISO: input.fechaISO,
    hora: input.hora,
    duracionMin: input.duracionMin,
    enlace: input.enlace,
    destinatarioTipo: input.destinatarioTipo,
    pacientesCorreos: input.pacientesCorreos,
    grabar: input.grabar,
    recordatorio: input.recordatorio,
  }), []);

  const crearClase = useCallback((input: NuevaClaseInput) => {
    const id = nextId();
    setClases((cs) => [
      ...cs,
      {
        id,
        titulo: input.titulo,
        instructor: profesional?.nombre || 'Dra. Ana Rivas',
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
    if (profesional) {
      // Se muestra de inmediato con un id temporal y se reemplaza por el de la base.
      void datosDesde(input).then((datos) => crearClaseVivo(profesional.id, datos)).then((res) => {
        if (res.error) {
          setErrorClases(res.error.message);
          setClases((cs) => cs.filter((c) => c.id !== id));
          return;
        }
        setErrorClases(null);
        setClases((cs) => cs.map((c) => (c.id === id ? { ...c, id: res.data } : c)));
      });
    }
    return id;
  }, [profesional, datosDesde]);

  const actualizarClase = useCallback((id: string, input: NuevaClaseInput) => {
    aplicar(id, {
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
    }, async () => actualizarClaseVivo(id, await datosDesde(input)));
  }, [aplicar, datosDesde]);

  const cancelarClase = useCallback((id: string) => {
    aplicar(id, { estado: 'cancelada' }, () => actualizarClaseVivo(id, { estado: 'cancelada' }));
  }, [aplicar]);

  const iniciarClase = useCallback((id: string) => {
    const conectados = clasesRef.current.find((c) => c.id === id)?.conectados ?? 1;
    aplicar(id, { estado: 'vivo', conectados }, () => actualizarClaseVivo(id, { estado: 'vivo', conectados }));
  }, [aplicar]);

  const finalizarClase = useCallback((id: string) => {
    const asistieron = clasesRef.current.find((c) => c.id === id)?.conectados ?? 0;
    aplicar(id, { estado: 'finalizada', asistieron }, () => actualizarClaseVivo(id, { estado: 'finalizada', asistieron }));
  }, [aplicar]);

  const toggleRecordarme = useCallback((id: string) => {
    const activar = !recordatoriosColegas.includes(id);
    setRecordatoriosColegas((rs) => (activar ? [...rs, id] : rs.filter((r) => r !== id)));
    if (!enBase) return;
    cambiarRecordatorio(id, activar).then((res) => {
      if (!res.error) return;
      setErrorClases(res.error.message);
      setRecordatoriosColegas((rs) => (activar ? rs.filter((r) => r !== id) : [...rs, id]));
    });
  }, [enBase, recordatoriosColegas]);

  return (
    <InstructorLiveClassesContext.Provider
      value={{
        clases, enBase, hoy: enBase ? hoyLocalISO() : HOY_VIVO, errorClases,
        crearClase, actualizarClase, cancelarClase, iniciarClase, finalizarClase, toggleRecordarme, recordatoriosColegas,
      }}
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
