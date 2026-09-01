import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import type { Database } from '@/types/database';
import type { RolNombre } from '@/lib/supabase/types';

type Usuario = Database['public']['Tables']['usuarios']['Row'];
type RolRow = Database['public']['Tables']['roles']['Row'];

// Servicio de autenticación y perfil sobre Supabase.
//
// Todos los métodos devuelven `Result<T>` y, cuando Supabase no está
// configurado, devuelven un error explícito `supabase_not_configured` para
// que el contexto de sesión conserve el modo demo actual.

export interface SignUpInput {
  email: string;
  password: string;
  nombre?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthSession {
  id: string;
  email: string;
  // `true` si la sesión quedó activa (p. ej. autoconfirm activo).
  // `false` si Supabase requiere confirmar el correo antes de iniciar sesión.
  sessionEstablished: boolean;
}

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

export async function signUp(input: SignUpInput): Promise<Result<AuthSession>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: input.nombre ? { data: { full_name: input.nombre } } : undefined,
  });

  if (error) return fail(toServiceError(error));
  if (!data.user) return fail({ code: 'no_user', message: 'No se pudo crear el usuario.' });

  // El trigger handle_new_user crea la fila en public.usuarios.
  // Si la sesión queda activa (autoconfirm), podemos asignar el rol y el
  // perfil de inmediato. Si requiere confirmación, lo hará el login posterior.
  if (data.session) {
    await ensureUserProfile(data.user.id, input.nombre);
  }

  return ok({
    id: data.user.id,
    email: data.user.email ?? input.email,
    sessionEstablished: Boolean(data.session),
  });
}

export async function signIn(input: SignInInput): Promise<Result<AuthSession>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) return fail(toServiceError(error));
  if (!data.user) return fail({ code: 'no_user', message: 'No se pudo iniciar sesión.' });

  // Asegurar que el perfil existe (por si el trigger no se ejecutó)
  await ensureUserProfile(data.user.id, data.user.user_metadata?.full_name as string | undefined);

  return ok({
    id: data.user.id,
    email: data.user.email ?? input.email,
    sessionEstablished: true,
  });
}

export async function signOut(): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return ok(null);

  const { error } = await supabase.auth.signOut();
  if (error) return fail(toServiceError(error));
  return ok(null);
}

export async function getSessionUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// Garantiza que la fila de perfil en public.usuarios exista y tenga el
// nombre y el rol solicitados. Se usa justo después de signUp o signIn.
async function ensureUserProfile(userId: string, nombre: string | undefined) {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return;

  if (nombre) {
    await supabase.from('usuarios').update({ nombre }).eq('id', userId);
  }

  // Por defecto asignamos 'estudiante' si todavía no tiene un rol.
  await ensureRole(userId, 'estudiante');
}

export async function ensureRole(userId: string, rolNombre: RolNombre): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  // 1. Obtener el id del rol por nombre
  const { data: rol, error: rolErr } = await supabase
    .from('roles')
    .select('id, nombre')
    .eq('nombre', rolNombre)
    .maybeSingle();

  if (rolErr) return fail(toServiceError(rolErr));
  if (!rol) return fail({ code: 'role_not_found', message: `Rol ${rolNombre} no existe en la base.` });

  const rolId = (rol as RolRow).id;

  // 2. Insertar en usuario_roles con UPSERT para no duplicar.
  const { error: linkErr } = await supabase
    .from('usuario_roles')
    .upsert({ usuario_id: userId, rol_id: rolId }, { onConflict: 'usuario_id,rol_id' });

  if (linkErr) return fail(toServiceError(linkErr));
  return ok(null);
}

export async function getProfile(): Promise<Result<Usuario>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const userId = await getSessionUserId();
  if (!userId) return fail({ code: 'no_session', message: 'No hay sesión activa.' });

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) return fail(toServiceError(error));
  if (!data) return fail({ code: 'profile_not_found', message: 'No se encontró el perfil.' });
  return ok(data as Usuario);
}

export async function updateProfile(fields: Partial<Pick<Usuario, 'nombre' | 'telefono' | 'foto' | 'idioma'>>): Promise<Result<Usuario>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const userId = await getSessionUserId();
  if (!userId) return fail({ code: 'no_session', message: 'No hay sesión activa.' });

  const { data, error } = await supabase
    .from('usuarios')
    .update(fields)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) return fail(toServiceError(error));
  if (!data) return fail({ code: 'profile_not_found', message: 'No se encontró el perfil.' });
  return ok(data as Usuario);
}

export async function getRoles(): Promise<Result<RolNombre[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const userId = await getSessionUserId();
  if (!userId) return fail({ code: 'no_session', message: 'No hay sesión activa.' });

  const { data, error } = await supabase
    .from('usuario_roles')
    .select('roles(nombre)')
    .eq('usuario_id', userId);

  if (error) return fail(toServiceError(error));

  const roles: RolNombre[] = (data ?? [])
    .map((row) => (row as { roles?: { nombre?: string } | null }).roles?.nombre)
    .filter((nombre): nombre is RolNombre => nombre === 'estudiante' || nombre === 'instructor' || nombre === 'administrador');

  return ok(roles);
}
