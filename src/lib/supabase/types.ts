// Tipos de dominio transcritos manualmente desde las migraciones del equipo:
//   001_usuarios.sql, 002_citas.sql y 003_cursos.sql
//
// Estos tipos permiten desarrollar la capa de servicios sin depender todavía
// de `src/types/database.ts`. Cuando se genere el tipo real de Supabase,
// estos se reemplazarán por el genérico Database sin cambiar los contratos
// de la capa de servicios.

export type RolNombre = 'estudiante' | 'instructor' | 'administrador';

export interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
  telefono: string | null;
  foto: string | null;
  idioma: string;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  fecha_creacion: string;
  ultimo_acceso: string | null;
}

export interface UsuarioRol {
  usuario_id: string;
  rol_id: number;
}

export interface Moneda {
  codigo: string;
  nombre: string;
  simbolo: string;
  es_principal: boolean;
  estado: 'activo' | 'inactivo';
}

export interface Servicio {
  id: number;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  slug: string;
  imagen: string | null;
  estado: 'activo' | 'inactivo';
}

export interface Modalidad {
  id: number;
  nombre: 'presencial' | 'virtual' | 'domicilio';
}

export interface ServicioModalidad {
  id: number;
  servicio_id: number;
  modalidad_id: number;
  duracion_minutos: number;
  precio: number;
  moneda: string | null;
}

export interface Profesional {
  id: number;
  usuario_id: string;
  especialidad: string | null;
  descripcion: string | null;
  estado: 'activo' | 'inactivo';
}

export interface Lugar {
  id: number;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  mapa_url: string | null;
  contacto: string | null;
  estado: 'activo' | 'inactivo';
}

export type CitaEstado =
  | 'pendiente_pago'
  | 'parcialmente_pagada'
  | 'confirmada'
  | 'completada'
  | 'cancelada'
  | 'reprogramada';

export interface Cita {
  id: string;
  usuario_id: string;
  servicio_id: number | null;
  profesional_id: number | null;
  lugar_id: number | null;
  modalidad_id: number | null;
  fecha: string;
  hora: string;
  duracion_minutos: number;
  precio_total: number;
  moneda: string | null;
  monto_abonado: number;
  saldo_pendiente: number;
  estado: CitaEstado;
  observaciones: string | null;
  fecha_creacion: string;
}

export type EstadoOrden = 'pendiente' | 'pagado' | 'cancelado' | 'reembolsado';

export interface Orden {
  id: string;
  usuario_id: string;
  concepto: string;
  tipo_producto: 'cita' | 'curso' | 'producto_digital' | 'cuota';
  producto_id: string;
  monto: number;
  moneda: string | null;
  tasa_aplicada: number | null;
  monto_convertido: number | null;
  estado: EstadoOrden;
  fecha_creacion: string;
}

export interface Pago {
  id: string;
  orden_id: string;
  monto: number;
  moneda: string | null;
  metodo: 'stripe' | 'paypal' | 'manual';
  referencia: string | null;
  comprobante_url: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  fecha: string;
}

export type CursoEstado = 'borrador' | 'publicado' | 'archivado';

export interface Curso {
  id: number;
  nombre: string;
  slug: string;
  imagen: string | null;
  descripcion: string | null;
  precio: number;
  moneda: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: CursoEstado;
}

export interface Modulo {
  id: number;
  curso_id: number;
  titulo: string;
  descripcion: string | null;
  orden: number;
  estado: 'activo' | 'inactivo';
}

export interface Clase {
  id: number;
  modulo_id: number;
  titulo: string;
  descripcion: string | null;
  texto_formativo: string | null;
  video_url: string | null;
  duracion_segundos: number;
  orden: number;
  estado: 'activo' | 'inactivo';
}

export interface Progreso {
  id: number;
  usuario_id: string;
  clase_id: number;
  segundo_actual: number;
  porcentaje: number;
  completado: boolean;
  fecha_actualizacion: string;
}

export interface Inscripcion {
  id: number;
  usuario_id: string;
  curso_id: number;
  tipo_acceso: 'completo' | 'por_cuotas';
  estado: 'activa' | 'suspendida' | 'finalizada';
  fecha_inicio: string;
  fecha_fin: string | null;
}

export type TipoProductoDigital = 'video' | 'libro_pdf';

export interface ProductoDigital {
  id: number;
  tipo: TipoProductoDigital;
  titulo: string;
  slug: string;
  portada: string | null;
  descripcion: string | null;
  precio: number;
  moneda: string | null;
  archivo_url: string | null;
  estado: 'activo' | 'inactivo';
}

export interface CompraDigital {
  id: number;
  usuario_id: string;
  producto_id: number;
  pago_id: string | null;
  fecha: string;
}

export interface EnlaceDescarga {
  id: string;
  compra_id: number;
  token: string;
  vencimiento: string;
  descargas_max: number;
  descargas_realizadas: number;
}
