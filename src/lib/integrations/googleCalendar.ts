// ─── Stub: Google Calendar OAuth ──────────────────────────────────────────────
//
// Para activar la sincronización real de las citas de un profesional con su Google Calendar:
//
// 1. En Google Cloud Console:
//    - Crear proyecto y habilitar "Google Calendar API".
//    - Configurar pantalla de consentimiento OAuth.
//    - Crear credenciales (Client ID de aplicación web).
//
// 2. Flujo OAuth en la aplicación:
//    - El profesional entra a su perfil de Instructor y hace click en "Conectar Google Calendar".
//    - Se le redirige a la pantalla de Google.
//    - Google devuelve un `code` al callback.
//    - Ese código se envía a la Edge Function `google-calendar-auth` para obtener
//      los access_token y refresh_token, los cuales se guardan en la DB
//      (idealmente encriptados o en Vault) asociados al `profesional_id`.
//
// 3. Sincronización en la Edge Function `book-appointment`:
//    - Después de guardar la cita en la DB, se lee el token del profesional.
//    - Se llama a la API `POST https://www.googleapis.com/calendar/v3/calendars/primary/events`
//    - Se obtiene el `htmlLink` y se guarda en `citas.google_event_id`.

/** Client ID público para iniciar el flujo (requerido para habilitar el botón UI). */
export const GCAL_CLIENT_ID = import.meta.env.VITE_GCAL_CLIENT_ID as string | undefined;

/** Indica si la integración está configurada a nivel frontend. */
export const GCAL_CONFIGURED = Boolean(GCAL_CLIENT_ID);
