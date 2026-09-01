import { useState } from 'react';
import {
  ArrowLeft, Play, Mic, Video as VideoIcon, Hand, ScreenShare, PhoneOff, Send, Radio,
} from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { AULA_NAV_LABELS, buildAulaVirtualNav } from '@/components/site/aulaVirtualNav';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { PROXIMAS_CLASES, GRABACIONES, CHAT_DEMO } from '@/data/liveClassesData';

type Vista = 'lista' | 'sala' | 'grabacion';
type Tab = 'proximas' | 'grabaciones';

interface MensajeLocal {
  autor: string;
  hora: string;
  texto: string;
  esInstructor?: boolean;
}

const text = {
  es: {
    volverPortal: 'Volver al portal',
    titulo: 'Clases en vivo', subtitulo: 'Únete a las sesiones en directo o repasa las grabaciones.',
    tabProximas: 'Próximas', tabGrabaciones: 'Grabaciones',
    enVivo: 'EN VIVO', conectados: 'conectados', curso: 'Curso:', unirseAhora: 'Unirse ahora',
    inscrito: 'Inscrito', recordarme: 'Recordarme', inscribirme: 'Inscribirme', min: 'min',
    salirSala: 'Salir de la sala', salir: 'Salir',
    chat: 'Chat', participantes: 'Participantes',
    levantoMano: 'levantó la mano', escribeMensaje: 'Escribe un mensaje…',
    volverListado: 'Volver a clases en vivo',
  },
  en: {
    volverPortal: 'Back to portal',
    titulo: 'Live classes', subtitulo: 'Join live sessions or catch up with recordings.',
    tabProximas: 'Upcoming', tabGrabaciones: 'Recordings',
    enVivo: 'LIVE', conectados: 'online', curso: 'Course:', unirseAhora: 'Join now',
    inscrito: 'Registered', recordarme: 'Remind me', inscribirme: 'Register', min: 'min',
    salirSala: 'Leave room', salir: 'Leave',
    chat: 'Chat', participantes: 'People',
    levantoMano: 'raised their hand', escribeMensaje: 'Write a message…',
    volverListado: 'Back to live classes',
  },
} as const;

export default function LiveClassesPage() {
  const { user } = useSiteAuth();
  const { language } = useSiteLanguage();
  const t = text[language];
  const navItems = buildAulaVirtualNav(AULA_NAV_LABELS[language], ['vivo']);

  const [vista, setVista] = useState<Vista>('lista');
  const [tab, setTab] = useState<Tab>('proximas');
  const [grabacionKey, setGrabacionKey] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<MensajeLocal[]>(
    CHAT_DEMO.map((m) => ({ autor: m.autor, hora: m.hora, texto: m.texto[language], esInstructor: m.esInstructor }))
  );
  const [nuevoMensaje, setNuevoMensaje] = useState('');

  const claseEnVivo = PROXIMAS_CLASES.find((c) => c.esHoy) || PROXIMAS_CLASES[0];
  const grabacion = grabacionKey ? GRABACIONES.find((g) => g.key === grabacionKey) : null;
  const nombreUsuario = (user?.nombre || '').trim().split(/\s+/)[0] || (language === 'es' ? 'Tú' : 'You');

  function enviarMensaje() {
    if (!nuevoMensaje.trim()) return;
    setMensajes((m) => [...m, { autor: nombreUsuario, hora: 'ahora', texto: nuevoMensaje.trim() }]);
    setNuevoMensaje('');
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="vivo"
      onNavigate={() => {}}
      roleBadge={{ es: 'Aula Virtual', en: 'Classroom' }}
      backTo={vista === 'lista' ? '/aula-virtual' : undefined}
      backLabel={{ es: text.es.volverPortal, en: text.en.volverPortal }}
    >
      {vista === 'lista' && (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{t.titulo}</h1>
            <p className="text-sm text-ink/50">{t.subtitulo}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTab('proximas')}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                tab === 'proximas' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'
              }`}
            >
              {t.tabProximas}
            </button>
            <button
              onClick={() => setTab('grabaciones')}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                tab === 'grabaciones' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'
              }`}
            >
              {t.tabGrabaciones}
            </button>
          </div>

          {tab === 'proximas' ? (
            <div className="space-y-4">
              {PROXIMAS_CLASES.map((c) =>
                c.esHoy ? (
                  <div key={c.key} className="overflow-hidden rounded-2xl border border-rose-300 bg-white shadow-soft">
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative shrink-0 sm:w-64">
                        <div className="grid h-40 w-full place-items-center bg-ink text-white/70 sm:h-full">
                          <Radio size={32} />
                        </div>
                        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                          <span className="animate-pulse">●</span> {t.enVivo}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <h3 className="font-display text-lg font-semibold text-ink">{c.titulo[language]}</h3>
                          <p className="text-sm text-ink/50">📅 {c.diaCorto[language]} · {c.hora} · {c.profesional}</p>
                          {c.curso && (
                            <p className="mt-1 text-xs text-ink/45">{t.curso} {c.curso[language]} · 👥 {c.conectados} {t.conectados}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setVista('sala')}
                          className="whitespace-nowrap rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-soft hover:opacity-90"
                        >
                          {t.unirseAhora}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={c.key} className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft sm:flex-row sm:items-center">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-center leading-none text-brand-700">
                      <span className="text-sm font-bold">{c.diaCorto[language]}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-ink">{c.titulo[language]}</h3>
                      <p className="text-sm text-ink/50">🕒 {c.hora} · {c.profesional} · {c.duracionMin} {t.min}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.inscrito ? (
                        <>
                          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{t.inscrito}</span>
                          <button className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-50">{t.recordarme}</button>
                        </>
                      ) : (
                        <button className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90">{t.inscribirme}</button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {GRABACIONES.map((g) => (
                <article key={g.key} className="group overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-soft">
                  <div className="relative">
                    <img src={g.image} alt={g.titulo[language]} className="h-36 w-full object-cover" />
                    <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">{g.duracion}</span>
                    <button
                      onClick={() => { setGrabacionKey(g.key); setVista('grabacion'); }}
                      className="absolute inset-0 grid place-items-center"
                      aria-label="Play"
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-brand-700 shadow-lift transition group-hover:scale-105">
                        <Play size={18} className="ml-0.5" fill="currentColor" />
                      </span>
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-ink">{g.titulo[language]}</h3>
                    <p className="text-xs text-ink/45">{g.profesional} · {g.fecha[language]}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {vista === 'sala' && (
        <>
          <button onClick={() => setVista('lista')} className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
            <ArrowLeft size={15} /> {t.salirSala}
          </button>
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="min-w-0 flex-1">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-brand-100 bg-ink shadow-soft">
                <div className="absolute inset-0 grid place-items-center text-white/30"><VideoIcon size={48} /></div>
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                  <span className="animate-pulse">●</span> {t.enVivo}
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white">👥 {claseEnVivo.conectados}</span>
                <span className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs text-white">{claseEnVivo.profesional}</span>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Mic"><Mic size={18} /></button>
                  <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Camera"><VideoIcon size={18} /></button>
                  <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Hand"><Hand size={18} /></button>
                  <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Share"><ScreenShare size={18} /></button>
                  <button onClick={() => setVista('lista')} className="flex h-11 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700">
                    <PhoneOff size={15} /> {t.salir}
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <h1 className="font-display text-xl font-semibold text-ink">{claseEnVivo.titulo[language]}</h1>
                <p className="text-sm text-ink/50">{claseEnVivo.profesional} · {t.curso} {claseEnVivo.curso?.[language]}</p>
              </div>
            </div>

            <aside className="flex shrink-0 flex-col rounded-2xl border border-brand-100 bg-white lg:w-80" style={{ height: 'min(70vh, 560px)' }}>
              <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
                <div className="flex gap-4 text-sm">
                  <button className="border-b-2 border-brand-600 pb-1 font-semibold text-ink">{t.chat}</button>
                  <button className="pb-1 text-ink/45 hover:text-ink">{t.participantes} ({claseEnVivo.conectados})</button>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
                {mensajes.map((m, i) => (
                  <div key={i}>
                    <p className={`text-xs font-semibold ${m.esInstructor ? 'text-brand-600' : 'text-lilac-600'}`}>
                      {m.autor} <span className="font-normal text-ink/40">· {m.hora}</span>
                    </p>
                    <p className="text-ink">{m.texto}</p>
                  </div>
                ))}
                <div className="text-center">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-ink/50">✋ Carla R. {t.levantoMano}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-brand-100 p-3">
                <input
                  type="text"
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
                  placeholder={t.escribeMensaje}
                  className="flex-1 rounded-full border border-brand-200 px-4 py-2 text-sm text-ink focus:border-brand-400"
                />
                <button onClick={enviarMensaje} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-white" aria-label="Send">
                  <Send size={15} />
                </button>
              </div>
            </aside>
          </div>
        </>
      )}

      {vista === 'grabacion' && grabacion && (
        <>
          <button onClick={() => setVista('lista')} className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
            <ArrowLeft size={15} /> {t.volverListado}
          </button>
          <div className="max-w-3xl">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-brand-100 bg-ink shadow-soft">
              <img src={grabacion.image} alt={grabacion.titulo[language]} className="absolute inset-0 h-full w-full object-cover opacity-70" />
              <button className="absolute inset-0 grid place-items-center" aria-label="Play">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-brand-700 shadow-2xl transition hover:scale-105">
                  <Play size={32} className="ml-1" fill="currentColor" />
                </span>
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <div className="mb-2 h-1 rounded-full bg-white/25"><div className="h-1 w-1/4 rounded-full bg-white" /></div>
                <div className="flex items-center justify-between text-xs text-white">
                  <span>00:00 / {grabacion.duracion}</span>
                  <span>1.0x</span>
                </div>
              </div>
            </div>
            <h1 className="mt-4 font-display text-xl font-semibold text-ink">{grabacion.titulo[language]}</h1>
            <p className="text-sm text-ink/50">{grabacion.profesional} · {grabacion.fecha[language]}</p>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
