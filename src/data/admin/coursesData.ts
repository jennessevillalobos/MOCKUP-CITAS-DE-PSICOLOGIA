export type CursoEstado = 'Publicado' | 'Borrador';

export interface CursoRecord {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  precio: number;
  moneda: string;
  estado: CursoEstado;
  inscritos: number;
  modulos: number;
}

export const demoCursos: CursoRecord[] = [
  { id: 'cu1', titulo: 'Manejo de ansiedad', descripcion: 'Herramientas prácticas para reconocer y regular la ansiedad cotidiana.', categoria: 'Bienestar', precio: 79, moneda: 'USD', estado: 'Publicado', inscritos: 58, modulos: 6 },
  { id: 'cu2', titulo: 'Liderazgo consciente', descripcion: 'Curso grupal para equipos y organizaciones sobre liderazgo emocionalmente inteligente.', categoria: 'Organizacional', precio: 40, moneda: 'USD', estado: 'Publicado', inscritos: 24, modulos: 8 },
  { id: 'cu3', titulo: 'Comunicación en pareja', descripcion: 'Estrategias de comunicación asertiva para fortalecer la relación.', categoria: 'Relaciones', precio: 65, moneda: 'USD', estado: 'Publicado', inscritos: 33, modulos: 5 },
  { id: 'cu4', titulo: 'Crianza respetuosa', descripcion: 'Fundamentos de crianza basada en apego y respeto mutuo.', categoria: 'Familia', precio: 55, moneda: 'USD', estado: 'Borrador', inscritos: 0, modulos: 4 },
];

export type AccesoEstado = 'Activo' | 'Suspendido';

export interface InscripcionRecord {
  id: string;
  cursoId: string;
  estudiante: string;
  correo: string;
  fechaInscripcion: string;
  accesoEstado: AccesoEstado;
  progreso: number; // 0-100
  cuotasTotales: number;
  cuotasPagadas: number;
}

export const demoInscripciones: InscripcionRecord[] = [
  { id: 'in1', cursoId: 'cu1', estudiante: 'Lucía González', correo: 'lucia.gonzalez@mail.com', fechaInscripcion: '2026-07-01', accesoEstado: 'Activo', progreso: 80, cuotasTotales: 1, cuotasPagadas: 1 },
  { id: 'in2', cursoId: 'cu1', estudiante: 'Diana Cruz', correo: 'diana.cruz@mail.com', fechaInscripcion: '2026-07-05', accesoEstado: 'Activo', progreso: 45, cuotasTotales: 1, cuotasPagadas: 1 },
  { id: 'in3', cursoId: 'cu2', estudiante: 'Grupo Bienestar S.A.', correo: 'contacto@bienestar.com', fechaInscripcion: '2026-08-06', accesoEstado: 'Activo', progreso: 20, cuotasTotales: 1, cuotasPagadas: 1 },
  { id: 'in4', cursoId: 'cu3', estudiante: 'Marco Peña', correo: 'marco.pena@mail.com', fechaInscripcion: '2026-06-20', accesoEstado: 'Suspendido', progreso: 30, cuotasTotales: 3, cuotasPagadas: 1 },
  { id: 'in5', cursoId: 'cu3', estudiante: 'Ana Torres', correo: 'ana.torres@mail.com', fechaInscripcion: '2026-06-22', accesoEstado: 'Activo', progreso: 95, cuotasTotales: 3, cuotasPagadas: 3 },
];

export type TipoRegla = 'Secuencial' | 'Evaluación' | 'Pago';

export interface ReglaDesbloqueo {
  cursoId: string;
  tipo: TipoRegla;
  notaMinima: number;
  bloquearSiCuotaVencida: boolean;
  emitirCertificado: boolean;
  permitirRepetirEvaluacion: boolean;
}

export const demoReglas: ReglaDesbloqueo[] = [
  { cursoId: 'cu1', tipo: 'Secuencial', notaMinima: 70, bloquearSiCuotaVencida: true, emitirCertificado: true, permitirRepetirEvaluacion: true },
  { cursoId: 'cu2', tipo: 'Pago', notaMinima: 0, bloquearSiCuotaVencida: true, emitirCertificado: false, permitirRepetirEvaluacion: false },
  { cursoId: 'cu3', tipo: 'Evaluación', notaMinima: 80, bloquearSiCuotaVencida: false, emitirCertificado: true, permitirRepetirEvaluacion: true },
  { cursoId: 'cu4', tipo: 'Secuencial', notaMinima: 60, bloquearSiCuotaVencida: true, emitirCertificado: true, permitirRepetirEvaluacion: false },
];

export type CuotaEstado = 'Vencida' | 'Pendiente' | 'Pagada';

export interface CuotaRecord {
  id: string;
  inscripcionId: string;
  estudiante: string;
  curso: string;
  numero: number;
  totalCuotas: number;
  monto: number;
  moneda: string;
  vencimiento: string;
  estado: CuotaEstado;
}

export const demoCuotas: CuotaRecord[] = [
  { id: 'cq1', inscripcionId: 'in4', estudiante: 'Marco Peña', curso: 'Comunicación en pareja', numero: 2, totalCuotas: 3, monto: 22, moneda: 'USD', vencimiento: '2026-08-01', estado: 'Vencida' },
  { id: 'cq2', inscripcionId: 'in4', estudiante: 'Marco Peña', curso: 'Comunicación en pareja', numero: 3, totalCuotas: 3, monto: 22, moneda: 'USD', vencimiento: '2026-09-01', estado: 'Pendiente' },
  { id: 'cq3', inscripcionId: 'in5', estudiante: 'Ana Torres', curso: 'Comunicación en pareja', numero: 3, totalCuotas: 3, monto: 22, moneda: 'USD', vencimiento: '2026-08-20', estado: 'Pagada' },
  { id: 'cq4', inscripcionId: 'in1', estudiante: 'Lucía González', curso: 'Manejo de ansiedad', numero: 1, totalCuotas: 1, monto: 79, moneda: 'USD', vencimiento: '2026-07-01', estado: 'Pagada' },
];
