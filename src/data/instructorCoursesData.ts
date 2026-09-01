import { MODULOS_DEMO, type ModuloBuilder } from '@/data/courseBuilderData';

// Datos de "Mis cursos" / Constructor de cursos para el panel del instructor
// (Dra. Ana Rivas). Se reconciliaron con la página pública de Cursos
// (`coursesPageData.ts`, la fuente que alimenta el Home): allí "Manejo de la
// ansiedad" y "Superar la ansiedad social" están atribuidos a Ana Rivas, y
// "Autoestima y confianza" pertenece a otra profesora (Lic. Sofía Núñez) —
// por eso ya NO aparece en la lista de cursos de Ana Rivas (se corrigió una
// inconsistencia de datos anterior, a pedido explícito del usuario).

export interface CursoBuilderInfo {
  titulo: string;
  descripcion: string;
  categoria: string;
  nivel: string;
  idioma: string;
  precio: string;
  moneda: string;
  imagen: string; // vacío = usa el bloque de color de CURSOS_META como respaldo
  estado: 'publicado' | 'borrador';
}

export interface CursoInstructorMeta {
  key: string;
  duracion: { es: string; en: string };
  lecciones: number;
  estudiantes: number;
  rating: number;
  color: string; // bloque de color de respaldo cuando el curso no tiene imagen pública (borradores)
}

// Metadatos de solo consulta — no se editan desde el Constructor (ahí solo
// se edita la info de `CURSOS_INFO_DEMO`, ver abajo).
export const CURSOS_META: CursoInstructorMeta[] = [
  { key: 'manejo-ansiedad', duracion: { es: '4 semanas', en: '4 weeks' }, lecciones: 12, estudiantes: 142, rating: 4.9, color: 'bg-brand-600' },
  { key: 'ansiedad-social', duracion: { es: '4 h', en: '4h' }, lecciones: 11, estudiantes: 87, rating: 4.7, color: 'bg-lilac-500' },
  { key: 'afrontar-duelo', duracion: { es: '3 semanas', en: '3 weeks' }, lecciones: 8, estudiantes: 0, rating: 0, color: 'bg-brand-300' },
];

// Info editable desde el Constructor de cursos — semilla inicial; el estado
// real (con las ediciones del profesional) vive en
// `InstructorCoursesContext` + localStorage.
export const CURSOS_INFO_DEMO: Record<string, CursoBuilderInfo> = {
  'manejo-ansiedad': {
    titulo: 'Manejo de la ansiedad',
    descripcion: 'Aprende a reconocer, entender y calmar la ansiedad con técnicas prácticas basadas en evidencia.',
    categoria: 'Bienestar', nivel: 'Principiante', idioma: 'Español', precio: '49', moneda: 'USD $',
    imagen: 'https://images.pexels.com/photos/8715971/pexels-photo-8715971.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    estado: 'publicado',
  },
  'ansiedad-social': {
    titulo: 'Superar la ansiedad social',
    descripcion: 'Estrategias prácticas para sentirte más cómodo en situaciones sociales, paso a paso.',
    categoria: 'Bienestar', nivel: 'Intermedio', idioma: 'Español', precio: '55', moneda: 'USD $',
    imagen: 'https://images.pexels.com/photos/6567345/pexels-photo-6567345.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    estado: 'publicado',
  },
  'afrontar-duelo': {
    titulo: 'Afrontar el duelo',
    descripcion: 'Un espacio para procesar la pérdida a tu propio ritmo, con acompañamiento profesional.',
    categoria: 'Bienestar', nivel: 'Principiante', idioma: 'Español', precio: '45', moneda: 'USD $',
    imagen: '',
    estado: 'borrador',
  },
  // Curso en blanco — destino de "+ Nuevo curso" hasta que exista un flujo
  // real de creación (que además lo agregue a CURSOS_META).
  nuevo: {
    titulo: '', descripcion: '', categoria: 'Bienestar', nivel: 'Principiante', idioma: 'Español',
    precio: '0', moneda: 'USD $', imagen: '', estado: 'borrador',
  },
};

const MODULOS_ANSIEDAD_SOCIAL: ModuloBuilder[] = [
  {
    id: 'as-m1',
    titulo: 'Módulo 1 · Entendiendo la ansiedad social',
    items: [
      { id: 'as-l1', tipo: 'clase', titulo: '¿Qué es la ansiedad social?', duracion: '07:30', contenido: 'Diferenciamos timidez, introversión y ansiedad social, y cómo esta última se manifiesta en el cuerpo y en los pensamientos.', reglaDesbloqueo: 'secuencial', vistaPrevia: true, materiales: [] },
      { id: 'as-l2', tipo: 'clase', titulo: 'Pensamientos automáticos', duracion: '09:10', contenido: 'Identificamos los pensamientos automáticos más comunes antes de una situación social y cómo cuestionarlos.', reglaDesbloqueo: 'secuencial', vistaPrevia: false, materiales: [] },
      { id: 'as-q1', tipo: 'evaluacion', preguntas: 5 },
    ],
  },
  {
    id: 'as-m2',
    titulo: 'Módulo 2 · Exposición gradual',
    items: [
      { id: 'as-l3', tipo: 'clase', titulo: 'Construir tu escalera de exposición', duracion: '10:20', contenido: 'Aprende a diseñar una escalera de situaciones sociales, de menor a mayor dificultad, para exponerte de forma gradual y segura.', reglaDesbloqueo: 'evaluacion', vistaPrevia: false, materiales: [] },
      { id: 'as-l4', tipo: 'clase', titulo: 'Practicar en situaciones reales', duracion: '08:45', contenido: 'Estrategias para llevar la exposición a la vida diaria, con seguimiento de tu progreso.', reglaDesbloqueo: 'evaluacion', vistaPrevia: false, materiales: [] },
    ],
  },
];

const MODULOS_DUELO: ModuloBuilder[] = [
  {
    id: 'ad-m1',
    titulo: 'Módulo 1 · Las etapas del duelo',
    items: [
      { id: 'ad-l1', tipo: 'clase', titulo: '¿Qué es el duelo?', duracion: '06:50', contenido: 'Un acercamiento amable a qué es el duelo y por qué no sigue un camino lineal ni un tiempo fijo.', reglaDesbloqueo: 'secuencial', vistaPrevia: true, materiales: [] },
      { id: 'ad-l2', tipo: 'clase', titulo: 'Emociones que aparecen', duracion: '08:15', contenido: 'Recorremos las emociones más frecuentes durante el proceso — tristeza, rabia, culpa, alivio — y por qué todas son válidas.', reglaDesbloqueo: 'secuencial', vistaPrevia: false, materiales: [] },
    ],
  },
];

// Árbol de módulos por curso — semilla inicial; el estado real vive en el
// Context (así reordenar/editar clases persiste igual que en "Mis citas").
export const MODULOS_POR_CURSO: Record<string, ModuloBuilder[]> = {
  'manejo-ansiedad': MODULOS_DEMO,
  'ansiedad-social': MODULOS_ANSIEDAD_SOCIAL,
  'afrontar-duelo': MODULOS_DUELO,
  nuevo: [],
};
