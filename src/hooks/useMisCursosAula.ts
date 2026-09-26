import { useEffect, useState } from 'react';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { CURSOS_INSCRITOS, type CursoInscrito } from '@/data/aulaVirtualData';
import { CURSOS_PUBLICOS } from '@/data/coursesPageData';
import { cargarMisCursos, type CursoEstudiante } from '@/lib/api/cursosEstudiante';

export interface CursoAula extends CursoInscrito {
  // Solo con datos reales: última clase completada (ISO).
  ultimaActividad?: string | null;
}

// Cursos del Aula Virtual: con sesión real, los inscritos en la base
// (mis_cursos_estudiante); en demo, CURSOS_INSCRITOS. `cursos` es null
// mientras carga.
export function useMisCursosAula() {
  const { esSesionReal } = useSiteAuth();
  const [reales, setReales] = useState<CursoAula[] | null>(null);

  useEffect(() => {
    if (!esSesionReal) return;
    void cargarMisCursos().then((res) => setReales(res.error ? [] : res.data.map(aCursoAula)));
  }, [esSesionReal]);

  return { real: esSesionReal, cursos: esSesionReal ? reales : (CURSOS_INSCRITOS as CursoAula[]) };
}

function aCursoAula(c: CursoEstudiante): CursoAula {
  const publico = CURSOS_PUBLICOS.find((p) => p.key === c.slug);
  return {
    key: c.slug,
    title: { es: c.nombre, en: publico?.title.en ?? c.nombre },
    instructor: c.profesional ?? '',
    leccionActual: c.completadas,
    totalLecciones: c.totalClases,
    progreso: c.porcentaje,
    completado: c.totalClases > 0 && c.porcentaje >= 100,
    image: c.imagen || publico?.image || '',
    ultimaActividad: c.ultimaActividad,
  };
}

// Días seguidos con actividad terminando hoy (o ayer, si hoy aún no hubo),
// en la zona horaria del navegador.
export function calcularRacha(momentos: string[]): number {
  const dia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const dias = new Set(momentos.map((m) => dia(new Date(m))));
  const cursor = new Date();
  if (!dias.has(dia(cursor))) cursor.setDate(cursor.getDate() - 1);
  let racha = 0;
  while (dias.has(dia(cursor))) {
    racha += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

// "Hoy", "Ayer", "Hace N días".
export function haceCuanto(iso: string, language: 'es' | 'en'): string {
  const inicio = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicio(new Date()) - inicio(new Date(iso))) / 86_400_000);
  if (dias <= 0) return language === 'es' ? 'Hoy' : 'Today';
  if (dias === 1) return language === 'es' ? 'Ayer' : 'Yesterday';
  return language === 'es' ? `Hace ${dias} días` : `${dias} days ago`;
}
