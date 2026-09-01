import { useMemo, useState } from 'react';
import { Search, Eye, Unlock } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminDrawer from '@/components/admin/ui/AdminDrawer';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import {
  demoEvaluaciones, demoPendientesCalificar,
  type EvaluacionRecord, type PendienteCalificar, type EstadoEvaluacion,
} from '@/data/admin/assessmentsData';

type Tab = 'eva' | 'cal' | 'res';

const text = {
  es: {
    title: 'Evaluaciones', subtitle: 'Supervisa las evaluaciones de todos los cursos e instructores de la plataforma',
    kpiActive: 'Evaluaciones activas', kpiAttempts: 'Intentos este mes', kpiPending: 'Pendientes por calificar', kpiPassRate: 'Promedio de aprobación',
    tabs: { eva: 'Evaluaciones', cal: 'Por calificar', res: 'Resultados' } as Record<Tab, string>,
    search: 'Buscar evaluación, curso o instructor…', course: 'Curso', status: 'Estado', all: 'Todos',
    published: 'Publicada', draft: 'Borrador',
    assessment: 'Evaluación', courseModule: 'Curso · módulo', instructor: 'Instructor', attempts: 'Intentos',
    passMark: 'Nota mín.', evaluated: 'Evaluados', noResults: 'No hay evaluaciones con este filtro.',
    tipos: { Mixta: 'Mixta', 'Opción múltiple': 'Opción múltiple' } as Record<EvaluacionRecord['tipo'], string>,
    // drawer detalle
    detailCourse: 'Curso', detailModule: 'Módulo', attemptsAllowed: 'Intentos permitidos', minGrade: 'Nota mínima',
    toDraft: 'Pasar a borrador', publish: 'Publicar', unlockTitle: 'Liberar acceso manualmente',
    unlockDesc: 'Salta la regla de desbloqueo para un estudiante puntual, sin importar su progreso o nota previa.',
    studentEmail: 'Correo del estudiante', unlockBtn: 'Liberar acceso', invalidEmail: 'Ingresa un correo válido primero.',
    unlockedFor: 'Acceso liberado para',
    // por calificar
    searchStudent: 'Buscar estudiante o curso…', student: 'Estudiante', question: 'Pregunta', submitted: 'Enviado',
    grade: 'Calificar', pending: 'pendientes', noQueue: 'Nada pendiente — la bandeja de calificación está vacía.',
    gradeAnswer: 'Calificar respuesta', gradeLabel: 'Nota (0–100)', feedback: 'Comentario (opcional)', save: 'Guardar calificación',
    gradeError: 'Ingresa una nota entre 0 y 100.',
    // resultados
    noAttemptsYet: 'Sin intentos aún', passed: 'aprobado', noResultsYet: 'Todavía no hay resultados — ninguna evaluación se ha presentado.',
  },
  en: {
    title: 'Assessments', subtitle: 'Oversee assessments across every course and instructor on the platform',
    kpiActive: 'Active assessments', kpiAttempts: 'Attempts this month', kpiPending: 'Pending grading', kpiPassRate: 'Average pass rate',
    tabs: { eva: 'Assessments', cal: 'To grade', res: 'Results' } as Record<Tab, string>,
    search: 'Search assessment, course or instructor…', course: 'Course', status: 'Status', all: 'All',
    published: 'Published', draft: 'Draft',
    assessment: 'Assessment', courseModule: 'Course · module', instructor: 'Instructor', attempts: 'Attempts',
    passMark: 'Pass mark', evaluated: 'Evaluated', noResults: 'No assessments match this filter yet.',
    tipos: { Mixta: 'Mixed', 'Opción múltiple': 'Multiple choice' } as Record<EvaluacionRecord['tipo'], string>,
    detailCourse: 'Course', detailModule: 'Module', attemptsAllowed: 'Attempts allowed', minGrade: 'Pass mark',
    toDraft: 'Move to draft', publish: 'Publish', unlockTitle: 'Manually unlock access',
    unlockDesc: 'Skips the unlock rule for a specific student, regardless of their progress or previous grade.',
    studentEmail: 'Student email', unlockBtn: 'Unlock access', invalidEmail: 'Enter a valid email first.',
    unlockedFor: 'Access unlocked for',
    searchStudent: 'Search student or course…', student: 'Student', question: 'Question', submitted: 'Submitted',
    grade: 'Grade', pending: 'pending', noQueue: 'Nothing pending — the grading queue is empty.',
    gradeAnswer: 'Grade answer', gradeLabel: 'Grade (0–100)', feedback: 'Feedback (optional)', save: 'Save grade',
    gradeError: 'Enter a grade between 0 and 100.',
    noAttemptsYet: 'No attempts yet', passed: 'passed', noResultsYet: 'No results yet — no assessment has been taken.',
  },
} as const;

function estadoTone(e: EstadoEvaluacion) {
  return e === 'Publicada' ? 'positivo' : 'alerta';
}

export default function AdminAssessmentsPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];

  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRecord[]>(demoEvaluaciones);
  const [pendientes, setPendientes] = useState<PendienteCalificar[]>(demoPendientesCalificar);

  const [tab, setTab] = useState<Tab>('eva');
  const [buscarEva, setBuscarEva] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoEvaluacion>('todos');
  const [buscarCal, setBuscarCal] = useState('');

  const [evaluacionSelId, setEvaluacionSelId] = useState<string | null>(null);
  const [correoLiberar, setCorreoLiberar] = useState('');
  const [mensajeLiberar, setMensajeLiberar] = useState<{ ok: boolean; texto: string } | null>(null);

  const [calificarSelId, setCalificarSelId] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [comentario, setComentario] = useState('');
  const [errorNota, setErrorNota] = useState(false);

  const cursos = useMemo(() => Array.from(new Set(evaluaciones.map((e) => e.curso))), [evaluaciones]);

  const evaluacionesFiltradas = useMemo(
    () =>
      evaluaciones.filter((e) => {
        const q = buscarEva.toLowerCase();
        const matchQ = !q || e.nombre.toLowerCase().includes(q) || e.curso.toLowerCase().includes(q) || e.instructor.toLowerCase().includes(q);
        return matchQ && (filtroCurso === 'todos' || e.curso === filtroCurso) && (filtroEstado === 'todos' || e.estado === filtroEstado);
      }),
    [evaluaciones, buscarEva, filtroCurso, filtroEstado],
  );

  const pendientesFiltrados = useMemo(
    () => pendientes.filter((p) => p.estudiante.toLowerCase().includes(buscarCal.toLowerCase()) || p.curso.toLowerCase().includes(buscarCal.toLowerCase())),
    [pendientes, buscarCal],
  );

  const kpis = useMemo(() => {
    const activas = evaluaciones.filter((e) => e.estado === 'Publicada').length;
    const intentos = evaluaciones.reduce((acc, e) => acc + e.evaluados, 0);
    const totalEval = evaluaciones.reduce((acc, e) => acc + e.evaluados, 0);
    const totalAprob = evaluaciones.reduce((acc, e) => acc + e.aprobados, 0);
    const pct = totalEval ? Math.round((totalAprob / totalEval) * 100) : null;
    return { activas, intentos, pendientes: pendientes.length, pct };
  }, [evaluaciones, pendientes]);

  const resultadosPorCurso = useMemo(() => {
    const map = new Map<string, { curso: string; evaluados: number; aprobados: number }>();
    evaluaciones.forEach((e) => {
      const cur = map.get(e.curso) ?? { curso: e.curso, evaluados: 0, aprobados: 0 };
      cur.evaluados += e.evaluados;
      cur.aprobados += e.aprobados;
      map.set(e.curso, cur);
    });
    return Array.from(map.values());
  }, [evaluaciones]);

  const evaluacionSel = evaluaciones.find((e) => e.id === evaluacionSelId) || null;
  const calificarSel = pendientes.find((p) => p.id === calificarSelId) || null;

  function abrirEvaluacion(id: string) {
    setEvaluacionSelId(id);
    setCorreoLiberar('');
    setMensajeLiberar(null);
  }
  function toggleEstadoEvaluacion(id: string) {
    setEvaluaciones((prev) => prev.map((e) => (e.id === id ? { ...e, estado: e.estado === 'Publicada' ? 'Borrador' : 'Publicada' } : e)));
  }
  function liberarAcceso() {
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRe.test(correoLiberar.trim())) {
      setMensajeLiberar({ ok: false, texto: t.invalidEmail });
      return;
    }
    setMensajeLiberar({ ok: true, texto: `${t.unlockedFor} ${correoLiberar.trim()}.` });
    setCorreoLiberar('');
  }

  function abrirCalificar(id: string) {
    setCalificarSelId(id);
    setNota('');
    setComentario('');
    setErrorNota(false);
  }
  function guardarCalificacion() {
    const n = Number(nota);
    if (nota === '' || Number.isNaN(n) || n < 0 || n > 100) {
      setErrorNota(true);
      return;
    }
    if (calificarSel) setPendientes((prev) => prev.filter((p) => p.id !== calificarSel.id));
    setCalificarSelId(null);
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs text-ink/50"><span className="h-2 w-2 rounded-full bg-brand-500" />{t.kpiActive}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink">{kpis.activas}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs text-ink/50"><span className="h-2 w-2 rounded-full bg-lilac-500" />{t.kpiAttempts}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink">{kpis.intentos}</p>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-amber-50/40 p-4">
          <p className="flex items-center gap-1.5 text-xs text-amber-700/70"><span className="h-2 w-2 rounded-full bg-amber-500" />{t.kpiPending}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-amber-700">{kpis.pendientes}</p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
          <p className="flex items-center gap-1.5 text-xs text-emerald-700/70"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t.kpiPassRate}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-emerald-700">{kpis.pct !== null ? `${kpis.pct}%` : '—'}</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-2xl border border-brand-100 bg-white p-1 sm:w-fit">
        {(['eva', 'cal', 'res'] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
              tab === tb ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/50 hover:bg-brand-50'
            }`}
          >
            {t.tabs[tb]}
            {tb === 'cal' && kpis.pendientes > 0 && (
              <span className="rounded-full bg-amber-400/20 px-1.5 text-[10px] font-bold text-amber-600">{kpis.pendientes}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'eva' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3">
              <Search size={15} className="text-ink/35" />
              <input value={buscarEva} onChange={(e) => setBuscarEva(e.target.value)} placeholder={t.search} className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35" />
            </div>
            <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} className="h-9 rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none">
              <option value="todos">{t.course}</option>
              {cursos.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className="h-9 rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none">
              <option value="todos">{t.status}</option>
              <option value="Publicada">{t.published}</option>
              <option value="Borrador">{t.draft}</option>
            </select>
          </div>

          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-4 py-3 font-semibold">{t.assessment}</th>
                    <th className="px-4 py-3 font-semibold">{t.courseModule}</th>
                    <th className="px-4 py-3 font-semibold">{t.instructor}</th>
                    <th className="px-4 py-3 font-semibold">{t.attempts}</th>
                    <th className="px-4 py-3 font-semibold">{t.passMark}</th>
                    <th className="px-4 py-3 font-semibold">{t.evaluated}</th>
                    <th className="px-4 py-3 font-semibold">{t.status}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {evaluacionesFiltradas.map((e) => {
                    const pctA = e.evaluados ? Math.round((e.aprobados / e.evaluados) * 100) : null;
                    return (
                      <tr key={e.id} className="cursor-pointer hover:bg-brand-50/50" onClick={() => abrirEvaluacion(e.id)}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{e.nombre}</p>
                          <p className="text-xs text-ink/45">{t.tipos[e.tipo]}</p>
                        </td>
                        <td className="px-4 py-3 text-ink/60">{e.curso}<br /><span className="text-xs text-ink/40">{e.modulo}</span></td>
                        <td className="px-4 py-3 text-ink/60">{e.instructor}</td>
                        <td className="px-4 py-3 text-ink/60">{e.intentos}</td>
                        <td className="px-4 py-3 text-ink/60">{e.notaMinima}%</td>
                        <td className="px-4 py-3 text-ink/60">{e.evaluados}{pctA !== null && <span className="text-xs text-ink/40"> ({pctA}% ✓)</span>}</td>
                        <td className="px-4 py-3"><StatusBadge tone={estadoTone(e.estado)}>{e.estado === 'Publicada' ? t.published : t.draft}</StatusBadge></td>
                        <td className="px-4 py-3 text-right"><Eye size={15} className="text-ink/35" /></td>
                      </tr>
                    );
                  })}
                  {evaluacionesFiltradas.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ink/40">{t.noResults}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === 'cal' && (
        <>
          <div className="flex h-10 w-full max-w-sm items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3">
            <Search size={15} className="text-ink/35" />
            <input value={buscarCal} onChange={(e) => setBuscarCal(e.target.value)} placeholder={t.searchStudent} className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35" />
          </div>
          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-4 py-3 font-semibold">{t.student}</th>
                    <th className="px-4 py-3 font-semibold">{t.course}</th>
                    <th className="px-4 py-3 font-semibold">{t.question}</th>
                    <th className="px-4 py-3 font-semibold">{t.submitted}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {pendientesFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-brand-50/50">
                      <td className="px-4 py-3 font-semibold text-ink">{p.estudiante}</td>
                      <td className="px-4 py-3 text-ink/60">{p.curso}</td>
                      <td className="px-4 py-3 max-w-[280px] truncate text-ink/50">{p.pregunta}</td>
                      <td className="px-4 py-3 text-ink/45">{p.fecha}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => abrirCalificar(p.id)} className="rounded-full border border-brand-200 px-3 py-1 text-xs font-bold text-brand-700 hover:bg-brand-50">
                          {t.grade}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendientesFiltrados.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink/40">{t.noQueue}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === 'res' && (
        <section className="space-y-5 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          {resultadosPorCurso.length === 0 || resultadosPorCurso.every((c) => !c.evaluados) ? (
            <p className="py-8 text-center text-sm text-ink/40">{t.noResultsYet}</p>
          ) : (
            resultadosPorCurso.map((c) => {
              const pct = c.evaluados ? Math.round((c.aprobados / c.evaluados) * 100) : 0;
              const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <div key={c.curso}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink">{c.curso}</span>
                    <span className="text-ink/50">{c.evaluados ? `${pct}% ${t.passed} · ${c.evaluados} ${t.evaluated.toLowerCase()}` : t.noAttemptsYet}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-50">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${c.evaluados ? pct : 0}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {evaluacionSel && (
        <AdminDrawer title={evaluacionSel.nombre} onClose={() => setEvaluacionSelId(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge tone={estadoTone(evaluacionSel.estado)}>{evaluacionSel.estado === 'Publicada' ? t.published : t.draft}</StatusBadge>
              <span className="text-xs text-ink/45">{t.tipos[evaluacionSel.tipo]}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-brand-50/50 p-3">
                <p className="text-[11px] text-ink/40">{t.detailCourse}</p>
                <p className="font-semibold text-ink">{evaluacionSel.curso}</p>
              </div>
              <div className="rounded-xl bg-brand-50/50 p-3">
                <p className="text-[11px] text-ink/40">{t.detailModule}</p>
                <p className="font-semibold text-ink">{evaluacionSel.modulo}</p>
              </div>
              <div className="rounded-xl bg-brand-50/50 p-3">
                <p className="text-[11px] text-ink/40">{t.instructor}</p>
                <p className="font-semibold text-ink">{evaluacionSel.instructor}</p>
              </div>
              <div className="rounded-xl bg-brand-50/50 p-3">
                <p className="text-[11px] text-ink/40">{t.attemptsAllowed}</p>
                <p className="font-semibold text-ink">{evaluacionSel.intentos}</p>
              </div>
              <div className="rounded-xl bg-brand-50/50 p-3">
                <p className="text-[11px] text-ink/40">{t.minGrade}</p>
                <p className="font-semibold text-ink">{evaluacionSel.notaMinima}%</p>
              </div>
              <div className="rounded-xl bg-brand-50/50 p-3">
                <p className="text-[11px] text-ink/40">{t.evaluated}</p>
                <p className="font-semibold text-ink">{evaluacionSel.evaluados}{evaluacionSel.evaluados > 0 && ` (${Math.round((evaluacionSel.aprobados / evaluacionSel.evaluados) * 100)}% ✓)`}</p>
              </div>
            </div>

            <button
              onClick={() => toggleEstadoEvaluacion(evaluacionSel.id)}
              className={`w-full rounded-xl py-2.5 text-sm font-bold ${
                evaluacionSel.estado === 'Publicada' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {evaluacionSel.estado === 'Publicada' ? t.toDraft : t.publish}
            </button>

            <div className="space-y-2 border-t border-brand-100 pt-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Unlock size={14} className="text-brand-500" />{t.unlockTitle}</p>
              <p className="text-xs text-ink/50">{t.unlockDesc}</p>
              <input
                type="email" value={correoLiberar} onChange={(e) => setCorreoLiberar(e.target.value)} placeholder={t.studentEmail}
                className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none"
              />
              <button onClick={liberarAcceso} className="w-full rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">{t.unlockBtn}</button>
              {mensajeLiberar && (
                <p className={`text-xs ${mensajeLiberar.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{mensajeLiberar.texto}</p>
              )}
            </div>
          </div>
        </AdminDrawer>
      )}

      {calificarSel && (
        <AdminDrawer title={t.gradeAnswer} onClose={() => setCalificarSelId(null)}>
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-50/50 p-3">
              <p className="text-[11px] text-ink/40">{t.student}</p>
              <p className="font-semibold text-ink">{calificarSel.estudiante}</p>
              <p className="mt-0.5 text-xs text-ink/45">{calificarSel.curso} · {calificarSel.fecha}</p>
            </div>
            <div className="rounded-xl bg-brand-50/50 p-3">
              <p className="text-[11px] text-ink/40">{t.question}</p>
              <p className="mt-1 text-sm text-ink/80">{calificarSel.pregunta}</p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.gradeLabel}</label>
              <input
                type="number" min={0} max={100} value={nota}
                onChange={(e) => { setNota(e.target.value); setErrorNota(false); }}
                className={`h-10 w-full rounded-xl border px-3 text-sm text-ink outline-none ${errorNota ? 'border-rose-300' : 'border-brand-200'}`}
              />
              {errorNota && <p className="mt-1 text-xs text-rose-600">{t.gradeError}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.feedback}</label>
              <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink outline-none" />
            </div>
            <button onClick={guardarCalificacion} className="w-full rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">{t.save}</button>
          </div>
        </AdminDrawer>
      )}
    </AdminLayout>
  );
}
