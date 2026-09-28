import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, MapPin, Pencil } from 'lucide-react';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminDrawer from '@/components/admin/ui/AdminDrawer';
import AvisoFlotante from '@/components/admin/ui/AvisoFlotante';
import {
  cargarCatalogoAdmin, guardarServicioAdmin, guardarSedeAdmin,
  type ServicioAdmin, type SedeAdmin,
} from '@/lib/api/admin';

// Pestañas "Servicios" y "Lugares / Sedes" del admin con la base real
// (migración 057). No se borran: se ocultan (hay citas que los usan).

const text = {
  es: {
    cargando: 'Cargando…', reintentar: 'Reintentar', vacio: 'No hay resultados.',
    servicio: 'Servicio', categoria: 'Categoría', duracion: 'Duración', precio: 'Precio', estado: 'Estado', editar: 'Editar',
    profesionales: 'profesionales', citas: 'citas', min: 'min',
    visible: 'Visible', oculto: 'Oculto', verSitio: 'Ver en el sitio',
    nuevoServicio: 'Nuevo servicio', editarServicio: 'Editar servicio',
    nuevaSede: 'Nueva sede', editarSede: 'Editar sede',
    nombre: 'Nombre', descripcion: 'Descripción', modalidad: 'Modalidad que se muestra',
    es: 'Español', en: 'Inglés (opcional)',
    duracionMin: 'Duración (min)', precioUsd: 'Precio (USD)',
    precioAyuda: 'Mismo precio y duración para online y presencial. Las citas ya reservadas conservan su precio.',
    imagen: 'Imagen (enlace https, opcional)', imagenAyuda: 'Si la dejas vacía se usa la imagen de su categoría.',
    visibleServicio: 'Visible en el sitio y en "Agendar una cita"',
    visibleSede: 'Visible en el sitio y en "Agendar una cita"',
    nuevoAyuda: 'Se asigna a todas las profesionales activas; puedes quitárselo a cada una en la pestaña Profesionales.',
    ciudad: 'Ciudad', direccion: 'Dirección', mapa: 'Enlace del mapa (https, opcional)', contacto: 'Teléfono o contacto (opcional)',
    cancelar: 'Cancelar', guardar: 'Guardar', crear: 'Crear', guardando: 'Guardando…',
    guardado: 'Guardado.', creado: 'Creado.',
    faltanServicio: 'Completa el nombre y la descripción en español, la duración y el precio.',
    faltanSede: 'Completa el nombre y la dirección.',
    sinDireccion: 'Sin dirección', verMapa: 'Mapa',
    categorias: { individual: 'Individual', pareja: 'Pareja y familia', infantil: 'Niñez y adolescencia', orientacion: 'Orientación' },
  },
  en: {
    cargando: 'Loading…', reintentar: 'Retry', vacio: 'No results.',
    servicio: 'Service', categoria: 'Category', duracion: 'Duration', precio: 'Price', estado: 'Status', editar: 'Edit',
    profesionales: 'professionals', citas: 'appointments', min: 'min',
    visible: 'Visible', oculto: 'Hidden', verSitio: 'View on site',
    nuevoServicio: 'New service', editarServicio: 'Edit service',
    nuevaSede: 'New location', editarSede: 'Edit location',
    nombre: 'Name', descripcion: 'Description', modalidad: 'Displayed modality',
    es: 'Spanish', en: 'English (optional)',
    duracionMin: 'Duration (min)', precioUsd: 'Price (USD)',
    precioAyuda: 'Same price and duration online and in person. Already booked appointments keep their price.',
    imagen: 'Image (https link, optional)', imagenAyuda: 'If empty, the category image is used.',
    visibleServicio: 'Visible on the site and in "Book an appointment"',
    visibleSede: 'Visible on the site and in "Book an appointment"',
    nuevoAyuda: 'It is assigned to every active professional; you can remove it from each one in the Professionals tab.',
    ciudad: 'City', direccion: 'Address', mapa: 'Map link (https, optional)', contacto: 'Phone or contact (optional)',
    cancelar: 'Cancel', guardar: 'Save', crear: 'Create', guardando: 'Saving…',
    guardado: 'Saved.', creado: 'Created.',
    faltanServicio: 'Fill in the name and description in Spanish, the duration and the price.',
    faltanSede: 'Fill in the name and the address.',
    sinDireccion: 'No address', verMapa: 'Map',
    categorias: { individual: 'Individual', pareja: 'Couples & family', infantil: 'Children & teens', orientacion: 'Guidance' },
  },
} as const;

type T = (typeof text)['es'] | (typeof text)['en'];
type Lang = 'es' | 'en';

const MODALIDADES = [
  { es: 'En línea / Presencial', en: 'Online / In-person' },
  { es: 'En línea', en: 'Online' },
  { es: 'Presencial', en: 'In-person' },
];
const CATEGORIAS = ['individual', 'pareja', 'infantil', 'orientacion'] as const;

const etiqueta = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40';
const campo = 'w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none focus:border-brand-400';

// Carga compartida por las dos pestañas.
function useCatalogoAdmin(t: T) {
  const [datos, setDatos] = useState<{ servicios: ServicioAdmin[]; sedes: SedeAdmin[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);

  async function cargar() {
    setError(null);
    const res = await cargarCatalogoAdmin();
    if (res.error) setError(res.error.message);
    else setDatos(res.data);
  }
  useEffect(() => {
    void cargar();
  }, []);

  function avisar(texto: string, err = false) {
    setAviso({ texto, error: err });
    window.setTimeout(() => setAviso(null), 4000);
  }

  const estadoCarga = error ? (
    <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
      {error}{' '}
      <button onClick={() => void cargar()} className="font-bold underline">{t.reintentar}</button>
    </div>
  ) : !datos ? (
    <p className="text-sm text-ink/50">{t.cargando}</p>
  ) : null;

  return { datos, cargar, aviso, avisar, estadoCarga };
}

function Pie({ t, guardando, esNuevo, onClose, onGuardar }: { t: T; guardando: boolean; esNuevo: boolean; onClose: () => void; onGuardar: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onClose} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">{t.cancelar}</button>
      <button onClick={onGuardar} disabled={guardando} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft disabled:opacity-60">
        {guardando ? t.guardando : esNuevo ? t.crear : t.guardar}
      </button>
    </div>
  );
}

// ─────────────────────────── Servicios ───────────────────────────

export function ServiciosAdminReal({ lang, buscar, abrirNuevo, onNuevoCerrado }: { lang: Lang; buscar: string; abrirNuevo: boolean; onNuevoCerrado: () => void }) {
  const t = text[lang];
  const { datos, cargar, aviso, avisar, estadoCarga } = useCatalogoAdmin(t);
  const [editando, setEditando] = useState<ServicioAdmin | null>(null);

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (datos?.servicios ?? []).filter((s) => !q || s.nombre.toLowerCase().includes(q) || s.textos.nombre_en?.toLowerCase().includes(q));
  }, [datos, buscar]);

  if (estadoCarga) return estadoCarga;

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                <th className="px-5 py-3 font-semibold">{t.servicio}</th>
                <th className="px-5 py-3 font-semibold">{t.categoria}</th>
                <th className="px-5 py-3 font-semibold">{t.duracion}</th>
                <th className="px-5 py-3 font-semibold">{t.precio}</th>
                <th className="px-5 py-3 font-semibold">{t.estado}</th>
                <th className="px-5 py-3 text-right font-semibold">{t.editar}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-ink/45">{t.vacio}</td></tr>
              )}
              {filtrados.map((s) => (
                <tr key={s.id} className="hover:bg-brand-50/50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink">{lang === 'en' ? s.textos.nombre_en || s.nombre : s.nombre}</p>
                    <p className="text-xs text-ink/45">{s.profesionales} {t.profesionales} · {s.citas} {t.citas}</p>
                  </td>
                  <td className="px-5 py-3 text-ink/60">{t.categorias[s.categoria]}</td>
                  <td className="px-5 py-3 text-ink/60">{s.duracion ?? '—'} {t.min}</td>
                  <td className="px-5 py-3 font-semibold text-ink">USD {s.precio ?? '—'}</td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={s.estado === 'activo' ? 'positivo' : 'neutro'}>{s.estado === 'activo' ? t.visible : t.oculto}</StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {s.estado === 'activo' && (
                        <Link to={`/servicios/${s.slug}`} target="_blank" className="rounded-lg p-1.5 text-ink/40 hover:bg-brand-50 hover:text-brand-600" aria-label={t.verSitio} title={t.verSitio}>
                          <ExternalLink size={15} />
                        </Link>
                      )}
                      <button onClick={() => setEditando(s)} className="rounded-lg p-1.5 text-ink/40 hover:bg-brand-50 hover:text-brand-600" aria-label={t.editar}>
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(abrirNuevo || editando) && (
        <ServicioDrawer
          t={t}
          lang={lang}
          servicio={editando}
          onClose={() => { setEditando(null); onNuevoCerrado(); }}
          onHecho={(nuevo) => { setEditando(null); onNuevoCerrado(); avisar(nuevo ? t.creado : t.guardado); void cargar(); }}
          onError={(m) => avisar(m, true)}
        />
      )}
      <AvisoFlotante aviso={aviso} />
    </>
  );
}

function ServicioDrawer({ t, lang, servicio, onClose, onHecho, onError }: {
  t: T; lang: Lang; servicio: ServicioAdmin | null;
  onClose: () => void; onHecho: (nuevo: boolean) => void; onError: (m: string) => void;
}) {
  const [nombre, setNombre] = useState(servicio?.nombre ?? '');
  const [nombreEn, setNombreEn] = useState(servicio?.textos.nombre_en ?? '');
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? '');
  const [descripcionEn, setDescripcionEn] = useState(servicio?.textos.descripcion_en ?? '');
  const [categoria, setCategoria] = useState<ServicioAdmin['categoria']>(servicio?.categoria ?? 'individual');
  const [modalidad, setModalidad] = useState(Math.max(0, MODALIDADES.findIndex((m) => m.es === servicio?.textos.modalidad_es)));
  const [duracion, setDuracion] = useState(String(servicio?.duracion ?? 50));
  const [precio, setPrecio] = useState(String(servicio?.precio ?? ''));
  const [imagen, setImagen] = useState(servicio?.imagen ?? '');
  const [visible, setVisible] = useState(servicio ? servicio.estado === 'activo' : true);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim() || !descripcion.trim() || !duracion.trim() || !precio.trim()) return onError(t.faltanServicio);
    setGuardando(true);
    const res = await guardarServicioAdmin(servicio?.id ?? null, {
      nombre, nombre_en: nombreEn, descripcion, descripcion_en: descripcionEn, categoria,
      modalidad_es: MODALIDADES[modalidad].es, modalidad_en: MODALIDADES[modalidad].en,
      duracion: duracion.trim(), precio: precio.trim().replace(',', '.'), imagen,
      estado: visible ? 'activo' : 'inactivo',
    });
    setGuardando(false);
    if (res.error) return onError(res.error.message);
    onHecho(!servicio);
  }

  return (
    <AdminDrawer
      title={servicio ? t.editarServicio : t.nuevoServicio}
      subtitle={servicio?.nombre}
      onClose={onClose}
      footer={<Pie t={t} guardando={guardando} esNuevo={!servicio} onClose={onClose} onGuardar={() => void guardar()} />}
    >
      <div className="space-y-4">
        {!servicio && <p className="rounded-2xl bg-brand-50 p-3 text-xs leading-5 text-ink/65">{t.nuevoAyuda}</p>}
        <div>
          <label className={etiqueta}>{t.nombre}</label>
          <div className="grid gap-2">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t.es} className={`${campo} h-10`} />
            <input value={nombreEn} onChange={(e) => setNombreEn(e.target.value)} placeholder={t.en} className={`${campo} h-10`} />
          </div>
        </div>
        <div>
          <label className={etiqueta}>{t.descripcion}</label>
          <div className="grid gap-2">
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} placeholder={t.es} className={`${campo} py-2`} />
            <textarea value={descripcionEn} onChange={(e) => setDescripcionEn(e.target.value)} rows={3} placeholder={t.en} className={`${campo} py-2`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={etiqueta}>{t.categoria}</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as ServicioAdmin['categoria'])} className={`${campo} h-10`}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{t.categorias[c]}</option>)}
            </select>
          </div>
          <div>
            <label className={etiqueta}>{t.modalidad}</label>
            <select value={modalidad} onChange={(e) => setModalidad(Number(e.target.value))} className={`${campo} h-10`}>
              {MODALIDADES.map((m, i) => <option key={m.es} value={i}>{m[lang]}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={etiqueta}>{t.duracionMin}</label>
            <input type="number" min={15} max={240} value={duracion} onChange={(e) => setDuracion(e.target.value)} className={`${campo} h-10`} />
          </div>
          <div>
            <label className={etiqueta}>{t.precioUsd}</label>
            <input type="number" min={0} step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={`${campo} h-10`} />
          </div>
        </div>
        <p className="-mt-2 text-[11px] leading-4 text-ink/45">{t.precioAyuda}</p>
        <div>
          <label className={etiqueta}>{t.imagen}</label>
          <input value={imagen} onChange={(e) => setImagen(e.target.value)} placeholder="https://" className={`${campo} h-10`} />
          <p className="mt-1 text-[11px] text-ink/45">{t.imagenAyuda}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
          {t.visibleServicio}
        </label>
      </div>
    </AdminDrawer>
  );
}

// ─────────────────────────── Sedes ───────────────────────────

export function SedesAdminReal({ lang, buscar, abrirNueva, onNuevaCerrada }: { lang: Lang; buscar: string; abrirNueva: boolean; onNuevaCerrada: () => void }) {
  const t = text[lang];
  const { datos, cargar, aviso, avisar, estadoCarga } = useCatalogoAdmin(t);
  const [editando, setEditando] = useState<SedeAdmin | null>(null);

  const filtradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (datos?.sedes ?? []).filter((s) => !q || [s.nombre, s.ciudad, s.direccion].some((v) => v?.toLowerCase().includes(q)));
  }, [datos, buscar]);

  if (estadoCarga) return estadoCarga;

  return (
    <>
      {filtradas.length === 0 ? (
        <p className="rounded-3xl border border-brand-100 bg-white p-6 text-sm text-ink/50">{t.vacio}</p>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtradas.map((s) => (
            <div key={s.id} className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin size={17} className="text-brand-500" />
                  <p className="font-display text-lg font-semibold text-ink">{s.nombre}</p>
                </div>
                <button onClick={() => setEditando(s)} className="rounded-lg p-1.5 text-ink/40 hover:bg-brand-50 hover:text-brand-600" aria-label={t.editar}>
                  <Pencil size={14} />
                </button>
              </div>
              <p className="mt-2 text-sm text-ink/60">{(lang === 'en' ? s.direccion_en || s.direccion : s.direccion) || t.sinDireccion}</p>
              {s.ciudad && <p className="mt-1 text-xs text-ink/45">{s.ciudad}</p>}
              {s.contacto && <p className="mt-1 text-xs text-ink/45">{s.contacto}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={s.estado === 'activo' ? 'positivo' : 'neutro'}>{s.estado === 'activo' ? t.visible : t.oculto}</StatusBadge>
                <span className="text-xs font-semibold text-brand-600">{s.profesionales} {t.profesionales} · {s.citas} {t.citas}</span>
                {s.mapa_url && (
                  <a href={s.mapa_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                    {t.verMapa} <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {(abrirNueva || editando) && (
        <SedeDrawer
          t={t}
          sede={editando}
          onClose={() => { setEditando(null); onNuevaCerrada(); }}
          onHecho={(nueva) => { setEditando(null); onNuevaCerrada(); avisar(nueva ? t.creado : t.guardado); void cargar(); }}
          onError={(m) => avisar(m, true)}
        />
      )}
      <AvisoFlotante aviso={aviso} />
    </>
  );
}

function SedeDrawer({ t, sede, onClose, onHecho, onError }: {
  t: T; sede: SedeAdmin | null; onClose: () => void; onHecho: (nueva: boolean) => void; onError: (m: string) => void;
}) {
  const [nombre, setNombre] = useState(sede?.nombre ?? '');
  const [ciudad, setCiudad] = useState(sede?.ciudad ?? '');
  const [direccion, setDireccion] = useState(sede?.direccion ?? '');
  const [direccionEn, setDireccionEn] = useState(sede?.direccion_en ?? '');
  const [mapa, setMapa] = useState(sede?.mapa_url ?? '');
  const [contacto, setContacto] = useState(sede?.contacto ?? '');
  const [visible, setVisible] = useState(sede ? sede.estado === 'activo' : true);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim() || !direccion.trim()) return onError(t.faltanSede);
    setGuardando(true);
    const res = await guardarSedeAdmin(sede?.id ?? null, {
      nombre, ciudad, direccion, direccion_en: direccionEn, mapa_url: mapa, contacto,
      estado: visible ? 'activo' : 'inactivo',
    });
    setGuardando(false);
    if (res.error) return onError(res.error.message);
    onHecho(!sede);
  }

  return (
    <AdminDrawer
      title={sede ? t.editarSede : t.nuevaSede}
      subtitle={sede?.nombre}
      onClose={onClose}
      footer={<Pie t={t} guardando={guardando} esNuevo={!sede} onClose={onClose} onGuardar={() => void guardar()} />}
    >
      <div className="space-y-4">
        {!sede && <p className="rounded-2xl bg-brand-50 p-3 text-xs leading-5 text-ink/65">{t.nuevoAyuda}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={etiqueta}>{t.nombre}</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={`${campo} h-10`} />
          </div>
          <div>
            <label className={etiqueta}>{t.ciudad}</label>
            <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={`${campo} h-10`} />
          </div>
        </div>
        <div>
          <label className={etiqueta}>{t.direccion}</label>
          <div className="grid gap-2">
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder={t.es} className={`${campo} h-10`} />
            <input value={direccionEn} onChange={(e) => setDireccionEn(e.target.value)} placeholder={t.en} className={`${campo} h-10`} />
          </div>
        </div>
        <div>
          <label className={etiqueta}>{t.mapa}</label>
          <input value={mapa} onChange={(e) => setMapa(e.target.value)} placeholder="https://maps.google.com/…" className={`${campo} h-10`} />
        </div>
        <div>
          <label className={etiqueta}>{t.contacto}</label>
          <input value={contacto} onChange={(e) => setContacto(e.target.value)} className={`${campo} h-10`} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
          {t.visibleSede}
        </label>
      </div>
    </AdminDrawer>
  );
}
