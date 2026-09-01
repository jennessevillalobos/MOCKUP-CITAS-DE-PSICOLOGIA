import { useMemo, useState } from 'react';
import { Radio, Link2, Copy, Video, PlayCircle, Users, Search, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import { demoClasesEnVivo, ESTUDIANTES_DISPONIBLES, type ClaseEnVivoRecord, type ClaseEstado, type Destinatario } from '@/data/admin/liveClassesData';
import { demoCursos } from '@/data/admin/coursesData';

type FiltroEstado = 'todas' | ClaseEstado;

const text = {
  es: {
    title: 'Clases en vivo', subtitle: 'Programación y transmisión · datos de demostración',
    formTitle: 'Programar nueva clase', classTitle: 'Título de la clase', course: 'Curso (opcional)', noCourse: 'Sin curso asociado',
    instructor: 'Instructor', date: 'Fecha', time: 'Hora', duration: 'Duración (min)', link: 'Enlace / sala',
    autoLink: 'Generar enlace automático', recipients: 'Destinatarios', all: 'Todos', course2: 'Curso', group: 'Grupo', specific: 'Específicos',
    searchStudent: 'Buscar estudiante…', record: 'Grabar sesión', reminder: 'Enviar recordatorio', saveDraft: 'Guardar borrador',
    schedule: 'Programar clase',
    listTitle: 'Clases programadas', filterAll: 'Todas', scheduled: 'Programadas', live: 'En vivo', finished: 'Finalizadas',
    joinNow: 'Unirse ahora', copyLink: 'Copiar enlace', edit: 'Editar', viewRecording: 'Ver grabación',
    estados: { Programada: 'Programada', 'En vivo': 'En vivo', Finalizada: 'Finalizada', Borrador: 'Borrador' } as Record<ClaseEstado, string>,
    enrolled: 'inscritos', copied: 'Enlace copiado', noClasses: 'No hay clases con este filtro.',
  },
  en: {
    title: 'Live classes', subtitle: 'Scheduling and streaming · demo data',
    formTitle: 'Schedule new class', classTitle: 'Class title', course: 'Course (optional)', noCourse: 'No course linked',
    instructor: 'Instructor', date: 'Date', time: 'Time', duration: 'Duration (min)', link: 'Link / room',
    autoLink: 'Generate link automatically', recipients: 'Recipients', all: 'Everyone', course2: 'Course', group: 'Group', specific: 'Specific',
    searchStudent: 'Search student…', record: 'Record session', reminder: 'Send reminder', saveDraft: 'Save draft',
    schedule: 'Schedule class',
    listTitle: 'Scheduled classes', filterAll: 'All', scheduled: 'Scheduled', live: 'Live', finished: 'Finished',
    joinNow: 'Join now', copyLink: 'Copy link', edit: 'Edit', viewRecording: 'View recording',
    estados: { Programada: 'Scheduled', 'En vivo': 'Live', Finalizada: 'Finished', Borrador: 'Draft' } as Record<ClaseEstado, string>,
    enrolled: 'enrolled', copied: 'Link copied', noClasses: 'No classes match this filter.',
  },
} as const;

function estadoTone(e: ClaseEstado) {
  if (e === 'En vivo') return 'negativo';
  if (e === 'Programada') return 'neutro';
  if (e === 'Finalizada') return 'positivo';
  return 'alerta';
}

export default function AdminLiveClassesPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];
  const [clases, setClases] = useState<ClaseEnVivoRecord[]>(demoClasesEnVivo);
  const [filtro, setFiltro] = useState<FiltroEstado>('todas');
  const [copiado, setCopiado] = useState<string | null>(null);

  const [form, setForm] = useState({
    titulo: '', cursoId: '', instructor: '', fechaISO: '2026-08-25', hora: '17:00', duracionMin: 60,
    enlace: '', destinatarios: 'Todos' as Destinatario, especificos: [] as string[], buscarEst: '',
    grabar: true, recordatorio: true,
  });

  function toggleEspecifico(nombre: string) {
    setForm((f) => ({
      ...f,
      especificos: f.especificos.includes(nombre) ? f.especificos.filter((x) => x !== nombre) : [...f.especificos, nombre],
    }));
  }
  function generarEnlace() {
    setForm((f) => ({ ...f, enlace: `https://meet.psiqueamor.com/sala-${Math.random().toString(16).slice(2, 8)}` }));
  }

  function agregarClase(estado: ClaseEstado) {
    if (!form.titulo.trim()) return;
    const nueva: ClaseEnVivoRecord = {
      id: `lv${Date.now()}`, titulo: form.titulo, cursoId: form.cursoId || undefined, instructor: form.instructor,
      fechaISO: form.fechaISO, hora: form.hora, duracionMin: form.duracionMin, enlace: form.enlace,
      destinatarios: form.destinatarios, estudiantesEspecificos: form.destinatarios === 'Específicos' ? form.especificos : [],
      grabarSesion: form.grabar, recordatorio: form.recordatorio, estado, inscritos: 0,
    };
    setClases((prev) => [nueva, ...prev]);
    setForm({ titulo: '', cursoId: '', instructor: '', fechaISO: '2026-08-25', hora: '17:00', duracionMin: 60, enlace: '', destinatarios: 'Todos', especificos: [], buscarEst: '', grabar: true, recordatorio: true });
  }

  function copiarEnlace(id: string, enlace: string) {
    setCopiado(id);
    setTimeout(() => setCopiado(null), 1500);
    void enlace;
  }

  const filtradas = useMemo(() => {
    if (filtro === 'todas') return clases;
    return clases.filter((c) => c.estado === filtro);
  }, [clases, filtro]);

  const estudiantesFiltrados = ESTUDIANTES_DISPONIBLES.filter((e) => e.toLowerCase().includes(form.buscarEst.toLowerCase()));

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        {/* Formulario */}
        <section className="h-fit space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <Radio size={16} className="text-brand-500" />
            {t.formTitle}
          </p>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.classTitle}</label>
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.course}</label>
              <select value={form.cursoId} onChange={(e) => setForm({ ...form, cursoId: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-2 text-xs text-ink outline-none">
                <option value="">{t.noCourse}</option>
                {demoCursos.map((c) => (
                  <option key={c.id} value={c.id}>{c.titulo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.instructor}</label>
              <input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.date}</label>
              <input type="date" value={form.fechaISO} onChange={(e) => setForm({ ...form, fechaISO: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-2 text-xs text-ink outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.time}</label>
              <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-2 text-xs text-ink outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.duration}</label>
              <input type="number" value={form.duracionMin} onChange={(e) => setForm({ ...form, duracionMin: Number(e.target.value) })} className="h-10 w-full rounded-xl border border-brand-200 px-2 text-xs text-ink outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.link}</label>
            <div className="flex gap-2">
              <input value={form.enlace} onChange={(e) => setForm({ ...form, enlace: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-xs text-ink outline-none" placeholder="https://" />
              <button onClick={generarEnlace} className="flex shrink-0 items-center gap-1 rounded-xl border border-brand-200 px-3 text-xs font-bold text-brand-700 hover:bg-brand-50" title={t.autoLink}>
                <Link2 size={14} />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.recipients}</label>
            <div className="flex gap-1 rounded-2xl border border-brand-100 bg-brand-50/40 p-1">
              {(['Todos', 'Curso', 'Grupo', 'Específicos'] as Destinatario[]).map((op) => (
                <button
                  key={op}
                  onClick={() => setForm({ ...form, destinatarios: op })}
                  className={`flex-1 rounded-xl px-2 py-1.5 text-[11px] font-bold transition ${
                    form.destinatarios === op ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/50 hover:bg-white'
                  }`}
                >
                  {op === 'Todos' ? t.all : op === 'Curso' ? t.course2 : op === 'Grupo' ? t.group : t.specific}
                </button>
              ))}
            </div>

            {form.destinatarios === 'Específicos' && (
              <div className="mt-2 space-y-2">
                <div className="flex h-9 items-center gap-2 rounded-xl border border-brand-100 bg-white px-2">
                  <Search size={13} className="text-ink/35" />
                  <input value={form.buscarEst} onChange={(e) => setForm({ ...form, buscarEst: e.target.value })} placeholder={t.searchStudent} className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink/35" />
                </div>
                <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                  {estudiantesFiltrados.map((e) => (
                    <button
                      key={e}
                      onClick={() => toggleEspecifico(e)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                        form.especificos.includes(e) ? 'border-brand-300 bg-brand-100 text-brand-700' : 'border-brand-100 bg-white text-ink/50 hover:bg-brand-50'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center justify-between text-sm text-ink/70">
            <span className="flex items-center gap-1.5"><Video size={14} className="text-brand-500" />{t.record}</span>
            <input type="checkbox" checked={form.grabar} onChange={(e) => setForm({ ...form, grabar: e.target.checked })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
          </label>
          <label className="flex items-center justify-between text-sm text-ink/70">
            <span className="flex items-center gap-1.5"><RefreshCw size={14} className="text-brand-500" />{t.reminder}</span>
            <input type="checkbox" checked={form.recordatorio} onChange={(e) => setForm({ ...form, recordatorio: e.target.checked })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
          </label>

          <div className="flex gap-2 border-t border-brand-100 pt-3">
            <button onClick={() => agregarClase('Borrador')} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-xs font-bold text-ink/60 hover:bg-brand-50">{t.saveDraft}</button>
            <button onClick={() => agregarClase('Programada')} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-xs font-bold text-white shadow-soft">{t.schedule}</button>
          </div>
        </section>

        {/* Lista */}
        <section className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(['todas', 'Programada', 'En vivo', 'Finalizada'] as FiltroEstado[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  filtro === f ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 bg-white text-ink/55 hover:bg-brand-50'
                }`}
              >
                {f === 'todas' ? t.filterAll : f === 'Programada' ? t.scheduled : f === 'En vivo' ? t.live : t.finished}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtradas.map((c) => (
              <div key={c.id} className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {c.estado === 'En vivo' && <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />}
                      <p className="font-display text-base font-semibold text-ink sm:text-lg">{c.titulo}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-ink/50">{c.instructor} · {c.fechaISO} · {c.hora} · {c.duracionMin} min</p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-ink/40">
                      <Users size={12} />
                      {c.inscritos} {t.enrolled} · {c.destinatarios}
                    </p>
                  </div>
                  <StatusBadge tone={estadoTone(c.estado)}>{t.estados[c.estado]}</StatusBadge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-brand-50 pt-3">
                  {c.estado === 'En vivo' && (
                    <a href={c.enlace || '#'} className="flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-1.5 text-xs font-bold text-white shadow-soft">
                      <PlayCircle size={14} />
                      {t.joinNow}
                    </a>
                  )}
                  {(c.estado === 'Programada' || c.estado === 'Borrador') && (
                    <>
                      <button onClick={() => copiarEnlace(c.id, c.enlace)} className="flex items-center gap-1.5 rounded-xl border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50">
                        <Copy size={13} />
                        {copiado === c.id ? t.copied : t.copyLink}
                      </button>
                      <button className="rounded-xl border border-brand-100 px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-brand-50">{t.edit}</button>
                    </>
                  )}
                  {c.estado === 'Finalizada' && c.grabacionUrl && (
                    <a href={c.grabacionUrl} className="flex items-center gap-1.5 rounded-xl border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50">
                      <PlayCircle size={13} />
                      {t.viewRecording}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {filtradas.length === 0 && <p className="py-10 text-center text-sm text-ink/40">{t.noClasses}</p>}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
