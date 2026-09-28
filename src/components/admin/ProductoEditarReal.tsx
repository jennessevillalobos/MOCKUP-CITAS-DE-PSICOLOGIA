import { useEffect, useState } from 'react';
import AdminDrawer from '@/components/admin/ui/AdminDrawer';
import { CATEGORIAS_PRODUCTO } from '@/data/admin/digitalProductsData';
import { cargarProductoAdmin, guardarProductoAdmin, type ProductoAdminDetalle } from '@/lib/api/admin';

// Editar un producto digital con la base real (migración 058): título y
// descripción ES/EN, categoría, precio, tipo (si aún no tiene archivo) y
// duración de los videos. El archivo lo sube la profesional en "Mis productos".

const etiqueta = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40';
const campo = 'w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none focus:border-brand-400';

const text = {
  es: {
    titulo: 'Editar producto', cargando: 'Cargando…', nombre: 'Título', descripcion: 'Descripción',
    es: 'Español', en: 'Inglés (opcional)', categoria: 'Categoría', precio: 'Precio (USD)', tipo: 'Tipo',
    libro: 'Libro (PDF)', video: 'Video', duracion: 'Duración del video (min:seg)',
    tipoBloqueado: 'El tipo no se puede cambiar porque ya tiene archivo.',
    ayuda: 'Para publicarlo necesita precio y que la profesional responsable suba el archivo en "Mis productos"; luego pulsa "Activar".',
    cancelar: 'Cancelar', guardar: 'Guardar', guardando: 'Guardando…', faltan: 'Completa el título, la descripción y el precio.',
  },
  en: {
    titulo: 'Edit product', cargando: 'Loading…', nombre: 'Title', descripcion: 'Description',
    es: 'Spanish', en: 'English (optional)', categoria: 'Category', precio: 'Price (USD)', tipo: 'Type',
    libro: 'Book (PDF)', video: 'Video', duracion: 'Video duration (min:sec)',
    tipoBloqueado: 'The type cannot change because it already has a file.',
    ayuda: 'To publish it, it needs a price and the responsible professional must upload the file in "My products"; then press "Activate".',
    cancelar: 'Cancel', guardar: 'Save', guardando: 'Saving…', faltan: 'Fill in the title, description and price.',
  },
} as const;

export default function ProductoEditarReal({
  lang, productoId, onClose, onGuardado, onError,
}: { lang: 'es' | 'en'; productoId: number; onClose: () => void; onGuardado: () => void; onError: (m: string) => void }) {
  const t = text[lang];
  const [p, setP] = useState<ProductoAdminDetalle | null>(null);
  const [titulo, setTitulo] = useState('');
  const [tituloEn, setTituloEn] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionEn, setDescripcionEn] = useState('');
  const [categoria, setCategoria] = useState('');
  const [precio, setPrecio] = useState('');
  const [tipo, setTipo] = useState<'video' | 'libro_pdf'>('libro_pdf');
  const [duracion, setDuracion] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    void cargarProductoAdmin(productoId).then((res) => {
      if (res.error) return onError(res.error.message);
      const d = res.data;
      setP(d);
      setTitulo(d.titulo);
      setTituloEn(d.textos.titulo_en ?? '');
      setDescripcion(d.descripcion ?? '');
      setDescripcionEn(d.textos.descripcion_en ?? '');
      setCategoria(d.categoria ?? '');
      setPrecio(d.precio ? String(d.precio) : '');
      setTipo(d.tipo);
      setDuracion(d.textos.duracion ?? '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  async function guardar() {
    if (!titulo.trim() || !descripcion.trim() || !precio.trim()) return onError(t.faltan);
    setGuardando(true);
    const res = await guardarProductoAdmin(productoId, {
      titulo, titulo_en: tituloEn, descripcion, descripcion_en: descripcionEn, categoria,
      precio: precio.trim().replace(',', '.'), tipo, duracion,
    });
    setGuardando(false);
    if (res.error) return onError(res.error.message);
    onGuardado();
  }

  const categorias = [...new Set([...CATEGORIAS_PRODUCTO, ...(p?.categoria ? [p.categoria] : [])])];

  return (
    <AdminDrawer
      title={t.titulo}
      subtitle={p ? `${p.titulo} · ${p.clave}` : undefined}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">{t.cancelar}</button>
          <button onClick={() => void guardar()} disabled={guardando || !p} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft disabled:opacity-60">
            {guardando ? t.guardando : t.guardar}
          </button>
        </div>
      }
    >
      {!p ? (
        <p className="text-sm text-ink/50">{t.cargando}</p>
      ) : (
        <div className="space-y-4">
          <p className="rounded-2xl bg-brand-50 p-3 text-xs leading-5 text-ink/65">{t.ayuda}</p>
          <div>
            <label className={etiqueta}>{t.nombre}</label>
            <div className="grid gap-2">
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={t.es} className={`${campo} h-10`} />
              <input value={tituloEn} onChange={(e) => setTituloEn(e.target.value)} placeholder={t.en} className={`${campo} h-10`} />
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
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={`${campo} h-10`}>
                <option value="">—</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={etiqueta}>{t.precio}</label>
              <input type="number" min={0} step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={`${campo} h-10`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={etiqueta}>{t.tipo}</label>
              <select value={tipo} disabled={p.tieneArchivo} onChange={(e) => setTipo(e.target.value as 'video' | 'libro_pdf')} className={`${campo} h-10 disabled:bg-brand-50`}>
                <option value="libro_pdf">{t.libro}</option>
                <option value="video">{t.video}</option>
              </select>
            </div>
            {tipo === 'video' && (
              <div>
                <label className={etiqueta}>{t.duracion}</label>
                <input value={duracion} onChange={(e) => setDuracion(e.target.value)} placeholder="20:00" className={`${campo} h-10`} />
              </div>
            )}
          </div>
          {p.tieneArchivo && <p className="-mt-2 text-[11px] text-ink/45">{t.tipoBloqueado}</p>}
        </div>
      )}
    </AdminDrawer>
  );
}
