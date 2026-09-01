import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ChevronUp, ChevronDown, PlayCircle, ClipboardCheck, Trash2, Upload,
  FileText, Headphones, X, Bold, Italic, Underline, List, ListOrdered, Link2, Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import type { ModuloBuilder, ReglaDesbloqueo } from '@/data/courseBuilderData';
import { useInstructorCourses } from '@/context/InstructorCoursesContext';
import { CURSOS_META, CURSOS_INFO_DEMO } from '@/data/instructorCoursesData';

const logo = '/src/assets/logos/1_(1).png';
type Tab = 'clase' | 'datos';

const text = {
  es: {
    volver: 'Volver al panel', subtitulo: 'Constructor de cursos',
    borrador: 'Borrador', publicado: 'Publicado', guardado: 'Guardado',
    vistaPrevia: 'Vista previa', publicar: 'Publicar',
    contenidoCurso: 'Contenido del curso', mod: 'mód.', clases: 'clases',
    reordenar: 'Usa las flechas para reordenar módulos y clases.',
    clase: 'Clase', evaluacion: 'Evaluación', preg: 'preg.',
    evaluacionModulo: 'Evaluación del módulo',
    añadirModulo: '+ Añadir módulo',
    editarClase: 'Editar clase', datosCurso: 'Datos del curso',
    sinSeleccion: 'Selecciona una clase del panel izquierdo para editarla.',
    modulo: 'Módulo', claseN: 'Clase', eliminar: 'Eliminar',
    videoClase: 'Video de la clase', arrastraVideo: 'Arrastra un video o haz clic para subir',
    hasta2gb: 'MP4 · hasta 2GB · o pega un enlace', pegaEnlace: 'https://…',
    contenidoFormativo: 'Contenido formativo',
    materiales: 'Materiales de apoyo', añadirMaterial: '+ Añadir material',
    reglaTitulo: 'Regla de desbloqueo', reglaSub: '¿Cuándo puede el estudiante ver esta clase?',
    reglaSecuencial: 'Secuencial', reglaSecuencialDet: 'Al completar la clase anterior.',
    reglaEvaluacion: 'Por evaluación', reglaEvaluacionDet: 'Al aprobar la evaluación del módulo.',
    reglaPago: 'Por pago', reglaPagoDet: 'Requiere cuota/pago al día.',
    clasePreview: 'Clase de vista previa', duracionEstimada: 'Duración estimada',
    guardarClase: 'Guardar clase', guardadoOk: 'Guardado ✓',
    tituloCurso: 'Título del curso', descripcion: 'Descripción',
    categoria: 'Categoría', nivel: 'Nivel', idioma: 'Idioma',
    precio: 'Precio', moneda: 'Moneda', planesPago: 'Planes de pago',
    unicoCuotas: 'Único + cuotas', soloUnico: 'Solo pago único',
    imagenCurso: 'Imagen del curso', cambiar: '✎ Cambiar', recomendado: 'Recomendado 1280×720px',
    estado: 'Estado',
    estadoAyuda: 'En borrador solo tú lo ves. Publicado aparece en el catálogo.',
    principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado',
    bienestar: 'Bienestar', habilidades: 'Habilidades', familia: 'Familia',
  },
  en: {
    volver: 'Back to panel', subtitulo: 'Course builder',
    borrador: 'Draft', publicado: 'Published', guardado: 'Saved',
    vistaPrevia: 'Preview', publicar: 'Publish',
    contenidoCurso: 'Course content', mod: 'mod.', clases: 'lessons',
    reordenar: 'Use the arrows to reorder modules and lessons.',
    clase: 'Lesson', evaluacion: 'Quiz', preg: 'q.',
    evaluacionModulo: 'Module quiz',
    añadirModulo: '+ Add module',
    editarClase: 'Edit lesson', datosCurso: 'Course details',
    sinSeleccion: 'Select a lesson from the left panel to edit it.',
    modulo: 'Module', claseN: 'Lesson', eliminar: 'Delete',
    videoClase: 'Lesson video', arrastraVideo: 'Drag a video or click to upload',
    hasta2gb: 'MP4 · up to 2GB · or paste a link', pegaEnlace: 'https://…',
    contenidoFormativo: 'Lesson content',
    materiales: 'Support materials', añadirMaterial: '+ Add material',
    reglaTitulo: 'Unlock rule', reglaSub: 'When can the student access this lesson?',
    reglaSecuencial: 'Sequential', reglaSecuencialDet: 'After completing the previous lesson.',
    reglaEvaluacion: 'By assessment', reglaEvaluacionDet: 'After passing the module quiz.',
    reglaPago: 'By payment', reglaPagoDet: 'Requires installment/payment up to date.',
    clasePreview: 'Preview lesson', duracionEstimada: 'Estimated duration',
    guardarClase: 'Save lesson', guardadoOk: 'Saved ✓',
    tituloCurso: 'Course title', descripcion: 'Description',
    categoria: 'Category', nivel: 'Level', idioma: 'Language',
    precio: 'Price', moneda: 'Currency', planesPago: 'Payment plans',
    unicoCuotas: 'One-time + installments', soloUnico: 'One-time payment only',
    imagenCurso: 'Course image', cambiar: '✎ Change', recomendado: 'Recommended 1280×720px',
    estado: 'Status',
    estadoAyuda: 'Draft is only visible to you. Published appears in the catalog.',
    principiante: 'Beginner', intermedio: 'Intermediate', avanzado: 'Advanced',
    bienestar: 'Wellness', habilidades: 'Skills', familia: 'Family',
  },
} as const;

const reglas: { key: ReglaDesbloqueo; label: keyof typeof text.es; det: keyof typeof text.es }[] = [
  { key: 'secuencial', label: 'reglaSecuencial', det: 'reglaSecuencialDet' },
  { key: 'evaluacion', label: 'reglaEvaluacion', det: 'reglaEvaluacionDet' },
  { key: 'pago', label: 'reglaPago', det: 'reglaPagoDet' },
];

let idSeq = 100;
function nextId(prefix: string) {
  idSeq += 1;
  return `${prefix}${idSeq}`;
}

export default function ConstructorCursosPage() {
  const { cursoKey } = useParams<{ cursoKey: string }>();
  const key = cursoKey || 'manejo-ansiedad';
  // key={key} fuerza el remontaje completo del editor al navegar entre
  // "Editar" de cursos distintos (o a "+ Nuevo curso"), así cada instancia
  // arranca con su propia selección de módulo/clase en vez de arrastrar la
  // del curso anterior.
  return <ConstructorCursosInner key={key} cursoKey={key} />;
}

function ConstructorCursosInner({ cursoKey }: { cursoKey: string }) {
  const { language, setLanguage } = useSiteLanguage();
  const t = text[language];
  const { cursos, modulosPorCurso, actualizarInfo, actualizarModulos } = useInstructorCourses();

  const info = cursos[cursoKey] ?? CURSOS_INFO_DEMO.nuevo;
  const modulos = modulosPorCurso[cursoKey] ?? [];
  const meta = CURSOS_META.find((m) => m.key === cursoKey);

  const [tab, setTab] = useState<Tab>('clase');
  const [selModulo, setSelModulo] = useState<string | null>(modulos[0]?.id ?? null);
  const [selItem, setSelItem] = useState<string | null>(modulos[0]?.items[0]?.id ?? null);
  const [guardadoOk, setGuardadoOk] = useState(false);

  function setModulos(updater: (ms: ModuloBuilder[]) => ModuloBuilder[]) {
    actualizarModulos(cursoKey, updater(modulos));
  }

  const modActual = modulos.find((m) => m.id === selModulo) || null;
  const itemActual = modActual?.items.find((i) => i.id === selItem) || null;
  const leccionActual = itemActual && itemActual.tipo === 'clase' ? itemActual : null;
  const modIndexActual = modActual ? modulos.indexOf(modActual) : -1;
  const itemIndexActual = modActual && itemActual ? modActual.items.indexOf(itemActual) : -1;

  const totalClases = modulos.reduce((acc, m) => acc + m.items.filter((i) => i.tipo === 'clase').length, 0);

  function selectLesson(moduloId: string, itemId: string) {
    setSelModulo(moduloId);
    setSelItem(itemId);
    setTab('clase');
  }

  function updateModuloTitulo(moduloId: string, valor: string) {
    setModulos((ms) => ms.map((m) => (m.id === moduloId ? { ...m, titulo: valor } : m)));
  }

  function moveModulo(index: number, dir: -1 | 1) {
    setModulos((ms) => {
      const next = [...ms];
      const target = index + dir;
      if (target < 0 || target >= next.length) return ms;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function moveItem(moduloId: string, index: number, dir: -1 | 1) {
    setModulos((ms) =>
      ms.map((m) => {
        if (m.id !== moduloId) return m;
        const target = index + dir;
        if (target < 0 || target >= m.items.length) return m;
        const items = [...m.items];
        [items[index], items[target]] = [items[target], items[index]];
        return { ...m, items };
      })
    );
  }

  function addModulo() {
    const nuevo: ModuloBuilder = { id: nextId('m'), titulo: language === 'es' ? 'Nuevo módulo' : 'New module', items: [] };
    setModulos((ms) => [...ms, nuevo]);
  }

  function addLeccion(moduloId: string) {
    const id = nextId('l');
    setModulos((ms) =>
      ms.map((m) =>
        m.id === moduloId
          ? {
              ...m,
              items: [
                ...m.items,
                {
                  id, tipo: 'clase', titulo: language === 'es' ? 'Nueva clase' : 'New lesson', duracion: '00:00',
                  contenido: '', reglaDesbloqueo: 'secuencial', vistaPrevia: false, materiales: [],
                },
              ],
            }
          : m
      )
    );
    selectLesson(moduloId, id);
  }

  function addEvaluacion(moduloId: string) {
    const id = nextId('q');
    setModulos((ms) =>
      ms.map((m) => (m.id === moduloId ? { ...m, items: [...m.items, { id, tipo: 'evaluacion', preguntas: 5 }] } : m))
    );
  }

  function eliminarLeccionActual() {
    if (!modActual || !itemActual) return;
    const modId = modActual.id;
    setModulos((ms) => ms.map((m) => (m.id === modId ? { ...m, items: m.items.filter((i) => i.id !== itemActual.id) } : m)));
    setSelItem(null);
  }

  function patchLeccion(fields: Partial<Omit<NonNullable<typeof leccionActual>, 'id' | 'tipo'>>) {
    if (!modActual || !leccionActual) return;
    const modId = modActual.id;
    const itemId = leccionActual.id;
    setModulos((ms) =>
      ms.map((m) =>
        m.id === modId
          ? { ...m, items: m.items.map((i) => (i.id === itemId && i.tipo === 'clase' ? { ...i, ...fields } : i)) }
          : m
      )
    );
  }

  function removeMaterial(index: number) {
    if (!leccionActual) return;
    patchLeccion({ materiales: leccionActual.materiales.filter((_, i) => i !== index) });
  }

  function addMaterial() {
    if (!leccionActual) return;
    patchLeccion({
      materiales: [...leccionActual.materiales, { nombre: language === 'es' ? 'Nuevo_archivo.pdf' : 'New_file.pdf', tipo: 'pdf', tamano: '—' }],
    });
  }

  function guardarClase() {
    setGuardadoOk(true);
    window.setTimeout(() => setGuardadoOk(false), 1800);
  }

  function publicar() {
    actualizarInfo(cursoKey, { estado: 'publicado' });
    setTab('datos');
  }

  return (
    <div className="min-h-screen bg-brand-50/40">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <Link to="/instructor" className="shrink-0 text-ink/50 hover:text-ink" aria-label={t.volver}>
            <ArrowLeft size={18} />
          </Link>
          <Link to="/" className="hidden shrink-0 items-center sm:flex">
            <img src={logo} alt="Psique Amor" className="h-7 w-auto" />
          </Link>
          <div className="min-w-0">
            <input
              value={info.titulo}
              onChange={(e) => actualizarInfo(cursoKey, { titulo: e.target.value })}
              className="w-full max-w-[200px] truncate rounded bg-transparent px-1 -mx-1 text-sm font-semibold text-ink focus:bg-brand-50 focus:outline-none"
            />
            <p className="truncate text-xs text-ink/45">{t.subtitulo}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <span
              className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${
                info.estado === 'publicado' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-ink/50'
              }`}
            >
              {info.estado === 'publicado' ? t.publicado : t.borrador}
            </span>
            <span className="hidden items-center gap-1 text-xs text-ink/40 md:inline-flex">
              <CheckCircle2 size={13} /> {t.guardado}
            </span>
            <button className="hidden rounded-full border border-brand-200 px-4 py-1.5 text-sm font-semibold text-ink hover:bg-brand-50 sm:inline-block">
              {t.vistaPrevia}
            </button>
            <button onClick={publicar} className="rounded-full bg-brand-gradient px-4 py-1.5 text-sm font-semibold text-white shadow-soft hover:opacity-90">
              {t.publicar}
            </button>
            <div className="hidden items-center rounded-full border border-brand-100 text-xs font-bold sm:flex overflow-hidden">
              <button onClick={() => setLanguage('es')} className={`px-2.5 py-1.5 ${language === 'es' ? 'bg-brand-gradient text-white' : 'text-ink/45'}`}>ES</button>
              <button onClick={() => setLanguage('en')} className={`px-2.5 py-1.5 ${language === 'en' ? 'bg-brand-gradient text-white' : 'text-ink/45'}`}>EN</button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        {/* ===== ÁRBOL DE CONTENIDO ===== */}
        <aside className="shrink-0 border-b border-brand-100 p-4 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-ink">{t.contenidoCurso}</h2>
            <span className="text-xs text-ink/40">{modulos.length} {t.mod} · {totalClases} {t.clases}</span>
          </div>
          <p className="mb-3 text-[11px] text-ink/40">↕ {t.reordenar}</p>

          <div className="space-y-3">
            {modulos.map((mod, mi) => (
              <div key={mod.id} className="overflow-hidden rounded-2xl border border-brand-100 bg-white">
                <div className="flex items-center gap-2 border-b border-brand-50 px-3 py-2.5">
                  <div className="flex shrink-0 flex-col">
                    <button onClick={() => moveModulo(mi, -1)} disabled={mi === 0} className="text-ink/25 hover:text-ink disabled:cursor-not-allowed disabled:opacity-20" aria-label="up">
                      <ChevronUp size={13} />
                    </button>
                    <button onClick={() => moveModulo(mi, 1)} disabled={mi === modulos.length - 1} className="text-ink/25 hover:text-ink disabled:cursor-not-allowed disabled:opacity-20" aria-label="down">
                      <ChevronDown size={13} />
                    </button>
                  </div>
                  <input
                    value={mod.titulo}
                    onChange={(e) => updateModuloTitulo(mod.id, e.target.value)}
                    className="min-w-0 flex-1 truncate rounded bg-transparent px-1 -mx-1 text-sm font-semibold text-ink focus:bg-brand-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1 p-2">
                  {mod.items.map((item, ii) => {
                    const isSel = item.id === selItem;
                    if (item.tipo === 'evaluacion') {
                      return (
                        <div key={item.id} className="flex items-center gap-2 rounded-xl border border-lilac-100 bg-lilac-50/60 px-2 py-2">
                          <div className="flex shrink-0 flex-col">
                            <button onClick={() => moveItem(mod.id, ii, -1)} disabled={ii === 0} className="text-lilac-300 hover:text-lilac-600 disabled:cursor-not-allowed disabled:opacity-30" aria-label="up"><ChevronUp size={11} /></button>
                            <button onClick={() => moveItem(mod.id, ii, 1)} disabled={ii === mod.items.length - 1} className="text-lilac-300 hover:text-lilac-600 disabled:cursor-not-allowed disabled:opacity-30" aria-label="down"><ChevronDown size={11} /></button>
                          </div>
                          <ClipboardCheck size={14} className="shrink-0 text-lilac-600" />
                          <span className="flex-1 truncate text-sm text-lilac-700">{t.evaluacionModulo}</span>
                          <span className="shrink-0 text-xs text-ink/40">{item.preguntas} {t.preg}</span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={item.id}
                        onClick={() => selectLesson(mod.id, item.id)}
                        className={`flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left transition ${
                          isSel ? 'border-brand-300 bg-brand-50' : 'border-transparent hover:bg-brand-50/60'
                        }`}
                      >
                        <span className="flex shrink-0 flex-col" onClick={(e) => e.stopPropagation()}>
                          <span onClick={() => moveItem(mod.id, ii, -1)} className={`block ${ii === 0 ? 'pointer-events-none opacity-20' : 'cursor-pointer hover:text-ink'} text-ink/25`}><ChevronUp size={11} /></span>
                          <span onClick={() => moveItem(mod.id, ii, 1)} className={`block ${ii === mod.items.length - 1 ? 'pointer-events-none opacity-20' : 'cursor-pointer hover:text-ink'} text-ink/25`}><ChevronDown size={11} /></span>
                        </span>
                        <PlayCircle size={14} className={`shrink-0 ${isSel ? 'text-brand-600' : 'text-ink/30'}`} />
                        <span className="flex-1 truncate text-sm text-ink">{item.titulo}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 px-3 pb-3">
                  <button onClick={() => addLeccion(mod.id)} className="text-xs font-semibold text-brand-600 hover:underline">+ {t.clase}</button>
                  <button onClick={() => addEvaluacion(mod.id)} className="text-xs font-semibold text-lilac-600 hover:underline">+ {t.evaluacion}</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addModulo} className="mt-3 w-full rounded-2xl border border-dashed border-brand-200 py-3 text-sm font-semibold text-ink hover:bg-brand-50">
            {t.añadirModulo}
          </button>
        </aside>

        {/* ===== PANEL DERECHO ===== */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mb-6 flex gap-6 overflow-x-auto border-b border-brand-100">
            <button
              onClick={() => setTab('clase')}
              className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition ${tab === 'clase' ? 'border-brand-600 text-ink' : 'border-transparent text-ink/45 hover:text-ink'}`}
            >
              {t.editarClase}
            </button>
            <button
              onClick={() => setTab('datos')}
              className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition ${tab === 'datos' ? 'border-brand-600 text-ink' : 'border-transparent text-ink/45 hover:text-ink'}`}
            >
              {t.datosCurso}
            </button>
          </div>

          {/* ===== EDITAR CLASE ===== */}
          {tab === 'clase' && (
            !leccionActual ? (
              <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-10 text-center text-sm text-ink/45">
                {t.sinSeleccion}
              </div>
            ) : (
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-ink/45">{t.modulo} {modIndexActual + 1} · {t.claseN} {itemIndexActual + 1}</p>
                    <input
                      value={leccionActual.titulo}
                      onChange={(e) => patchLeccion({ titulo: e.target.value })}
                      className="w-full truncate rounded bg-transparent px-1 -mx-1 font-display text-2xl font-semibold text-ink focus:bg-brand-50 focus:outline-none"
                    />
                  </div>
                  <button onClick={eliminarLeccionActual} className="flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
                    <Trash2 size={14} /> {t.eliminar}
                  </button>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    {/* VIDEO */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-ink">{t.videoClase}</label>
                      <div className="grid place-items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-6 text-center aspect-video">
                        <div>
                          <Upload size={26} className="mx-auto mb-2 text-brand-400" />
                          <p className="text-sm font-medium text-ink">{t.arrastraVideo}</p>
                          <p className="mt-1 text-xs text-ink/45">{t.hasta2gb}</p>
                          <input type="text" placeholder={t.pegaEnlace} className="focus-ring mt-3 w-full max-w-sm rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-ink" />
                        </div>
                      </div>
                    </div>

                    {/* CONTENIDO FORMATIVO */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-ink">{t.contenidoFormativo}</label>
                      <div className="overflow-hidden rounded-2xl border border-brand-200">
                        <div className="flex items-center gap-1 border-b border-brand-100 bg-brand-50/60 px-3 py-2 text-ink/45">
                          <button className="w-7 hover:text-ink"><Bold size={14} className="mx-auto" /></button>
                          <button className="w-7 hover:text-ink"><Italic size={14} className="mx-auto" /></button>
                          <button className="w-7 hover:text-ink"><Underline size={14} className="mx-auto" /></button>
                          <span className="mx-1 h-4 w-px bg-brand-200" />
                          <button className="w-7 hover:text-ink"><List size={14} className="mx-auto" /></button>
                          <button className="w-7 hover:text-ink"><ListOrdered size={14} className="mx-auto" /></button>
                          <button className="w-7 hover:text-ink"><Link2 size={14} className="mx-auto" /></button>
                          <button className="w-7 hover:text-ink"><ImageIcon size={14} className="mx-auto" /></button>
                        </div>
                        <textarea
                          rows={6}
                          value={leccionActual.contenido}
                          onChange={(e) => patchLeccion({ contenido: e.target.value })}
                          className="w-full bg-white px-4 py-3 text-sm text-ink focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* MATERIALES */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-ink">{t.materiales}</label>
                      <div className="space-y-2">
                        {leccionActual.materiales.map((mat, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white p-3">
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${mat.tipo === 'pdf' ? 'bg-rose-50 text-rose-500' : 'bg-brand-50 text-brand-600'}`}>
                              {mat.tipo === 'pdf' ? <FileText size={16} /> : <Headphones size={16} />}
                            </span>
                            <span className="flex-1 truncate text-sm text-ink">{mat.nombre}</span>
                            <span className="shrink-0 text-xs text-ink/40">{mat.tamano}</span>
                            <button onClick={() => removeMaterial(i)} className="shrink-0 text-rose-400 hover:text-rose-600" aria-label="remove"><X size={15} /></button>
                          </div>
                        ))}
                        <button onClick={addMaterial} className="w-full rounded-xl border border-dashed border-brand-200 py-3 text-sm font-semibold text-ink hover:bg-brand-50">
                          {t.añadirMaterial}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* LATERAL */}
                  <aside className="space-y-4">
                    <div className="rounded-2xl border border-brand-100 bg-white p-5">
                      <h3 className="mb-1 font-display font-semibold text-ink">{t.reglaTitulo}</h3>
                      <p className="mb-4 text-xs text-ink/45">{t.reglaSub}</p>
                      <div className="space-y-2">
                        {reglas.map((r) => (
                          <label
                            key={r.key}
                            onClick={() => patchLeccion({ reglaDesbloqueo: r.key })}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                              leccionActual.reglaDesbloqueo === r.key ? 'border-brand-300 bg-brand-50' : 'border-brand-100 hover:bg-brand-50/50'
                            }`}
                          >
                            <span
                              className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                                leccionActual.reglaDesbloqueo === r.key ? 'border-brand-500 bg-brand-500' : 'border-brand-200'
                              }`}
                            />
                            <div>
                              <p className="text-sm font-medium text-ink">{t[r.label]}</p>
                              <p className="text-xs text-ink/45">{t[r.det]}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3 rounded-2xl border border-brand-100 bg-white p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-ink">{t.clasePreview}</span>
                        <button
                          onClick={() => patchLeccion({ vistaPrevia: !leccionActual.vistaPrevia })}
                          className={`relative h-6 w-11 rounded-full transition ${leccionActual.vistaPrevia ? 'bg-brand-gradient' : 'bg-brand-100'}`}
                          aria-pressed={leccionActual.vistaPrevia}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${leccionActual.vistaPrevia ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-ink/45">{t.duracionEstimada}</label>
                        <input
                          value={leccionActual.duracion}
                          onChange={(e) => patchLeccion({ duracion: e.target.value })}
                          className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink"
                        />
                      </div>
                    </div>
                    <button onClick={guardarClase} className="w-full rounded-full bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90">
                      {guardadoOk ? t.guardadoOk : t.guardarClase}
                    </button>
                  </aside>
                </div>
              </div>
            )
          )}

          {/* ===== DATOS DEL CURSO ===== */}
          {tab === 'datos' && (
            <div className="grid items-start gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">{t.tituloCurso}</label>
                  <input value={info.titulo} onChange={(e) => actualizarInfo(cursoKey, { titulo: e.target.value })} className="focus-ring w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">{t.descripcion}</label>
                  <textarea rows={4} value={info.descripcion} onChange={(e) => actualizarInfo(cursoKey, { descripcion: e.target.value })} className="focus-ring w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">{t.categoria}</label>
                    <select value={info.categoria} onChange={(e) => actualizarInfo(cursoKey, { categoria: e.target.value })} className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm text-ink">
                      <option>{t.bienestar}</option>
                      <option>{t.habilidades}</option>
                      <option>{t.familia}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">{t.nivel}</label>
                    <select value={info.nivel} onChange={(e) => actualizarInfo(cursoKey, { nivel: e.target.value })} className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm text-ink">
                      <option>{t.principiante}</option>
                      <option>{t.intermedio}</option>
                      <option>{t.avanzado}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">{t.idioma}</label>
                    <select value={info.idioma} onChange={(e) => actualizarInfo(cursoKey, { idioma: e.target.value })} className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm text-ink">
                      <option>Español</option>
                      <option>English</option>
                      <option>ES / EN</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">{t.precio}</label>
                    <input value={info.precio} onChange={(e) => actualizarInfo(cursoKey, { precio: e.target.value })} className="focus-ring w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">{t.moneda}</label>
                    <select value={info.moneda} onChange={(e) => actualizarInfo(cursoKey, { moneda: e.target.value })} className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm text-ink">
                      <option>USD $</option>
                      <option>EUR €</option>
                      <option>MXN $</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">{t.planesPago}</label>
                    <select className="focus-ring w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm text-ink">
                      <option>{t.unicoCuotas}</option>
                      <option>{t.soloUnico}</option>
                    </select>
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-brand-100 bg-white p-5">
                  <label className="mb-2 block text-sm font-medium text-ink">{t.imagenCurso}</label>
                  <div className="relative mb-2 overflow-hidden rounded-xl border border-brand-100">
                    {info.imagen ? (
                      <img src={info.imagen} alt="" className="h-32 w-full object-cover" />
                    ) : (
                      <div className={`h-32 w-full ${meta?.color ?? 'bg-brand-300'}`} />
                    )}
                    <button className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-3 py-1 text-xs text-white">{t.cambiar}</button>
                  </div>
                  <p className="text-xs text-ink/45">{t.recomendado}</p>
                </div>
                <div className="rounded-2xl border border-brand-100 bg-white p-5">
                  <label className="mb-2 block text-sm font-medium text-ink">{t.estado}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => actualizarInfo(cursoKey, { estado: 'borrador' })}
                      className={`flex-1 rounded-full py-2 text-sm font-semibold ${info.estado === 'borrador' ? 'border border-brand-300 bg-brand-50 text-brand-700' : 'border border-brand-100 text-ink/45 hover:text-ink'}`}
                    >
                      {t.borrador}
                    </button>
                    <button
                      onClick={() => actualizarInfo(cursoKey, { estado: 'publicado' })}
                      className={`flex-1 rounded-full py-2 text-sm font-semibold ${info.estado === 'publicado' ? 'border border-brand-300 bg-brand-50 text-brand-700' : 'border border-brand-100 text-ink/45 hover:text-ink'}`}
                    >
                      {t.publicado}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-ink/45">{t.estadoAyuda}</p>
                </div>
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
