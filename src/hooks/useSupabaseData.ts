// Hooks para consumir datos reales de Supabase con fallback a demo.
//
// Cada hook devuelve un objeto con la forma { data, loading, error, refresh }
// y combina los datos reales (si Supabase está configurado y hay sesión) con
// los datos demo del frontend, de manera que las páginas siguen funcionando
// cuando todavía no hay backend real activo.

import { useCallback, useEffect, useState } from 'react';
import { cargarMisCitas } from '@/lib/api/citasPaciente';
import { listMisCursos, listModulos } from '@/lib/api/courses';
import { listMisCompras, type CompraDigital } from '@/lib/api/products';
import { PAGOS_PACIENTE, type CitaPaciente } from '@/data/patientPortalData';
import { CURSOS_INSCRITOS } from '@/data/aulaVirtualData';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useInstructorAgenda } from '@/context/InstructorAgendaContext';

// ────────────────────────────────────────────────────────────────────────────
// Citas del paciente: combina DB (si real auth), InstructorAgendaContext
// (reservas hechas en /agendar con modo demo) y los datos demo.
// ────────────────────────────────────────────────────────────────────────────
export function useMyAppointments() {
  const { user, isRealAuth, esSesionReal } = useSiteAuth();
  const { citas: citasAgenda } = useInstructorAgenda();

  const [dbCitas, setDbCitas] = useState<CitaPaciente[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isRealAuth || !esSesionReal || !user) {
      setDbCitas([]);
      return;
    }
    setLoading(true);
    const res = await cargarMisCitas();
    if (res.data) setDbCitas(res.data);
    setLoading(false);
  }, [isRealAuth, esSesionReal, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Reservas del modo demo (localStorage); con sesión real no se mezclan.
  const citasAgendaComoPaciente = user && !esSesionReal
    ? citasAgenda
        .filter((c) => c.correo === user.correo)
        .map((c) => {
          const d = new Date(`${c.fechaISO}T00:00:00`);
          const estado: CitaPaciente['estado'] =
            c.estado === 'Programada' ? 'agendada' : c.estado === 'Completada' ? 'completada' : 'cancelada';
          return {
            dia: d.toLocaleDateString('es-ES', { day: '2-digit' }),
            mes: d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', ''),
            fecha: {
              es: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
              en: d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            },
            servicio: { es: c.servicio, en: c.servicio },
            hora: c.hora,
            modalidad: c.modalidad === 'Presencial' ? (c.lugar ? `Presencial · ${c.lugar}` : 'Presencial') : 'Online',
            profesional: c.profesional,
            estado,
            total: c.precio ?? 0,
            pagado: c.precio ?? 0,
            origenReserva: true,
          } satisfies CitaPaciente;
        })
    : [];

  return { data: { dbCitas, agenda: citasAgendaComoPaciente }, enBase: isRealAuth && esSesionReal, loading, refresh };
}

// ────────────────────────────────────────────────────────────────────────────
// Cursos del estudiante: cursos inscritos reales + cursos de demo.
// ────────────────────────────────────────────────────────────────────────────
export function useMyCourses() {
  const { isRealAuth, user } = useSiteAuth();
  const [dbCursos, setDbCursos] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isRealAuth || !user) {
      setDbCursos([]);
      return;
    }
    setLoading(true);
    const res = await listMisCursos();
    if (res.data) setDbCursos(res.data.map((c) => c.curso_id).filter((id): id is number => id !== null));
    setLoading(false);
  }, [isRealAuth, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dbCursos, demoCursos: CURSOS_INSCRITOS, loading, refresh };
}

// ────────────────────────────────────────────────────────────────────────────
// Compras del paciente: combina DB y demo.
// ────────────────────────────────────────────────────────────────────────────
export function useMyPurchases() {
  const { isRealAuth, user } = useSiteAuth();
  const [dbCompras, setDbCompras] = useState<CompraDigital[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isRealAuth || !user) {
      setDbCompras([]);
      return;
    }
    setLoading(true);
    const res = await listMisCompras();
    if (res.data) setDbCompras(res.data);
    setLoading(false);
  }, [isRealAuth, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dbCompras, demoPagos: PAGOS_PACIENTE, loading, refresh };
}

// ────────────────────────────────────────────────────────────────────────────
// Módulos y clases de un curso real (para Aula Virtual).
// ────────────────────────────────────────────────────────────────────────────
export function useCourseContent(cursoId: number | null) {
  const [modulos, setModulos] = useState<Awaited<ReturnType<typeof listModulos>>['data']>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cursoId === null) {
      setModulos([]);
      return;
    }
    setLoading(true);
    listModulos(cursoId).then((res) => {
      if (res.data) setModulos(res.data);
      setLoading(false);
    });
  }, [cursoId]);

  return { modulos, loading };
}
