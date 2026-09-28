import { useMemo, useState } from 'react';
import { Search, Plus, BookOpen, Video as VideoIcon, ImagePlus, UploadCloud, ShieldCheck, Pencil } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminDrawer from '@/components/admin/ui/AdminDrawer';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import { demoProductos, CATEGORIAS_PRODUCTO, type ProductoDigitalRecord, type EstadoProducto, type TipoProducto } from '@/data/admin/digitalProductsData';
import { Link } from 'react-router-dom';
import AvisoFlotante from '@/components/admin/ui/AvisoFlotante';
import { useDialogo } from '@/context/DialogoContext';
import { useAcademiaAdmin } from '@/hooks/useAcademiaAdmin';
import { actualizarProductoAdmin, type AcademiaAdmin } from '@/lib/api/admin';
import ProductoEditarReal from '@/components/admin/ProductoEditarReal';

type ProductoBase = AcademiaAdmin['productos'][number];

const text = {
  es: {
    title: 'Productos digitales', subtitle: 'Libros y videos protegidos · datos de demostración', newProduct: 'Nuevo producto',
    kpiTotal: 'Total', kpiPublished: 'Publicados', kpiDrafts: 'Borradores', kpiSales: 'Ventas del mes',
    search: 'Buscar producto…', sales: 'ventas', publish: 'Publicar', toDraft: 'Pasar a borrador', edit: 'Editar',
    noResults: 'No se encontraron productos.',
    estados: { Publicado: 'Publicado', Borrador: 'Borrador', Archivado: 'Archivado' } as Record<EstadoProducto, string>,
    // drawer
    newTitle: 'Nuevo producto digital', editTitle: 'Editar producto digital', productTitle: 'Título', description: 'Descripción',
    type: 'Tipo', book: 'Libro', video: 'Video', category: 'Categoría', price: 'Precio', status: 'Estado de publicación',
    cover: 'Imagen de portada', dropCover: 'Arrastra una imagen o haz clic para subir', protectedFile: 'Archivo protegido',
    dropFile: 'Arrastra el archivo o haz clic para simular la carga (solo metadatos, sin almacenamiento real)',
    simulate: 'Simular carga de archivo', fileLoaded: 'Archivo cargado', deliverySettings: 'Entrega y protección',
    streaming: 'Streaming protegido', download: 'Descarga permitida', watermark: 'Marca de agua', downloadLimit: 'Límite de descargas',
    accessDays: 'Acceso (días)', blockCapture: 'Bloquear captura de pantalla', unlimited: '0 = ilimitado',
    save: 'Guardar', cancel: 'Cancelar',
  },
  en: {
    title: 'Digital products', subtitle: 'Protected books and videos · demo data', newProduct: 'New product',
    kpiTotal: 'Total', kpiPublished: 'Published', kpiDrafts: 'Drafts', kpiSales: 'Sales this month',
    search: 'Search product…', sales: 'sales', publish: 'Publish', toDraft: 'Move to draft', edit: 'Edit',
    noResults: 'No products found.',
    estados: { Publicado: 'Published', Borrador: 'Draft', Archivado: 'Archived' } as Record<EstadoProducto, string>,
    newTitle: 'New digital product', editTitle: 'Edit digital product', productTitle: 'Title', description: 'Description',
    type: 'Type', book: 'Book', video: 'Video', category: 'Category', price: 'Price', status: 'Publication status',
    cover: 'Cover image', dropCover: 'Drag an image or click to upload', protectedFile: 'Protected file',
    dropFile: 'Drag the file or click to simulate the upload (metadata only, no real storage)',
    simulate: 'Simulate file upload', fileLoaded: 'File loaded', deliverySettings: 'Delivery & protection',
    streaming: 'Protected streaming', download: 'Download allowed', watermark: 'Watermark', downloadLimit: 'Download limit',
    accessDays: 'Access (days)', blockCapture: 'Block screen capture', unlimited: '0 = unlimited',
    save: 'Save', cancel: 'Cancel',
  },
} as const;

const tipoIcon: Record<TipoProducto, typeof BookOpen> = { Libro: BookOpen, Video: VideoIcon };

function estadoTone(e: EstadoProducto) {
  if (e === 'Publicado') return 'positivo';
  if (e === 'Archivado') return 'negativo';
  return 'neutro';
}

type T = typeof text.es | typeof text.en;

export default function AdminDigitalProductsPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];
  const [busqueda, setBusqueda] = useState('');
  const { esReal, datos, error: errorCarga, recargar, aviso, mostrarAviso } = useAcademiaAdmin();
  const { confirmar } = useDialogo();
  const [procesando, setProcesando] = useState(false);
  const productosReales = useMemo(() => datos?.productos ?? [], [datos]);
  const [productos, setProductos] = useState<ProductoDigitalRecord[]>(demoProductos);

  async function actualizarReal(p: ProductoBase, cambios: { activo?: boolean; profesionalId?: number; descarga?: boolean }, texto: string, pregunta?: string) {
    if (pregunta && !(await confirmar(pregunta, { textoAceptar: 'Confirmar' }))) return recargar();
    setProcesando(true);
    const res = await actualizarProductoAdmin(p.id, cambios);
    setProcesando(false);
    if (res.error) return mostrarAviso(res.error.message, true);
    mostrarAviso(texto);
    return recargar();
  }
  const filtradosReales = productosReales.filter((p) => p.titulo.toLowerCase().includes(busqueda.trim().toLowerCase()));
  const [editando, setEditando] = useState<ProductoDigitalRecord | 'new' | null>(null);
  // Con la base: producto real en edición (058).
  const [editandoReal, setEditandoReal] = useState<number | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => p.titulo.toLowerCase().includes(q));
  }, [productos, busqueda]);

  function togglePublicado(id: string) {
    setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, estado: p.estado === 'Publicado' ? 'Borrador' : 'Publicado' } : p)));
  }

  function guardar(p: ProductoDigitalRecord) {
    setProductos((prev) => {
      const existe = prev.some((x) => x.id === p.id);
      return existe ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
    });
    setEditando(null);
  }

  const kpi = useMemo(() => {
    if (esReal) {
      return {
        total: productosReales.length,
        publicados: productosReales.filter((p) => p.estado === 'activo').length,
        borradores: productosReales.filter((p) => p.estado !== 'activo').length,
        ventasMes: productosReales.reduce((acc, p) => acc + p.ventasMes, 0),
      };
    }
    const total = productos.length;
    const publicados = productos.filter((p) => p.estado === 'Publicado').length;
    const borradores = productos.filter((p) => p.estado === 'Borrador').length;
    const ventasMes = productos.reduce((acc, p) => acc + p.ventas, 0);
    return { total, publicados, borradores, ventasMes };
  }, [productos, productosReales, esReal]);

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">{esReal ? (lang === 'es' ? 'Libros y videos protegidos · datos reales' : 'Protected books and videos · live data') : t.subtitle}</p>
        </div>
        {!esReal && (
        <button
          onClick={() => setEditando('new')}
          className="flex h-10 items-center gap-2 rounded-2xl bg-brand-gradient px-4 text-sm font-bold text-white shadow-soft"
        >
          <Plus size={16} />
          {t.newProduct}
        </button>
        )}
      </div>
      {errorCarga && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorCarga}</p>}
      <AvisoFlotante aviso={aviso} />
      {editandoReal !== null && (
        <ProductoEditarReal
          lang={lang}
          productoId={editandoReal}
          onClose={() => setEditandoReal(null)}
          onGuardado={() => { setEditandoReal(null); mostrarAviso('Producto guardado.'); void recargar(); }}
          onError={(m) => mostrarAviso(m, true)}
        />
      )}
      {esReal && (
        <p className="rounded-2xl bg-brand-50 px-4 py-3 text-xs text-ink/60">
          Este es el catálogo de la Tienda y de Recursos. Con “Editar” cambias título, descripción, categoría y precio. Cada producto tiene una profesional
          responsable que sube el archivo en “Mis productos” y aprueba las transferencias; solo se puede activar cuando tiene archivo y precio.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t.kpiTotal, value: kpi.total },
          { label: esReal ? (lang === 'es' ? 'Activos' : 'Active') : t.kpiPublished, value: kpi.publicados },
          { label: esReal ? (lang === 'es' ? 'Inactivos' : 'Inactive') : t.kpiDrafts, value: kpi.borradores },
          { label: t.kpiSales, value: kpi.ventasMes },
        ].map((k) => (
          <div key={k.label} className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
            <p className="font-display text-2xl font-semibold text-ink">{k.value}</p>
            <p className="text-xs text-ink/50">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex h-10 w-full max-w-sm items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3">
        <Search size={15} className="text-ink/35" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
          placeholder={t.search}
        />
      </div>

      {esReal && (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtradosReales.map((p) => {
          const Icon = p.tipo === 'video' ? VideoIcon : BookOpen;
          return (
            <div key={p.id} className="flex flex-col rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon size={20} />
                </span>
                <StatusBadge tone={p.estado === 'activo' ? 'positivo' : 'neutro'}>{p.estado === 'activo' ? 'Activo' : 'Inactivo'}</StatusBadge>
              </div>
              <p className="mt-4 font-display text-lg font-semibold text-ink">{p.titulo}</p>
              <p className="text-xs text-ink/45">{p.tipo === 'video' ? 'Video' : 'Libro PDF'} · {p.categoria ?? '—'} · {p.clave}</p>
              <p className={`mt-2 flex items-center gap-1 text-[11px] ${p.tieneArchivo ? 'text-ink/45' : 'text-amber-700'}`}>
                <ShieldCheck size={12} className={p.tieneArchivo ? 'text-brand-500' : 'text-amber-500'} />
                {p.tieneArchivo ? 'Archivo cargado' : 'Falta subir el archivo'}
              </p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">{p.moneda} {p.precio}</span>
                <span className="text-xs text-ink/45">{p.ventas} {t.sales}</span>
              </div>
              <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Profesional responsable</label>
              <select
                value={p.profesionalId ?? ''}
                disabled={procesando}
                onChange={(e) => {
                  const nueva = datos?.profesionales.find((x) => x.id === Number(e.target.value));
                  void actualizarReal(
                    p,
                    { profesionalId: Number(e.target.value) },
                    `Producto reasignado a ${nueva?.nombre ?? 'la profesional'}.`,
                    `¿Reasignar "${p.titulo}" a ${nueva?.nombre ?? 'esa profesional'}? Ella subirá el archivo y aprobará sus transferencias.`
                  );
                }}
                className="mt-1 h-9 w-full rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none"
              >
                {(datos?.profesionales ?? []).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </select>
              <label className="mt-3 flex items-center justify-between text-xs text-ink/70">
                {t.download}
                <input
                  type="checkbox"
                  checked={p.descarga}
                  disabled={procesando}
                  onChange={(e) => void actualizarReal(p, { descarga: e.target.checked }, e.target.checked ? 'Descarga permitida.' : 'Descarga desactivada: solo lectura en la página.')}
                  className="h-4 w-4 rounded border-brand-300 text-brand-600"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  disabled={procesando}
                  onClick={() =>
                    void actualizarReal(
                      p,
                      { activo: p.estado !== 'activo' },
                      p.estado === 'activo' ? 'Producto desactivado.' : 'Producto activado.',
                      p.estado === 'activo'
                        ? `¿Desactivar "${p.titulo}"? No se podrá comprar; quienes ya lo compraron lo conservan.`
                        : undefined
                    )
                  }
                  className="flex-1 rounded-2xl border border-brand-100 py-2 text-xs font-semibold text-ink hover:bg-brand-50 disabled:opacity-50"
                >
                  {p.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => setEditandoReal(p.id)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-brand-100 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                >
                  <Pencil size={12} /> {t.edit}
                </button>
                {p.estado === 'activo' && (
                  <Link to={`/tienda/${p.clave}`} target="_blank" className="flex-1 rounded-2xl border border-brand-100 py-2 text-center text-xs font-semibold text-brand-700 hover:bg-brand-50">
                    Ver en la tienda
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {filtradosReales.length === 0 && <p className="col-span-full py-10 text-center text-sm text-ink/40">{t.noResults}</p>}
      </section>
      )}

      {!esReal && (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtrados.map((p) => {
          const Icon = tipoIcon[p.tipo];
          return (
            <div key={p.id} className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon size={20} />
                </span>
                <div className="flex items-center gap-1.5">
                  <StatusBadge tone={estadoTone(p.estado)}>{t.estados[p.estado]}</StatusBadge>
                  <button onClick={() => setEditando(p)} className="rounded-lg p-1 text-ink/35 hover:bg-brand-50 hover:text-brand-600" aria-label={t.edit}>
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
              <p className="mt-4 font-display text-lg font-semibold text-ink">{p.titulo}</p>
              <p className="text-xs text-ink/45">{p.tipo} · {p.categoria}</p>
              {p.archivo && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-ink/40">
                  <ShieldCheck size={12} className="text-brand-500" />
                  {p.archivo.nombre} · {p.archivo.tamanoMB} MB
                </p>
              )}
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">{p.moneda} {p.precio}</span>
                <span className="text-xs text-ink/45">{p.ventas} {t.sales}</span>
              </div>
              <button
                onClick={() => togglePublicado(p.id)}
                className="mt-4 w-full rounded-2xl border border-brand-100 py-2 text-xs font-semibold text-ink hover:bg-brand-50"
              >
                {p.estado === 'Publicado' ? t.toDraft : t.publish}
              </button>
            </div>
          );
        })}
        {filtrados.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-ink/40">{t.noResults}</p>
        )}
      </section>
      )}

      {editando && (
        <ProductoDrawer t={t} value={editando === 'new' ? null : editando} onClose={() => setEditando(null)} onSave={guardar} />
      )}
    </AdminLayout>
  );
}

function ProductoDrawer({ t, value, onClose, onSave }: { t: T; value: ProductoDigitalRecord | null; onClose: () => void; onSave: (p: ProductoDigitalRecord) => void }) {
  const [form, setForm] = useState<ProductoDigitalRecord>(
    value ?? {
      id: `pd${Date.now()}`, titulo: '', descripcion: '', tipo: 'Libro', categoria: CATEGORIAS_PRODUCTO[0], precio: 0, moneda: 'USD',
      ventas: 0, estado: 'Borrador', actualizado: '2026-08-19',
      entrega: { streamingProtegido: true, descargaPermitida: false, marcaDeAgua: true, limiteDescargas: 0, accesoDias: 365, bloquearCaptura: true },
    },
  );
  const [coverListo, setCoverListo] = useState(!!value);

  function simularArchivo() {
    setForm((f) => ({
      ...f,
      archivo: {
        nombre: f.tipo === 'Libro' ? 'documento-protegido.pdf' : 'video-protegido.mp4',
        tamanoMB: f.tipo === 'Libro' ? Math.round(Math.random() * 8 + 1) : Math.round(Math.random() * 400 + 100),
        formato: f.tipo === 'Libro' ? 'PDF' : 'MP4',
      },
    }));
  }

  return (
    <AdminDrawer
      title={value ? t.editTitle : t.newTitle}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">{t.cancel}</button>
          <button onClick={() => onSave(form)} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">{t.save}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.type}</label>
          <div className="flex gap-1 rounded-2xl border border-brand-100 bg-brand-50/40 p-1">
            {(['Libro', 'Video'] as TipoProducto[]).map((op) => (
              <button
                key={op}
                onClick={() => setForm((f) => ({ ...f, tipo: op }))}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  form.tipo === op ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/50 hover:bg-white'
                }`}
              >
                {op === 'Libro' ? <BookOpen size={14} /> : <VideoIcon size={14} />}
                {op === 'Libro' ? t.book : t.video}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.productTitle}</label>
          <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.description}</label>
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.category}</label>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none">
              {CATEGORIAS_PRODUCTO.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.price}</label>
            <div className="flex gap-1">
              <input value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className="h-10 w-16 rounded-xl border border-brand-200 px-2 text-sm text-ink outline-none" />
              <input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.cover}</label>
          <button
            type="button"
            onClick={() => setCoverListo(true)}
            className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 text-ink/40 hover:bg-brand-50"
          >
            <ImagePlus size={20} />
            <span className="text-xs">{coverListo ? '✓' : t.dropCover}</span>
          </button>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.protectedFile}</label>
          <button
            type="button"
            onClick={simularArchivo}
            className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 text-ink/40 hover:bg-brand-50"
          >
            <UploadCloud size={20} />
            <span className="px-4 text-center text-xs">{form.archivo ? `${t.fileLoaded}: ${form.archivo.nombre} (${form.archivo.tamanoMB} MB)` : t.dropFile}</span>
          </button>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/30 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-ink/60">
            <ShieldCheck size={14} className="text-brand-500" />
            {t.deliverySettings}
          </p>
          <div className="space-y-2.5">
            <label className="flex items-center justify-between text-sm text-ink/70">
              {t.streaming}
              <input type="checkbox" checked={form.entrega.streamingProtegido} onChange={(e) => setForm({ ...form, entrega: { ...form.entrega, streamingProtegido: e.target.checked } })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
            </label>
            <label className="flex items-center justify-between text-sm text-ink/70">
              {t.download}
              <input type="checkbox" checked={form.entrega.descargaPermitida} onChange={(e) => setForm({ ...form, entrega: { ...form.entrega, descargaPermitida: e.target.checked } })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
            </label>
            <label className="flex items-center justify-between text-sm text-ink/70">
              {t.watermark}
              <input type="checkbox" checked={form.entrega.marcaDeAgua} onChange={(e) => setForm({ ...form, entrega: { ...form.entrega, marcaDeAgua: e.target.checked } })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
            </label>
            <label className="flex items-center justify-between text-sm text-ink/70">
              {t.blockCapture}
              <input type="checkbox" checked={form.entrega.bloquearCaptura} onChange={(e) => setForm({ ...form, entrega: { ...form.entrega, bloquearCaptura: e.target.checked } })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
            </label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.downloadLimit}</label>
                <input type="number" value={form.entrega.limiteDescargas} onChange={(e) => setForm({ ...form, entrega: { ...form.entrega, limiteDescargas: Number(e.target.value) } })} className="h-9 w-full rounded-xl border border-brand-200 px-2 text-xs text-ink outline-none" />
                <p className="mt-0.5 text-[10px] text-ink/35">{t.unlimited}</p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.accessDays}</label>
                <input type="number" value={form.entrega.accesoDias} onChange={(e) => setForm({ ...form, entrega: { ...form.entrega, accesoDias: Number(e.target.value) } })} className="h-9 w-full rounded-xl border border-brand-200 px-2 text-xs text-ink outline-none" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.status}</label>
          <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoProducto })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none">
            <option value="Borrador">{t.estados.Borrador}</option>
            <option value="Publicado">{t.estados.Publicado}</option>
            <option value="Archivado">{t.estados.Archivado}</option>
          </select>
        </div>
      </div>
    </AdminDrawer>
  );
}
