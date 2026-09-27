import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Search, Reply, Archive, CheckCheck, AlertTriangle, Inbox } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminDrawer from '@/components/admin/ui/AdminDrawer';
import AvisoFlotante from '@/components/admin/ui/AvisoFlotante';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { listarMensajesAdmin, estadoMensajeAdmin, type MensajeContactoAdmin, type EstadoMensaje } from '@/lib/api/admin';

// Mensajes del formulario de contacto (Home y /contacto, migración 037). Cada
// uno también llega por correo (Resend) al buzón de CONTACT_TO; aquí se les da
// seguimiento: nuevo → leído → respondido, o archivado.

const text = {
  es: {
    title: 'Mensajes de contacto', subtitle: 'Formulario del sitio (Home y Contacto)',
    search: 'Buscar por nombre, correo o asunto…', all: 'Todos',
    estados: { nuevo: 'Nuevo', leido: 'Leído', respondido: 'Respondido', archivado: 'Archivado' } as Record<EstadoMensaje, string>,
    noSubject: '(sin asunto)', empty: 'No hay mensajes con este filtro.',
    demo: 'Los mensajes de contacto se ven aquí cuando el sitio está conectado a Supabase.',
    reply: 'Responder por correo', markReplied: 'Marcar como respondido', archive: 'Archivar', restore: 'Volver a nuevos',
    mailFailed: 'El aviso por correo no se pudo enviar', mailOk: 'También llegó por correo', from: 'Desde',
    origin: { home: 'Home', contacto: 'Página de contacto' },
  },
  en: {
    title: 'Contact messages', subtitle: 'Website form (Home and Contact)',
    search: 'Search by name, email or subject…', all: 'All',
    estados: { nuevo: 'New', leido: 'Read', respondido: 'Replied', archivado: 'Archived' } as Record<EstadoMensaje, string>,
    noSubject: '(no subject)', empty: 'No messages match this filter.',
    demo: 'Contact messages show up here when the site is connected to Supabase.',
    reply: 'Reply by email', markReplied: 'Mark as replied', archive: 'Archive', restore: 'Back to new',
    mailFailed: 'The email notice could not be sent', mailOk: 'Also delivered by email', from: 'From',
    origin: { home: 'Home', contacto: 'Contact page' },
  },
} as const;

const TONO: Record<EstadoMensaje, 'positivo' | 'neutro' | 'alerta' | 'negativo'> = {
  nuevo: 'alerta', leido: 'neutro', respondido: 'positivo', archivado: 'neutro',
};

function fechaHora(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AdminMessagesPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];
  const { esReal } = useAdminAuth();
  const [mensajes, setMensajes] = useState<MensajeContactoAdmin[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'activos' | EstadoMensaje>('activos');
  const [buscar, setBuscar] = useState('');
  const [selId, setSelId] = useState<number | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);

  function mostrarAviso(texto: string, error = false) {
    setAviso({ texto, error });
    window.setTimeout(() => setAviso(null), 4000);
  }

  const recargar = useCallback(async () => {
    if (!esReal) return;
    const res = await listarMensajesAdmin();
    if (res.error) return setErrorCarga(res.error.message);
    setErrorCarga(null);
    setMensajes(res.data);
  }, [esReal]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return mensajes.filter((m) => {
      const pasaEstado = filtro === 'activos' ? m.estado !== 'archivado' : m.estado === filtro;
      const pasaTexto = !q || m.nombre.toLowerCase().includes(q) || m.correo.toLowerCase().includes(q) || (m.asunto ?? '').toLowerCase().includes(q);
      return pasaEstado && pasaTexto;
    });
  }, [mensajes, filtro, buscar]);

  const conteo = (e: EstadoMensaje) => mensajes.filter((m) => m.estado === e).length;
  const sel = mensajes.find((m) => m.id === selId) ?? null;

  async function cambiarEstado(m: MensajeContactoAdmin, estado: EstadoMensaje, texto?: string) {
    const res = await estadoMensajeAdmin(m.id, estado);
    if (res.error) return mostrarAviso(res.error.message, true);
    if (texto) mostrarAviso(texto);
    await recargar();
  }

  // Al abrir un mensaje nuevo, pasa a "leído".
  async function abrir(m: MensajeContactoAdmin) {
    setSelId(m.id);
    if (m.estado === 'nuevo') await cambiarEstado(m, 'leido');
  }

  const asuntoRespuesta = (m: MensajeContactoAdmin) =>
    `Re: ${m.asunto || (m.idioma === 'en' ? 'Your message to PsiqueAmor' : 'Tu mensaje a PsiqueAmor')}`;

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">{t.subtitle}</p>
        </div>
      </div>
      {errorCarga && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorCarga}</p>}
      <AvisoFlotante aviso={aviso} />

      {!esReal ? (
        <p className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/30 px-5 py-12 text-center text-sm text-ink/50">{t.demo}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(['activos', 'nuevo', 'leido', 'respondido', 'archivado'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  filtro === f ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 bg-white text-ink/55 hover:bg-brand-50'
                }`}
              >
                {f === 'activos' ? t.all : `${t.estados[f]} (${conteo(f)})`}
              </button>
            ))}
            <div className="ml-auto flex h-9 min-w-[220px] items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3">
              <Search size={14} className="text-ink/35" />
              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder={t.search}
                className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink/35"
              />
            </div>
          </div>

          <section className="divide-y divide-brand-50 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            {filtrados.map((m) => (
              <button
                key={m.id}
                onClick={() => void abrir(m)}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-brand-50/40 ${m.estado === 'nuevo' ? 'bg-amber-50/30' : ''}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.estado === 'nuevo' ? 'bg-amber-500' : 'bg-transparent'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm ${m.estado === 'nuevo' ? 'font-bold text-ink' : 'font-medium text-ink/75'}`}>
                      {m.nombre} <span className="font-normal text-ink/40">· {m.correo}</span>
                    </p>
                    <span className="shrink-0 text-[11px] text-ink/35">{fechaHora(m.fecha)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-ink/60">{m.asunto || t.noSubject}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink/45">{m.mensaje}</p>
                </div>
                <StatusBadge tone={TONO[m.estado]}>{t.estados[m.estado]}</StatusBadge>
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="flex flex-col items-center gap-2 px-5 py-12 text-center text-sm text-ink/40">
                <Inbox size={28} className="text-brand-200" />
                {t.empty}
              </p>
            )}
          </section>
        </>
      )}

      {sel && (
        <AdminDrawer title={sel.asunto || t.noSubject} onClose={() => setSelId(null)}>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge tone={TONO[sel.estado]}>{t.estados[sel.estado]}</StatusBadge>
              <span className="text-xs text-ink/40">{fechaHora(sel.fecha)} · {t.origin[sel.origen]} · {sel.idioma.toUpperCase()}</span>
            </div>
            <div className="space-y-1.5 rounded-2xl bg-brand-50/50 p-3 text-xs">
              <p className="font-semibold text-ink">{t.from}: {sel.nombre}</p>
              <p className="flex items-center gap-1.5 text-ink/60"><Mail size={12} />{sel.correo}</p>
              {sel.telefono && <p className="flex items-center gap-1.5 text-ink/60"><Phone size={12} />{sel.telefono}</p>}
            </div>
            <p className="whitespace-pre-wrap rounded-2xl border border-brand-100 p-4 leading-relaxed text-ink/80">{sel.mensaje}</p>
            {sel.correoEnviado === false ? (
              <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {t.mailFailed}{sel.correoError ? `: ${sel.correoError}` : '.'}
              </p>
            ) : sel.correoEnviado ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCheck size={13} />{t.mailOk}</p>
            ) : null}

            <div className="grid grid-cols-1 gap-2">
              <a
                href={`mailto:${sel.correo}?subject=${encodeURIComponent(asuntoRespuesta(sel))}`}
                className="flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft"
              >
                <Reply size={15} />
                {t.reply}
              </a>
              {sel.estado !== 'respondido' && (
                <button
                  onClick={() => void cambiarEstado(sel, 'respondido', lang === 'es' ? 'Marcado como respondido.' : 'Marked as replied.')}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCheck size={15} />
                  {t.markReplied}
                </button>
              )}
              {sel.estado !== 'archivado' ? (
                <button
                  onClick={() => {
                    void cambiarEstado(sel, 'archivado', lang === 'es' ? 'Mensaje archivado.' : 'Message archived.');
                    setSelId(null);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-brand-100 py-2.5 text-sm font-semibold text-ink/60 hover:bg-brand-50"
                >
                  <Archive size={15} />
                  {t.archive}
                </button>
              ) : (
                <button
                  onClick={() => void cambiarEstado(sel, 'nuevo')}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-brand-100 py-2.5 text-sm font-semibold text-ink/60 hover:bg-brand-50"
                >
                  {t.restore}
                </button>
              )}
            </div>
          </div>
        </AdminDrawer>
      )}
    </AdminLayout>
  );
}
