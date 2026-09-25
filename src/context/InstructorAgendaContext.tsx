import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { CitaEstado } from '@/data/admin/agendaData';
import { AGENDA_INSTRUCTOR_HOY, CITAS_INSTRUCTOR_DEMO, NOTAS_PACIENTE_DEMO, type CitaInstructor, type NotaPaciente } from '@/data/citasInstructorData';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { cargarPerfil } from '@/lib/api/perfil';
import { cargarCitasProfesional, actualizarCita, crearNotaPaciente } from '@/lib/api/citasProfesional';

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

// YYYY-MM-DD en hora local.
function hoyLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface InstructorAgendaContextValue {
  citas: CitaInstructor[];
  notas: NotaPaciente[];
  // true cuando las citas son las reales del profesional con sesión (Supabase).
  enBase: boolean;
  // "Hoy" de referencia: la fecha real con la base, la fecha fija de la demo si no.
  hoy: string;
  cargando: boolean;
  errorCitas: string | null;
  reagendarCita: (id: string, fechaISO: string, hora: string) => void;
  cambiarEstado: (id: string, estado: CitaEstado) => void;
  actualizarNotaSesion: (id: string, texto: string) => void;
  agregarNotaPaciente: (correo: string, paciente: string, texto: string) => void;
  // Crea una cita nueva (usada por el wizard público de reserva en
  // /agendar, modo demo) y devuelve el id generado.
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
  const [profesionalId, setProfesionalId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorCitas, setErrorCitas] = useState<string | null>(null);
  const pacientePorCorreo = useRef<Record<string, string>>({});
  const citasRef = useRef(citas);
  citasRef.current = citas;
  const enBase = profesionalId !== null;

  // Si la sesión real es de un profesional, sus citas y notas salen de la base.
  // Pacientes, visitantes de /agendar y el modo demo siguen con localStorage.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelado = false;
    (async () => {
      const perfil = await cargarPerfil();
      if (cancelado || perfil.error || !perfil.data?.profesionalId) return;
      setCargando(true);
      const res = await cargarCitasProfesional(perfil.data.profesionalId, perfil.data.nombre ?? '');
      if (cancelado) return;
      setCargando(false);
      if (res.error) {
        setErrorCitas(res.error.message);
        return;
      }
      pacientePorCorreo.current = res.data.pacientePorCorreo;
      setProfesionalId(perfil.data.profesionalId);
      setCitas(res.data.citas);
      setNotas(res.data.notas);
    })();
    return () => { cancelado = true; };
  }, []);

  // Sincroniza cada cambio a localStorage — así "Mis citas" y el Dashboard
  // (montados por separado al navegar entre rutas) siempre ven el mismo
  // estado, sin necesidad de un provider global montado en toda la app.
  // Con la base no se toca: los datos reales no se mezclan con los de demo.
  useEffect(() => {
    if (enBase) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ citas, notas }));
    } catch {
      // localStorage no disponible; los cambios siguen vivos en memoria durante esta visita.
    }
  }, [citas, notas, enBase]);

  // Aplica un cambio en pantalla y, con la base, lo guarda; si falla se revierte.
  const cambiarCita = useCallback(
    (id: string, cambios: Partial<CitaInstructor>, guardar: () => ReturnType<typeof actualizarCita>) => {
      const anterior = citasRef.current.find((c) => c.id === id);
      setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
      if (!enBase) return;
      guardar().then((res) => {
        if (!res.error) {
          setErrorCitas(null);
          return;
        }
        setErrorCitas(res.error.message);
        if (anterior) setCitas((prev) => prev.map((c) => (c.id === id ? anterior : c)));
      });
    },
    [enBase]
  );

  const reagendarCita = useCallback((id: string, fechaISO: string, hora: string) => {
    cambiarCita(id, { fechaISO, hora, estado: 'Programada' }, () => actualizarCita(id, { fechaISO, hora }));
  }, [cambiarCita]);

  const cambiarEstado = useCallback((id: string, estado: CitaEstado) => {
    cambiarCita(id, { estado }, () => actualizarCita(id, { estado }));
  }, [cambiarCita]);

  const actualizarNotaSesion = useCallback((id: string, texto: string) => {
    cambiarCita(id, { notas: texto }, () => actualizarCita(id, { notas: texto }));
  }, [cambiarCita]);

  const agregarNotaPaciente = useCallback((correo: string, paciente: string, texto: string) => {
    if (!texto.trim()) return;
    const idTemporal = `np${Date.now()}`;
    setNotas((prev) => [{ id: idTemporal, correo, paciente, fecha: 'Hoy', texto: texto.trim() }, ...prev]);
    const pacienteId = pacientePorCorreo.current[correo];
    if (!enBase || profesionalId === null) return;
    if (!pacienteId) {
      setErrorCitas('No se encontró la cuenta de este paciente.');
      setNotas((prev) => prev.filter((n) => n.id !== idTemporal));
      return;
    }
    crearNotaPaciente(profesionalId, pacienteId, texto.trim()).then((res) => {
      if (res.error) {
        setErrorCitas(res.error.message);
        setNotas((prev) => prev.filter((n) => n.id !== idTemporal));
        return;
      }
      setErrorCitas(null);
      setNotas((prev) => prev.map((n) => (n.id === idTemporal ? { ...n, id: res.data.id, fecha: res.data.fecha } : n)));
    });
  }, [enBase, profesionalId]);

  const agregarCita = useCallback((cita: Omit<CitaInstructor, 'id'>) => {
    const id = nextCitaId();
    setCitas((prev) => [...prev, { ...cita, id }]);
    return id;
  }, []);

  return (
    <InstructorAgendaContext.Provider
      value={{
        citas, notas, enBase, hoy: enBase ? hoyLocalISO() : AGENDA_INSTRUCTOR_HOY, cargando, errorCitas,
        reagendarCita, cambiarEstado, actualizarNotaSesion, agregarNotaPaciente, agregarCita,
      }}
    >
      {children}
    </InstructorAgendaContext.Provider>
  );
}

export function useInstructorAgenda() {
  const ctx = useContext(InstructorAgendaContext);
  if (!ctx) throw new Error('useInstructorAgenda debe usarse dentro de <InstructorAgendaProvider>');
  return ctx;
}
