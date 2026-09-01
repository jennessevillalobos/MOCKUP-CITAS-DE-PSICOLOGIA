import { useState, useMemo } from 'react';
import { Star, Search, CheckCircle2, EyeOff, Trash2, MessageSquare, Filter } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAdminLanguage } from '@/context/AdminLanguageContext';

type EstadoReseña = 'pendiente' | 'aprobada' | 'oculta';
type TonoBadge = 'positivo' | 'neutro' | 'negativo';

interface Reseña {
  id: string;
  paciente: string;
  profesional: string;
  servicio: string;
  estrellas: number;
  comentario: string;
  fecha: string;
  estado: EstadoReseña;
}

const demoReseñas: Reseña[] = [
  { id: 'r1', paciente: 'María González', profesional: 'Dra. Carla Méndez', servicio: 'Terapia individual', estrellas: 5, comentario: 'Excelente profesional, me ayudó a entender mis patrones de conducta y a trabajar en ellos de forma práctica. La recomiendo totalmente.', fecha: '2026-08-20', estado: 'pendiente' },
  { id: 'r2', paciente: 'Pedro Ramírez', profesional: 'Lic. Jorge Herrera', servicio: 'Terapia de pareja', estrellas: 4, comentario: 'Muy buena sesión. Dimos pasos importantes como pareja. El espacio fue muy seguro y el enfoque fue directo al problema.', fecha: '2026-08-18', estado: 'aprobada' },
  { id: 'r3', paciente: 'Sofía Alvarado', profesional: 'Dra. Carla Méndez', servicio: 'Terapia individual', estrellas: 2, comentario: 'La sesión fue muy corta y no siento que hayamos avanzado. Esperaba más orientación concreta sobre mi situación.', fecha: '2026-08-15', estado: 'pendiente' },
  { id: 'r4', paciente: 'Luis Montoya', profesional: 'Psic. Valeria Castro', servicio: 'Curso: Manejo de ansiedad', estrellas: 5, comentario: 'El curso cambió mi perspectiva. Muy completo, con ejercicios prácticos que puedo aplicar en mi día a día. 100% recomendado.', fecha: '2026-08-12', estado: 'aprobada' },
  { id: 'r5', paciente: 'Ana Castillo', profesional: 'Lic. Jorge Herrera', servicio: 'Terapia familiar', estrellas: 1, comentario: 'Pésima experiencia. El profesional llegó tarde y no mostró interés en nuestra situación familiar.', fecha: '2026-08-10', estado: 'pendiente' },
  { id: 'r6', paciente: 'Carlos Vega', profesional: 'Psic. Valeria Castro', servicio: 'Terapia individual', estrellas: 5, comentario: 'Me sentí escuchado desde la primera sesión. Es una profesional empática, preparada y muy humana.', fecha: '2026-08-08', estado: 'aprobada' },
  { id: 'r7', paciente: 'Valentina Torres', profesional: 'Dra. Carla Méndez', servicio: 'Terapia de pareja', estrellas: 3, comentario: 'La sesión fue correcta pero esperaba más dinamismo. El consultorio virtual funcionó bien. Seguiremos en el proceso.', fecha: '2026-08-05', estado: 'oculta' },
];

const text = {
  es: {
    title: 'Moderación de reseñas', subtitle: 'Revisa, aprueba u oculta los comentarios de los pacientes · datos de demostración',
    search: 'Buscar por paciente, profesional…', all: 'Todos', filterEstado: 'Filtrar por estado',
    estados: { pendiente: 'Pendiente', aprobada: 'Aprobada', oculta: 'Oculta' } as Record<EstadoReseña, string>,
    profesional: 'Profesional', paciente: 'Paciente', servicio: 'Servicio', fecha: 'Fecha', calificacion: 'Calificación', comentario: 'Comentario', estado: 'Estado', acciones: 'Acciones',
    aprobar: 'Aprobar', ocultar: 'Ocultar', eliminar: 'Eliminar', confirmEliminar: '¿Eliminar esta reseña? Esta acción no se puede deshacer.',
    noResultados: 'No hay reseñas que coincidan con tu búsqueda.',
    kpiTotal: 'Total de reseñas', kpiPendiente: 'Pendientes de revisión', kpiAprobadas: 'Aprobadas', kpiPromedio: 'Calificación promedio',
  },
  en: {
    title: 'Review moderation', subtitle: 'Review, approve or hide patient comments · demo data',
    search: 'Search by patient, professional…', all: 'All', filterEstado: 'Filter by status',
    estados: { pendiente: 'Pending', aprobada: 'Approved', oculta: 'Hidden' } as Record<EstadoReseña, string>,
    profesional: 'Professional', paciente: 'Patient', servicio: 'Service', fecha: 'Date', calificacion: 'Rating', comentario: 'Comment', estado: 'Status', acciones: 'Actions',
    aprobar: 'Approve', ocultar: 'Hide', eliminar: 'Delete', confirmEliminar: 'Delete this review? This action cannot be undone.',
    noResultados: 'No reviews match your search.',
    kpiTotal: 'Total reviews', kpiPendiente: 'Pending review', kpiAprobadas: 'Approved', kpiPromedio: 'Average rating',
  },
} as const;

function tonoDeBadge(estado: EstadoReseña): TonoBadge {
  if (estado === 'aprobada') return 'positivo';
  if (estado === 'oculta') return 'negativo';
  return 'neutro';
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-ink/20 fill-ink/20'}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];

  const [reseñas, setReseñas] = useState<Reseña[]>(demoReseñas);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoReseña | 'todos'>('todos');

  const kpiTotal = reseñas.length;
  const kpiPendiente = reseñas.filter(r => r.estado === 'pendiente').length;
  const kpiAprobadas = reseñas.filter(r => r.estado === 'aprobada').length;
  const kpiPromedio = (reseñas.reduce((acc, r) => acc + r.estrellas, 0) / reseñas.length).toFixed(1);

  const reseñasFiltradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return reseñas.filter((r) => {
      const matchTexto = r.paciente.toLowerCase().includes(q) || r.profesional.toLowerCase().includes(q) || r.comentario.toLowerCase().includes(q);
      const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
      return matchTexto && matchEstado;
    });
  }, [reseñas, buscar, filtroEstado]);

  function cambiarEstado(id: string, nuevo: EstadoReseña) {
    setReseñas(prev => prev.map(r => r.id === id ? { ...r, estado: nuevo } : r));
  }

  function eliminar(id: string) {
    if (!window.confirm(t.confirmEliminar)) return;
    setReseñas(prev => prev.filter(r => r.id !== id));
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">{t.subtitle}</p>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: t.kpiTotal, value: kpiTotal, icon: MessageSquare, color: 'text-brand-500 bg-brand-50' },
          { label: t.kpiPendiente, value: kpiPendiente, icon: Filter, color: 'text-amber-500 bg-amber-50' },
          { label: t.kpiAprobadas, value: kpiAprobadas, icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
          { label: t.kpiPromedio, value: `⭐ ${kpiPromedio}`, icon: Star, color: 'text-amber-500 bg-amber-50' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="flex items-center gap-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${kpi.color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-ink/50">{kpi.label}</p>
                <p className="font-display text-xl font-bold text-ink">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft sm:px-5 sm:py-3">
        <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-3">
          <Search size={15} className="text-ink/35" />
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder={t.search}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
          className="h-9 rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none"
        >
          <option value="todos">{t.all} · {t.filterEstado}</option>
          {(['pendiente', 'aprobada', 'oculta'] as EstadoReseña[]).map((e) => (
            <option key={e} value={e}>{t.estados[e]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {reseñasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-brand-200 bg-brand-50/30 py-16 text-center">
          <MessageSquare size={36} className="mb-3 text-brand-200" />
          <p className="text-sm text-ink/50">{t.noResultados}</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-5 py-3 font-semibold">{t.paciente}</th>
                  <th className="px-5 py-3 font-semibold">{t.profesional}</th>
                  <th className="px-5 py-3 font-semibold">{t.calificacion}</th>
                  <th className="px-5 py-3 font-semibold">{t.comentario}</th>
                  <th className="px-5 py-3 font-semibold">{t.fecha}</th>
                  <th className="px-5 py-3 font-semibold">{t.estado}</th>
                  <th className="px-5 py-3 font-semibold">{t.acciones}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {reseñasFiltradas.map((r) => (
                  <tr key={r.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{r.paciente}</p>
                      <p className="text-xs text-ink/45">{r.servicio}</p>
                    </td>
                    <td className="px-5 py-4 text-ink/70">{r.profesional}</td>
                    <td className="px-5 py-4">
                      <StarRating value={r.estrellas} />
                      <p className="mt-0.5 text-xs font-bold text-amber-500">{r.estrellas}/5</p>
                    </td>
                    <td className="px-5 py-4 max-w-[260px]">
                      <p className="line-clamp-2 text-xs leading-relaxed text-ink/70">{r.comentario}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-ink/45">{r.fecha}</td>
                    <td className="px-5 py-4">
                      <StatusBadge tone={tonoDeBadge(r.estado)}>{t.estados[r.estado]}</StatusBadge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {r.estado !== 'aprobada' && (
                          <button
                            onClick={() => cambiarEstado(r.id, 'aprobada')}
                            title={t.aprobar}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        {r.estado !== 'oculta' && (
                          <button
                            onClick={() => cambiarEstado(r.id, 'oculta')}
                            title={t.ocultar}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-ink/50 transition hover:bg-brand-100"
                          >
                            <EyeOff size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => eliminar(r.id)}
                          title={t.eliminar}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AdminLayout>
  );
}
