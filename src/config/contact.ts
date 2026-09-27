// Datos de contacto y redes que usa todo el sitio (Home, pie de página, Contacto).
// Con Supabase manda lo que guarda el admin en Configuración → General
// (tabla `configuracion_sitio`, hook `useContacto`); esto queda como respaldo
// y como valores del modo demo. WhatsApp y teléfono son de relleno y las redes
// apuntan a las páginas generales hasta tener las cuentas propias.
export const contactConfig = {
  whatsapp: 'https://wa.me/0000000000',
  phone: '+00 000 000 0000',
  email: 'hola@psiqueamor.com',
  location: 'Atención online y presencial',
  hours: 'Lun — Vie · 9:00 — 19:00',
  instagram: 'https://www.instagram.com/?hl=es',
  linkedin: 'https://www.linkedin.com/',
  youtube: 'https://www.youtube.com/',
};
