import { useState, useEffect } from 'react';
import { X, CreditCard, ShieldCheck, Loader2, PartyPopper, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { createStripeSession } from '@/lib/api/edgeFunctions';
import { ProductoDigitalRecord } from '@/data/admin/digitalProductsData';

interface ProductCheckoutModalProps {
  product: ProductoDigitalRecord;
  onClose: () => void;
}

const text = {
  es: {
    title: 'Comprar recurso',
    subtitle: 'Completa tu información para acceder al material.',
    name: 'Nombre completo', email: 'Correo electrónico',
    card: 'Datos de la tarjeta', cardNumber: 'Número de tarjeta', cardName: 'Nombre en la tarjeta', expiry: 'MM/AA', cvv: 'CVV',
    simulated: 'Pago simulado — esta demo aún no tiene backend, no se realiza ningún cargo real.',
    pay: 'Pagar', processing: 'Procesando...',
    successTitle: '¡Compra exitosa!', successSub: 'Tu recurso ya está disponible en tu Biblioteca.',
    goToLibrary: 'Ir a mi Biblioteca', backToStore: 'Volver a la tienda',
    total: 'Total a pagar',
  },
  en: {
    title: 'Buy resource',
    subtitle: 'Complete your information to access the material.',
    name: 'Full name', email: 'Email address',
    card: 'Card details', cardNumber: 'Card number', cardName: 'Name on card', expiry: 'MM/YY', cvv: 'CVV',
    simulated: 'Simulated payment — this demo has no backend yet, no real charge is made.',
    pay: 'Pay', processing: 'Processing...',
    successTitle: 'Successful purchase!', successSub: 'Your resource is now available in your Library.',
    goToLibrary: 'Go to my Library', backToStore: 'Back to store',
    total: 'Total due',
  }
} as const;

export default function ProductCheckoutModal({ product, onClose }: ProductCheckoutModalProps) {
  const { language } = useSiteLanguage();
  const t = text[language];
  const navigate = useNavigate();
  const { isRealAuth } = useSiteAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setPayError(null);

    // ── Ruta real: crear orden en Supabase, luego iniciar Stripe Checkout ──
    if (isRealAuth) {
      const supabase = getSupabaseClient();
      if (supabase) {
        // 1. Crear la orden en la tabla `ordenes`
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user.id;
        if (userId) {
          const { data: orden, error: ordenErr } = await supabase
            .from('ordenes')
            .insert({
              usuario_id: userId,
              concepto: product.titulo,
              tipo_producto: 'producto_digital',
              producto_id: String(product.id),
              monto: product.precio,
              moneda: product.moneda ?? 'USD',
            })
            .select('id')
            .single();

          if (ordenErr || !orden) {
            setPayError(language === 'es' ? 'No se pudo crear la orden.' : 'Could not create the order.');
            setIsProcessing(false);
            return;
          }

          // 2. Iniciar sesión de pago con Stripe
          const res = await createStripeSession(orden.id);
          setIsProcessing(false);
          if (res.data?.checkout_url) {
            window.location.href = res.data.checkout_url;
            return;
          } else {
            // Stripe no configurado o error: caer al modo demo
            setIsSuccess(true);
            return;
          }
        }
      }
    }

    // ── Ruta demo: sin Supabase o sin Stripe ──
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative flex w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-100 bg-brand-50/50 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">{isSuccess ? t.successTitle : t.title}</h2>
          {!isProcessing && !isSuccess && (
            <button onClick={onClose} className="rounded-full p-2 text-ink/40 transition hover:bg-white hover:text-ink">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {isSuccess ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <PartyPopper size={36} />
              </div>
              <h3 className="font-display text-2xl font-bold text-ink">{t.successTitle}</h3>
              <p className="mt-2 text-sm text-ink/60">{t.successSub}</p>

              <div className="mt-8 flex w-full flex-col gap-3">
                <button 
                  onClick={() => navigate('/aula-virtual/biblioteca')} 
                  className="focus-ring flex h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient font-bold text-white shadow-soft hover:-translate-y-0.5 hover:shadow-lift transition"
                >
                  {t.goToLibrary} <ArrowRight size={16} />
                </button>
                <button 
                  onClick={onClose}
                  className="flex h-12 items-center justify-center rounded-full border border-brand-200 bg-white font-bold text-brand-700 transition hover:bg-brand-50"
                >
                  {t.backToStore}
                </button>
              </div>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleCheckout}>
              {/* Product Summary */}
              <div className="mb-6 flex gap-4 rounded-2xl bg-brand-50/60 p-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                   {/* Aspect ratio placeholder or icon */}
                   <span className="text-2xl">📦</span>
                </div>
                <div className="flex flex-1 flex-col justify-center">
                  <h4 className="font-semibold text-ink line-clamp-1">{product.titulo}</h4>
                  <p className="text-xs text-ink/50">{product.tipo} • {product.categoria}</p>
                </div>
                <div className="flex items-center text-right font-display text-lg font-bold text-brand-700">
                  ${product.precio} <span className="ml-1 text-xs font-normal text-ink/40">{product.moneda}</span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink/70">{t.name}</span>
                    <input required className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink/70">{t.email}</span>
                    <input required type="email" className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                  </label>
                </div>
                
                <hr className="my-4 border-brand-100" />

                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                  <CreditCard size={16} className="text-brand-500" />
                  {t.card}
                </h4>
                
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-ink/70">{t.cardNumber}</span>
                  <input required maxLength={19} placeholder="4242 4242 4242 4242" className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 font-mono text-sm tracking-wide text-ink outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-ink/70">{t.cardName}</span>
                  <input required className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink/70">{t.expiry}</span>
                    <input required placeholder="MM/AA" maxLength={5} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink/70">{t.cvv}</span>
                    <input required maxLength={4} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                  </label>
                </div>
              </div>

              {payError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                  <span>⚠️</span>
                  <span>{payError}</span>
                </div>
              )}
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs leading-5 text-ink/60">
                <ShieldCheck size={16} className="shrink-0 text-brand-400" />
                <p>{t.simulated}</p>
              </div>
            </form>
          )}
        </div>

        {/* Sticky footer — botón de pago siempre visible */}
        {!isSuccess && (
          <div className="shrink-0 border-t border-brand-100 bg-white px-5 py-4 sm:px-6">
            <button
              type="submit"
              form="checkout-form"
              disabled={isProcessing}
              className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isProcessing ? (
                <><Loader2 size={18} className="animate-spin" /> {t.processing}</>
              ) : (
                <>{t.pay} ${product.precio} {product.moneda} <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
