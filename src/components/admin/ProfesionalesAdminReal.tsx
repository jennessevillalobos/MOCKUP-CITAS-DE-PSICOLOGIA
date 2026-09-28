import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Link2, Pencil, RefreshCw } from 'lucide-react';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminDrawer from '@/components/admin/ui/AdminDrawer';
import AvisoFlotante from '@/components/admin/ui/AvisoFlotante';
import { useDialogo } from '@/context/DialogoContext';
import {
  cargarProfesionalesAdmin, crearProfesionalAdmin, actualizarProfesionalAdmin, enlazarProfesionalAdmin,
  type FichaProfesionalAdmin, type ProfesionalesAdmin, type DatosFicha,
} from '@/lib/api/admin';

// Pestaña "Profesionales" del admin con la base real (migraciones 055–056).
// Flujo decidido con la usuaria: la profesional se registra en el sitio y el
// admin crea su ficha enlazada a esa cuenta; también se puede pasar una ficha
// existente (con su agenda, citas y cursos) a otra cuenta.

const text = {
  es: {
    cargando: 'Cargando profesionales…', errorCarga: 'No se pudieron cargar las profesionales.', reintentar: 'Reintentar',
    vacio: 'No hay profesionales que coincidan.',
    visible: 'Visible en el sitio', oculta: 'Oculta', sinAcceso: 'Cuenta interna · sin acceso',
    sinAccesoAyuda: 'Esta ficha usa una cuenta interna sin contraseña: nadie puede entrar a su panel. Enlázala a la cuenta real de la profesional.',
    citas: 'citas', cursos: 'cursos', servicios: 'servicios', sedes: 'Sedes', sinSedes: 'Solo online', verSitio: 'Ver en el sitio', editar: 'Editar',
    nueva: 'Nueva profesional', editarFicha: 'Editar ficha',
    nuevaAyuda: 'La profesional debe registrarse antes en "Crear cuenta" (con su correo o con Google). Aquí creas su ficha pública y se le activa el panel de profesional.',
    correoCuenta: 'Correo de su cuenta', nombrePublico: 'Nombre público', nombrePh: 'Ej.: Dra. María Pérez',
    nombreAyudaNueva: 'Si lo dejas vacío se usa el nombre con el que se registró.',
    especialidad: 'Especialidad', descripcion: 'Descripción corta (tarjetas)', modalidad: 'Modalidad',
    bio: 'Sobre mí (perfil)', experiencia: 'Experiencia', experienciaPh: 'Ej.: 8 años de experiencia',
    enfoques: 'Enfoques (separados por coma)', formacion: 'Formación y certificaciones (una por línea)',
    serviciosLabel: 'Servicios que ofrece', sedesLabel: 'Sedes (presencial)',
    es: 'Español', en: 'Inglés (opcional)',
    visibleToggle: 'Visible en el sitio y en "Agendar una cita"',
    cancelar: 'Cancelar', guardar: 'Guardar', crear: 'Crear ficha', guardando: 'Guardando…',
    cuenta: 'Cuenta enlazada', cambiarCuenta: 'Enlazar a otra cuenta', enlazar: 'Enlazar',
    enlazarAyuda: 'La ficha, con su agenda, citas, cursos y productos, pasa a la cuenta que indiques. La cuenta anterior deja de ser profesional.',
    confirmarEnlace: (correo: string) => `¿Enlazar esta ficha a la cuenta ${correo}? Esa persona podrá entrar al panel de esta profesional.`,
    faltan: 'Completa el nombre, la especialidad y la descripción en español, y elige al menos un servicio.',
    faltanNueva: 'Completa la especialidad y la descripción en español, y elige al menos un servicio.',
    faltaCorreo: 'Escribe el correo de la cuenta de la profesional.',
    creada: 'Ficha creada. La profesional ya puede entrar a su panel.', guardada: 'Ficha guardada.', enlazada: 'Ficha enlazada a la nueva cuenta.',
    horarioInicial: 'Se crea con horario L–V 9:00–17:00 y sábado 9:00–13:00; ella lo ajusta en Agenda/Disponibilidad.',
  },
  en: {
    cargando: 'Loading professionals…', errorCarga: 'Could not load professionals.', reintentar: 'Retry',
    vacio: 'No professionals match.',
    visible: 'Visible on site', oculta: 'Hidden', sinAcceso: 'Internal account · no access',
    sinAccesoAyuda: "This profile uses an internal account without a password: nobody can open its panel. Link it to the professional's real account.",
    citas: 'appointments', cursos: 'courses', servicios: 'services', sedes: 'Locations', sinSedes: 'Online only', verSitio: 'View on site', editar: 'Edit',
    nueva: 'New professional', editarFicha: 'Edit profile',
    nuevaAyuda: 'The professional must sign up first with "Create account" (email or Google). Here you create her public profile and her professional panel is enabled.',
    correoCuenta: 'Account email', nombrePublico: 'Public name', nombrePh: 'E.g.: Dr. María Pérez',
    nombreAyudaNueva: 'If empty, the name used at sign-up is kept.',
    especialidad: 'Specialty', descripcion: 'Short description (cards)', modalidad: 'Modality',
    bio: 'About me (profile)', experiencia: 'Experience', experienciaPh: 'E.g.: 8 years of experience',
    enfoques: 'Approaches (comma separated)', formacion: 'Training & certifications (one per line)',
    serviciosLabel: 'Services offered', sedesLabel: 'Locations (in-person)',
    es: 'Spanish', en: 'English (optional)',
    visibleToggle: 'Visible on the site and in "Book an appointment"',
    cancelar: 'Cancel', guardar: 'Save', crear: 'Create profile', guardando: 'Saving…',
    cuenta: 'Linked account', cambiarCuenta: 'Link to another account', enlazar: 'Link',
    enlazarAyuda: 'The profile, with its schedule, appointments, courses and products, moves to the account you enter. The previous account stops being a professional.',
    confirmarEnlace: (correo: string) => `Link this profile to ${correo}? That person will be able to open this professional's panel.`,
    faltan: 'Fill in the name, specialty and description in Spanish, and choose at least one service.',
    faltanNueva: 'Fill in the specialty and description in Spanish, and choose at least one service.',
    faltaCorreo: "Enter the professional's account email.",
    creada: 'Profile created. The professional can now open her panel.', guardada: 'Profile saved.', enlazada: 'Profile linked to the new account.',
    horarioInicial: 'Created with hours Mon–Fri 9:00–17:00 and Sat 9:00–13:00; she adjusts them in Schedule/Availability.',
  },
} as const;

type T = (typeof text)['es'] | (typeof text)['en'];

const MODALIDADES = [
  { es: 'Online y presencial', en: 'Online and in-person' },
  { es: 'Online', en: 'Online' },
  { es: 'Presencial', en: 'In-person' },
];

function iniciales(nombre: string) {
  const partes = nombre.replace(/^(Dra?\.|Lic\.)\s*/i, '').trim().split(/\s+/);
  return (partes.length >= 2 ? partes[0][0] + partes[1][0] : nombre.slice(0, 2)).toUpperCase();
}

const chip = (activo: boolean) =>
  `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
    activo ? 'border-brand-300 bg-brand-100 text-brand-700' : 'border-brand-100 bg-white text-ink/50 hover:bg-brand-50'
  }`;
const etiqueta = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40';
const campo = 'w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none focus:border-brand-400';

export default function ProfesionalesAdminReal({
  lang, buscar, abrirNueva, onNuevaCerrada,
}: { lang: 'es' | 'en'; buscar: string; abrirNueva: boolean; onNuevaCerrada: () => void }) {
  const t = text[lang];
  const [datos, setDatos] = useState<ProfesionalesAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<FichaProfesionalAdmin | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);

  function avisar(texto: string, err = false) {
    setAviso({ texto, error: err });
    window.setTimeout(() => setAviso(null), 4000);
  }

  async function cargar() {
    setError(null);
    const res = await cargarProfesionalesAdmin();
    if (res.error) setError(res.error.message || t.errorCarga);
    else setDatos(res.data);
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (datos?.fichas ?? []).filter(
      (f) => !q || [f.nombre, f.correo, f.especialidad].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [datos, buscar]);

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
        {error}{' '}
        <button onClick={() => void cargar()} className="font-bold underline">{t.reintentar}</button>
      </div>
    );
  }
  if (!datos) return <p className="text-sm text-ink/50">{t.cargando}</p>;

  const nombreSede = (id: number) => datos.sedes.find((s) => s.id === id)?.nombre ?? '';

  return (
    <>
      {filtradas.length === 0 ? (
        <p className="rounded-3xl border border-brand-100 bg-white p-6 text-sm text-ink/50">{t.vacio}</p>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((f) => (
            <div key={f.id} className="flex flex-col rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  {f.foto ? (
                    <img src={f.foto} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                      {iniciales(f.nombre || '?')}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{f.nombre}</p>
                    <p className="truncate text-xs text-ink/45">{f.especialidad}</p>
                  </div>
                </div>
                <button onClick={() => setEditando(f)} className="rounded-lg p-1.5 text-ink/40 hover:bg-brand-50 hover:text-brand-600" aria-label={t.editar}>
                  <Pencil size={14} />
                </button>
              </div>
              <p className="mt-3 truncate text-xs text-ink/55">{f.correo}</p>
              <div className="mt-2 space-y-1 text-xs text-ink/55">
                <p>{f.servicios.length} {t.servicios} · {f.citas} {t.citas} · {f.cursos} {t.cursos}</p>
                <p>{t.sedes}: {f.sedes.length ? f.sedes.map(nombreSede).join(', ') : t.sinSedes}</p>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <StatusBadge tone={f.estado === 'activo' ? 'positivo' : 'neutro'}>{f.estado === 'activo' ? t.visible : t.oculta}</StatusBadge>
                {f.cuentaInterna && <StatusBadge tone="alerta">{t.sinAcceso}</StatusBadge>}
                {f.estado === 'activo' && (
                  <Link to={`/profesionales/${f.slug}`} target="_blank" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                    {t.verSitio} <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {(abrirNueva || editando) && (
        <FichaDrawer
          t={t}
          lang={lang}
          ficha={editando}
          catalogo={datos}
          onClose={() => { setEditando(null); onNuevaCerrada(); }}
          onHecho={(mensaje) => { setEditando(null); onNuevaCerrada(); avisar(mensaje); void cargar(); }}
          onError={(m) => avisar(m, true)}
        />
      )}
      <AvisoFlotante aviso={aviso} />
    </>
  );
}

function lista(texto: string, separador: RegExp) {
  return texto.split(separador).map((x) => x.trim()).filter(Boolean);
}

function FichaDrawer({
  t, lang, ficha, catalogo, onClose, onHecho, onError,
}: {
  t: T; lang: 'es' | 'en'; ficha: FichaProfesionalAdmin | null; catalogo: ProfesionalesAdmin;
  onClose: () => void; onHecho: (mensaje: string) => void; onError: (mensaje: string) => void;
}) {
  const { confirmar } = useDialogo();
  const p = ficha?.perfil ?? {};
  const [correo, setCorreo] = useState('');
  const [nombre, setNombre] = useState(ficha?.nombre ?? '');
  const [especialidad, setEspecialidad] = useState(ficha?.especialidad ?? '');
  const [especialidadEn, setEspecialidadEn] = useState(p.especialidad_en ?? '');
  const [descripcion, setDescripcion] = useState(ficha?.descripcion ?? '');
  const [descripcionEn, setDescripcionEn] = useState(p.descripcion_en ?? '');
  const [modalidad, setModalidad] = useState(
    Math.max(0, MODALIDADES.findIndex((m) => m.es === p.modalidad_es)),
  );
  const [bio, setBio] = useState(p.bio_es ?? '');
  const [bioEn, setBioEn] = useState(p.bio_en ?? '');
  const [experiencia, setExperiencia] = useState(p.experiencia_es ?? '');
  const [experienciaEn, setExperienciaEn] = useState(p.experiencia_en ?? '');
  const [enfoques, setEnfoques] = useState((p.enfoques_es ?? []).join(', '));
  const [enfoquesEn, setEnfoquesEn] = useState((p.enfoques_en ?? []).join(', '));
  const [formacion, setFormacion] = useState((p.formacion ?? []).join('\n'));
  const [servicios, setServicios] = useState<number[]>(ficha?.servicios ?? catalogo.servicios.map((s) => s.id));
  const [sedes, setSedes] = useState<number[]>(ficha?.sedes ?? []);
  const [visible, setVisible] = useState(ficha ? ficha.estado === 'activo' : true);
  const [guardando, setGuardando] = useState(false);
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [nombreEnlace, setNombreEnlace] = useState(ficha?.nombre ?? '');
  const [mostrarEnlace, setMostrarEnlace] = useState(false);

  const alternar = (lista: number[], id: number) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  async function guardar() {
    const nombreOk = nombre.trim() !== '' || !ficha;
    if (!nombreOk || !especialidad.trim() || !descripcion.trim() || servicios.length === 0) return onError(ficha ? t.faltan : t.faltanNueva);
    if (!ficha && !correo.trim()) return onError(t.faltaCorreo);
    const datos: DatosFicha = {
      nombre: nombre.trim(),
      especialidad: especialidad.trim(),
      descripcion: descripcion.trim(),
      estado: visible ? 'activo' : 'inactivo',
      especialidad_en: especialidadEn,
      descripcion_en: descripcionEn,
      modalidad_es: MODALIDADES[modalidad].es,
      modalidad_en: MODALIDADES[modalidad].en,
      bio_es: bio, bio_en: bioEn,
      experiencia_es: experiencia, experiencia_en: experienciaEn,
      enfoques_es: lista(enfoques, /,/), enfoques_en: lista(enfoquesEn, /,/),
      formacion: lista(formacion, /\n/),
      servicios, sedes,
    };
    setGuardando(true);
    const res = ficha ? await actualizarProfesionalAdmin(ficha.id, datos) : await crearProfesionalAdmin(correo.trim(), datos);
    setGuardando(false);
    if (res.error) return onError(res.error.message);
    onHecho(ficha ? t.guardada : t.creada);
  }

  async function enlazar() {
    if (!ficha || !nuevoCorreo.trim()) return onError(t.faltaCorreo);
    if (!(await confirmar(t.confirmarEnlace(nuevoCorreo.trim())))) return;
    setGuardando(true);
    const res = await enlazarProfesionalAdmin(ficha.id, nuevoCorreo.trim(), nombreEnlace.trim());
    setGuardando(false);
    if (res.error) return onError(res.error.message);
    onHecho(t.enlazada);
  }

  const par = (
    label: string, es: string, setEs: (v: string) => void, en: string, setEn: (v: string) => void,
    opciones: { area?: boolean; ph?: string } = {},
  ) => (
    <div>
      <label className={etiqueta}>{label}</label>
      <div className="grid gap-2">
        {[{ v: es, set: setEs, l: t.es }, { v: en, set: setEn, l: t.en }].map((c) =>
          opciones.area ? (
            <textarea key={c.l} value={c.v} onChange={(e) => c.set(e.target.value)} rows={3} placeholder={`${c.l}${opciones.ph ? ` · ${opciones.ph}` : ''}`} className={`${campo} py-2`} />
          ) : (
            <input key={c.l} value={c.v} onChange={(e) => c.set(e.target.value)} placeholder={`${c.l}${opciones.ph ? ` · ${opciones.ph}` : ''}`} className={`${campo} h-10`} />
          ),
        )}
      </div>
    </div>
  );

  return (
    <AdminDrawer
      title={ficha ? t.editarFicha : t.nueva}
      subtitle={ficha?.nombre ?? undefined}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">{t.cancelar}</button>
          <button onClick={() => void guardar()} disabled={guardando} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft disabled:opacity-60">
            {guardando ? t.guardando : ficha ? t.guardar : t.crear}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {!ficha && (
          <>
            <p className="rounded-2xl bg-brand-50 p-3 text-xs leading-5 text-ink/65">{t.nuevaAyuda}</p>
            <div>
              <label className={etiqueta}>{t.correoCuenta}</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className={`${campo} h-10`} />
            </div>
          </>
        )}

        {ficha && (
          <div className="rounded-2xl border border-brand-100 p-3">
            <p className={etiqueta}>{t.cuenta}</p>
            <p className="text-sm font-semibold text-ink">{ficha.correo}</p>
            {ficha.cuentaInterna && <p className="mt-1 text-xs leading-5 text-amber-700">{t.sinAccesoAyuda}</p>}
            {!mostrarEnlace ? (
              <button onClick={() => setMostrarEnlace(true)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline">
                <Link2 size={13} /> {t.cambiarCuenta}
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs leading-5 text-ink/55">{t.enlazarAyuda}</p>
                <input type="email" value={nuevoCorreo} onChange={(e) => setNuevoCorreo(e.target.value)} placeholder={t.correoCuenta} className={`${campo} h-10`} />
                <input value={nombreEnlace} onChange={(e) => setNombreEnlace(e.target.value)} placeholder={t.nombrePublico} aria-label={t.nombrePublico} className={`${campo} h-10`} />
                <button onClick={() => void enlazar()} disabled={guardando} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                  <RefreshCw size={13} /> {t.enlazar}
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <label className={etiqueta}>{t.nombrePublico}</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t.nombrePh} className={`${campo} h-10`} />
          {!ficha && <p className="mt-1 text-[11px] text-ink/45">{t.nombreAyudaNueva}</p>}
        </div>
        {par(t.especialidad, especialidad, setEspecialidad, especialidadEn, setEspecialidadEn)}
        {par(t.descripcion, descripcion, setDescripcion, descripcionEn, setDescripcionEn, { area: true })}
        <div>
          <label className={etiqueta}>{t.modalidad}</label>
          <select value={modalidad} onChange={(e) => setModalidad(Number(e.target.value))} className={`${campo} h-10`}>
            {MODALIDADES.map((m, i) => <option key={m.es} value={i}>{m[lang]}</option>)}
          </select>
        </div>
        <div>
          <label className={etiqueta}>{t.serviciosLabel}</label>
          <div className="flex flex-wrap gap-1.5">
            {catalogo.servicios.map((s) => (
              <button key={s.id} type="button" onClick={() => setServicios((l) => alternar(l, s.id))} className={chip(servicios.includes(s.id))}>{s.nombre}</button>
            ))}
          </div>
        </div>
        <div>
          <label className={etiqueta}>{t.sedesLabel}</label>
          <div className="flex flex-wrap gap-1.5">
            {catalogo.sedes.map((s) => (
              <button key={s.id} type="button" onClick={() => setSedes((l) => alternar(l, s.id))} className={chip(sedes.includes(s.id))}>{s.nombre}</button>
            ))}
          </div>
        </div>
        {par(t.bio, bio, setBio, bioEn, setBioEn, { area: true })}
        {par(t.experiencia, experiencia, setExperiencia, experienciaEn, setExperienciaEn, { ph: t.experienciaPh })}
        {par(t.enfoques, enfoques, setEnfoques, enfoquesEn, setEnfoquesEn)}
        <div>
          <label className={etiqueta}>{t.formacion}</label>
          <textarea value={formacion} onChange={(e) => setFormacion(e.target.value)} rows={3} className={`${campo} py-2`} />
        </div>
        {ficha && (
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
          {t.visibleToggle}
        </label>
        )}
        {!ficha && <p className="text-[11px] leading-5 text-ink/45">{t.horarioInicial}</p>}
      </div>
    </AdminDrawer>
  );
}
