import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { cargarAcademiaAdmin, type AcademiaAdmin } from '@/lib/api/admin';

// Datos reales de la academia para el panel admin (Cursos, Evaluaciones,
// Clases en vivo y Productos). Sin Supabase, `datos` queda en null y cada
// página sigue con su demo.
export function useAcademiaAdmin() {
  const { esReal } = useAdminAuth();
  const [datos, setDatos] = useState<AcademiaAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(esReal);

  const recargar = useCallback(async () => {
    if (!esReal) return;
    const res = await cargarAcademiaAdmin();
    setCargando(false);
    if (res.error) setError(res.error.message);
    else {
      setError(null);
      setDatos(res.data);
    }
  }, [esReal]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  // Aviso flotante tras una acción.
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const mostrarAviso = useCallback((texto: string, esError = false) => {
    setAviso({ texto, error: esError });
    window.setTimeout(() => setAviso(null), 4000);
  }, []);

  return { esReal, datos, error, cargando, recargar, aviso, mostrarAviso };
}

export function fechaCortaLocal(iso: string) {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
