import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';

// Cualquier ruta bajo /admin/* que no sea el login pasa por aquí. Si no hay
// sesión de administrador, redirige al formulario de acceso en vez de mostrar
// datos operativos a quien entre por URL directa. Con Supabase, espera a que
// se valide la sesión guardada (rol `administrador`) antes de decidir.
export default function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { user, verificando } = useAdminAuth();
  if (verificando) {
    return <div className="grid min-h-screen place-items-center bg-mist-gradient text-sm text-ink/50">Verificando acceso…</div>;
  }
  if (!user) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
