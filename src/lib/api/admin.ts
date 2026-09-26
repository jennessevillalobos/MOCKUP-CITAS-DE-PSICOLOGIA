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
