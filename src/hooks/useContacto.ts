import { useEffect, useState } from 'react';
import { contactConfig } from '@/config/contact';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

// Configuración del sitio que edita el admin (tabla `configuracion_sitio`):
// datos de contacto (049) y datos bancarios para transferencias (051). Con
// Supabase se leen de la base una vez por visita y se recuerdan en
// localStorage para no mostrar el relleno; sin Supabase se usan los valores
// por defecto del código.

export type ContactoSitio = typeof contactConfig;

export interface DatosTransferencia {
  banco: string;
  titular: string;
  numero: string;
  // Otros métodos o instrucciones (pago móvil, Zelle…), texto libre.
  adicional: string;
}

export const TRANSFERENCIA_POR_DEFECTO: DatosTransferencia = {
  banco: 'Zelle / BOFA',
  titular: 'Clínica PsiqueAmor',
  numero: '0102-0304-0506-0708',
  adicional: '',
};

const cache: Record<string, unknown> = {};
const pedidos: Record<string, Promise<unknown> | undefined> = {};
const claveLocal = (clave: string) => `psiqueConfig_${clave}`;

function leerLocal<T>(clave: string, porDefecto: T): T | null {
  try {
    const raw = localStorage.getItem(claveLocal(clave));
    return raw ? { ...porDefecto, ...(JSON.parse(raw) as Partial<T>) } : null;
  } catch {
    return null;
  }
}

async function pedir<T>(clave: string, porDefecto: T): Promise<T> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return porDefecto;
  const { data } = await supabase.from('configuracion_sitio').select('valor').eq('clave', clave).maybeSingle();
  const valor = { ...porDefecto, ...((data?.valor as Partial<T> | undefined) ?? {}) };
  try {
    localStorage.setItem(claveLocal(clave), JSON.stringify(valor));
  } catch {
    // sin localStorage: solo en memoria
  }
  return valor;
}

// Tras guardar en el admin: descarta lo recordado y avisa a quien use el hook.
export function refrescarConfiguracion(clave: string) {
  delete cache[clave];
  delete pedidos[clave];
  try {
    localStorage.removeItem(claveLocal(clave));
  } catch {
    // sin localStorage
  }
  window.dispatchEvent(new CustomEvent('configuracion-actualizada', { detail: clave }));
}

export const refrescarContacto = () => refrescarConfiguracion('contacto');

function useConfiguracion<T>(clave: string, porDefecto: T): T {
  const [valor, setValor] = useState<T>(() => (cache[clave] as T | undefined) ?? leerLocal(clave, porDefecto) ?? porDefecto);

  useEffect(() => {
    let vigente = true;
    const cargar = () => {
      if (cache[clave]) return setValor(cache[clave] as T);
      pedidos[clave] ??= pedir(clave, porDefecto);
      void (pedidos[clave] as Promise<T>).then((v) => {
        cache[clave] = v;
        if (vigente) setValor(v);
      });
    };
    const alActualizar = (e: Event) => {
      if ((e as CustomEvent<string>).detail === clave) cargar();
    };
    cargar();
    window.addEventListener('configuracion-actualizada', alActualizar);
    return () => {
      vigente = false;
      window.removeEventListener('configuracion-actualizada', alActualizar);
    };
    // porDefecto es una constante del módulo en cada uso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  return valor;
}

export function useContacto(): ContactoSitio {
  return useConfiguracion('contacto', contactConfig);
}

export function useDatosTransferencia(): DatosTransferencia {
  return useConfiguracion('transferencia', TRANSFERENCIA_POR_DEFECTO);
}
