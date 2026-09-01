import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Download, PlayCircle, ShieldCheck, ShoppingCart } from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import ProductCheckoutModal from '@/components/site/ProductCheckoutModal';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { demoProductos } from '@/data/admin/digitalProductsData';

const text = {
  es: {
    back: 'Volver a la tienda',
    resource: 'Recurso digital',
    description: 'Descripción',
    delivery: 'Entrega y acceso',
    buy: 'Comprar ahora',
    category: 'Categoría',
    updated: 'Actualizado',
    protected: 'Compra protegida',
    protectedText: 'El acceso se habilita después de confirmar el pago.',
    streaming: 'Reproducción protegida dentro de tu cuenta',
    download: 'Enlace de descarga personal y temporal',
    noDownload: 'Contenido disponible para reproducción, sin descarga directa',
    downloads: 'descargas permitidas',
    notFound: 'Producto no encontrado',
    notFoundText: 'El recurso que buscas no está disponible o ya no está publicado.',
  },
  en: {
    back: 'Back to store',
    resource: 'Digital resource',
    description: 'Description',
    delivery: 'Delivery and access',
    buy: 'Buy now',
    category: 'Category',
    updated: 'Updated',
    protected: 'Protected purchase',
    protectedText: 'Access is enabled after payment confirmation.',
    streaming: 'Protected playback within your account',
    download: 'Personal and temporary download link',
    noDownload: 'Available for playback without direct download',
    downloads: 'downloads allowed',
    notFound: 'Product not found',
    notFoundText: 'The resource you are looking for is unavailable or no longer published.',
  },
} as const;

export default function DigitalProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useSiteLanguage();
  const t = text[language];
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const product = demoProductos.find((item) => item.id === id && item.estado === 'Publicado');

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteHeader />
        <main className="container-wide flex flex-1 flex-col items-center justify-center py-32 text-center">
          <h1 className="font-display text-3xl font-semibold text-ink">{t.notFound}</h1>
          <p className="mt-3 text-sm text-ink/60">{t.notFoundText}</p>
          <Link to="/tienda" className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-3 text-sm font-bold text-white">
            <ArrowLeft size={15} /> {t.back}
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const isBook = product.tipo === 'Libro';
  const ProductIcon = isBook ? BookOpen : PlayCircle;
  const deliveryText = isBook
    ? product.entrega.descargaPermitida
      ? `${t.download}${product.entrega.limiteDescargas ? ` · ${product.entrega.limiteDescargas} ${t.downloads}` : ''}`
      : t.noDownload
    : product.entrega.streamingProtegido ? t.streaming : t.noDownload;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1 pt-[82px] sm:pt-[86px]">
        <section className="relative overflow-hidden bg-mist-gradient py-12 sm:py-20">
          <div className="container-wide">
            <Link to="/tienda" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/55 hover:text-brand-600">
              <ArrowLeft size={15} /> {t.back}
            </Link>
            <div className="mt-10 grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
              <div className="relative grid min-h-[300px] place-items-center overflow-hidden rounded-[32px] bg-brand-50 shadow-soft sm:min-h-[390px]">
                <div className="absolute inset-0 bg-mist-gradient" />
                <ProductIcon size={104} strokeWidth={1.1} className={isBook ? 'relative text-brand-300' : 'relative text-lilac-300'} />
                <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">
                  {product.tipo}
                </span>
              </div>
              <div>
                <span className="eyebrow">{t.resource}</span>
                <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{product.titulo}</h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-ink/65">{product.descripcion}</p>
                <div className="mt-7 grid gap-3 text-sm text-ink/60 sm:grid-cols-2">
                  <span><strong className="font-semibold text-ink">{t.category}:</strong> {product.categoria}</span>
                  <span><strong className="font-semibold text-ink">{t.updated}:</strong> {product.actualizado}</span>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <span className="font-display text-3xl font-semibold text-brand-700">${product.precio} <span className="text-sm font-normal text-ink/45">{product.moneda}</span></span>
                  <button onClick={() => setCheckoutOpen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5">
                    <ShoppingCart size={16} /> {t.buy} <ArrowRight size={15} />
                  </button>
                </div>
                <div className="mt-7 flex items-start gap-3 rounded-2xl border border-brand-100 bg-white p-4 text-sm text-ink/60 shadow-sm">
                  <ShieldCheck size={19} className="mt-0.5 shrink-0 text-brand-500" />
                  <div><p className="font-semibold text-ink">{t.protected}</p><p className="mt-1">{t.protectedText}</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-wide grid gap-6 py-16 sm:py-24 lg:grid-cols-[1fr_.8fr]">
          <article className="rounded-3xl border border-brand-100 bg-white p-7 shadow-soft sm:p-10">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.description}</h2>
            <p className="mt-5 text-base leading-8 text-ink/65">{product.descripcion}</p>
          </article>
          <article className="rounded-3xl border border-brand-100 bg-brand-50/60 p-7 sm:p-10">
            <h2 className="font-display text-2xl font-semibold text-ink">{t.delivery}</h2>
            <div className="mt-6 flex items-start gap-3 text-sm leading-6 text-ink/65">
              {isBook ? <Download size={18} className="mt-1 shrink-0 text-brand-600" /> : <PlayCircle size={18} className="mt-1 shrink-0 text-brand-600" />}
              <span>{deliveryText}</span>
            </div>
            <div className="mt-5 flex items-start gap-3 text-sm leading-6 text-ink/65">
              <Check size={18} className="mt-1 shrink-0 text-emerald-600" />
              <span>{t.protectedText}</span>
            </div>
          </article>
        </section>
      </main>
      <SiteFooter />
      {checkoutOpen && <ProductCheckoutModal product={product} onClose={() => setCheckoutOpen(false)} />}
    </div>
  );
}
