import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ok, fail, toServiceError, type Result } from '@/lib/supabase/errors';
import { subirImagenPublica } from '@/lib/integrations/cloudinary';

// Perfil del usuario con sesión real: datos personales en `usuarios` y, si es
// profesional, su ficha pública en `profesionales` (migración 014 limita las
// columnas editables). La foto va al bucket público `avatares/<uid>/`.

export interface PreferenciasUsuario {
  notifCitas?: boolean;
  notifReservas?: boolean;
  notifMensajes?: boolean;
  notifPromos?: boolean;
  // Paciente/estudiante: avisos de cursos (migración 026).
  notifCursos?: boolean;
}

export interface PerfilReal {
  userId: string;
  correo: string;
  nombre: string | null;
  telefono: string | null;
  foto: string | null;
  idioma: string | null;
  preferencias: PreferenciasUsuario;
  esProfesional: boolean;
  profesionalId: number | null;
  sobreMi: string | null;
}

function notConfigured<T>(): Result<T> {
  return fail<T>({ code: 'supabase_not_configured', message: 'Supabase no está configurado.' });
}

export async function cargarPerfil(): Promise<Result<PerfilReal | null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { data: sesion } = await supabase.auth.getSession();
  const authUser = sesion.session?.user;
  if (!authUser) return ok(null);

  const [usuario, profesional, roles] = await Promise.all([
    supabase.from('usuarios').select('nombre, telefono, foto, idioma, preferencias').eq('id', authUser.id).maybeSingle(),
    supabase.from('profesionales').select('id, descripcion').eq('usuario_id', authUser.id).maybeSingle(),
    supabase.from('usuario_roles').select('roles(nombre)').eq('usuario_id', authUser.id),
  ]);
  const error = usuario.error ?? profesional.error ?? roles.error;
  if (error) return fail(toServiceError(error));

  const nombresRol = (roles.data ?? []).map((r) => (r as { roles?: { nombre?: string } | null }).roles?.nombre);
  return ok({
    userId: authUser.id,
    correo: authUser.email ?? '',
    nombre: usuario.data?.nombre ?? null,
    telefono: usuario.data?.telefono ?? null,
    foto: usuario.data?.foto ?? null,
    idioma: usuario.data?.idioma ?? null,
    preferencias: (usuario.data?.preferencias ?? {}) as PreferenciasUsuario,
    esProfesional: !!profesional.data || nombresRol.includes('instructor') || nombresRol.includes('administrador'),
    profesionalId: profesional.data?.id ?? null,
    sobreMi: profesional.data?.descripcion ?? null,
  });
}

export async function guardarPerfil(
  perfil: Pick<PerfilReal, 'userId' | 'profesionalId'>,
  campos: { nombre?: string; telefono?: string; foto?: string; idioma?: string; preferencias?: PreferenciasUsuario; sobreMi?: string }
): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const cambiosUsuario: Record<string, unknown> = {};
  if (campos.nombre !== undefined) cambiosUsuario.nombre = campos.nombre;
  if (campos.telefono !== undefined) cambiosUsuario.telefono = campos.telefono || null;
  if (campos.foto !== undefined) cambiosUsuario.foto = campos.foto;
  if (campos.idioma !== undefined) cambiosUsuario.idioma = campos.idioma;
  if (campos.preferencias !== undefined) cambiosUsuario.preferencias = campos.preferencias;

  if (Object.keys(cambiosUsuario).length > 0) {
    const { error } = await supabase.from('usuarios').update(cambiosUsuario).eq('id', perfil.userId);
    if (error) return fail(toServiceError(error));
  }
  if (campos.sobreMi !== undefined && perfil.profesionalId !== null) {
    const { error } = await supabase.from('profesionales').update({ descripcion: campos.sobreMi || null }).eq('id', perfil.profesionalId);
    if (error) return fail(toServiceError(error));
  }
  return ok(null);
}

// Sube la foto (data URL de un <input type="file">) y devuelve su URL pública.
// Va a Cloudinary (imágenes públicas); si Cloudinary aún no está configurado,
// usa el bucket público `avatares` de Supabase como hasta ahora.
export async function subirFotoPerfil(userId: string, dataUrl: string): Promise<Result<string>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const blob = await (await fetch(dataUrl)).blob();
  const enCloudinary = await subirImagenPublica(blob, 'avatar');
  if (!enCloudinary.error) return ok(enCloudinary.data);
  if (enCloudinary.error.code !== 'config_error') return fail(enCloudinary.error);

  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const ruta = `${userId}/avatar.${extension}`;

  const { error } = await supabase.storage.from('avatares').upload(ruta, blob, { upsert: true, contentType: blob.type });
  if (error) {
    const mensaje = /size|exceed/i.test(error.message)
      ? 'La imagen supera 2 MB.'
      : /mime|type/i.test(error.message) ? 'Formato no permitido (usa JPG, PNG o WEBP).' : error.message;
    return fail({ code: 'storage_error', message: mensaje });
  }
  // El parámetro evita que el navegador muestre la foto anterior en caché.
  const { data } = supabase.storage.from('avatares').getPublicUrl(ruta);
  return ok(`${data.publicUrl}?v=${Date.now()}`);
}

// Verifica la contraseña actual volviendo a autenticar antes de cambiarla.
export async function cambiarContrasena(correo: string, actual: string, nueva: string): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const verificacion = await supabase.auth.signInWithPassword({ email: correo, password: actual });
  if (verificacion.error) return fail({ code: 'invalid_credentials', message: 'La contraseña actual no es correcta.' });

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return fail(toServiceError(error));
  return ok(null);
}

// Fechas de la cuenta de Auth (creación y último inicio de sesión).
export async function datosCuenta(): Promise<{ creadaEn: string | null; ultimoAcceso: string | null } | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { creadaEn: data.user.created_at ?? null, ultimoAcceso: data.user.last_sign_in_at ?? null };
}

export async function cerrarTodasLasSesiones(): Promise<Result<null>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return notConfigured();

  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) return fail(toServiceError(error));
  return ok(null);
}
