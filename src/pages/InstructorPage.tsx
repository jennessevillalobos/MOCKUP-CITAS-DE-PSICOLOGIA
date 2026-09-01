import { Link } from 'react-router-dom';
import {
  GraduationCap, Users, Star, ClipboardCheck, CheckCircle2, Plus, Radio, CalendarDays, Video, MapPin,
} from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { INSTRUCTOR_NAV_LABELS, buildInstructorNav } from '@/components/site/instructorNav';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useInstructorAgenda } from '@/context/InstructorAgendaContext';
import { useInstructorCourses } from '@/context/InstructorCoursesContext';
import { useInstructorLiveClasses } from '@/context/InstructorLiveClassesContext';
import { useInstructorGrading } from '@/context/InstructorGradingContext';
import { AGENDA_INSTRUCTOR_HOY } from '@/data/citasInstructorData';
import { CURSOS_META, CURSOS_INFO_DEMO } from '@/data/instructorCoursesData';
import { HOY_VIVO } from '@/data/clasesVivoInstructorData';
import { ACTIVIDAD_INSTRUCTOR } from '@/data/instructorPortalData';

const text = {
  es: {
    misCursos: 'Mis cursos', constructor: 'Constructor de cursos', evaluaciones: 'Evaluaciones', agenda: 'Agenda / Disponibilidad',
    clasesEnVivo: 'Clases en vivo', notificaciones: 'Notificaciones',
    hola: 'Hola', resumen: 'Resumen de tu actividad como instructora.', nuevoCurso: '+ Nuevo curso',
    cursosLabel: 'Cursos', publicados: 'publicados', borrador: 'borrador',
    estudiantesActivos: 'Estudiantes activos', esteMs: 'este mes',
    porCalificar: 'Por calificar', respuestasAbiertas: 'respuestas abiertas',
    proximasEnVivo: 'Próximas en vivo', estaSemana: 'esta semana',
    misCursosTitle: 'Mis cursos', verTodos: 'Ver todos', estudiantes: 'estudiantes', publicado: 'Publicado', borradorLabel: 'Borrador', sinPublicar: 'Sin publicar',
    actividadReciente: 'Actividad reciente',
    porCalificarTitle: 'Por calificar', calificar: 'Calificar', verTodasN: (n: number) => `Ver todas (${n})`,
    proximasClasesTitle: 'Próximas clases en vivo', hoyLabelVivo: 'HOY', iniciar: 'Iniciar', unirse: 'Unirse', ver: 'Ver', programarClase: 'Programar clase',
    sinClasesVivo: 'No tienes clases en vivo próximas.', claseDe: 'de',
    proximaCita: 'Tu próxima cita', sinProximas: 'No tienes citas próximas.',
    hoyLabel: 'hoy', citasHoyLabel: 'citas hoy', citasSemanaLabel: 'citas esta semana',
    verMisCitas: 'Ver mis citas', enLinea: 'En línea',
  },
  en: {
    misCursos: 'My courses', constructor: 'Course builder', evaluaciones: 'Assessments', agenda: 'Schedule / Availability',
    clasesEnVivo: 'Live classes', notificaciones: 'Notifications',
    hola: 'Hi', resumen: 'Summary of your teaching activity.', nuevoCurso: '+ New course',
    cursosLabel: 'Courses', publicados: 'published', borrador: 'draft',
    estudiantesActivos: 'Active students', esteMs: 'this month',
    porCalificar: 'To grade', respuestasAbiertas: 'open answers',
    proximasEnVivo: 'Upcoming live', estaSemana: 'this week',
    misCursosTitle: 'My courses', verTodos: 'All', estudiantes: 'students', publicado: 'Published', borradorLabel: 'Draft', sinPublicar: 'Unpublished',
    actividadReciente: 'Recent activity',
    porCalificarTitle: 'To grade', calificar: 'Grade', verTodasN: (n: number) => `View all (${n})`,
    proximasClasesTitle: 'Upcoming live classes', hoyLabelVivo: 'TODAY', iniciar: 'Start', unirse: 'Join', ver: 'View', programarClase: 'Schedule class',
    sinClasesVivo: 'No upcoming live classes.', claseDe: 'by',
    proximaCita: 'Your next appointment', sinProximas: 'No upcoming appointments.',
    hoyLabel: 'today', citasHoyLabel: 'appointments today', citasSemanaLabel: 'appointments this week',
    verMisCitas: 'View my appointments', enLinea: 'Online',
  },
} as const;

function diffDias(fechaISO: string, base: string) {
  const a = new Date(`${fechaISO}T00:00:00`);
  const b = new Date(`${base}T00:00:00`);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

const AVATAR_ANA_RIVAS = 'https://images.pexels.com/photos/7579108/pexels-photo-7579108.jpeg?auto=compress&cs=tinysrgb&h=200&w=200';

export default function InstructorPage() {
  const { user } = useSiteAuth();
  const { language } = useSiteLanguage();
  const t = text[language];

  const navItems = buildInstructorNav(INSTRUCTOR_NAV_LABELS, ['dash'], ['constructor', 'citas', 'cursos', 'vivo', 'evaluaciones', 'notif', 'agenda', 'perfil']);
  const { citas } = useInstructorAgenda();
  const { cursos, modulosPorCurso } = useInstructorCourses();
  const { clases } = useInstructorLiveClasses();
  const { intentos } = useInstructorGrading();

  const nombre = user?.nombre || 'Dra. Ana Rivas';
  const publicados = CURSOS_META.filter((m) => cursos[m.key]?.estado === 'publicado').length;
  const borradores = CURSOS_META.length - publicados;
  const totalEstudiantes = CURSOS_META.reduce((acc, m) => acc + m.estudiantes, 0);

  const proximas = citas.filter((c) => c.estado === 'Programada').sort((a, b) => (a.fechaISO + a.hora).localeCompare(b.fechaISO + b.hora));
  const proximaCita = proximas[0] || null;
  const citasHoy = proximas.filter((c) => c.fechaISO === AGENDA_INSTRUCTOR_HOY).length;
  const citasSemana = proximas.filter((c) => {
    const d = diffDias(c.fechaISO, AGENDA_INSTRUCTOR_HOY);
    return d >= 0 && d <= 6;
  }).length;

  const clasesVivoProximas = clases
    .filter((c) => c.estado === 'programada' || c.estado === 'vivo')
    .sort((a, b) => (a.fechaISO + a.hora).localeCompare(b.fechaISO + b.hora));
  const clasesVivoEstaSemana = clasesVivoProximas.filter((c) => {
    const d = diffDias(c.fechaISO, HOY_VIVO);
    return d >= 0 && d <= 6;
  }).length;

  const pendientesCalificar = intentos.filter((i) => i.estado === 'pendiente');
  function detalleIntento(cursoKey: string, moduloId: string, evaluacionId: string) {
    const cursoTitulo = CURSOS_INFO_DEMO[cursoKey]?.titulo || cursoKey;
    const modulos = modulosPorCurso[cursoKey] ?? [];
    const modulo = modulos.find((m) => m.id === moduloId);
    const evalItem = modulo?.items.find((it) => it.id === evaluacionId && it.tipo === 'evaluacion');
    const evalTitulo = evalItem && evalItem.tipo === 'evaluacion' ? evalItem.tituloEval || evaluacionId : evaluacionId;
    return `${cursoTitulo} · ${evalTitulo}`;
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="dash"
      onNavigate={() => {}}
      roleBadge={{ es: 'Instructor', en: 'Instructor' }}
      profileTo="/instructor/perfil"
      sidebarExtra={
        <div className="rounded-2xl bg-white/10 p-4 text-white">
          <p className="mb-2 text-sm font-semibold">{language === 'es' ? 'Crea un curso nuevo' : 'Create a course'}</p>
          <Link to="/instructor/constructor/nuevo" className="block rounded-full bg-white/60 py-2 text-center text-xs font-semibold text-brand-800 hover:bg-white/80">
            {t.nuevoCurso}
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 overflow-hidden rounded-full border border-brand-100">
            <img src={AVATAR_ANA_RIVAS} alt={nombre} className="h-full w-full object-cover" style={{ objectPosition: '50% 20%' }} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.hola}, {nombre.split(' ')[0] === 'Dra.' ? nombre.split(' ').slice(0, 2).join(' ') : nombre.split(' ')[0]} 👋</h1>
            <p className="text-sm text-ink/50">{t.resumen}</p>
          </div>
        </div>
        <Link to="/instructor/constructor/nuevo" className="flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-soft hover:opacity-90">
          <Plus size={16} />{t.nuevoCurso}
        </Link>
      </div>

      {/* Próxima cita */}
      <div className="flex flex-col gap-4 rounded-3xl bg-brand-gradient p-5 shadow-soft sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 text-white">
            <CalendarDays size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{t.proximaCita}</p>
            {proximaCita ? (
              <>
                <p className="truncate font-display text-lg font-semibold text-white">
                  {proximaCita.paciente} · {proximaCita.fechaISO === AGENDA_INSTRUCTOR_HOY ? t.hoyLabel : proximaCita.fechaISO} {proximaCita.hora}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-white/85">
                  {proximaCita.modalidad === 'Online' ? <Video size={13} /> : <MapPin size={13} />}
                  {proximaCita.modalidad === 'Online' ? t.enLinea : proximaCita.lugar} · {proximaCita.servicio}
                </p>
              </>
            ) : (
              <p className="text-lg font-semibold text-white">{t.sinProximas}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="text-center text-white">
            <p className="font-display text-2xl font-semibold">{citasHoy}</p>
            <p className="text-xs text-white/75">{t.citasHoyLabel}</p>
          </div>
          <div className="text-center text-white">
            <p className="font-display text-2xl font-semibold">{citasSemana}</p>
            <p className="text-xs text-white/75">{t.citasSemanaLabel}</p>
          </div>
          <Link to="/instructor/citas" className="whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-soft hover:bg-white/90">
            {t.verMisCitas}
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          <div className="mb-1 flex items-center justify-between"><p className="text-xs text-ink/50">{t.cursosLabel}</p><GraduationCap size={16} className="text-brand-500" /></div>
          <p className="font-display text-2xl font-semibold text-ink">{CURSOS_META.length}</p>
          <p className="text-xs text-ink/40">{publicados} {t.publicados} · {borradores} {t.borrador}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          <div className="mb-1 flex items-center justify-between"><p className="text-xs text-ink/50">{t.estudiantesActivos}</p><Users size={16} className="text-lilac-500" /></div>
          <p className="font-display text-2xl font-semibold text-ink">{totalEstudiantes}</p>
          <p className="text-xs text-emerald-600">+18 {t.esteMs}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          <div className="mb-1 flex items-center justify-between"><p className="text-xs text-ink/50">{t.porCalificar}</p><ClipboardCheck size={16} className="text-amber-500" /></div>
          <p className="font-display text-2xl font-semibold text-amber-600">{pendientesCalificar.length}</p>
          <p className="text-xs text-ink/40">{t.respuestasAbiertas}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
          <div className="mb-1 flex items-center justify-between"><p className="text-xs text-ink/50">{t.proximasEnVivo}</p><Radio size={16} className="text-lilac-500" /></div>
          <p className="font-display text-2xl font-semibold text-ink">{clasesVivoEstaSemana}</p>
          <p className="text-xs text-ink/40">{t.estaSemana}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">{t.misCursosTitle}</h2>
              <Link to="/instructor/cursos" className="text-sm font-semibold text-brand-600 hover:underline">{t.verTodos}</Link>
            </div>
            <div className="space-y-3">
              {CURSOS_META.map((meta) => {
                const info = cursos[meta.key];
                if (!info) return null;
                const publicado = info.estado === 'publicado';
                return (
                  <div key={meta.key} className="flex items-center gap-4 rounded-2xl bg-brand-50/60 p-3">
                    {info.imagen ? (
                      <span className="h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                        <img src={info.imagen} alt="" className="h-full w-full object-cover" />
                      </span>
                    ) : (
                      <span className={`grid h-14 w-20 shrink-0 place-items-center rounded-lg text-white ${meta.color}`}>
                        <GraduationCap size={20} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{info.titulo}</p>
                      <p className="text-xs text-ink/45">
                        {publicado ? (
                          <>{meta.estudiantes} {t.estudiantes} · <Star size={11} className="mb-0.5 inline text-amber-500" /> {meta.rating}</>
                        ) : t.sinPublicar}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${publicado ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-100 text-ink/50'}`}>
                      {publicado ? t.publicado : t.borradorLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">{t.actividadReciente}</h2>
            <div className="space-y-4 text-sm">
              {ACTIVIDAD_INSTRUCTOR.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs text-brand-600">
                    {a.tipo === 'inscripcion' ? <Users size={14} /> : a.tipo === 'calificar' ? <ClipboardCheck size={14} /> : a.tipo === 'reseña' ? <Star size={14} /> : <CheckCircle2 size={14} />}
                  </span>
                  <div>
                    <p className="text-ink"><b>{a.quien}</b> {a.texto[language]}</p>
                    <p className="text-xs text-ink/40">{a.tiempo[language]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">{t.porCalificarTitle}</h2>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">{pendientesCalificar.length}</span>
            </div>
            <div className="space-y-2 text-sm">
              {pendientesCalificar.slice(0, 3).map((p) => (
                <Link key={p.id} to="/instructor/evaluaciones" className="flex items-center justify-between rounded-2xl bg-brand-50/60 p-3 hover:bg-brand-50">
                  <div className="min-w-0">
                    <p className="truncate text-ink">{p.estudiante}</p>
                    <p className="truncate text-xs text-ink/45">{detalleIntento(p.cursoKey, p.moduloId, p.evaluacionId)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white">{t.calificar}</span>
                </Link>
              ))}
            </div>
            <Link to="/instructor/evaluaciones" className="mt-3 block text-center text-xs font-semibold text-brand-600 hover:underline">{t.verTodasN(pendientesCalificar.length)}</Link>
          </div>

          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t.proximasClasesTitle}</h2>
            <div className="space-y-3 text-sm">
              {clasesVivoProximas.length === 0 ? (
                <p className="text-xs text-ink/40">{t.sinClasesVivo}</p>
              ) : (
                clasesVivoProximas.slice(0, 3).map((c) => {
                  const esHoy = c.fechaISO === HOY_VIVO;
                  const label = c.estado === 'vivo' ? (c.esPropia ? t.iniciar : t.unirse) : t.ver;
                  return (
                    <Link key={c.id} to="/instructor/vivo" className="flex items-center gap-3 rounded-xl -mx-1 px-1 py-0.5 hover:bg-brand-50/50">
                      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-center leading-none ${c.estado === 'vivo' ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700'}`}>
                        <span className="text-[11px] font-bold">{esHoy ? t.hoyLabelVivo : c.fechaISO.slice(5)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-ink">{c.titulo}</p>
                        <p className="text-xs text-ink/45">{c.hora}{!c.esPropia ? ` · ${t.claseDe} ${c.instructor}` : ''}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${c.estado === 'vivo' ? 'bg-brand-gradient text-white' : 'border border-brand-200 text-brand-700'}`}>
                        {label}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
            <Link to="/instructor/vivo" className="mt-3 block text-center text-xs font-semibold text-brand-600 hover:underline">{t.programarClase}</Link>
          </div>
        </div>
      </section>

      <footer className="pb-6 pt-2 text-center text-xs text-ink/35">
        Psique Amor · {language === 'es' ? 'Panel del instructor — datos de demostración' : 'Instructor panel — demo data'}
      </footer>
    </PortalLayout>
  );
}
