import { useEffect, useState } from 'react';
import { contactConfig } from '@/config/contact';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export type ContactoSitio = typeof contactConfig;

// Datos de contacto del sitio. Con Supabase salen de `configuracion_sitio`
// (los edita el admin en Configuración → General, migración 049); mientras
// cargan, o sin Supabase, se usa src/config/contact.ts. Se piden una sola vez
// por visita y se recuerdan en localStorage para no mostrar el relleno.
const CLAVE_LOCAL = 'psiqueContacto';
let cache: ContactoSitio | null = null;
let pedido: Promise<ContactoSitio> | null = null;

function leerLocal(): ContactoSitio | null {
  try {
    const raw = localStorage.getItem(CLAVE_LOCAL);
    return raw ? { ...contactConfig, ...(JSON.parse(raw) as Partial<ContactoSitio>) } : null;
  } catch {
    return null;
  }
}

async function pedirContacto(): Promise<ContactoSitio> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return contactConfig;
  const { data } = await supabase.from('configuracion_sitio').select('valor').eq('clave', 'contacto').maybeSingle();
  const valor = { ...contactConfig, ...((data?.valor as Partial<ContactoSitio> | undefined) ?? {}) };
  try {
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(valor));
  } catch {
    // sin localStorage: solo en memoria
  }
  return valor;
}

// Tras guardar en el admin: descarta lo recordado y avisa a quien esté usando el hook.
export function refrescarContacto() {
  cache = null;
  pedido = null;
  try {
    localStorage.removeItem(CLAVE_LOCAL);
  } catch {
    // sin localStorage
  }
  window.dispatchEvent(new Event('contacto-actualizado'));
}

export function useContacto(): ContactoSitio {
  const [contacto, setContacto] = useState<ContactoSitio>(() => cache ?? leerLocal() ?? contactConfig);

  useEffect(() => {
    let vigente = true;
    const cargar = () => {
      if (cache) return setContacto(cache);
      pedido ??= pedirContacto();
      void pedido.then((c) => {
        cache = c;
        if (vigente) setContacto(c);
      });
    };
    cargar();
    window.addEventListener('contacto-actualizado', cargar);
    return () => {
      vigente = false;
      window.removeEventListener('contacto-actualizado', cargar);
    };
  }, []);

  return contacto;
}
