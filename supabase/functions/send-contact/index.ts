// Edge Function: send-contact
//
// Formulario de contacto del sitio (Home y /contacto). Valida los datos,
// descarta bots (campo trampa `sitio_web`) y limita a 3 mensajes por correo
// cada hora; guarda el mensaje en public.mensajes_contacto (migración 037) y
// lo reenvía con Resend a la bandeja del equipo, con "Responder a" apuntando
// a quien escribió. El mensaje se guarda aunque el correo falle.
//
// Secretos (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY  clave de Resend (obligatoria para enviar)
//   CONTACT_TO      correo(s) que reciben los mensajes, separados por coma
//   CONTACT_FROM    remitente; sin dominio verificado en Resend usar
//                   "PsiqueAmor <onboarding@resend.dev>" (valor por defecto)
// Se llama sin sesión (clave pública), como la reserva de invitado.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createServiceClient } from '../_shared/auth.ts';

interface ContactInput {
  nombre?: string;
  correo?: string;
  telefono?: string;
  asunto?: string;
  mensaje?: string;
  origen?: 'home' | 'contacto';
  idioma?: 'es' | 'en';
  // Campo trampa: invisible para personas; si viene lleno, es un bot.
  sitio_web?: string;
}

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_POR_HORA = 3;

function limpiar(valor: unknown, max: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  const body = await readJson<ContactInput>(req);
  if (!body) return jsonError('invalid_payload', 'Datos inválidos.', 422, requestId);

  // Bot: se responde "ok" sin guardar ni enviar nada.
  if (limpiar(body.sitio_web, 200)) return jsonOk({ guardado: true, correo_enviado: false }, 200, requestId);

  const nombre = limpiar(body.nombre, 120);
  const correo = limpiar(body.correo, 200).toLowerCase();
  const telefono = limpiar(body.telefono, 40) || null;
  const asunto = limpiar(body.asunto, 200) || null;
  const mensaje = limpiar(body.mensaje, 5000);
  const origen = body.origen === 'home' ? 'home' : 'contacto';
  const idioma = body.idioma === 'en' ? 'en' : 'es';

  if (nombre.length < 2) return jsonError('invalid_name', 'Escribe tu nombre.', 422, requestId);
  if (!CORREO_RE.test(correo)) return jsonError('invalid_email', 'Escribe un correo válido.', 422, requestId);
  if (mensaje.length < 5) return jsonError('invalid_message', 'Escribe tu mensaje.', 422, requestId);

  const db = createServiceClient();

  // Límite anti-abuso por correo.
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from('mensajes_contacto')
    .select('id', { count: 'exact', head: true })
    .eq('correo', correo)
    .gte('creado_en', haceUnaHora);
  if ((count ?? 0) >= MAX_POR_HORA) {
    return jsonError('rate_limited', 'Ya recibimos varios mensajes tuyos. Intenta de nuevo en un rato.', 429, requestId);
  }

  const { data: fila, error: insertErr } = await db
    .from('mensajes_contacto')
    .insert({ nombre, correo, telefono, asunto, mensaje, origen, idioma })
    .select('id')
    .single();
  if (insertErr || !fila) return jsonError('db_error', 'No se pudo guardar tu mensaje. Intenta de nuevo.', 500, requestId);

  // Envío con Resend (si está configurado).
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const destinos = (Deno.env.get('CONTACT_TO') ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  const remitente = Deno.env.get('CONTACT_FROM') || 'PsiqueAmor <onboarding@resend.dev>';
  let correoEnviado = false;
  let correoId: string | null = null;
  let correoError: string | null = null;

  if (!resendKey || destinos.length === 0) {
    correoError = 'Resend no configurado (RESEND_API_KEY / CONTACT_TO).';
  } else {
    const filas: [string, string][] = [
      ['Nombre', nombre], ['Correo', correo], ['Teléfono', telefono ?? '—'], ['Asunto', asunto ?? '—'],
      ['Origen', origen === 'home' ? 'Formulario del inicio' : 'Página de contacto'],
    ];
    const html = `
      <div style="font-family:Arial,sans-serif;color:#17324b;max-width:560px">
        <h2 style="margin:0 0 12px">Nuevo mensaje de contacto</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          ${filas.map(([k, v]) => `<tr><td style="padding:6px 8px;color:#6b7c8f;width:110px">${k}</td><td style="padding:6px 8px">${escapar(v)}</td></tr>`).join('')}
        </table>
        <div style="margin-top:16px;padding:14px;background:#f3f6fb;border-radius:10px;white-space:pre-wrap;font-size:14px">${escapar(mensaje)}</div>
        <p style="margin-top:16px;font-size:12px;color:#6b7c8f">Responde a este correo para contestarle directamente. Mensaje #${fila.id}.</p>
      </div>`;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: remitente,
          to: destinos,
          reply_to: correo,
          subject: `Contacto web: ${asunto ?? nombre}`,
          html,
          text: `${filas.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${mensaje}`,
        }),
      });
      const datos = await res.json().catch(() => ({}));
      if (res.ok) {
        correoEnviado = true;
        correoId = (datos as { id?: string }).id ?? null;
      } else {
        correoError = `${res.status}: ${(datos as { message?: string }).message ?? 'error de Resend'}`.slice(0, 300);
      }
    } catch (e) {
      correoError = `fetch: ${String(e)}`.slice(0, 300);
    }
  }

  await db.from('mensajes_contacto')
    .update({ correo_enviado: correoEnviado, correo_id: correoId, correo_error: correoError })
    .eq('id', fila.id);

  // Para quien escribe, el mensaje ya quedó recibido aunque el correo fallara.
  return jsonOk({ guardado: true, correo_enviado: correoEnviado }, 200, requestId);
});
