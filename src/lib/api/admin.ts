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
