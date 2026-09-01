import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';

// Cualquier ruta bajo /admin/* que no sea el login pasa por aquí. Si no hay
// sesión activa, redirige al formulario de acceso en vez de mostrar datos
// operativos a quien entre por URL directa.
export default function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAdminAuth();
  if (!user) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
