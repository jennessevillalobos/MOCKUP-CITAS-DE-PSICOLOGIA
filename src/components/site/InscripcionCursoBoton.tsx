import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PaymentCheckoutModal from '@/components/site/PaymentCheckoutModal';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { estadoInscripcion, inscribirseGratis, type EstadoInscripcion } from '@/lib/api/cursosEstudiante';

// Botón "Inscribirme" de la página pública de un curso.
// Modo demo: lleva a iniciar sesión (como antes). Con Supabase: consulta el
// estado real (curso inexistente, sin sesión, inscrito, pago en revisión,
// gratis o de pago) y abre el pago por transferencia cuando corresponde.

const text = {
  es: {
    proximamente: 'Inscripciones próximamente', irAlCurso: 'Ir al curso', enRevision: 'Pago en revisión',
    enRevisionDetalle: 'Tu profesional revisará la transferencia; al aprobarla tendrás acceso.',
    gratis: 'Inscribirme gratis', inscribiendo: 'Inscribiendo…', cargando: 'Cargando…',
    saldoPendiente: 'Te falta pagar', inicia: 'Inicia sesión para inscribirte',
  },
  en: {
    proximamente: 'Enrollment coming soon', irAlCurso: 'Go to course', enRevision: 'Payment under review',
    enRevisionDetalle: 'Your professional will review the transfer; once approved you will get access.',
    gratis: 'Enroll for free', inscribiendo: 'Enrolling…', cargando: 'Loading…',
    saldoPendiente: 'Remaining to pay', inicia: 'Sign in to enroll',
  },
} as const;

// La página del curso muestra el botón dos veces: tras un cambio, todas las
// instancias del mismo curso vuelven a consultar el estado.
const EVENTO_CAMBIO = 'psique:inscripcion-actualizada';
function avisarCambio(slug: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO, { detail: slug }));
}

interface Props {
  slug: string;
  className: string;
  // Contenido del botón en el caso normal ("Inscribirme ahora").
  children: ReactNode;
}

export default function InscripcionCursoBoton({ slug, className, children }: Props) {
  const { isRealAuth, esSesionReal, user } = useSiteAuth();
  const { language } = useSiteLanguage();
  const t = text[language];
  const navigate = useNavigate();

  // undefined = cargando; null = el curso no existe en la base.
  const [estado, setEstado] = useState<EstadoInscripcion | null | undefined>(undefined);
  const [pagando, setPagando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    const res = await estadoInscripcion(slug);
    setEstado(res.error ? null : res.data);
  }, [slug]);

  useEffect(() => {
    if (isRealAuth) void recargar();
  }, [isRealAuth, esSesionReal, recargar]);

  useEffect(() => {
    const alCambiar = (e: Event) => {
      if ((e as CustomEvent<string>).detail === slug) void recargar();
    };
    window.addEventListener(EVENTO_CAMBIO, alCambiar);
    return () => window.removeEventListener(EVENTO_CAMBIO, alCambiar);
  }, [slug, recargar]);

  const loginConVuelta = `/iniciar-sesion?volver=${encodeURIComponent(`/cursos/${slug}`)}`;

  if (!isRealAuth) {
    return <Link to="/iniciar-sesion" className={className}>{children}</Link>;
  }
  if (estado === undefined) {
    return <span className={`${className} cursor-wait opacity-70`}>{t.cargando}</span>;
  }
  if (estado === null) {
    return <span className={`${className} cursor-not-allowed opacity-60`}>{t.proximamente}</span>;
  }
  if (!user || !esSesionReal) {
    return <Link to={loginConVuelta} className={className} title={t.inicia}>{children}</Link>;
  }
  if (estado.inscrito) {
    return <Link to="/aula-virtual" className={className}>{t.irAlCurso}</Link>;
  }

  const saldo = Math.max(0, estado.precio - estado.pagado - estado.enRevision);
  if (estado.precio > 0 && saldo <= 0) {
    return (
      <div>
        <span className={`${className} cursor-default opacity-80`}>{t.enRevision}</span>
        <p className="mt-2 text-center text-xs text-ink/55">{t.enRevisionDetalle}</p>
      </div>
    );
  }

  async function inscribirGratis(cursoId: number) {
    setOcupado(true);
    setError(null);
    const res = await inscribirseGratis(cursoId);
    setOcupado(false);
    if (res.error) return setError(res.error.message);
    avisarCambio(slug);
    navigate('/aula-virtual');
  }

  return (
    <div>
      {estado.precio === 0 ? (
        <button type="button" disabled={ocupado} onClick={() => void inscribirGratis(estado.cursoId)} className={className}>
          {ocupado ? t.inscribiendo : t.gratis}
        </button>
      ) : (
        <button type="button" onClick={() => setPagando(true)} className={className}>
          {children}
        </button>
      )}
      {estado.pagado + estado.enRevision > 0 && saldo > 0 && (
        <p className="mt-2 text-center text-xs text-ink/55">{t.saldoPendiente}: USD ${saldo}</p>
      )}
      {error && <p role="alert" className="mt-2 text-center text-xs text-rose-600">{error}</p>}
      {pagando && (
        <PaymentCheckoutModal
          monto={saldo}
          concepto={estado.nombre}
          cursoId={estado.cursoId}
          onClose={() => setPagando(false)}
          onSuccess={() => {
            setPagando(false);
            avisarCambio(slug);
          }}
        />
      )}
    </div>
  );
}
