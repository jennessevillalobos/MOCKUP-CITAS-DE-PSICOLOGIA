import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Film, FileCheck2, FileWarning, Upload, Trash2, Loader2, ImagePlus } from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { INSTRUCTOR_NAV_LABELS, buildInstructorNav } from '@/components/site/instructorNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useDialogo } from '@/context/DialogoContext';
import {
  cargarMisProductos, subirArchivoProducto, quitarArchivoProducto, cambiarDescargaProducto,
  subirPortadaProducto, quitarPortadaProducto,
  FORMATOS_POR_TIPO, TAMANO_MAXIMO_MB, type ProductoProfesional,
} from '@/lib/api/productosProfesional';
import { optimizarImagen, TIPOS_IMAGEN } from '@/lib/integrations/cloudinary';

// "Mis productos": productos digitales de la profesional (Tienda). Aquí sube
// el archivo que reciben los compradores en su Biblioteca y decide si pueden
// descargarlo o solo leerlo / verlo dentro de la plataforma.

const text = {
  es: {
    volverPortal: 'Volver al panel',
    titulo: 'Mis productos', subtitulo: 'Libros y videos que vendes en la Tienda. Sube aquí el archivo que recibe cada comprador.',
    cargando: 'Cargando tus productos…', sinProductos: 'Aún no tienes productos asignados en la Tienda.',
    soloReal: 'Esta sección funciona con una cuenta real de profesional.',
    libro: 'Libro', video: 'Video', publicado: 'En la Tienda', borrador: 'Borrador',
    ventas: 'ventas', enRevision: 'pago(s) por revisar', verPagos: 'Revisar',
    sinArchivo: 'Sin archivo: los compradores verán “Archivo disponible pronto”.',
    archivoActual: 'Archivo actual', subir: 'Subir archivo', reemplazar: 'Reemplazar', quitar: 'Quitar', subiendo: 'Subiendo…',
    permitirDescarga: 'Permitir descarga', permitirDescargaDet: 'Si está apagado, solo pueden leerlo o verlo en la plataforma.',
    formatosLibro: `PDF o EPUB · máx. ${TAMANO_MAXIMO_MB} MB`, formatosVideo: `MP4, WebM o MP3 · máx. ${TAMANO_MAXIMO_MB} MB`,
    confirmQuitar: '¿Quitar el archivo? Los compradores dejarán de poder abrirlo hasta que subas otro.',
    confirmReemplazar: 'Los compradores recibirán el archivo nuevo. ¿Continuar?',
    listo: 'Archivo guardado ✓',
    portada: 'Portada', subirPortada: 'Subir portada', cambiarPortada: 'Cambiar portada', portadaDet: 'Imagen pública de la Tienda y la Biblioteca · JPG, PNG o WebP',
    cloudinaryNoConfig: 'Las imágenes aún no están configuradas (Cloudinary). Pide a la administración que lo active.',
  },
  en: {
    volverPortal: 'Back to panel',
    titulo: 'My products', subtitulo: 'Books and videos you sell in the Store. Upload here the file each buyer receives.',
    cargando: 'Loading your products…', sinProductos: 'You have no products assigned in the Store yet.',
    soloReal: 'This section works with a real professional account.',
    libro: 'Book', video: 'Video', publicado: 'In the Store', borrador: 'Draft',
    ventas: 'sales', enRevision: 'payment(s) to review', verPagos: 'Review',
    sinArchivo: 'No file: buyers will see “File available soon”.',
    archivoActual: 'Current file', subir: 'Upload file', reemplazar: 'Replace', quitar: 'Remove', subiendo: 'Uploading…',
    permitirDescarga: 'Allow download', permitirDescargaDet: 'When off, buyers can only read or watch it on the platform.',
    formatosLibro: `PDF or EPUB · max ${TAMANO_MAXIMO_MB} MB`, formatosVideo: `MP4, WebM or MP3 · max ${TAMANO_MAXIMO_MB} MB`,
    confirmQuitar: 'Remove the file? Buyers will not be able to open it until you upload another.',
    confirmReemplazar: 'Buyers will receive the new file. Continue?',
    listo: 'File saved ✓',
    portada: 'Cover', subirPortada: 'Upload cover', cambiarPortada: 'Change cover', portadaDet: 'Public image for the Store and Library · JPG, PNG or WebP',
    cloudinaryNoConfig: 'Images are not configured yet (Cloudinary). Ask the administrator to enable it.',
  },
} as const;

export default function MisProductosPage() {
  const { language } = useSiteLanguage();
  const { esSesionReal } = useSiteAuth();
  const dialogo = useDialogo();
  const t = text[language];
  const navItems = buildInstructorNav(INSTRUCTOR_NAV_LABELS, ['productos'], ['constructor', 'citas', 'cursos', 'vivo', 'evaluaciones', 'notif', 'agenda', 'productos', 'perfil']);

  const [productos, setProductos] = useState<ProductoProfesional[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);
  const [listoId, setListoId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const portadaRef = useRef<HTMLInputElement>(null);
  const [portadaId, setPortadaId] = useState<number | null>(null);
  const destinoRef = useRef<ProductoProfesional | null>(null);

  const recargar = useCallback(async () => {
    const res = await cargarMisProductos();
    if (res.error) setError(res.error.message);
    else setProductos(res.data);
  }, []);

  useEffect(() => {
    if (esSesionReal) void recargar();
  }, [esSesionReal, recargar]);

  async function elegirArchivo(p: ProductoProfesional) {
    if (p.archivo && !(await dialogo.confirmar(t.confirmReemplazar))) return;
    destinoRef.current = p;
    if (inputRef.current) {
      inputRef.current.accept = FORMATOS_POR_TIPO[p.tipo];
      inputRef.current.click();
    }
  }

  async function alSeleccionar(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    const p = destinoRef.current;
    if (!archivo || !p) return;
    setError(null);
    setOcupadoId(p.id);
    const res = await subirArchivoProducto(p, archivo);
    setOcupadoId(null);
    if (res.error) return setError(`${p.titulo}: ${res.error.message}`);
    setListoId(p.id);
    window.setTimeout(() => setListoId(null), 2500);
    await recargar();
  }

  async function quitar(p: ProductoProfesional) {
    if (!(await dialogo.confirmar(t.confirmQuitar, { peligro: true }))) return;
    setOcupadoId(p.id);
    const res = await quitarArchivoProducto(p);
    setOcupadoId(null);
    if (res.error) return setError(res.error.message);
    await recargar();
  }

  function elegirPortada(p: ProductoProfesional) {
    destinoRef.current = p;
    portadaRef.current?.click();
  }

  async function alSeleccionarPortada(e: ChangeEvent<HTMLInputElement>) {
    const imagen = e.target.files?.[0];
    e.target.value = '';
    const p = destinoRef.current;
    if (!imagen || !p) return;
    setError(null);
    setPortadaId(p.id);
    const res = await subirPortadaProducto(p, imagen);
    setPortadaId(null);
    if (res.error) return setError(`${p.titulo}: ${res.error.code === 'config_error' ? t.cloudinaryNoConfig : res.error.message}`);
    await recargar();
  }

  async function quitarPortada(p: ProductoProfesional) {
    const res = await quitarPortadaProducto(p.id);
    if (res.error) return setError(res.error.message);
    await recargar();
  }

  async function alternarDescarga(p: ProductoProfesional) {
    const res = await cambiarDescargaProducto(p.id, !p.descargaPermitida);
    if (res.error) return setError(res.error.message);
    setProductos((ps) => ps?.map((x) => (x.id === p.id ? { ...x, descargaPermitida: !x.descargaPermitida } : x)) ?? null);
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="productos"
      onNavigate={() => {}}
      roleBadge={{ es: 'Instructor', en: 'Instructor' }}
      profileTo="/instructor/perfil"
      backTo="/instructor"
      backLabel={{ es: t.volverPortal, en: t.volverPortal }}
    >
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.titulo}</h1>
        <p className="text-sm text-ink/50">{t.subtitulo}</p>
      </div>

      <input ref={inputRef} type="file" className="hidden" onChange={(e) => void alSeleccionar(e)} />
      <input ref={portadaRef} type="file" accept={TIPOS_IMAGEN} className="hidden" onChange={(e) => void alSeleccionarPortada(e)} />

      {!esSesionReal && <p className="rounded-2xl border border-brand-100 bg-white p-6 text-sm text-ink/55">{t.soloReal}</p>}
      {error && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}
      {esSesionReal && !productos && !error && <p className="text-sm text-ink/45">{t.cargando}</p>}
      {productos?.length === 0 && <p className="rounded-2xl border border-brand-100 bg-white p-6 text-sm text-ink/55">{t.sinProductos}</p>}

      <div className="space-y-4">
        {productos?.map((p) => {
          const ocupado = ocupadoId === p.id;
          const Icono = p.tipo === 'video' ? Film : BookOpen;
          return (
            <div key={p.id} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start gap-4">
                {p.portada ? (
                  <img src={optimizarImagen(p.portada, 160)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icono size={20} /></span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display font-semibold text-ink">{p.titulo}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.estado === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-ink/50'}`}>
                      {p.estado === 'activo' ? t.publicado : t.borrador}
                    </span>
                  </div>
                  <p className="text-xs text-ink/50">
                    {p.tipo === 'video' ? t.video : t.libro} · {p.categoria} · USD ${p.precio} · {p.ventas} {t.ventas}
                    {p.pagosEnRevision > 0 && (
                      <> · <Link to="/instructor/citas" className="font-semibold text-amber-600 hover:underline">{p.pagosEnRevision} {t.enRevision}</Link></>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-50 bg-brand-50/40 px-4 py-3 text-sm">
                {p.archivo ? (
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-ink">
                    <FileCheck2 size={16} className="shrink-0 text-emerald-600" />
                    <span className="truncate"><span className="text-ink/50">{t.archivoActual}:</span> {p.archivo.split('/').pop()}</span>
                  </span>
                ) : (
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-amber-700">
                    <FileWarning size={16} className="shrink-0" /> {t.sinArchivo}
                  </span>
                )}
                {listoId === p.id && <span className="text-xs font-semibold text-emerald-600">{t.listo}</span>}
                <button
                  onClick={() => void elegirArchivo(p)}
                  disabled={ocupado}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {ocupado ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {ocupado ? t.subiendo : p.archivo ? t.reemplazar : t.subir}
                </button>
                {p.archivo && (
                  <button
                    onClick={() => void quitar(p)}
                    disabled={ocupado}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                  >
                    <Trash2 size={13} /> {t.quitar}
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-ink/40">{p.tipo === 'video' ? t.formatosVideo : t.formatosLibro}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => elegirPortada(p)}
                  disabled={portadaId === p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold text-ink hover:bg-brand-50 disabled:opacity-60"
                >
                  {portadaId === p.id ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                  {portadaId === p.id ? t.subiendo : p.portada ? t.cambiarPortada : t.subirPortada}
                </button>
                {p.portada && portadaId !== p.id && (
                  <button onClick={() => void quitarPortada(p)} className="text-xs font-semibold text-rose-600 hover:underline">{t.quitar}</button>
                )}
                <span className="text-[11px] text-ink/40">{t.portadaDet}</span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ink">{t.permitirDescarga}</p>
                  <p className="text-xs text-ink/45">{t.permitirDescargaDet}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void alternarDescarga(p)}
                  aria-pressed={p.descargaPermitida}
                  aria-label={t.permitirDescarga}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${p.descargaPermitida ? 'bg-brand-600' : 'bg-brand-100'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${p.descargaPermitida ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </PortalLayout>
  );
}
