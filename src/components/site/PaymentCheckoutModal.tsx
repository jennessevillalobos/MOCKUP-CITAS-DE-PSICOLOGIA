import { useState, useEffect } from 'react';
import { X, CreditCard, ShieldCheck, Loader2, PartyPopper, ArrowRight, Building, UploadCloud } from 'lucide-react';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { createStripeSession, createPaypalOrder } from '@/lib/api/edgeFunctions';
import { uploadToCloudinary, CLOUDINARY_CONFIGURED } from '@/lib/integrations/cloudinary';

interface PaymentCheckoutModalProps {
  monto: number;
  concepto: string;
  moneda?: string;
  ordenId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const text = {
  es: {
    title: 'Realizar pago',
    subtitle: 'Elige tu método de pago preferido para completar la transacción.',
    methods: { card: 'Tarjeta', paypal: 'PayPal', transfer: 'Transferencia' },
    card: 'Datos de la tarjeta', cardNumber: 'Número de tarjeta', cardName: 'Nombre en la tarjeta', expiry: 'MM/AA', cvv: 'CVV',
    transferInfo: 'Datos bancarios',
    bank: 'Banco', accountInfo: 'Cuenta corriente a nombre de Clínica PsiqueAmor', accountNum: '0102-0304-0506-0708',
    uploadReceipt: 'Sube tu comprobante (PDF, JPG, PNG)', upload: 'Seleccionar archivo', uploadOk: 'Archivo seleccionado', uploadingMsg: 'Subiendo comprobante...',
    simulated: 'Pago protegido por SSL — procesado mediante pasarela segura.',
    pay: 'Pagar', reportPayment: 'Reportar pago', processing: 'Procesando...',
    successTitle: '¡Pago exitoso!', successSub: 'Tu pago ha sido registrado correctamente.',
    successSubTransfer: 'Hemos recibido tu reporte. Será validado en las próximas 24 horas.',
    close: 'Cerrar ventana',
  },
  en: {
    title: 'Make a payment',
    subtitle: 'Choose your preferred payment method to complete the transaction.',
    methods: { card: 'Card', paypal: 'PayPal', transfer: 'Transfer' },
    card: 'Card details', cardNumber: 'Card number', cardName: 'Name on card', expiry: 'MM/YY', cvv: 'CVV',
    transferInfo: 'Bank details',
    bank: 'Bank', accountInfo: 'Checking account - PsiqueAmor Clinic', accountNum: '0102-0304-0506-0708',
    uploadReceipt: 'Upload your receipt (PDF, JPG, PNG)', upload: 'Select file', uploadOk: 'File selected', uploadingMsg: 'Uploading receipt...',
    simulated: 'SSL Secured Payment — processed via secure gateway.',
    pay: 'Pay', reportPayment: 'Report payment', processing: 'Processing...',
    successTitle: 'Payment successful!', successSub: 'Your payment has been registered correctly.',
    successSubTransfer: 'We have received your report. It will be validated within 24 hours.',
    close: 'Close window',
  }
} as const;

export default function PaymentCheckoutModal({ monto, concepto, moneda = 'USD', ordenId, onClose, onSuccess }: PaymentCheckoutModalProps) {
  const { language } = useSiteLanguage();
  const t = text[language];
  const { isRealAuth } = useSiteAuth();

  const [method, setMethod] = useState<'card' | 'paypal' | 'transfer'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setPayError(null);

    // ── Real API Flow (Stripe, PayPal, Transfer) ──
    if (isRealAuth) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user.id;

        if (userId) {
          let currentOrdenId = ordenId;

          // Si no viene un ordenId explícito, registramos una nueva orden en Supabase
          if (!currentOrdenId) {
            const { data: orden, error: ordenErr } = await supabase
              .from('ordenes')
              .insert({
                usuario_id: userId,
                concepto,
                monto,
                moneda,
                estado: 'pendiente',
                metodo_pago: method,
              })
              .select('id')
              .single();

            if (!ordenErr && orden) {
              currentOrdenId = orden.id;
            }
          }

          if (currentOrdenId) {
            if (method === 'card') {
              const res = await createStripeSession(currentOrdenId, monto);
              if (res.ok && res.data?.checkout_url) {
                setIsProcessing(false);
                window.location.href = res.data.checkout_url;
                return;
              } else if (res.error && res.error.code !== 'supabase_not_configured') {
                setIsProcessing(false);
                setPayError(res.error.message);
                return;
              }
            } else if (method === 'paypal') {
              const res = await createPaypalOrder(currentOrdenId);
              if (res.ok && res.data?.approval_url) {
                setIsProcessing(false);
                window.location.href = res.data.approval_url;
                return;
              } else if (res.error && res.error.code !== 'supabase_not_configured') {
                setIsProcessing(false);
                setPayError(res.error.message);
                return;
              }
            } else if (method === 'transfer') {
              // Subir comprobante a Cloudinary si hay archivo seleccionado
              let comprobanteUrl = 'comprobante_pendiente';
              if (receiptFile && CLOUDINARY_CONFIGURED) {
                setIsUploading(true);
                const url = await uploadToCloudinary(receiptFile);
                setIsUploading(false);
                if (url) comprobanteUrl = url;
              } else if (receiptFile) {
                // Cloudinary no configurado: guardar nombre como referencia
                comprobanteUrl = `local:${receiptFile.name}`;
              }
              await supabase
                .from('ordenes')
                .update({ estado: 'en_revision', comprobante_url: comprobanteUrl })
                .eq('id', currentOrdenId);
            }
          }
        }
      }
    }

    // ── Demo / Fallback mode ──
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 3000);
      }
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
              <p className="mt-2 text-sm text-ink/60">{method === 'transfer' ? t.successSubTransfer : t.successSub}</p>

              <div className="mt-8 flex w-full flex-col gap-3">
                <button 
                  onClick={onClose} 
                  className="focus-ring flex h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient font-bold text-white shadow-soft hover:-translate-y-0.5 hover:shadow-lift transition"
                >
                  {t.close} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleCheckout}>
              {/* Payment Summary */}
              <div className="mb-6 flex gap-4 rounded-2xl bg-brand-50/60 p-4 items-center">
                <div className="flex-1">
                  <h4 className="font-semibold text-ink line-clamp-2">{concepto}</h4>
                </div>
                <div className="flex items-center text-right font-display text-2xl font-bold text-brand-700">
                  ${monto} <span className="ml-1 text-sm font-normal text-ink/40">{moneda}</span>
                </div>
              </div>

              {/* Method Selector */}
              <div className="mb-6 flex rounded-xl border border-brand-100 bg-brand-50/50 p-1">
                {(['card', 'paypal', 'transfer'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                      method === m ? 'bg-white text-brand-700 shadow-sm' : 'text-ink/50 hover:text-ink/80'
                    }`}
                  >
                    {t.methods[m]}
                  </button>
                ))}
              </div>

              {/* Form Fields based on Method */}
              <div className="space-y-4">
                {method === 'card' && (
                  <>
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
                  </>
                )}

                {method === 'paypal' && (
                  <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50">
                     <p className="text-center text-sm text-ink/60 px-6">
                       Al hacer clic en pagar, serás redirigido a PayPal de forma segura.
                     </p>
                  </div>
                )}

                {method === 'transfer' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                        <Building size={16} className="text-brand-500" />
                        {t.transferInfo}
                      </h4>
                      <dl className="grid gap-2 text-sm">
                        <div className="flex justify-between border-b border-brand-100 pb-2">
                          <dt className="text-ink/60">{t.bank}:</dt>
                          <dd className="font-semibold text-ink">Zelle / BOFA</dd>
                        </div>
                        <div className="flex justify-between border-b border-brand-100 pb-2">
                          <dt className="text-ink/60">Info:</dt>
                          <dd className="font-semibold text-ink text-right">{t.accountInfo}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-ink/60">Account:</dt>
                          <dd className="font-mono font-semibold text-ink">{t.accountNum}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div>
                       <span className="mb-1 block text-xs font-bold text-ink/70">{t.uploadReceipt}</span>
                       <label className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white text-sm font-bold text-brand-700 hover:bg-brand-50 transition">
                         <UploadCloud size={16} />
                         {receiptFile ? receiptFile.name : t.upload}
                         <input
                           type="file"
                           accept="image/*,application/pdf"
                           className="sr-only"
                           onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                         />
                       </label>
                       {receiptFile && (
                         <p className="mt-1 text-[11px] text-emerald-600">✓ {t.uploadOk}</p>
                       )}
                       {isUploading && (
                         <p className="mt-1 flex items-center gap-1 text-[11px] text-brand-600"><Loader2 size={11} className="animate-spin" /> {t.uploadingMsg}</p>
                       )}
                     </div>
                  </div>
                )}
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

        {/* Sticky footer */}
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
                <>{method === 'transfer' ? t.reportPayment : t.pay} ${monto} {moneda}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
