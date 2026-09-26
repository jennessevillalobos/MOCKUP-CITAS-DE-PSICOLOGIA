import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import PaymentCheckoutModal from '@/components/site/PaymentCheckoutModal';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { estadoCompraProducto, type EstadoCompraProducto } from '@/lib/api/productosEstudiante';
import type { ProductoDigitalRecord } from '@/data/admin/digitalProductsData';

// Compra de un producto de la Tienda con Supabase: consulta el estado real
// (no disponible, sin sesión, ya comprado, pago en revisión) y, si toca,
// abre el pago por transferencia que aprueba la profesional dueña.

const text = {
  es: {
    cargando: 'Cargando…', noDisponible: 'Este producto todavía no está a la venta.',
    inicia: 'Inicia sesión para comprar este recurso.', iniciarSesion: 'Iniciar sesión',
    yaEsTuyo: 'Ya compraste este recurso.', irBiblioteca: 'Ir a mi Biblioteca',
    enRevision: 'Tu pago está en revisión. Cuando la profesional lo apruebe, el recurso aparecerá en tu Biblioteca.',
    cerrar: 'Cerrar',
  },
  en: {
    cargando: 'Loading…', noDisponible: 'This product is not for sale yet.',
    inicia: 'Sign in to buy this resource.', iniciarSesion: 'Sign in',
    yaEsTuyo: 'You already bought this resource.', irBiblioteca: 'Go to my Library',
    enRevision: 'Your payment is under review. Once approved, the resource will appear in your Library.',
    cerrar: 'Close',
  },
} as const;

export default function CompraProductoReal({ product, onClose }: { product: ProductoDigitalRecord; onClose: () => void }) {
  const { user, esSesionReal } = useSiteAuth();
  const { language } = useSiteLanguage();
  const t = text[language];
  // undefined = cargando; null = no está a la venta.
  const [estado, setEstado] = useState<EstadoCompraProducto | null | undefined>(undefined);

  useEffect(() => {
    void estadoCompraProducto(product.id).then((res) => setEstado(res.error ? null : res.data));
  }, [product.id, esSesionReal]);

  const saldo = estado ? Math.max(0, estado.precio - estado.pagado - estado.enRevision) : 0;

  if (estado && user && esSesionReal && !estado.comprado && saldo > 0) {
    return (
      <PaymentCheckoutModal
        monto={saldo}
        concepto={estado.titulo}
        productoId={estado.productoId}
        onClose={onClose}
        onSuccess={onClose}
      />
    );
  }

  let cuerpo: React.ReactNode;
  if (estado === undefined) cuerpo = <p>{t.cargando}</p>;
  else if (estado === null) cuerpo = <p>{t.noDisponible}</p>;
  else if (!user || !esSesionReal) {
    cuerpo = (
      <>
        <p className="mb-4">{t.inicia}</p>
        <Link to={`/iniciar-sesion?volver=${encodeURIComponent(`/tienda/${product.id}`)}`} className="inline-block rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white">{t.iniciarSesion}</Link>
      </>
    );
  } else if (estado.comprado) {
    cuerpo = (
      <>
        <p className="mb-4">{t.yaEsTuyo}</p>
        <Link to="/aula-virtual/biblioteca" className="inline-block rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white">{t.irBiblioteca}</Link>
      </>
    );
  } else {
    cuerpo = <p>{t.enRevision}</p>;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center text-sm text-ink/70 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label={t.cerrar} className="absolute right-3 top-3 rounded-full p-2 text-ink/40 hover:bg-brand-50 hover:text-ink">
          <X size={18} />
        </button>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">{product.titulo}</h2>
        {cuerpo}
      </div>
    </div>
  );
}
