import { useMemo, useState } from 'react';
import { Search, BookText, PlayCircle, ShoppingCart, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { demoProductos, CATEGORIAS_PRODUCTO, ProductoDigitalRecord } from '@/data/admin/digitalProductsData';
import ProductCheckoutModal from '@/components/site/ProductCheckoutModal';

const text = {
  es: {
    breadcrumbHome: 'Inicio', breadcrumbCurrent: 'Tienda',
    title: 'Recursos digitales', subtitle: 'Libros y videos diseñados para acompañarte en tu proceso de bienestar emocional.',
    searchPlaceholder: 'Buscar recursos...',
    all: 'Todos', books: 'Libros', videos: 'Videos',
    buyNow: 'Comprar ahora',
    price: 'Precio',
    noResults: 'No encontramos recursos que coincidan con tu búsqueda.',
    categories: 'Categorías',
  },
  en: {
    breadcrumbHome: 'Home', breadcrumbCurrent: 'Store',
    title: 'Digital Resources', subtitle: 'Books and videos designed to accompany you in your emotional wellbeing process.',
    searchPlaceholder: 'Search resources...',
    all: 'All', books: 'Books', videos: 'Videos',
    buyNow: 'Buy now',
    price: 'Price',
    noResults: 'We found no resources matching your search.',
    categories: 'Categories',
  },
} as const;

export default function StorePage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const [selectedProduct, setSelectedProduct] = useState<ProductoDigitalRecord | null>(null);

  const [buscar, setBuscar] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Libro' | 'Video'>('Todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas');

  const productosPublicados = useMemo(() => demoProductos.filter((p) => p.estado === 'Publicado'), []);

  const productosFiltrados = useMemo(() => {
    return productosPublicados.filter((p) => {
      const matchTexto = p.titulo.toLowerCase().includes(buscar.toLowerCase()) || p.descripcion.toLowerCase().includes(buscar.toLowerCase());
      const matchTipo = filtroTipo === 'Todos' || p.tipo === filtroTipo;
      const matchCat = filtroCategoria === 'Todas' || p.categoria === filtroCategoria;
      return matchTexto && matchTipo && matchCat;
    });
  }, [productosPublicados, buscar, filtroTipo, filtroCategoria]);

  return (
    <div className="overflow-hidden bg-white">
      <SiteHeader />

      <main className="pt-[82px] sm:pt-[86px]">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden bg-brand-gradient py-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className="pointer-events-none absolute -right-32 top-0 -z-10 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-[-120px] -z-10 h-[360px] w-[360px] rounded-full bg-brand-300/20 blur-3xl" />
          
          <div className="container-wide text-center">
            <nav className="mb-4 text-sm text-white/70">
              <a href="/" className="hover:text-white">{t.breadcrumbHome}</a>
              <span className="mx-1.5">/</span>
              <span className="font-semibold text-white">{t.breadcrumbCurrent}</span>
            </nav>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{t.title}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">{t.subtitle}</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="container-wide py-12">
          {/* Filters Bar */}
          <div className="mb-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft sm:flex-row sm:px-5 sm:py-3">
            
            <div className="flex w-full items-center gap-1 rounded-2xl bg-brand-50/50 p-1 sm:w-auto">
              {(['Todos', 'Libro', 'Video'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                    filtroTipo === tipo ? 'bg-white text-brand-700 shadow-sm' : 'text-ink/60 hover:text-brand-600'
                  }`}
                >
                  {tipo === 'Todos' ? t.all : tipo === 'Libro' ? t.books : t.videos}
                </button>
              ))}
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex h-10 w-full items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3 sm:w-64">
                <Search size={16} className="text-ink/40" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
                />
              </div>
              
              <div className="flex h-10 w-full items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3 sm:w-auto">
                <Filter size={16} className="text-ink/40" />
                <select 
                  value={filtroCategoria} 
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full bg-transparent text-sm text-ink outline-none"
                >
                  <option value="Todas">{t.categories} ({t.all})</option>
                  {CATEGORIAS_PRODUCTO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Grid de Productos */}
          {productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-brand-200 bg-brand-50/30 py-20 text-center">
              <ShoppingCart size={40} className="mb-4 text-brand-200" />
              <p className="text-lg font-medium text-ink/70">{t.noResults}</p>
              <button 
                onClick={() => { setBuscar(''); setFiltroTipo('Todos'); setFiltroCategoria('Todas'); }}
                className="mt-4 text-sm font-semibold text-brand-600 hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {productosFiltrados.map((p) => (
                <article key={p.id} className="group relative flex flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
                  
                  {/* Aspect Ratio 4:3 para la portada */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-50">
                    <div className="absolute inset-0 flex items-center justify-center bg-mist-gradient">
                      {p.tipo === 'Libro' ? <BookText size={48} className="text-brand-300 transition-transform group-hover:scale-110" /> : <PlayCircle size={48} className="text-lilac-300 transition-transform group-hover:scale-110" />}
                    </div>
                    {/* Badge de tipo */}
                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 backdrop-blur">
                      {p.tipo === 'Libro' ? <BookText size={12} /> : <PlayCircle size={12} />}
                      {p.tipo === 'Libro' ? t.books : t.videos}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600">{p.categoria}</span>
                    </div>
                    <Link to={`/tienda/${p.id}`} className="font-display text-lg font-semibold text-ink line-clamp-1 hover:text-brand-600">{p.titulo}</Link>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-ink/60 line-clamp-2">{p.descripcion}</p>
                    
                    <div className="mt-5 flex items-center justify-between border-t border-brand-50 pt-4">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/40 block">{t.price}</span>
                        <span className="font-display text-xl font-bold text-ink">${p.precio} <span className="text-xs font-normal text-ink/50">{p.moneda}</span></span>
                      </div>
                      
                      <button
                        onClick={() => setSelectedProduct(p)}
                        className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white shadow-soft transition-transform hover:scale-105 active:scale-95"
                      >
                        <ShoppingCart size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />

      {selectedProduct && (
        <ProductCheckoutModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
