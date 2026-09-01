import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSiteAuth, type SiteRole } from '@/context/SiteAuthContext';

// Protege /portal-paciente e /instructor. Si no hay sesión, manda a
// /iniciar-sesion. Si hay sesión pero es del otro rol (p. ej. un paciente
// entrando a /instructor por URL directa), lo redirige a su propio portal
// en vez de mostrarle un panel que no le corresponde.
export default function ProtectedSiteRoute({ rol, children }: { rol: SiteRole; children: ReactNode }) {
  const { user } = useSiteAuth();

  if (!user) return <Navigate to="/iniciar-sesion" replace />;

  if (user.rol !== rol) {
    const destino = user.rol === 'paciente' ? '/portal-paciente' : '/instructor';
    return <Navigate to={destino} replace />;
  }

  return <>{children}</>;
}
