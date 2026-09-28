import { useEffect, useState } from 'react';
import { PROFESIONALES_PUBLICOS, type ProfesionalPublico } from '@/data/professionalsPageData';
import { listProfesionalesPublicos } from '@/lib/api/catalog';
import { isSupabaseConfigured } from '@/lib/supabase/client';

// Profesionales del sitio (listado, perfil y /agendar). Con Supabase la base
// decide quiénes aparecen (fichas activas, que crea el admin — migración 055)
// y sus textos; el catálogo del código completa lo que la ficha no tenga
// (fotos y textos de las 6 profesionales iniciales). Sin Supabase: el catálogo.

const FOTO_POR_DEFECTO = PROFESIONALES_PUBLICOS[0].image;

let cache: ProfesionalPublico[] | null = null;
let pedido: Promise<ProfesionalPublico[] | null> | null = null;

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const textos = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);

async function cargar(): Promise<ProfesionalPublico[] | null> {
  const res = await listProfesionalesPublicos();
  if (res.error) return null;
  return res.data.map((p) => {
    const local = PROFESIONALES_PUBLICOS.find((l) => l.key === p.slug);
    const perfil = (p.perfil ?? {}) as Record<string, unknown>;
    const especialidadEs = texto(p.especialidad) ?? local?.specialty.es ?? 'Psicología';
    const descripcionEs = texto(p.descripcion) ?? local?.description.es ?? '';
    const modalidadEs = texto(perfil.modalidad_es) ?? local?.modality.es ?? 'Online y presencial';
    const bioEs = texto(perfil.bio_es);
    const experienciaEs = texto(perfil.experiencia_es);
    const enfoquesEs = textos(perfil.enfoques_es);
    const enfoquesEn = textos(perfil.enfoques_en);
    return {
      key: p.slug ?? String(p.id),
      name: texto(p.nombre) ?? local?.name ?? 'Profesional',
      specialty: { es: especialidadEs, en: texto(perfil.especialidad_en) ?? local?.specialty.en ?? especialidadEs },
      description: { es: descripcionEs, en: texto(perfil.descripcion_en) ?? local?.description.en ?? descripcionEs },
      modality: { es: modalidadEs, en: texto(perfil.modalidad_en) ?? local?.modality.en ?? modalidadEs },
      image: texto(p.foto) ?? local?.image ?? FOTO_POR_DEFECTO,
      servicios: p.servicios ?? [],
      sedes: p.sedes ?? [],
      bio: bioEs ? { es: bioEs, en: texto(perfil.bio_en) ?? bioEs } : undefined,
      experiencia: experienciaEs ? { es: experienciaEs, en: texto(perfil.experiencia_en) ?? experienciaEs } : undefined,
      enfoques: enfoquesEs.length ? enfoquesEs.map((es, i) => ({ es, en: enfoquesEn[i] ?? es })) : undefined,
      formacion: textos(perfil.formacion).length ? textos(perfil.formacion) : undefined,
    };
  });
}

export function useProfesionalesPublicos() {
  const real = isSupabaseConfigured();
  const [lista, setLista] = useState<ProfesionalPublico[]>(() => cache ?? PROFESIONALES_PUBLICOS);
  // Con la base, hasta que responde no se sabe si una profesional nueva existe.
  const [cargando, setCargando] = useState(real && !cache);

  useEffect(() => {
    if (!real || cache) return;
    let vigente = true;
    pedido ??= cargar();
    void pedido.then((datos) => {
      if (datos) cache = datos;
      else pedido = null; // se reintenta en la próxima visita
      if (!vigente) return;
      if (datos) setLista(datos);
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, [real]);

  return { profesionales: lista, cargando };
}
