import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';

// Panel admin conectado (migración 039): acceso solo con el rol
// `administrador` y datos reales. Montos de la base en centavos; esta capa los
// devuelve en unidades (USD).

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

export async function esAdmin(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return false;
  const { data, error } = await supabase.rpc('es_admin');
  return !error && data === true;
}

export type PeriodoPanel = 'hoy' | '30d' | 'trimestre' | 'anio';

export interface PanelAdmin {
  kpis: {
    ingresos: number; ingresosPrevio: number;
    citasHoy: number; citasHoyOnline: number;
    nuevosUsuarios: number; nuevosUsuariosPrevio: number;
    ventas: number; ventasPrevio: number; ventasMonto: number;
  };
  ingresosPorMes: { mes: string; terapias: number; academia: number }[];
  canales: { terapias: number; cursos: number; productos: number };
  proximasCitas: { id: string; fecha: string; hora: string; paciente: string | null; servicio: string | null; profesional: string | null; lugar: string | null; estado: string }[];
  ventasRecientes: { concepto: string | null; tipo: string; quien: string | null; fecha: string; monto: number }[];
  pagosPorVerificar: { id: string; nombre: string | null; concepto: string | null; metodo: string; monto: number; fecha: string }[];
  saldosPendientes: { citaId: string; nombre: string | null; servicio: string | null; fecha: string; saldo: number; enRevision: number }[];
}

const aUsd = (c: number) => c / 100;

export async function cargarPanelAdmin(periodo: PeriodoPanel): Promise<Result<PanelAdmin>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.rpc('admin_panel_resumen', { p_periodo: periodo });
  if (error) return fail(toServiceError(error));
  const p = data as PanelAdmin;
  return ok({
    kpis: { ...p.kpis, ingresos: aUsd(p.kpis.ingresos), ingresosPrevio: aUsd(p.kpis.ingresosPrevio), ventasMonto: aUsd(p.kpis.ventasMonto) },
    ingresosPorMes: (p.ingresosPorMes ?? []).map((m) => ({ ...m, terapias: aUsd(m.terapias), academia: aUsd(m.academia) })),
    canales: { terapias: aUsd(p.canales.terapias), cursos: aUsd(p.canales.cursos), productos: aUsd(p.canales.productos) },
    proximasCitas: p.proximasCitas ?? [],
    ventasRecientes: (p.ventasRecientes ?? []).map((v) => ({ ...v, monto: aUsd(v.monto) })),
    pagosPorVerificar: (p.pagosPorVerificar ?? []).map((v) => ({ ...v, monto: aUsd(v.monto) })),
    saldosPendientes: (p.saldosPendientes ?? []).map((s) => ({ ...s, saldo: aUsd(s.saldo), enRevision: aUsd(s.enRevision) })),
  });
}

// "Notificar": recordatorio de saldo pendiente al paciente.
export async function recordarSaldo(citaId: string): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.rpc('admin_recordar_saldo', { p_cita_id: citaId });
  if (error) return fail(toServiceError(error));
  return ok(null);
}

// ── Usuarios (migración 040) ──

export type RolBase = 'estudiante' | 'instructor' | 'administrador';
export type EstadoCuenta = 'activo' | 'inactivo' | 'bloqueado';

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  estado: EstadoCuenta;
  creado: string;
  ultimoAcceso: string | null;
  roles: RolBase[];
  // slug de la ficha de profesional vinculada, si la tiene.
  profesional: string | null;
}

export interface ActividadUsuarioAdmin {
  tipo: string;
  texto: string;
  fecha: string;
}

async function rpcAdmin<T>(nombre: string, args?: Record<string, unknown>): Promise<Result<T>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) return fail(toServiceError(error));
  return ok((data ?? null) as T);
}

export async function listarUsuariosAdmin(): Promise<Result<UsuarioAdmin[]>> {
  const res = await rpcAdmin<UsuarioAdmin[] | null>('admin_listar_usuarios');
  return res.error ? fail(res.error) : ok(res.data ?? []);
}

export async function actividadUsuarioAdmin(usuarioId: string): Promise<Result<ActividadUsuarioAdmin[]>> {
  const res = await rpcAdmin<ActividadUsuarioAdmin[] | null>('admin_actividad_usuario', { p_usuario_id: usuarioId });
  return res.error ? fail(res.error) : ok(res.data ?? []);
}

export function guardarRolesAdmin(usuarioId: string, roles: RolBase[]) {
  return rpcAdmin<null>('admin_guardar_roles', { p_usuario_id: usuarioId, p_roles: roles });
}

export function cambiarEstadoUsuario(usuarioId: string, estado: EstadoCuenta) {
  return rpcAdmin<null>('admin_cambiar_estado', { p_usuario_id: usuarioId, p_estado: estado });
}

// Contraseña temporal que el administrador comunica a la persona.
export function claveTemporalUsuario(usuarioId: string, clave: string) {
  return rpcAdmin<null>('admin_clave_temporal', { p_usuario_id: usuarioId, p_clave: clave });
}

// ── Pagos y Finanzas (migraciones 041–042) ──

export type EstadoPagoBase = 'pendiente' | 'aprobado' | 'rechazado' | 'pendiente_reembolso' | 'reembolsado';

export interface PagoAdmin {
  id: string;
  ordenId: string | null;
  cliente: string | null;
  correo: string | null;
  concepto: string;
  tipo: 'cita' | 'curso' | 'producto_digital' | 'cuota' | null;
  metodo: string;
  monto: number;
  moneda: string;
  fecha: string;
  estado: EstadoPagoBase;
  referencia: string | null;
  comprobante: string | null;
  motivoRechazo: string | null;
  reembolsado: number;
  reembolsos: { monto: number; motivo: string; fecha: string }[];
  profesional: string | null;
}

export async function listarPagosAdmin(): Promise<Result<PagoAdmin[]>> {
  const res = await rpcAdmin<PagoAdmin[] | null>('admin_listar_pagos');
  if (res.error) return fail(res.error);
  return ok(
    (res.data ?? []).map((p) => ({
      ...p,
      monto: aUsd(p.monto),
      reembolsado: aUsd(p.reembolsado),
      reembolsos: (p.reembolsos ?? []).map((r) => ({ ...r, monto: aUsd(r.monto) })),
    }))
  );
}

// Monto en USD; la base lo guarda en centavos.
export function reembolsarPago(pagoId: string, montoUsd: number, motivo: string) {
  return rpcAdmin<null>('admin_reembolsar_pago', { p_pago_id: pagoId, p_monto: Math.round(montoUsd * 100), p_motivo: motivo });
}

export interface OrdenAdmin {
  id: string;
  cliente: string | null;
  concepto: string | null;
  tipo: string;
  total: number;
  moneda: string;
  estado: 'pendiente' | 'pagado' | 'cancelado' | 'reembolsado';
  fecha: string;
  saldoCita: number | null;
  pagos: { id: string; monto: number; moneda: string; metodo: string; fecha: string; estado: EstadoPagoBase; referencia: string | null }[];
  reembolsado: number;
}

export async function listarOrdenesAdmin(): Promise<Result<OrdenAdmin[]>> {
  const res = await rpcAdmin<OrdenAdmin[] | null>('admin_listar_ordenes');
  if (res.error) return fail(res.error);
  return ok(
    (res.data ?? []).map((o) => ({
      ...o,
      total: aUsd(o.total),
      saldoCita: o.saldoCita === null ? null : aUsd(o.saldoCita),
      reembolsado: aUsd(o.reembolsado),
      pagos: (o.pagos ?? []).map((p) => ({ ...p, monto: aUsd(p.monto) })),
    }))
  );
}

export function registrarAbonoAdmin(ordenId: string, montoUsd: number, referencia?: string) {
  return rpcAdmin<null>('admin_registrar_abono', { p_orden_id: ordenId, p_monto: Math.round(montoUsd * 100), p_referencia: referencia ?? null });
}

export interface MonedaBase {
  codigo: string;
  nombre: string;
  simbolo: string;
  esPrincipal: boolean;
  activa: boolean;
}

export interface TasaBase {
  id: number;
  codigo: string;
  // Unidades de la moneda por 1 USD.
  tasa: number;
  fecha: string;
}

// Monedas y tasas son de lectura pública. Las tasas guardadas como
// "X → USD" se invierten para mostrarlas siempre como unidades por 1 USD.
export async function cargarMonedasYTasas(): Promise<Result<{ monedas: MonedaBase[]; tasas: TasaBase[] }>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();
  const [m, t] = await Promise.all([
    supabase.from('monedas').select('codigo, nombre, simbolo, es_principal, estado').order('es_principal', { ascending: false }).order('codigo'),
    supabase.from('tasas_cambio').select('id, moneda_origen, moneda_destino, tasa, fecha').order('fecha', { ascending: false }).order('id', { ascending: false }),
  ]);
  if (m.error) return fail(toServiceError(m.error));
  if (t.error) return fail(toServiceError(t.error));
  const base = (m.data ?? []).find((x) => x.es_principal)?.codigo ?? 'USD';
  const tasas: TasaBase[] = [];
  for (const r of t.data ?? []) {
    const valor = Number(r.tasa);
    if (!(valor > 0)) continue;
    if (r.moneda_origen === base) tasas.push({ id: r.id, codigo: r.moneda_destino, tasa: valor, fecha: r.fecha });
    else if (r.moneda_destino === base) tasas.push({ id: r.id, codigo: r.moneda_origen, tasa: Math.round((1 / valor) * 10000) / 10000, fecha: r.fecha });
  }
  return ok({
    monedas: (m.data ?? []).map((x) => ({ codigo: x.codigo, nombre: x.nombre, simbolo: x.simbolo, esPrincipal: !!x.es_principal, activa: x.estado === 'activo' })),
    tasas,
  });
}

export function guardarMonedaAdmin(codigo: string, nombre: string, simbolo: string) {
  return rpcAdmin<null>('admin_guardar_moneda', { p_codigo: codigo, p_nombre: nombre, p_simbolo: simbolo });
}

export function estadoMonedaAdmin(codigo: string, activa: boolean) {
  return rpcAdmin<null>('admin_estado_moneda', { p_codigo: codigo, p_activa: activa });
}

export function registrarTasaAdmin(codigo: string, tasa: number) {
  return rpcAdmin<null>('admin_registrar_tasa', { p_codigo: codigo, p_tasa: tasa });
}

// ── Agenda (migración 043) ──

export type EstadoCitaBase = 'pendiente_pago' | 'parcialmente_pagada' | 'confirmada' | 'completada' | 'cancelada' | 'reprogramada' | 'no_asistio';

export interface CitaAdmin {
  id: string;
  fecha: string;
  hora: string;
  duracion: number;
  paciente: string | null;
  correo: string | null;
  servicio: string | null;
  servicioId: number;
  profesional: string | null;
  profesionalId: number;
  modalidad: string | null;
  lugar: string | null;
  lugarId: number | null;
  estado: EstadoCitaBase;
  precio: number;
  saldo: number;
  notas: string | null;
}

export interface AgendaAdmin {
  citas: CitaAdmin[];
  profesionales: { id: number; nombre: string }[];
  servicios: { id: number; nombre: string }[];
  lugares: { id: number; nombre: string }[];
  modalidades: { id: number; nombre: string }[];
  tarifas: { servicioId: number; modalidadId: number; duracion: number; precio: number }[];
  ofrece: { profesionalId: number; servicioId: number }[];
}

export async function cargarAgendaAdmin(): Promise<Result<AgendaAdmin>> {
  const res = await rpcAdmin<AgendaAdmin>('admin_agenda');
  if (res.error) return fail(res.error);
  const a = res.data;
  return ok({
    ...a,
    citas: (a.citas ?? []).map((c) => ({ ...c, precio: aUsd(c.precio), saldo: aUsd(c.saldo) })),
    tarifas: (a.tarifas ?? []).map((t) => ({ ...t, precio: aUsd(t.precio) })),
  });
}

// Estado (completada / no_asistio / cancelada) y/o nueva fecha y hora.
export function actualizarCitaAdmin(
  citaId: string,
  cambios: { estado?: 'completada' | 'no_asistio' | 'cancelada'; fecha?: string; hora?: string; motivo?: string }
) {
  return rpcAdmin<null>('admin_actualizar_cita', {
    p_cita_id: citaId,
    p_estado: cambios.estado ?? null,
    p_fecha: cambios.fecha ?? null,
    p_hora: cambios.hora ?? null,
    p_motivo: cambios.motivo ?? null,
  });
}

export function crearCitaAdmin(datos: {
  correo: string; servicioId: number; profesionalId: number; modalidadId: number; lugarId: number | null; fecha: string; hora: string;
}) {
  return rpcAdmin<string>('admin_crear_cita', {
    p_correo: datos.correo,
    p_servicio_id: datos.servicioId,
    p_profesional_id: datos.profesionalId,
    p_modalidad_id: datos.modalidadId,
    p_lugar_id: datos.lugarId,
    p_fecha: datos.fecha,
    p_hora: datos.hora,
  });
}

// ── Academia: cursos, evaluaciones, clases en vivo y productos (migración 044) ──

export interface AcademiaAdmin {
  profesionales: { id: number; nombre: string }[];
  cursos: {
    id: number; nombre: string; slug: string; descripcion: string | null; categoria: string | null;
    precio: number; moneda: string; estado: 'borrador' | 'publicado' | 'archivado';
    profesional: string | null; profesionalId: number | null; inscritos: number; modulos: number; clases: number;
    reglas: Record<string, number> | null;
  }[];
  inscripciones: {
    id: number; cursoId: number; curso: string; estudiante: string | null; correo: string | null;
    fecha: string; estado: 'activa' | 'suspendida' | 'finalizada'; progreso: number;
  }[];
  evaluaciones: {
    id: number; titulo: string; tipo: string; curso: string; cursoEstado: string; modulo: string | null; profesional: string | null;
    intentosMax: number; notaMinima: number; preguntas: number; intentos: number; evaluados: number; aprobados: number; intentosMes: number;
  }[];
  pendientes: { id: number; estudiante: string | null; curso: string; evaluacion: string; profesional: string | null; fecha: string }[];
  clasesVivo: {
    id: number; titulo: string; curso: string | null; profesional: string | null; fecha: string; hora: string; duracion: number;
    enlace: string | null; destinatario: 'curso' | 'pacientes'; invitados: number; inscritos: number;
    grabar: boolean; recordatorio: boolean; estado: 'programada' | 'vivo' | 'finalizada' | 'cancelada';
    grabacion: string | null; asistieron: number | null;
  }[];
  productos: {
    id: number; clave: string; titulo: string; tipo: 'video' | 'libro_pdf'; categoria: string | null; precio: number; moneda: string;
    estado: 'activo' | 'inactivo'; descripcion: string | null; profesional: string | null; profesionalId: number | null;
    tieneArchivo: boolean; descarga: boolean; ventas: number; ventasMes: number;
  }[];
}

export async function cargarAcademiaAdmin(): Promise<Result<AcademiaAdmin>> {
  const res = await rpcAdmin<AcademiaAdmin>('admin_academia');
  if (res.error) return fail(res.error);
  const a = res.data;
  return ok({
    ...a,
    cursos: (a.cursos ?? []).map((c) => ({ ...c, precio: aUsd(c.precio) })),
    productos: (a.productos ?? []).map((p) => ({ ...p, precio: aUsd(p.precio) })),
  });
}

export function estadoCursoAdmin(cursoId: number, estado: 'borrador' | 'publicado' | 'archivado') {
  return rpcAdmin<null>('admin_estado_curso', { p_curso_id: cursoId, p_estado: estado });
}

export function reasignarCursoAdmin(cursoId: number, profesionalId: number) {
  return rpcAdmin<null>('admin_reasignar_curso', { p_curso_id: cursoId, p_profesional_id: profesionalId });
}

export function accesoInscripcionAdmin(inscripcionId: number, activa: boolean) {
  return rpcAdmin<null>('admin_acceso_inscripcion', { p_inscripcion_id: inscripcionId, p_activa: activa });
}

export function actualizarProductoAdmin(productoId: number, cambios: { activo?: boolean; profesionalId?: number; descarga?: boolean }) {
  return rpcAdmin<null>('admin_actualizar_producto', {
    p_producto_id: productoId,
    p_activo: cambios.activo ?? null,
    p_profesional_id: cambios.profesionalId ?? null,
    p_descarga: cambios.descarga ?? null,
  });
}

export function actualizarClaseVivoAdmin(
  claseId: number,
  cambios: { titulo?: string; fecha?: string; hora?: string; duracion?: number; enlace?: string; cancelar?: boolean }
) {
  return rpcAdmin<null>('admin_actualizar_clase_vivo', {
    p_clase_id: claseId,
    p_titulo: cambios.titulo ?? null,
    p_fecha: cambios.fecha ?? null,
    p_hora: cambios.hora ?? null,
    p_duracion: cambios.duracion ?? null,
    p_enlace: cambios.enlace ?? null,
    p_cancelar: cambios.cancelar ?? false,
  });
}

// ── Reseñas, mensajes de contacto y avisos del admin (migración 046) ──

export interface ResenaAdmin {
  id: number;
  paciente: string | null;
  profesional: string | null;
  servicio: string | null;
  notaProfesional: number;
  notaServicio: number;
  comentario: string | null;
  fecha: string;
  estado: 'pendiente' | 'aprobado' | 'oculto';
}

export async function listarResenasAdmin(): Promise<Result<ResenaAdmin[]>> {
  const res = await rpcAdmin<ResenaAdmin[] | null>('admin_resenas');
  return res.error ? fail(res.error) : ok(res.data ?? []);
}

export function moderarResenaAdmin(id: number, estado: ResenaAdmin['estado']) {
  return rpcAdmin<null>('admin_moderar_resena', { p_id: id, p_estado: estado });
}

export function eliminarResenaAdmin(id: number) {
  return rpcAdmin<null>('admin_eliminar_resena', { p_id: id });
}

export type EstadoMensaje = 'nuevo' | 'leido' | 'respondido' | 'archivado';

export interface MensajeContactoAdmin {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  asunto: string | null;
  mensaje: string;
  origen: 'home' | 'contacto';
  idioma: 'es' | 'en';
  estado: EstadoMensaje;
  correoEnviado: boolean | null;
  correoError: string | null;
  fecha: string;
}

export async function listarMensajesAdmin(): Promise<Result<MensajeContactoAdmin[]>> {
  const res = await rpcAdmin<MensajeContactoAdmin[] | null>('admin_mensajes');
  return res.error ? fail(res.error) : ok(res.data ?? []);
}

export function estadoMensajeAdmin(id: number, estado: EstadoMensaje) {
  return rpcAdmin<null>('admin_estado_mensaje', { p_id: id, p_estado: estado });
}

export interface AvisoAdmin {
  id: number;
  tipo: 'cita' | 'evaluacion' | 'curso' | 'vivo' | 'reseña' | 'pago' | 'mensaje';
  textoEs: string;
  textoEn: string;
  link: string | null;
  leida: boolean;
  fecha: string;
}

// Notificaciones propias del admin (las generan los triggers de la 046).
export async function cargarAvisosAdmin(): Promise<Result<AvisoAdmin[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, tipo, texto_es, texto_en, link, leida, creado_en')
    .order('creado_en', { ascending: false })
    .limit(100);
  if (error) return fail(toServiceError(error));
  return ok(
    (data ?? []).map((n) => ({
      id: n.id, tipo: n.tipo, textoEs: n.texto_es, textoEn: n.texto_en, link: n.link, leida: n.leida, fecha: n.creado_en,
    }))
  );
}

export async function contarAvisosNoLeidos(): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return 0;
  const { count } = await supabase.from('notificaciones').select('id', { count: 'exact', head: true }).eq('leida', false);
  return count ?? 0;
}

// ── Reportes (migraciones 047–048) ──

export interface DiaReporteBase {
  fecha: string;
  citasReal: number; citasCancel: number; citasNoShow: number;
  ingresosServicios: number; ingresosCursos: number; ingresosVideos: number; ingresosLibros: number;
  inscripciones: number; cursosCompletados: number; evalTotal: number; evalAprobadas: number;
  ventasCursosUnid: number; ventasVideosUnid: number; ventasLibrosUnid: number;
  comentarios: number; sumaEstrellas: number; dist: number[];
}

export interface ReportesAdmin {
  dias: DiaReporteBase[];
  finanzas: { concepto: string; categoria: 'servicio' | 'curso' | 'video' | 'libro'; monto: number }[];
  citasPorProfesional: { profesional: string; realizadas: number; canceladas: number; noshow: number }[];
  academiaPorCurso: { curso: string; inscripciones: number; completados: number; evaluaciones: number; aprobadas: number }[];
  ventas: { producto: string; categoria: 'curso' | 'video' | 'libro'; unidades: number; monto: number }[];
  resenasPorServicio: { nombre: string; promedio: number; total: number }[];
  resenasPorProfesional: { nombre: string; promedio: number; total: number }[];
}

// Serie diaria desde el inicio del período anterior hasta `hasta`, en USD.
export async function cargarReportesAdmin(desde: string, hasta: string): Promise<Result<ReportesAdmin>> {
  const res = await rpcAdmin<ReportesAdmin>('admin_reportes', { p_desde: desde, p_hasta: hasta });
  if (res.error) return fail(res.error);
  const r = res.data;
  return ok({
    ...r,
    dias: (r.dias ?? []).map((d) => ({
      ...d,
      ingresosServicios: aUsd(d.ingresosServicios), ingresosCursos: aUsd(d.ingresosCursos),
      ingresosVideos: aUsd(d.ingresosVideos), ingresosLibros: aUsd(d.ingresosLibros),
    })),
    finanzas: (r.finanzas ?? []).map((f) => ({ ...f, monto: aUsd(f.monto) })),
    ventas: (r.ventas ?? []).map((v) => ({ ...v, monto: aUsd(v.monto) })),
    resenasPorServicio: (r.resenasPorServicio ?? []).map((x) => ({ ...x, promedio: Number(x.promedio) })),
    resenasPorProfesional: (r.resenasPorProfesional ?? []).map((x) => ({ ...x, promedio: Number(x.promedio) })),
  });
}

// ── Configuración: contacto, auditoría y sesiones (migración 049) ──

export function guardarContactoAdmin(valor: Record<string, string>) {
  return rpcAdmin<null>('admin_guardar_contacto', { p_valor: valor });
}

export interface EventoAuditoria {
  fecha: string;
  usuario: string;
  accion: string;
  detalle: string;
  tipo: 'Creación' | 'Edición' | 'Eliminación' | 'Acceso' | 'Seguridad';
}

export async function cargarAuditoriaAdmin(): Promise<Result<EventoAuditoria[]>> {
  const res = await rpcAdmin<EventoAuditoria[] | null>('admin_auditoria');
  return res.error ? fail(res.error) : ok(res.data ?? []);
}

export interface SesionAdmin {
  id: string;
  dispositivo: string | null;
  ip: string | null;
  creada: string;
  actividad: string;
  actual: boolean;
}

export async function misSesionesAdmin(): Promise<Result<SesionAdmin[]>> {
  const res = await rpcAdmin<SesionAdmin[] | null>('admin_mis_sesiones');
  return res.error ? fail(res.error) : ok(res.data ?? []);
}

export function cerrarSesionAdmin(sesionId: string) {
  return rpcAdmin<null>('admin_cerrar_sesion', { p_sesion_id: sesionId });
}

// Datos bancarios para transferencias (migración 051).
export function guardarTransferenciaAdmin(valor: { banco: string; titular: string; numero: string; adicional: string }) {
  return rpcAdmin<null>('admin_guardar_transferencia', { p_valor: valor });
}

// Fichas de profesionales (migraciones 055–056): la profesional se registra y
// el admin crea su ficha enlazada a esa cuenta (o pasa una ficha a otra cuenta).
export interface PerfilFicha {
  especialidad_en?: string; descripcion_en?: string;
  modalidad_es?: string; modalidad_en?: string;
  bio_es?: string; bio_en?: string;
  experiencia_es?: string; experiencia_en?: string;
  enfoques_es?: string[]; enfoques_en?: string[];
  formacion?: string[];
}

export interface FichaProfesionalAdmin {
  id: number;
  slug: string;
  especialidad: string | null;
  descripcion: string | null;
  estado: 'activo' | 'inactivo';
  perfil: PerfilFicha;
  nombre: string | null;
  correo: string | null;
  foto: string | null;
  cuentaInterna: boolean;
  servicios: number[];
  sedes: number[];
  citas: number;
  cursos: number;
  tieneHorario: boolean;
}

export interface ProfesionalesAdmin {
  fichas: FichaProfesionalAdmin[];
  servicios: { id: number; slug: string; nombre: string }[];
  sedes: { id: number; slug: string; nombre: string }[];
}

export type DatosFicha = PerfilFicha & {
  nombre: string;
  especialidad: string;
  descripcion: string;
  estado?: 'activo' | 'inactivo';
  servicios: number[];
  sedes: number[];
};

export function cargarProfesionalesAdmin() {
  return rpcAdmin<ProfesionalesAdmin>('admin_profesionales');
}

export function crearProfesionalAdmin(correo: string, datos: DatosFicha) {
  return rpcAdmin<number>('admin_crear_profesional', { p_correo: correo, p_datos: datos });
}

export function actualizarProfesionalAdmin(id: number, datos: DatosFicha) {
  return rpcAdmin<null>('admin_actualizar_profesional', { p_id: id, p_datos: datos });
}

export function enlazarProfesionalAdmin(id: number, correo: string, nombre: string) {
  return rpcAdmin<null>('admin_enlazar_profesional', { p_id: id, p_correo: correo, p_nombre: nombre });
}
