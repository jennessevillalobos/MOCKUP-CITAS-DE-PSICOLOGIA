import { useEffect, useState } from 'react';
import { SERVICIOS_PUBLICOS, type ServicioPublico, type CategoriaServicio } from '@/data/servicesPageData';
import { SEDES, type Sede } from '@/data/contactPageData';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

// Servicios y sedes del sitio. Con Supabase la base decide cuáles se muestran
// y sus textos, precio y duración (el admin los edita — migración 057); el
// catálogo del código aporta el ícono, el color y la imagen de los servicios
// iniciales. Sin Supabase: el catálogo del código.

const CATEGORIAS: CategoriaServicio[] = ['individual', 'pareja', 'infantil', 'orientacion'];
const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

// Caché por visita, compartida entre páginas.
function crearCatalogo<T>(fallback: T[], cargar: () => Promise<T[] | null>) {
  let cache: T[] | null = null;
  let pedido: Promise<T[] | null> | null = null;
  return function useCatalogo() {
    const real = isSupabaseConfigured();
    const [lista, setLista] = useState<T[]>(() => cache ?? fallback);
    const [cargando, setCargando] = useState(real && !cache);
    useEffect(() => {
      if (!real || cache) return;
      let vigente = true;
      pedido ??= cargar();
      void pedido.then((datos) => {
        if (datos) cache = datos;
        else pedido = null;
        if (!vigente) return;
        if (datos) setLista(datos);
        setCargando(false);
      });
      return () => {
        vigente = false;
      };
    }, [real]);
    return { lista, cargando };
  };
}

const useServicios = crearCatalogo<ServicioPublico>(SERVICIOS_PUBLICOS, async () => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('servicios')
    .select('id, nombre, categoria, descripcion, slug, imagen, textos, servicio_modalidad(modalidad_id, duracion_minutos, precio)')
    .eq('estado', 'activo')
    .order('id');
  if (error || !data) return null;
  return data.map((s) => {
    const local = SERVICIOS_PUBLICOS.find((l) => l.key === s.slug);
    const categoria = CATEGORIAS.includes(s.categoria as CategoriaServicio) ? (s.categoria as CategoriaServicio) : 'individual';
    const estilo = local ?? SERVICIOS_PUBLICOS.find((l) => l.categoria === categoria) ?? SERVICIOS_PUBLICOS[0];
    const t = (s.textos ?? {}) as Record<string, unknown>;
    const tarifa = [...(s.servicio_modalidad ?? [])].sort((a, b) => a.modalidad_id - b.modalidad_id)[0];
    const nombreEs = texto(s.nombre) ?? local?.titulo.es ?? 'Servicio';
    const descripcionEs = texto(s.descripcion) ?? local?.descripcion.es ?? '';
    const modalidadEs = texto(t.modalidad_es) ?? local?.modalidad.es ?? 'En línea / Presencial';
    return {
      key: s.slug,
      categoria,
      icon: estilo.icon,
      colorClases: estilo.colorClases,
      imagen: texto(s.imagen) ?? local?.imagen ?? estilo.imagen,
      imagenPosicion: local?.imagenPosicion,
      titulo: { es: nombreEs, en: texto(t.nombre_en) ?? local?.titulo.en ?? nombreEs },
      descripcion: { es: descripcionEs, en: texto(t.descripcion_en) ?? local?.descripcion.en ?? descripcionEs },
      duracionMin: tarifa?.duracion_minutos ?? local?.duracionMin ?? 50,
      precio: tarifa ? tarifa.precio / 100 : local?.precio ?? 0,
      modalidad: { es: modalidadEs, en: texto(t.modalidad_en) ?? local?.modalidad.en ?? modalidadEs },
    } satisfies ServicioPublico;
  });
});

const useSedes = crearCatalogo<Sede>(SEDES, async () => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('lugares')
    .select('slug, nombre, direccion, direccion_en, ciudad, mapa_url')
    .eq('estado', 'activo')
    .order('id');
  if (error || !data) return null;
  return data
    .filter((l) => l.slug)
    .map((l) => {
      const local = SEDES.find((s) => s.key === l.slug);
      const direccionEs = texto(l.direccion) ?? local?.direccion.es ?? '';
      return {
        key: l.slug as string,
        nombre: texto(l.nombre) ?? local?.nombre ?? 'Sede',
        direccion: { es: direccionEs, en: texto(l.direccion_en) ?? local?.direccion.en ?? direccionEs },
        mapaUrl: texto(l.mapa_url),
      };
    });
});

export function useServiciosPublicos() {
  const { lista, cargando } = useServicios();
  return { servicios: lista, cargando };
}

export function useSedesPublicas() {
  const { lista, cargando } = useSedes();
  return { sedes: lista, cargando };
}
