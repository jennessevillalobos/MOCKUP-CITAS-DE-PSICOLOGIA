// Utilidades de resultado y errores para la capa de servicios de Supabase.
//
// Toda la capa de servicios devuelve `Result<T>` para que las páginas puedan
// manejar de forma explícita el estado de éxito o de error, sin excepciones
// no controladas ni mensajes crudos del proveedor.

export type Result<T> = { data: T; error: null } | { data: null; error: ServiceError };

export interface ServiceError {
  code: string;
  message: string;
  status?: number;
}

export function ok<T>(data: T): Result<T> {
  return { data, error: null };
}

export function fail<T>(error: ServiceError): Result<T> {
  return { data: null, error };
}

function normalizeMessage(code: string, message: string): ServiceError {
  // Mensajes amigables para los errores más comunes de Supabase Auth/PostgREST.
  switch (code) {
    case 'invalid_credentials':
      return { code, message: 'Credenciales inválidas.', status: 401 };
    case 'user_already_exists':
      return { code, message: 'Ya existe una cuenta con ese correo.', status: 409 };
    case 'email_not_confirmed':
      return { code, message: 'Debes confirmar tu correo antes de continuar.', status: 403 };
    case 'row_level_security_error':
      return { code, message: 'No tienes permiso para realizar esta acción.', status: 403 };
    case '42501':
      return { code, message: 'No tienes permiso para realizar esta acción.', status: 403 };
    default:
      return { code, message, status: undefined };
  }
}

export function toServiceError(error: unknown): ServiceError {
  if (error && typeof error === 'object') {
    const err = error as { code?: string; message?: string; status?: number };
    const code = err.code ?? 'unknown_error';
    const message = err.message ?? 'Ocurrió un error inesperado.';
    return normalizeMessage(code, message);
  }
  return { code: 'unknown_error', message: 'Ocurrió un error inesperado.' };
}
