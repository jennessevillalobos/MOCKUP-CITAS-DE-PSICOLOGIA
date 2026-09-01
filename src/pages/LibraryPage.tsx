import { useState } from 'react';
import {
  ArrowLeft, Play, Search, Lock, ShieldCheck, ChevronLeft, ChevronRight, Minus, Plus, Bookmark,
} from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { AULA_NAV_LABELS, buildAulaVirtualNav } from '@/components/site/aulaVirtualNav';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { VIDEOS_COMPRADOS, LIBROS_COMPRADOS } from '@/data/libraryData';

type Vista = 'lista' | 'video' | 'libro';
type Tab = 'videos' | 'libros';

const text = {
  es: {
    volverPortal: 'Volver al portal',
    titulo: 'Mi biblioteca digital', subtitulo: 'Tu contenido comprado, disponible de por vida y protegido.',
    tabVideos: 'Videos', tabLibros: 'Libros', buscar: 'Buscar…',
    comprado: 'Comprado', ver: 'Ver', leer: 'Leer', paginas: 'pág.',
    volverBiblioteca: 'Volver a la biblioteca',
    protegidoVideo: 'Reproducción protegida · sin descarga · marca de agua con tu correo',
    protegidoLibro: 'Contenido protegido · sin descarga · marca de agua con tu correo',
    datosCompra: 'Datos de compra', comprado2: 'Comprado', orden: 'Orden', precio: 'Precio', metodo: 'Método', formato: 'Formato',
    acceso: 'Acceso', deVida: 'De por vida',
    descargaBloqueada: 'Descarga no permitida', descargarComprobante: 'Descargar comprobante de compra',
    pagina: 'Página',
  },
  en: {
    volverPortal: 'Back to portal',
    titulo: 'My digital library', subtitulo: 'Your purchased content, available for life and protected.',
    tabVideos: 'Videos', tabLibros: 'Books', buscar: 'Search…',
    comprado: 'Owned', ver: 'Watch', leer: 'Read', paginas: 'pp',
    volverBiblioteca: 'Back to library',
    protegidoVideo: 'Protected streaming · no download · watermark with your email',
    protegidoLibro: 'Protected content · no download · watermark with your email',
    datosCompra: 'Purchase details', comprado2: 'Purchased', orden: 'Order', precio: 'Price', metodo: 'Method', formato: 'Format',
    acceso: 'Access', deVida: 'Lifetime',
    descargaBloqueada: 'Download disabled', descargarComprobante: 'Download receipt',
    pagina: 'Page',
  },
} as const;

export default function LibraryPage() {
  const { user } = useSiteAuth();
  const { language } = useSiteLanguage();
  const t = text[language];

  const [vista, setVista] = useState<Vista>('lista');
  const [tab, setTab] = useState<Tab>('videos');
  const [busqueda, setBusqueda] = useState('');
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [libroKey, setLibroKey] = useState<string | null>(null);

  const navItems = buildAulaVirtualNav(AULA_NAV_LABELS[language], ['videos', 'libros']);

  function onNavigate(key: string) {
    if (key === 'videos' || key === 'libros') {
      setTab(key);
      setVista('lista');
    }
  }

  const videosFiltrados = VIDEOS_COMPRADOS.filter((v) => v.titulo[language].toLowerCase().includes(busqueda.toLowerCase()));
  const librosFiltrados = LIBROS_COMPRADOS.filter((l) => l.titulo[language].toLowerCase().includes(busqueda.toLowerCase()));

  const video = videoKey ? VIDEOS_COMPRADOS.find((v) => v.key === videoKey) : null;
  const libro = libroKey ? LIBROS_COMPRADOS.find((l) => l.key === libroKey) : null;
  const correo = user?.correo || 'demo@correo.com';

  return (
    <PortalLayout
      navItems={navItems}
      activeKey={tab}
      onNavigate={onNavigate}
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setTab('videos')}
                className={`flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  tab === 'videos' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'
                }`}
              >
                🎬 {t.tabVideos} <span className="text-xs opacity-70">({VIDEOS_COMPRADOS.length})</span>
              </button>
              <button
                onClick={() => setTab('libros')}
                className={`flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  tab === 'libros' ? 'border-transparent bg-brand-gradient text-white' : 'border-brand-200 text-ink/60 hover:bg-brand-50'
                }`}
              >
                📚 {t.tabLibros} <span className="text-xs opacity-70">({LIBROS_COMPRADOS.length})</span>
              </button>
            </div>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t.buscar}
                className="rounded-full border border-brand-200 bg-white py-1.5 pl-9 pr-4 text-sm text-ink focus:border-brand-400"
              />
            </div>
          </div>

          {tab === 'videos' ? (
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
              {videosFiltrados.map((v) => (
                <article key={v.key} className="group overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-soft">
                  <div className="relative">
                    <img src={v.image} alt={v.titulo[language]} className="h-36 w-full object-cover" />
                    <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">{v.duracion}</span>
                    <button
                      onClick={() => { setVideoKey(v.key); setVista('video'); }}
                      className="absolute inset-0 grid place-items-center"
                      aria-label={t.ver}
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-brand-700 shadow-lift transition group-hover:scale-105">
                        <Play size={18} className="ml-0.5" fill="currentColor" />
                      </span>
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-ink">{v.titulo[language]}</h3>
                    <p className="mb-2 text-xs text-ink/45">{v.instructor}</p>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">{t.comprado}</span>
                      <button onClick={() => { setVideoKey(v.key); setVista('video'); }} className="text-xs font-semibold text-brand-600 hover:underline">
                        {t.ver} →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {librosFiltrados.map((l) => (
                <article
                  key={l.key}
                  onClick={() => { setLibroKey(l.key); setVista('libro'); }}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-soft"
                >
                  <div className="relative">
                    <img src={l.image} alt={l.titulo[language]} className="h-52 w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-brand-700">📘 {l.formato}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-ink">{l.titulo[language]}</h3>
                    <p className="mb-2 text-xs text-ink/45">{l.autor} · {l.paginas} {t.paginas}</p>
                    <button className="text-xs font-semibold text-brand-600 hover:underline">{t.leer} →</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {vista === 'video' && video && (
        <>
          <button onClick={() => setVista('lista')} className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
            <ArrowLeft size={15} /> {t.volverBiblioteca}
          </button>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-brand-100 bg-ink shadow-lift">
                <img src={video.image} alt={video.titulo[language]} className="absolute inset-0 h-full w-full object-cover opacity-70" />
                <span className="absolute right-3 top-3 text-xs text-white/50">{correo}</span>
                <button className="absolute inset-0 grid place-items-center" aria-label="Play">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-brand-700 shadow-2xl transition hover:scale-105">
                    <Play size={32} className="ml-1" fill="currentColor" />
                  </span>
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <div className="mb-2 h-1 rounded-full bg-white/25"><div className="h-1 w-1/4 rounded-full bg-white" /></div>
                  <div className="flex items-center justify-between text-xs text-white">
                    <span>05:10 / {video.duracion}</span>
                    <span>1.0x</span>
                  </div>
                </div>
              </div>
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">{video.titulo[language]}</h1>
              <p className="text-sm text-ink/50">{video.instructor} · {video.duracion}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-ink/45">
                <ShieldCheck size={14} className="text-brand-600" /> {t.protegidoVideo}
              </div>
            </div>
            <aside className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
              <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t.datosCompra}</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink/45">{t.comprado2}</dt><dd className="text-ink">{video.compra.fecha}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/45">{t.orden}</dt><dd className="text-ink">{video.compra.orden}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/45">{t.precio}</dt><dd className="text-ink">{video.compra.precio}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/45">{t.metodo}</dt><dd className="text-ink">{video.compra.metodo}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/45">{t.acceso}</dt><dd className="font-semibold text-emerald-600">{t.deVida}</dd></div>
              </dl>
              <a href="#" className="mt-4 block text-center text-xs text-brand-600 hover:underline">{t.descargarComprobante}</a>
            </aside>
          </div>
        </>
      )}

      {vista === 'libro' && libro && (
        <>
          <button onClick={() => setVista('lista')} className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
            <ArrowLeft size={15} /> {t.volverBiblioteca}
          </button>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink/60">
                  <button className="rounded p-1 hover:bg-brand-50"><ChevronLeft size={16} /></button>
                  <span>{t.pagina} 12/{libro.paginas}</span>
                  <button className="rounded p-1 hover:bg-brand-50"><ChevronRight size={16} /></button>
                </div>
                <div className="flex items-center gap-2 text-ink/50">
                  <button className="rounded p-1 hover:bg-brand-50" aria-label="A-"><Minus size={14} /></button>
                  <button className="rounded p-1 hover:bg-brand-50" aria-label="A+"><Plus size={14} /></button>
                  <button className="rounded p-1 hover:bg-brand-50" aria-label="Bookmark"><Bookmark size={14} /></button>
                </div>
              </div>
              <div
                className="relative min-h-[420px] select-none overflow-hidden rounded-2xl border border-brand-100 bg-[#faf7f0] p-8 leading-relaxed text-[#2a2740] shadow-lift sm:p-12"
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.08]">
                  <span className="-rotate-12 font-display text-4xl font-semibold">{correo}</span>
                </div>
                <h2 className="mb-4 font-display text-xl font-semibold">{libro.capitulo.titulo}</h2>
                {libro.capitulo.parrafos.map((p, i) => (
                  <p key={i} className="mb-3 text-sm">{p[language]}</p>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink/45">
                <ShieldCheck size={14} className="text-brand-600" /> {t.protegidoLibro}
              </div>
            </div>
            <aside className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
              <img src={libro.image} alt={libro.titulo[language]} className="mb-4 w-24 rounded-xl border border-brand-100" />
              <h2 className="font-display font-semibold text-ink">{libro.titulo[language]}</h2>
              <p className="mb-4 text-sm text-ink/50">{libro.autor}</p>
              <dl className="space-y-2 border-t border-brand-100 pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-ink/45">{t.comprado2}</dt><dd className="text-ink">{libro.compra.fecha}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/45">{t.orden}</dt><dd className="text-ink">{libro.compra.orden}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/45">{t.precio}</dt><dd className="text-ink">{libro.compra.precio}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/45">{t.formato}</dt><dd className="text-ink">{libro.formato}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/45">{t.acceso}</dt><dd className="font-semibold text-emerald-600">{t.deVida}</dd></div>
              </dl>
              <button className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-brand-200 py-2.5 text-sm font-semibold text-ink/40" title={t.descargaBloqueada}>
                <Lock size={14} /> {t.descargaBloqueada}
              </button>
              <a href="#" className="mt-3 block text-center text-xs text-brand-600 hover:underline">{t.descargarComprobante}</a>
            </aside>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
