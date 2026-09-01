export type EstadoProducto = 'Publicado' | 'Borrador' | 'Archivado';
export type TipoProducto = 'Libro' | 'Video';

export interface ArchivoMeta {
  nombre: string;
  tamanoMB: number;
  formato: string;
}

export interface EntregaSettings {
  streamingProtegido: boolean;
  descargaPermitida: boolean;
  marcaDeAgua: boolean;
  limiteDescargas: number;
  accesoDias: number;
  bloquearCaptura: boolean;
}

export interface ProductoDigitalRecord {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoProducto;
  categoria: string;
  precio: number;
  moneda: string;
  ventas: number;
  estado: EstadoProducto;
  actualizado: string;
  archivo?: ArchivoMeta;
  entrega: EntregaSettings;
}

const entregaDefault: EntregaSettings = {
  streamingProtegido: true, descargaPermitida: false, marcaDeAgua: true, limiteDescargas: 0, accesoDias: 365, bloquearCaptura: true,
};

export const demoProductos: ProductoDigitalRecord[] = [
  {
    id: 'pd1', titulo: 'Vínculos sanos', descripcion: 'Libro digital sobre apego y relaciones saludables.', tipo: 'Libro',
    categoria: 'Relaciones', precio: 14, moneda: 'USD', ventas: 86, estado: 'Publicado', actualizado: '2026-06-02',
    archivo: { nombre: 'vinculos-sanos.pdf', tamanoMB: 4.2, formato: 'PDF' },
    entrega: { streamingProtegido: false, descargaPermitida: true, marcaDeAgua: true, limiteDescargas: 3, accesoDias: 365, bloquearCaptura: false },
  },
  {
    id: 'pd2', titulo: 'Guía de manejo de ansiedad', descripcion: 'Guía práctica en PDF con ejercicios de respiración y grounding.', tipo: 'Libro',
    categoria: 'Bienestar', precio: 9, moneda: 'USD', ventas: 142, estado: 'Publicado', actualizado: '2026-05-18',
    archivo: { nombre: 'guia-ansiedad.pdf', tamanoMB: 2.1, formato: 'PDF' },
    entrega: { streamingProtegido: false, descargaPermitida: true, marcaDeAgua: true, limiteDescargas: 5, accesoDias: 180, bloquearCaptura: false },
  },
  {
    id: 'pd3', titulo: 'Meditaciones guiadas · Vol. 1', descripcion: 'Serie de video-meditaciones guiadas de 10 a 20 minutos.', tipo: 'Video',
    categoria: 'Bienestar', precio: 12, moneda: 'USD', ventas: 54, estado: 'Publicado', actualizado: '2026-07-01',
    archivo: { nombre: 'meditaciones-vol1.mp4', tamanoMB: 480, formato: 'MP4' },
    entrega: entregaDefault,
  },
  {
    id: 'pd4', titulo: 'Taller: Diario emocional', descripcion: 'Grabación del taller en video con plantilla descargable.', tipo: 'Video',
    categoria: 'Autoconocimiento', precio: 6, moneda: 'USD', ventas: 31, estado: 'Publicado', actualizado: '2026-04-22',
    archivo: { nombre: 'taller-diario.mp4', tamanoMB: 310, formato: 'MP4' },
    entrega: { ...entregaDefault, limiteDescargas: 0 },
  },
  {
    id: 'pd5', titulo: 'Guía de comunicación en pareja', descripcion: 'Borrador de guía sobre comunicación asertiva en pareja.', tipo: 'Libro',
    categoria: 'Relaciones', precio: 9, moneda: 'USD', ventas: 0, estado: 'Borrador', actualizado: '2026-08-09',
    entrega: { streamingProtegido: false, descargaPermitida: true, marcaDeAgua: true, limiteDescargas: 3, accesoDias: 365, bloquearCaptura: false },
  },
];

export const CATEGORIAS_PRODUCTO = ['Relaciones', 'Bienestar', 'Autoconocimiento', 'Familia', 'Adolescentes'];
