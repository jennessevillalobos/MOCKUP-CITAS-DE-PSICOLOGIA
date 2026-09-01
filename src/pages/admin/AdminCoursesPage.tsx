import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap, Users, Lock, Receipt, Search, Plus, Award, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminModal from '@/components/admin/ui/AdminModal';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import {
  demoCursos, demoInscripciones, demoReglas, demoCuotas,
  type CursoRecord, type InscripcionRecord, type ReglaDesbloqueo, type CuotaRecord, type CuotaEstado, type TipoRegla,
} from '@/data/admin/coursesData';

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

  const [cursos] = useState<CursoRecord[]>(demoCursos);
  const [inscripciones, setInscripciones] = useState<InscripcionRecord[]>(demoInscripciones);
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

  function toggleAcceso(id: string) {
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

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">{t.subtitle}</p>
        </div>
        {tab === 'cursos' && (
          <button className="flex h-10 items-center gap-2 rounded-2xl bg-brand-gradient px-4 text-sm font-bold text-white shadow-soft">
            <Plus size={16} />
            {t.newCourse}
          </button>
        )}
      </div>

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

      {tab === 'reglas' && (
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

              <div className="flex gap-2 border-t border-brand-100 pt-3">
                <button className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">{t.discard}</button>
                <button className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">{t.save}</button>
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'cuotas' && (
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
                <dt className="text-ink/40">{t.installments}</dt>
                <dd className="font-semibold text-ink">{inscripcionSeleccionada.cuotasPagadas}/{inscripcionSeleccionada.cuotasTotales}</dd>
              </div>
            </dl>
            <button
              onClick={() => toggleAcceso(inscripcionSeleccionada.id)}
              className="w-full rounded-2xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft"
            >
              {inscripcionSeleccionada.accesoEstado === 'Activo' ? t.suspend : t.activate}
            </button>
          </div>
        </AdminModal>
      )}
    </AdminLayout>
  );
}
