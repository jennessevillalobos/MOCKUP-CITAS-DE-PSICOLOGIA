// Edge Function: book-appointment-guest
//
// Reserva sin sesión desde /agendar: valida el horario, crea la cuenta del
// paciente (activa, con la contraseña que eligió en el formulario) y registra
// la cita a su nombre. Después el frontend inicia sesión con esa contraseña.
//
// - Si ya existe una cuenta con ese correo NO se reserva a su nombre: se pide
//   iniciar sesión (evita que alguien use una cuenta ajena).
// - El horario se valida antes de crear la cuenta; si la cita falla después,
//   la cuenta recién creada se elimina.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createServiceClient } from '../_shared/auth.ts';
import { validarFormato, validarReserva, crearCitaConOrden, type DatosReserva } from '../_shared/reserva.ts';

interface GuestInput extends DatosReserva {
  nombre: string;
  correo: string;
  telefono?: string;
  password: string;
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  // ── 1. Validar el payload ──
  const body = await readJson<GuestInput>(req);
  const errorFormato = validarFormato(body);
  if (errorFormato) return jsonError(errorFormato.code, errorFormato.message, errorFormato.status, requestId);

  const nombre = body!.nombre?.trim() ?? '';
  const correo = body!.correo?.trim().toLowerCase() ?? '';
  const telefono = body!.telefono?.trim() || null;
  const password = body!.password ?? '';
  if (nombre.length < 2) return jsonError('invalid_name', 'Escribe tu nombre completo.', 422, requestId);
  if (!CORREO_VALIDO.test(correo)) return jsonError('invalid_email', 'El correo no es válido.', 422, requestId);
  if (password.length < 6) return jsonError('weak_password', 'La contraseña debe tener al menos 6 caracteres.', 422, requestId);

  const serviceClient = createServiceClient();

  // ── 2. Si el correo ya tiene cuenta, debe iniciar sesión para reservar ──
  const { data: existente } = await serviceClient.from('usuarios').select('id').ilike('email', correo).maybeSingle();
  if (existente) {
    return jsonError('account_exists', 'Ya existe una cuenta con este correo. Inicia sesión para reservar la cita.', 409, requestId);
  }

  // ── 3. Validar el horario antes de crear nada ──
  const reserva = await validarReserva(serviceClient, body!);
  if (reserva.error) return jsonError(reserva.error.code, reserva.error.message, reserva.error.status, requestId);

  // ── 4. Crear la cuenta (activa: el paciente entra de inmediato) ──
  const { data: creado, error: crearErr } = await serviceClient.auth.admin.createUser({
    email: correo,
    password,
    email_confirm: true,
    user_metadata: { full_name: nombre },
  });
  if (crearErr || !creado.user) {
    const yaExiste = /already|registered|exists/i.test(crearErr?.message ?? '');
    return yaExiste
      ? jsonError('account_exists', 'Ya existe una cuenta con este correo. Inicia sesión para reservar la cita.', 409, requestId)
      : jsonError('signup_error', crearErr?.message?.includes('Password') ? 'La contraseña no cumple los requisitos.' : 'No se pudo crear tu cuenta.', 422, requestId);
  }
  const usuarioId = creado.user.id;

  // El trigger on_auth_user_created ya creó la fila en usuarios: se completa
  // el teléfono y se asigna el rol de paciente (estudiante).
  if (telefono) await serviceClient.from('usuarios').update({ telefono }).eq('id', usuarioId);
  const { data: rol } = await serviceClient.from('roles').select('id').eq('nombre', 'estudiante').maybeSingle();
  if (rol) await serviceClient.from('usuario_roles').upsert({ usuario_id: usuarioId, rol_id: rol.id });

  // ── 5. Registrar la cita ──
  const cita = await crearCitaConOrden(serviceClient, usuarioId, body!, reserva.data);
  if (cita.error) {
    await serviceClient.auth.admin.deleteUser(usuarioId);
    return jsonError(cita.error.code, cita.error.message, cita.error.status, requestId);
  }

  return jsonOk({
    cita_id: cita.data.cita_id,
    fecha: body!.fecha,
    hora: body!.hora,
    duracion_minutos: reserva.data.duracion,
    precio: reserva.data.precio,
    moneda: reserva.data.moneda,
    estado: 'pendiente_pago',
    cuenta_creada: true,
  }, 201, requestId);
});
