import { Link } from 'react-router-dom';
import { GraduationCap, Users, Star, BookOpen, Clock, Plus, Pencil } from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { INSTRUCTOR_NAV_LABELS, buildInstructorNav } from '@/components/site/instructorNav';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useInstructorCourses } from '@/context/InstructorCoursesContext';
import { CURSOS_META } from '@/data/instructorCoursesData';

const text = {
  es: {
    volverPortal: 'Volver al panel',
    titulo: 'Mis cursos', subtitulo: 'Todos tus cursos — publicados y en borrador.',
    nuevoCurso: '+ Nuevo curso',
    totalCursos: 'Cursos', publicados: 'Publicados', borradores: 'Borradores', totalEstudiantes: 'Estudiantes',
    estudiantes: 'estudiantes', sinPublicar: 'Sin publicar',
    publicado: 'Publicado', borrador: 'Borrador',
    editar: 'Editar', pasarBorrador: 'Pasar a borrador', publicarAccion: 'Publicar',
  },
  en: {
    volverPortal: 'Back to panel',
    titulo: 'My courses', subtitulo: 'All your courses — published and drafts.',
    nuevoCurso: '+ New course',
    totalCursos: 'Courses', publicados: 'Published', borradores: 'Drafts', totalEstudiantes: 'Students',
    estudiantes: 'students', sinPublicar: 'Unpublished',
    publicado: 'Published', borrador: 'Draft',
    editar: 'Edit', pasarBorrador: 'Set as draft', publicarAccion: 'Publish',
  },
} as const;

export default function MisCursosPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const { cursos, actualizarInfo } = useInstructorCourses();

  const navItems = buildInstructorNav(INSTRUCTOR_NAV_LABELS, ['cursos'], ['constructor', 'citas', 'cursos', 'vivo', 'evaluaciones', 'notif', 'agenda', 'perfil']);

  const publicados = CURSOS_META.filter((m) => cursos[m.key]?.estado === 'publicado').length;
  const borradores = CURSOS_META.length - publicados;
  const totalEstudiantes = CURSOS_META.reduce((acc, m) => acc + m.estudiantes, 0);

  function alternarEstado(key: string) {
    const actual = cursos[key]?.estado;
    actualizarInfo(key, { estado: actual === 'publicado' ? 'borrador' : 'publicado' });
  }

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="cursos"
      onNavigate={() => {}}
      roleBadge={{ es: 'Instructor', en: 'Instructor' }}
      profileTo="/instructor/perfil"
      backTo="/instructor"
      backLabel={{ es: t.volverPortal, en: t.volverPortal }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t.titulo}</h1>
          <p className="text-sm text-ink/50">{t.subtitulo}</p>
        </div>
        <Link
          to="/instructor/constructor/nuevo"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-soft hover:opacity-90"
        >
          <Plus size={16} /> {t.nuevoCurso}
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <div className="mb-1 flex items-center justify-between"><p className="text-xs text-ink/50">{t.totalCursos}</p><GraduationCap size={15} className="text-brand-500" /></div>
          <p className="font-display text-2xl font-semibold text-ink">{CURSOS_META.length}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.publicados}</p>
          <p className="font-display text-2xl font-semibold text-emerald-600">{publicados}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs text-ink/50">{t.borradores}</p>
          <p className="font-display text-2xl font-semibold text-ink/60">{borradores}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <div className="mb-1 flex items-center justify-between"><p className="text-xs text-ink/50">{t.totalEstudiantes}</p><Users size={15} className="text-lilac-500" /></div>
          <p className="font-display text-2xl font-semibold text-ink">{totalEstudiantes}</p>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {CURSOS_META.map((meta) => {
          const info = cursos[meta.key];
          if (!info) return null;
          const publicado = info.estado === 'publicado';
          return (
            <div key={meta.key} className="flex flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
              <div className="relative h-36 w-full">
                {info.imagen ? (
                  <img src={info.imagen} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className={`grid h-full w-full place-items-center ${meta.color}`}>
                    <GraduationCap size={28} className="text-white/70" />
                  </div>
                )}
                <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${publicado ? 'bg-emerald-50 text-emerald-700' : 'bg-white/90 text-ink/60'}`}>
                  {publicado ? t.publicado : t.borrador}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{info.categoria}</p>
                  <h2 className="font-display text-lg font-semibold leading-snug text-ink">{info.titulo || (language === 'es' ? 'Curso sin título' : 'Untitled course')}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/55">{info.descripcion}</p>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/45">
                  <span className="flex items-center gap-1"><Clock size={12} /> {meta.duracion[language]}</span>
                  <span className="flex items-center gap-1"><BookOpen size={12} /> {meta.lecciones}</span>
                  <span className="font-semibold text-ink/60">{info.moneda} {info.precio}</span>
                </div>

                <p className="text-xs text-ink/45">
                  {publicado ? (
                    <>{meta.estudiantes} {t.estudiantes} · <Star size={11} className="mb-0.5 inline text-amber-500" /> {meta.rating}</>
                  ) : t.sinPublicar}
                </p>

                <div className="mt-auto flex gap-2 pt-1">
                  <Link
                    to={`/instructor/constructor/${meta.key}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-gradient px-3 py-2 text-xs font-bold text-white shadow-soft hover:opacity-90"
                  >
                    <Pencil size={13} /> {t.editar}
                  </Link>
                  <button
                    onClick={() => alternarEstado(meta.key)}
                    className="flex-1 rounded-full border border-brand-200 px-3 py-2 text-xs font-semibold text-ink/60 hover:bg-brand-50"
                  >
                    {publicado ? t.pasarBorrador : t.publicarAccion}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </PortalLayout>
  );
}
