// Edge Function: register-account
//
// "Crear cuenta" en /iniciar-sesion. El proyecto exige confirmar el correo y
// sin SMTP propio Supabase no envía ese correo, así que `signUp` dejaba la
// cuenta sin poder entrar. Esta función crea la cuenta ya activa, como paciente
// (el trigger on_auth_user_created le asigna el rol 'estudiante', 054), y el
// frontend inicia sesión en seguida con la misma contraseña.
//
// - Si el correo ya tiene cuenta responde `account_exists`.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createServiceClient } from '../_shared/auth.ts';

interface RegistroInput {
  nombre: string;
  correo: string;
  password: string;
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  const body = await readJson<RegistroInput>(req);
  const nombre = body?.nombre?.trim() ?? '';
  const correo = body?.correo?.trim().toLowerCase() ?? '';
  const password = body?.password ?? '';
  if (nombre.length < 2 || nombre.length > 120) return jsonError('invalid_name', 'Escribe tu nombre completo.', 422, requestId);
  if (!CORREO_VALIDO.test(correo) || correo.length > 254) return jsonError('invalid_email', 'El correo no es válido.', 422, requestId);
  if (password.length < 6 || password.length > 72) return jsonError('weak_password', 'La contraseña debe tener entre 6 y 72 caracteres.', 422, requestId);

  const serviceClient = createServiceClient();

  const { data: existente } = await serviceClient.from('usuarios').select('id').ilike('email', correo).maybeSingle();
  if (existente) {
    return jsonError('account_exists', 'Ya existe una cuenta con este correo. Inicia sesión.', 409, requestId);
  }

  const { data: creado, error: crearErr } = await serviceClient.auth.admin.createUser({
    email: correo,
    password,
    email_confirm: true,
    user_metadata: { full_name: nombre },
  });
  if (crearErr || !creado.user) {
    const yaExiste = /already|registered|exists/i.test(crearErr?.message ?? '');
    return yaExiste
      ? jsonError('account_exists', 'Ya existe una cuenta con este correo. Inicia sesión.', 409, requestId)
      : jsonError('signup_error', crearErr?.message?.includes('Password') ? 'La contraseña no cumple los requisitos.' : 'No se pudo crear tu cuenta.', 422, requestId);
  }

  return jsonOk({ usuario_id: creado.user.id }, 201, requestId);
});
