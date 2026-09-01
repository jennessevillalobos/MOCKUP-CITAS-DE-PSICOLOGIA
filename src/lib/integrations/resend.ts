// ─── Stub: Resend (servicio de correo transaccional) ─────────────────────────
//
// Las Edge Functions que ya existen (book-appointment, create-download-link)
// tienen comentarios marcados con "TODO: Resend" para agregar el envío real.
//
// Para activar Resend en producción:
//   1. Crea una cuenta en https://resend.com y genera una API key.
//   2. En Supabase → Project Settings → Edge Functions → Secrets:
//      agrega  RESEND_API_KEY = re_xxxxxxxxxxxxxx
//   3. En la Edge Function correspondiente, descomenta el bloque Resend:
//
//      const resendKey = Deno.env.get('RESEND_API_KEY');
//      if (resendKey) {
//        await fetch('https://api.resend.com/emails', {
//          method: 'POST',
//          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
//          body: JSON.stringify({
//            from: 'Psique Amor <no-reply@psiqueamor.com>',
//            to: [destinatario],
//            subject: 'Tu cita ha sido confirmada',
//            html: '<p>...</p>',
//          }),
//        });
//      }
//
// Variable de entorno en el frontend (opcional, solo para mostrar badge UI):
//   VITE_RESEND_CONFIGURED=true

/** true si Resend está marcado como activo para la UI (solo informativo). */
export const RESEND_CONFIGURED = import.meta.env.VITE_RESEND_CONFIGURED === 'true';
