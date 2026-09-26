import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GraduationCap, Users, Lock, Receipt, Search, Plus, Award, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminModal from '@/components/admin/ui/AdminModal';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import {
  demoCursos, demoInscripciones, demoReglas, demoCuotas,
  type CursoRecord, type InscripcionRecord, type ReglaDesbloqueo, type CuotaRecord, type CuotaEstado, type TipoRegla,
} from '@/data/admin/coursesData';
import { useDialogo } from '@/context/DialogoContext';
import { useAcademiaAdmin, fechaCortaLocal } from '@/hooks/useAcademiaAdmin';
import AvisoFlotante from '@/components/admin/ui/AvisoFlotante';
import { estadoCursoAdmin, reasignarCursoAdmin, accesoInscripcionAdmin } from '@/lib/api/admin';

const REGLA_LABEL: Record<string, string> = { secuencial: 'Secuencial', evaluacion: 'Por evaluación', pago: 'Por pago' };
const ESTADO_CURSO_LABEL: Record<string, string> = { publicado: 'Publicado', borrador: 'Borrador', archivado: 'Archivado' };

type Tab = 'cursos' | 'inscripciones' | 'reglas' | 'cuotas';

const text = {
  es: {
    title: 'Cursos e inscripciones', subtitle: 'Academia · datos de demostración',
    tabs: { cursos: 'Cursos', inscripciones: 'Inscripciones', reglas: 'Reglas de desbloqueo', cuotas: 'Cuotas' } as Record<Tab, string>,
    newCourse: 'Nuevo curso', search: 'Buscar…', all: 'Todos', status: 'Estado', enrolled: 'inscritos', modules: 'módulos',
    // inscripciones
    course: 'Curso', student: 'Estudiante', enrollDate: 'Fecha de inscripción', access: 'Acceso', progress: 'Progreso',
    installments: 'Cuotas', activate: 'Activar', suspend: 'Suspender', detail: 'Detalle de inscripción', close: 'Close'.replace('Close','Cerrar'),
    active: 'Activo', suspended: 'Suspendido',
    // reglas
    ruleType: 'Tipo de regla', sequential: 'Secuencial', evaluation: 'Evaluación', payment: 'Pago',
    minGrade: 'Nota mínima', blockOverdue: 'Bloquear si hay cuota vencida', issueCert: 'Emitir certificado',
    allowRetake: 'Permitir repetir evaluación', save: 'Guardar', discard: 'Descartar',
    // cuotas
    kpiOverdue: 'Vencidas', kpiPending: 'Pendientes', kpiPaid: 'Pagadas', register: 'Registrar',
    installmentOf: (n: number, total: number) => `Cuota ${n}/${total}`, dueDate: 'Vencimiento', amount: 'Monto',
    estadosCuota: { Vencida: 'Vencida', Pendiente: 'Pendiente', Pagada: 'Pagada' } as Record<CuotaEstado, string>,
    estadosCurso: { Publicado: 'Publicado', Borrador: 'Borrador' } as Record<CursoRecord['estado'], string>,
    noResults: 'Sin resultados con estos filtros.',
  },
  en: {
    title: 'Courses & enrollments', subtitle: 'Academy · demo data',
    tabs: { cursos: 'Courses', inscripciones: 'Enrollments', reglas: 'Unlock rules', cuotas: 'Installments' } as Record<Tab, string>,
    newCourse: 'New course', search: 'Search…', all: 'All', status: 'Status', enrolled: 'enrolled', modules: 'modules',
    course: 'Course', student: 'Student', enrollDate: 'Enrollment date', access: 'Access', progress: 'Progress',
    installments: 'Installments', activate: 'Activate', suspend: 'Suspend', detail: 'Enrollment detail', close: 'Close',
    active: 'Active', suspended: 'Suspended',
    ruleType: 'Rule type', sequential: 'Sequential', evaluation: 'Evaluation', payment: 'Payment',
    minGrade: 'Minimum grade', blockOverdue: 'Block if there is an overdue installment', issueCert: 'Issue certificate',
    allowRetake: 'Allow retaking evaluation', save: 'Save', discard: 'Discard',
    kpiOverdue: 'Overdue', kpiPending: 'Pending', kpiPaid: 'Paid', register: 'Register',
    installmentOf: (n: number, total: number) => `Installment ${n}/${total}`, dueDate: 'Due date', amount: 'Amount',
    estadosCuota: { Vencida: 'Overdue', Pendiente: 'Pending', Pagada: 'Paid' } as Record<CuotaEstado, string>,
    estadosCurso: { Publicado: 'Published', Borrador: 'Draft' } as Record<CursoRecord['estado'], string>,
    noResults: 'No results with these filters.',
  },
} as const;

function cuotaTone(e: CuotaEstado) {
  if (e === 'Pagada') return 'positivo';
  if (e === 'Vencida') return 'negativo';
  return 'alerta';
}

export default function AdminCoursesPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'cursos';

  const { esReal, datos, error: errorCarga, recargar, aviso, mostrarAviso } = useAcademiaAdmin();
  const { confirmar } = useDialogo();
  const [procesando, setProcesando] = useState(false);
  const cursosReales = datos?.cursos ?? [];
  // Con Supabase las listas salen de la base (admin_academia); si no, demo.
  const cursos: CursoRecord[] = esReal
    ? cursosReales.map((c) => ({
        id: String(c.id), titulo: c.nombre, descripcion: c.descripcion ?? '', categoria: c.categoria ?? '', precio: c.precio,
        moneda: c.moneda, estado: c.estado === 'publicado' ? 'Publicado' : 'Borrador', inscritos: c.inscritos, modulos: c.modulos,
      }))
    : demoCursos;
  const [inscripcionesDemo, setInscripciones] = useState<InscripcionRecord[]>(demoInscripciones);
  const inscripciones: InscripcionRecord[] = esReal
    ? (datos?.inscripciones ?? []).map((i) => ({
        id: String(i.id), cursoId: String(i.cursoId), estudiante: i.estudiante ?? '—', correo: i.correo ?? '',
        fechaInscripcion: fechaCortaLocal(i.fecha), accesoEstado: i.estado === 'activa' ? 'Activo' : 'Suspendido',
        progreso: Number(i.progreso) || 0, cuotasTotales: 0, cuotasPagadas: 0,
      }))
    : inscripcionesDemo;
  const [reglas, setReglas] = useState<ReglaDesbloqueo[]>(demoReglas);
  const [cuotas, setCuotas] = useState<CuotaRecord[]>(demoCuotas);

  const [buscar, setBuscar] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('todos');
  const [filtroAcceso, setFiltroAcceso] = useState<'todos' | InscripcionRecord['accesoEstado']>('todos');
  const [inscripcionSel, setInscripcionSel] = useState<string | null>(null);
  const [reglaCursoId, setReglaCursoId] = useState(cursos[0]?.id ?? '');
  const [filtroEstadoCuota, setFiltroEstadoCuota] = useState<'todos' | CuotaEstado>('todos');
  const [buscarCuota, setBuscarCuota] = useState('');

  const tabs: { key: Tab; label: string; icon: typeof GraduationCap }[] = [
    { key: 'cursos', label: t.tabs.cursos, icon: GraduationCap },
    { key: 'inscripciones', label: t.tabs.inscripciones, icon: Users },
    { key: 'reglas', label: t.tabs.reglas, icon: Lock },
    { key: 'cuotas', label: t.tabs.cuotas, icon: Receipt },
  ];

  const cursosFiltrados = useMemo(
    () => cursos.filter((c) => c.titulo.toLowerCase().includes(buscar.toLowerCase())),
    [cursos, buscar],
  );

  const inscripcionesFiltradas = useMemo(
    () =>
      inscripciones.filter(
        (i) =>
          (filtroCurso === 'todos' || i.cursoId === filtroCurso) &&
          (filtroAcceso === 'todos' || i.accesoEstado === filtroAcceso) &&
          i.estudiante.toLowerCase().includes(buscar.toLowerCase()),
      ),
    [inscripciones, filtroCurso, filtroAcceso, buscar],
  );

  async function toggleAcceso(id: string) {
    if (esReal) {
      const ins = inscripciones.find((i) => i.id === id);
      if (!ins) return;
      const activar = ins.accesoEstado !== 'Activo';
      const ok = await confirmar(
        activar
          ? `¿Reactivar el acceso de ${ins.estudiante} al curso?`
          : `¿Suspender el acceso de ${ins.estudiante} al curso? No podrá ver las clases hasta que lo reactives. No se toca ningún pago.`,
        { peligro: !activar, textoAceptar: activar ? 'Reactivar' : 'Suspender' }
      );
      if (!ok) return;
      setProcesando(true);
      const res = await accesoInscripcionAdmin(Number(id), activar);
      setProcesando(false);
      if (res.error) return mostrarAviso(res.error.message, true);
      mostrarAviso(activar ? 'Acceso reactivado. La estudiante recibió un aviso.' : 'Acceso suspendido. La estudiante recibió un aviso.');
      return recargar();
    }
    setInscripciones((prev) => prev.map((i) => (i.id === id ? { ...i, accesoEstado: i.accesoEstado === 'Activo' ? 'Suspendido' : 'Activo' } : i)));
  }

  const reglaActual = reglas.find((r) => r.cursoId === reglaCursoId) ?? reglas[0];
  function actualizarRegla(patch: Partial<ReglaDesbloqueo>) {
    setReglas((prev) => prev.map((r) => (r.cursoId === reglaCursoId ? { ...r, ...patch } : r)));
  }

  const cuotasKpi = useMemo(() => {
    const vencidas = cuotas.filter((c) => c.estado === 'Vencida').length;
    const pendientes = cuotas.filter((c) => c.estado === 'Pendiente').length;
    const pagadas = cuotas.filter((c) => c.estado === 'Pagada').length;
    return { vencidas, pendientes, pagadas };
  }, [cuotas]);

  const cuotasFiltradas = useMemo(
    () =>
      cuotas.filter(
        (c) =>
          (filtroEstadoCuota === 'todos' || c.estado === filtroEstadoCuota) &&
          c.estudiante.toLowerCase().includes(buscarCuota.toLowerCase()),
      ),
    [cuotas, filtroEstadoCuota, buscarCuota],
  );

  function registrarPago(id: string) {
    setCuotas((prev) => prev.map((c) => (c.id === id ? { ...c, estado: 'Pagada' } : c)));
  }

  const inscripcionSeleccionada = inscripciones.find((i) => i.id === inscripcionSel) || null;

  async function cambiarEstadoCurso(id: number, estado: 'borrador' | 'publicado', nombre: string) {
    const ok = await confirmar(
      estado === 'publicado'
        ? `¿Publicar "${nombre}"? Aparecerá en el sitio y se podrán inscribir.`
        : `¿Pasar "${nombre}" a borrador? Deja de mostrarse en el sitio; quienes ya están inscritos conservan su acceso.`,
      { textoAceptar: estado === 'publicado' ? 'Publicar' : 'Pasar a borrador' }
    );
    if (!ok) return;
    setProcesando(true);
    const res = await estadoCursoAdmin(id, estado);
    setProcesando(false);
    if (res.error) return mostrarAviso(res.error.message, true);
    mostrarAviso(estado === 'publicado' ? 'Curso publicado.' : 'Curso pasado a borrador.');
    return recargar();
  }

  async function reasignarCurso(id: number, profesionalId: number, nombre: string) {
    const prof = datos?.profesionales.find((p) => p.id === profesionalId)?.nombre ?? 'la profesional';
    const ok = await confirmar(`¿Reasignar "${nombre}" a ${prof}? Desde ahora lo edita ella y aprueba sus pagos.`, { textoAceptar: 'Reasignar' });
    if (!ok) return recargar();
    setProcesando(true);
    const res = await reasignarCursoAdmin(id, profesionalId);
    setProcesando(false);
    if (res.error) return mostrarAviso(res.error.message, true);
    mostrarAviso(`Curso reasignado a ${prof}.`);
    return recargar();
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">{esReal ? (lang === 'es' ? 'Academia · datos reales' : 'Academy · live data') : t.subtitle}</p>
        </div>
        {tab === 'cursos' && !esReal && (
          <Link
            to="/instructor/constructor/nuevo"
            className="flex h-10 items-center gap-2 rounded-2xl bg-brand-gradient px-4 text-sm font-bold text-white shadow-soft hover:opacity-90"
          >
            <Plus size={16} />
            {t.newCourse}
          </Link>
        )}
      </div>

      {errorCarga && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorCarga}</p>}
      <AvisoFlotante aviso={aviso} />
      {esReal && tab === 'cursos' && (
        <p className="rounded-2xl bg-brand-50 px-4 py-3 text-xs text-ink/60">
          Los cursos los crea y edita cada profesional en su Constructor. Desde aquí puedes publicarlos o pasarlos a borrador y reasignarlos a otra profesional.
        </p>
      )}

      <div className="flex w-full max-w-2xl gap-1 rounded-2xl border border-brand-100 bg-white p-1">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => { setSearchParams({ tab: tb.key }); setBuscar(''); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
                active ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/50 hover:bg-brand-50'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tb.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'cursos' && (
        <>
          <div className="flex h-10 w-full max-w-sm items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3">
            <Search size={15} className="text-ink/35" />
            <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder={t.search} className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35" />
          </div>
          {esReal && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cursosReales
              .filter((c) => c.nombre.toLowerCase().includes(buscar.toLowerCase()))
              .map((c) => (
                <div key={c.id} className="flex flex-col rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
                  <div className="flex items-start justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                      <GraduationCap size={20} />
                    </span>
                    <StatusBadge tone={c.estado === 'publicado' ? 'positivo' : c.estado === 'archivado' ? 'negativo' : 'neutro'}>
                      {ESTADO_CURSO_LABEL[c.estado] ?? c.estado}
                    </StatusBadge>
                  </div>
                  <p className="mt-4 font-display text-lg font-semibold text-ink">{c.nombre}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-ink/50">{c.descripcion}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink">{c.moneda} {c.precio}</span>
                    <span className="text-xs text-ink/45">{c.inscritos} {t.enrolled} · {c.modulos} {t.modules} · {c.clases} clases</span>
                  </div>
                  <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Profesional</label>
                  <select
                    value={c.profesionalId ?? ''}
                    disabled={procesando}
                    onChange={(e) => void reasignarCurso(c.id, Number(e.target.value), c.nombre)}
                    className="mt-1 h-9 w-full rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none"
                  >
                    {(datos?.profesionales ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={procesando || c.estado === 'archivado'}
                      onClick={() => void cambiarEstadoCurso(c.id, c.estado === 'publicado' ? 'borrador' : 'publicado', c.nombre)}
                      className="flex-1 rounded-2xl border border-brand-100 py-2 text-xs font-semibold text-ink hover:bg-brand-50 disabled:opacity-50"
                    >
                      {c.estado === 'publicado' ? 'Pasar a borrador' : 'Publicar'}
                    </button>
                    <Link to={`/cursos/${c.slug}`} target="_blank" className="flex-1 rounded-2xl border border-brand-100 py-2 text-center text-xs font-semibold text-brand-700 hover:bg-brand-50">
                      Ver en el sitio
                    </Link>
                  </div>
                </div>
              ))}
            {cursosReales.length === 0 && <p className="col-span-full py-10 text-center text-sm text-ink/40">{t.noResults}</p>}
          </section>
          )}
          {!esReal && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cursosFiltrados.map((c) => (
              <div key={c.id} className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <GraduationCap size={20} />
                  </span>
                  <StatusBadge tone={c.estado === 'Publicado' ? 'positivo' : 'neutro'}>{t.estadosCurso[c.estado]}</StatusBadge>
                </div>
                <p className="mt-4 font-display text-lg font-semibold text-ink">{c.titulo}</p>
                <p className="mt-1 text-xs text-ink/50">{c.descripcion}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">{c.moneda} {c.precio}</span>
                  <span className="text-xs text-ink/45">{c.inscritos} {t.enrolled} · {c.modulos} {t.modules}</span>
                </div>
              </div>
            ))}
          </section>
          )}
        </>
      )}

      {tab === 'inscripciones' && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft">
            <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-3">
              <Search size={15} className="text-ink/35" />
              <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder={t.search} className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35" />
            </div>
            <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} className="h-9 rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none">
              <option value="todos">{t.all} · {t.course}</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.titulo}</option>
              ))}
            </select>
            <select value={filtroAcceso} onChange={(e) => setFiltroAcceso(e.target.value as typeof filtroAcceso)} className="h-9 rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none">
              <option value="todos">{t.all} · {t.access}</option>
              <option value="Activo">{t.active}</option>
              <option value="Suspendido">{t.suspended}</option>
            </select>
          </div>

          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-5 py-3 font-semibold">{t.student}</th>
                    <th className="px-5 py-3 font-semibold">{t.course}</th>
                    <th className="px-5 py-3 font-semibold">{t.enrollDate}</th>
                    <th className="px-5 py-3 font-semibold">{t.progress}</th>
                    <th className="px-5 py-3 font-semibold">{t.access}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {inscripcionesFiltradas.map((i) => {
                    const curso = cursos.find((c) => c.id === i.cursoId);
                    return (
                      <tr key={i.id} className="cursor-pointer hover:bg-brand-50/50" onClick={() => setInscripcionSel(i.id)}>
                        <td className="px-5 py-3 font-semibold text-ink">{i.estudiante}</td>
                        <td className="px-5 py-3 text-ink/60">{curso?.titulo}</td>
                        <td className="px-5 py-3 text-ink/45">{i.fechaInscripcion}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-brand-50">
                              <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${i.progreso}%` }} />
                            </div>
                            <span className="text-xs text-ink/45">{i.progreso}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge tone={i.accesoEstado === 'Activo' ? 'positivo' : 'neutro'}>{i.accesoEstado === 'Activo' ? t.active : t.suspended}</StatusBadge>
                        </td>
                      </tr>
                    );
                  })}
                  {inscripcionesFiltradas.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-ink/40">{t.noResults}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === 'reglas' && esReal && (
        <section className="space-y-3 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          <p className="text-xs text-ink/55">
            La regla de desbloqueo se define clase por clase en el Constructor de cada profesional (secuencial, al aprobar la evaluación o al estar al día con el pago).
            Aquí ves cómo está configurado cada curso.
          </p>
          <div className="divide-y divide-brand-50">
            {cursosReales.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{c.nombre}</p>
                  <p className="text-xs text-ink/45">{c.profesional ?? '—'} · {c.clases} clases</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(c.reglas ?? {}).map(([regla, n]) => (
                    <span key={regla} className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                      {REGLA_LABEL[regla] ?? regla}: {n}
                    </span>
                  ))}
                  {!c.reglas && <span className="text-xs text-ink/40">Sin clases todavía</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'reglas' && !esReal && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          <div className="h-fit space-y-1 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft">
            {cursos.map((c) => (
              <button
                key={c.id}
                onClick={() => setReglaCursoId(c.id)}
                className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  reglaCursoId === c.id ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/60 hover:bg-brand-50'
                }`}
              >
                {c.titulo}
              </button>
            ))}
          </div>

          {reglaActual && (
            <section className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.ruleType}</label>
                <div className="flex gap-1 rounded-2xl border border-brand-100 bg-brand-50/40 p-1">
                  {(['Secuencial', 'Evaluación', 'Pago'] as TipoRegla[]).map((op) => (
                    <button
                      key={op}
                      onClick={() => actualizarRegla({ tipo: op })}
                      className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        reglaActual.tipo === op ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/50 hover:bg-white'
                      }`}
                    >
                      {op === 'Secuencial' ? t.sequential : op === 'Evaluación' ? t.evaluation : t.payment}
                    </button>
                  ))}
                </div>
              </div>

              {reglaActual.tipo === 'Evaluación' && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.minGrade}</label>
                  <input
                    type="number" value={reglaActual.notaMinima}
                    onChange={(e) => actualizarRegla({ notaMinima: Number(e.target.value) })}
                    className="h-10 w-32 rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none"
                  />
                </div>
              )}

              <div className="space-y-2.5 rounded-2xl border border-brand-100 bg-brand-50/30 p-4">
                <label className="flex items-center justify-between text-sm text-ink/70">
                  {t.blockOverdue}
                  <input type="checkbox" checked={reglaActual.bloquearSiCuotaVencida} onChange={(e) => actualizarRegla({ bloquearSiCuotaVencida: e.target.checked })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
                </label>
                <label className="flex items-center justify-between text-sm text-ink/70">
                  <span className="flex items-center gap-1.5"><Award size={14} className="text-brand-500" />{t.issueCert}</span>
                  <input type="checkbox" checked={reglaActual.emitirCertificado} onChange={(e) => actualizarRegla({ emitirCertificado: e.target.checked })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
                </label>
                <label className="flex items-center justify-between text-sm text-ink/70">
                  <span className="flex items-center gap-1.5"><RefreshCw size={14} className="text-brand-500" />{t.allowRetake}</span>
                  <input type="checkbox" checked={reglaActual.permitirRepetirEvaluacion} onChange={(e) => actualizarRegla({ permitirRepetirEvaluacion: e.target.checked })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
                </label>
              </div>

              <p className="border-t border-brand-100 pt-3 text-xs text-ink/40">Los cambios se aplican al marcarlos (demostración).</p>
            </section>
          )}
        </div>
      )}

      {tab === 'cuotas' && esReal && (
        <section className="space-y-3 rounded-3xl border border-brand-100 bg-white p-5 text-sm text-ink/60 shadow-soft">
          <p>
            Por ahora no hay cuotas: los cursos se pagan completos o con abonos por transferencia, y el acceso se activa al cubrir el precio.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/pagos" className="rounded-2xl border border-brand-100 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50">Ver pagos</Link>
            <Link to="/admin/finanzas?tab=ordenes" className="rounded-2xl border border-brand-100 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50">Ver órdenes y saldos</Link>
          </div>
        </section>
      )}

      {tab === 'cuotas' && !esReal && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-4">
              <p className="font-display text-2xl font-semibold text-rose-700">{cuotasKpi.vencidas}</p>
              <p className="text-xs text-rose-600/70">{t.kpiOverdue}</p>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-4">
              <p className="font-display text-2xl font-semibold text-amber-700">{cuotasKpi.pendientes}</p>
              <p className="text-xs text-amber-600/70">{t.kpiPending}</p>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="font-display text-2xl font-semibold text-emerald-700">{cuotasKpi.pagadas}</p>
              <p className="text-xs text-emerald-600/70">{t.kpiPaid}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft">
            <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-3">
              <Search size={15} className="text-ink/35" />
              <input value={buscarCuota} onChange={(e) => setBuscarCuota(e.target.value)} placeholder={t.search} className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35" />
            </div>
            <select value={filtroEstadoCuota} onChange={(e) => setFiltroEstadoCuota(e.target.value as typeof filtroEstadoCuota)} className="h-9 rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none">
              <option value="todos">{t.all}</option>
              <option value="Vencida">{t.estadosCuota.Vencida}</option>
              <option value="Pendiente">{t.estadosCuota.Pendiente}</option>
              <option value="Pagada">{t.estadosCuota.Pagada}</option>
            </select>
          </div>

          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-5 py-3 font-semibold">{t.student}</th>
                    <th className="px-5 py-3 font-semibold">{t.course}</th>
                    <th className="px-5 py-3 font-semibold">{t.installments}</th>
                    <th className="px-5 py-3 font-semibold">{t.dueDate}</th>
                    <th className="px-5 py-3 font-semibold">{t.amount}</th>
                    <th className="px-5 py-3 font-semibold">{t.status}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {cuotasFiltradas.map((c) => (
                    <tr key={c.id} className="hover:bg-brand-50/50">
                      <td className="px-5 py-3 font-semibold text-ink">{c.estudiante}</td>
                      <td className="px-5 py-3 text-ink/60">{c.curso}</td>
                      <td className="px-5 py-3 text-ink/50">{t.installmentOf(c.numero, c.totalCuotas)}</td>
                      <td className="px-5 py-3 text-ink/45">{c.vencimiento}</td>
                      <td className="px-5 py-3 font-semibold text-ink">{c.moneda} {c.monto}</td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={cuotaTone(c.estado)}>{t.estadosCuota[c.estado]}</StatusBadge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {c.estado !== 'Pagada' && (
                          <button onClick={() => registrarPago(c.id)} className="text-xs font-bold text-brand-600 hover:underline">{t.register}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {cuotasFiltradas.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-ink/40">{t.noResults}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {inscripcionSeleccionada && (
        <AdminModal title={t.detail} onClose={() => setInscripcionSel(null)}>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-display text-lg font-semibold text-ink">{inscripcionSeleccionada.estudiante}</p>
              <p className="text-xs text-ink/50">{inscripcionSeleccionada.correo}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-brand-100 p-4 text-xs">
              <div>
                <dt className="text-ink/40">{t.course}</dt>
                <dd className="font-semibold text-ink">{cursos.find((c) => c.id === inscripcionSeleccionada.cursoId)?.titulo}</dd>
              </div>
              <div>
                <dt className="text-ink/40">{t.enrollDate}</dt>
                <dd className="font-semibold text-ink">{inscripcionSeleccionada.fechaInscripcion}</dd>
              </div>
              <div>
                <dt className="text-ink/40">{t.progress}</dt>
                <dd className="font-semibold text-ink">{inscripcionSeleccionada.progreso}%</dd>
              </div>
              <div>
                <dt className="text-ink/40">{esReal ? t.access : t.installments}</dt>
                <dd className="font-semibold text-ink">
                  {esReal
                    ? inscripcionSeleccionada.accesoEstado === 'Activo' ? t.active : t.suspended
                    : `${inscripcionSeleccionada.cuotasPagadas}/${inscripcionSeleccionada.cuotasTotales}`}
                </dd>
              </div>
            </dl>
            <button
              onClick={() => void toggleAcceso(inscripcionSeleccionada.id)}
              disabled={procesando}
              className="w-full rounded-2xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft disabled:opacity-60"
            >
              {inscripcionSeleccionada.accesoEstado === 'Activo' ? t.suspend : t.activate}
            </button>
          </div>
        </AdminModal>
      )}
    </AdminLayout>
  );
}
