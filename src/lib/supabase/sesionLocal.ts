import { isSupabaseConfigured } from '@/lib/supabase/client';

// ¿Hay probablemente una sesión real de profesional? Se decide al instante
// con lo que guarda el navegador (token de Supabase Auth + rol de la sesión
// del sitio), sin esperar a la base. Los Contexts del panel del instructor lo
// usan para arrancar vacíos y "cargando" en vez de mostrar unos segundos los
// datos de demostración; si al validar resulta que no, vuelven al demo.
export function sesionProfesionalProbable(): boolean {
  if (!isSupabaseConfigured()) return false;
  try {
    const hayToken = Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    const rol = (JSON.parse(localStorage.getItem('psiqueUser') ?? 'null') as { rol?: string } | null)?.rol;
    return hayToken && rol === 'profesional';
  } catch {
    return false;
  }
}
