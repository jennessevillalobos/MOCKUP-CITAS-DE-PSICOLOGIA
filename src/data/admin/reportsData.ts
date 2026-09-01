// Generador de datos de demostración para el módulo de Reportes.
// Crea una serie diaria de 400 días con cifras plausibles; cada campo
// simula lo que en producción vendría de una agregación por fecha sobre
// citas, inscripciones, ventas y comentarios reales. Las tablas "por
// dimensión" (profesional, curso, producto) reparten el total del período
// usando pesos fijos sobre los catálogos reales del proyecto
// (servicesData, coursesData, digitalProductsData) cuando existen.
import { demoServicios } from './servicesData';
import { demoProfesionales } from './servicesData';
import { demoCursos } from './coursesData';
import { demoProductos } from './digitalProductsData';

export interface DiaReporte {
  fecha: Date;
  citasReal: number;
  citasCancel: number;
  citasNoShow: number;
  ingresosServicios: number;
  inscripciones: number;
  cursosCompletados: number;
  evalTotal: number;
  evalAprobadas: number;
  ventasCursosUnid: number;
  ventasVideosUnid: number;
  ventasLibrosUnid: number;
  ingresosCursos: number;
  ingresosVideos: number;
  ingresosLibros: number;
  ingresosTotal: number;
  comentarios: number;
  sumaEstrellas: number;
  dist: number[]; // [1★,2★,3★,4★,5★]
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function generarDiario(dias: number, base: Date): DiaReporte[] {
  const hoy = new Date(base);
  hoy.setHours(0, 0, 0, 0);
  const arr: DiaReporte[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const finde = dow === 0 || dow === 6;
    const factor = finde ? 0.5 : 1;
    const citasReal = Math.round(rand(4, 9) * factor);
    const citasCancel = Math.round(citasReal * rand(0.05, 0.15));
    const citasNoShow = Math.round(citasReal * rand(0.03, 0.1));
    const ingresosServicios = citasReal * 68 * rand(0.85, 1.15);
    const inscripciones = Math.round(rand(0, 3) * factor);
    const cursosCompletados = Math.round(rand(0, 1.2) * factor);
    const evalTotal = Math.round(rand(0, 4) * factor);
    const evalAprobadas = Math.round(evalTotal * rand(0.65, 0.9));
    const ventasCursosUnid = Math.round(rand(0, 2) * factor);
    const ventasVideosUnid = Math.round(rand(0, 2) * factor);
    const ventasLibrosUnid = Math.round(rand(0, 2) * factor);
    const ingresosCursos = ventasCursosUnid * 44;
    const ingresosVideos = ventasVideosUnid * 23;
    const ingresosLibros = ventasLibrosUnid * 14;
    const comentarios = Math.round(rand(0, 2) * factor);
    let sumaEstrellas = 0;
    const dist = [0, 0, 0, 0, 0];
    for (let c = 0; c < comentarios; c++) {
      const estr = Math.min(5, Math.max(1, Math.round(rand(3, 5.4))));
      dist[estr - 1]++;
      sumaEstrellas += estr;
    }
    arr.push({
      fecha: d,
      citasReal,
      citasCancel,
      citasNoShow,
      ingresosServicios,
      inscripciones,
      cursosCompletados,
      evalTotal,
      evalAprobadas,
      ventasCursosUnid,
      ventasVideosUnid,
      ventasLibrosUnid,
      ingresosCursos,
      ingresosVideos,
      ingresosLibros,
      ingresosTotal: ingresosServicios + ingresosCursos + ingresosVideos + ingresosLibros,
      comentarios,
      sumaEstrellas,
      dist,
    });
  }
  return arr;
}

// Fecha ancla fija (no Date.now()) para que la demo sea reproducible.
export const DIARIO: DiaReporte[] = generarDiario(400, new Date('2026-08-19T00:00:00'));

// ---------- Dimensiones (usa el catálogo real del proyecto) ----------
export interface Peso {
  n: string;
  w: number;
}

function normPesos(lista: Peso[]): Peso[] {
  const total = lista.reduce((a, x) => a + x.w, 0) || 1;
  return lista.map((x) => ({ ...x, w: x.w / total }));
}

export function serviciosDisponibles(): Peso[] {
  return normPesos(demoServicios.map((s, i) => ({ n: s.nombre, w: 1 + ((i % 3) - 1) * 0.15 })));
}

export function profesionalesDisponibles(): Peso[] {
  return normPesos(demoProfesionales.map((p, i) => ({ n: p.nombre, w: 1 + ((i % 3) - 1) * 0.2 })));
}

export function cursosDisponibles(): Peso[] {
  return normPesos(demoCursos.map((c, i) => ({ n: c.titulo, w: 1 + ((i % 3) - 1) * 0.2 })));
}

export function videosDisponibles(): Peso[] {
  const videos = demoProductos.filter((p) => p.tipo === 'Video').map((p) => ({ n: p.titulo, w: 1 }));
  return normPesos(videos.length ? videos : [{ n: '—', w: 1 }]);
}

export function librosDisponibles(): Peso[] {
  const libros = demoProductos.filter((p) => p.tipo === 'Libro').map((p) => ({ n: p.titulo, w: 1 }));
  return normPesos(libros.length ? libros : [{ n: '—', w: 1 }]);
}

// ---------- Rango de fechas ----------
export type PeriodoValor = 'hoy' | '7d' | '30d' | 'trim' | 'anio' | 'custom';

export function rangoPeriodo(periodo: PeriodoValor, hoyBase: Date, desdeCustom?: string, hastaCustom?: string) {
  const hoy = new Date(hoyBase);
  hoy.setHours(0, 0, 0, 0);
  let desde = new Date(hoy);
  let hasta = new Date(hoy);
  if (periodo === 'hoy') {
    // desde = hasta = hoy
  } else if (periodo === '7d') {
    desde.setDate(desde.getDate() - 6);
  } else if (periodo === '30d') {
    desde.setDate(desde.getDate() - 29);
  } else if (periodo === 'trim') {
    desde.setDate(desde.getDate() - 89);
  } else if (periodo === 'anio') {
    desde.setDate(desde.getDate() - 364);
  } else {
    desde = desdeCustom ? new Date(`${desdeCustom}T00:00:00`) : new Date(hoy);
    hasta = hastaCustom ? new Date(`${hastaCustom}T00:00:00`) : new Date(hoy);
    if (desde > hasta) {
      const t = desde;
      desde = hasta;
      hasta = t;
    }
  }
  return { desde, hasta };
}

export function diasEnRango(desde: Date, hasta: Date) {
  return DIARIO.filter((d) => d.fecha >= desde && d.fecha <= hasta);
}

export function rangoAnterior(desde: Date, hasta: Date) {
  const dur = hasta.getTime() - desde.getTime();
  const hastaAnt = new Date(desde.getTime() - 24 * 3600 * 1000);
  const desdeAnt = new Date(hastaAnt.getTime() - dur);
  return { desde: desdeAnt, hasta: hastaAnt };
}

export function sum(dias: DiaReporte[], campo: keyof DiaReporte): number {
  return dias.reduce((a, d) => a + (d[campo] as number), 0);
}

export function cambio(actual: number, anterior: number): { v: number; up: boolean } {
  if (!anterior) return { v: actual > 0 ? 100 : 0, up: true };
  const v = Math.round(((actual - anterior) / anterior) * 100);
  return { v: Math.abs(v), up: v >= 0 };
}

// ---------- Agrupación para el gráfico de barras ----------
export function bucketize(dias: DiaReporte[], campo: keyof DiaReporte): [string, number][] {
  if (!dias.length) return [];
  const span = Math.round((dias[dias.length - 1].fecha.getTime() - dias[0].fecha.getTime()) / (24 * 3600 * 1000)) + 1;
  const porSemana = span <= 98;
  const buckets: Record<string, number> = {};
  const orden: string[] = [];
  dias.forEach((d) => {
    let key: string;
    if (porSemana) {
      const wk = new Date(d.fecha);
      const dow = (wk.getDay() + 6) % 7;
      wk.setDate(wk.getDate() - dow);
      key = wk.toISOString().slice(0, 10);
    } else {
      key = `${d.fecha.getFullYear()}-${String(d.fecha.getMonth() + 1).padStart(2, '0')}`;
    }
    if (!(key in buckets)) {
      buckets[key] = 0;
      orden.push(key);
    }
    buckets[key] += d[campo] as number;
  });
  return orden.map((k) => [k, buckets[k]]);
}

export function formatBucketLabel(key: string, mesesCortos: string[]) {
  if (key.length === 7) {
    return mesesCortos[parseInt(key.slice(5, 7), 10) - 1];
  }
  const d = new Date(`${key}T00:00:00`);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ---------- Exportar CSV (del lado del cliente) ----------
export function exportarCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(',')].concat(rows.map((r) => r.map(esc).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
