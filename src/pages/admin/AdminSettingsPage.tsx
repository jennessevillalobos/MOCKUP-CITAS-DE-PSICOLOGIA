import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings2, Search as SearchIcon, Smartphone, ClipboardList, ShieldCheck, ImagePlus, Monitor,
  LogOut, Save,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import {
  demoConfigGeneral, demoSeoPaginas, demoPwaConfig, demoAuditLog, demoSesiones,
  type ConfigGeneral, type SeoPagina, type PwaConfig, type AuditLogEntry, type SesionActiva,
} from '@/data/admin/settingsData';
import { ALL_ROLES, ALL_PERMISOS, ROLE_PERMISOS, type UserRole, type Permiso } from '@/data/admin/usersData';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useDialogo } from '@/context/DialogoContext';
import AvisoFlotante from '@/components/admin/ui/AvisoFlotante';
import { useContacto, refrescarContacto } from '@/hooks/useContacto';
import { exportarCSV } from '@/data/admin/reportsData';
import {
  guardarContactoAdmin, cargarAuditoriaAdmin, misSesionesAdmin, cerrarSesionAdmin, type SesionAdmin,
} from '@/lib/api/admin';

// Campos de contacto editables (Configuración → General, migración 049).
const CAMPOS_CONTACTO: { clave: 'whatsapp' | 'phone' | 'email' | 'location' | 'hours' | 'instagram' | 'linkedin' | 'youtube'; es: string; en: string; ayuda?: string }[] = [
  { clave: 'whatsapp', es: 'Enlace de WhatsApp', en: 'WhatsApp link', ayuda: 'https://wa.me/58412XXXXXXX' },
  { clave: 'phone', es: 'Teléfono visible', en: 'Visible phone' },
  { clave: 'email', es: 'Correo de contacto', en: 'Contact email' },
  { clave: 'location', es: 'Ubicación / modalidad', en: 'Location / modality' },
  { clave: 'hours', es: 'Horario', en: 'Hours' },
  { clave: 'instagram', es: 'Instagram', en: 'Instagram' },
  { clave: 'linkedin', es: 'LinkedIn', en: 'LinkedIn' },
  { clave: 'youtube', es: 'YouTube', en: 'YouTube' },
];

// Dispositivo legible a partir del user agent.
function dispositivo(ua: string | null) {
  if (!ua) return 'Dispositivo desconocido';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const so = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return `${nav}${so ? ` · ${so}` : ''}`;
}

function fechaHora(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type Tab = 'general' | 'seo' | 'pwa' | 'auditoria' | 'seguridad';

const text = {
  es: {
    title: 'Configuración y auditoría', subtitle: 'Ajustes globales del sistema · datos de demostración',
    tabs: { general: 'General', seo: 'SEO', pwa: 'PWA', auditoria: 'Auditoría', seguridad: 'Seguridad' } as Record<Tab, string>,
    // general
    name: 'Nombre del sitio', slogan: 'Eslogan', logo: 'Logo', dropLogo: 'Arrastra el logo o haz clic para subir',
    brandColors: 'Colores de marca', primary: 'Primario', secondary: 'Secundario', languages: 'Idiomas activos',
    mainCurrency: 'Moneda principal', timezone: 'Zona horaria', save: 'Guardar cambios',
    // seo
    page: 'Página', slug: 'Slug', metaTitle: 'Meta título', metaDesc: 'Meta descripción', keywords: 'Palabras clave',
    googlePreview: 'Vista previa en Google', ogPreview: 'Vista previa Open Graph', chars: 'caracteres',
    // pwa
    appName: 'Nombre de la app', shortName: 'Nombre corto', icon: 'Ícono', dropIcon: 'Arrastra el ícono o haz clic para subir',
    themeColor: 'Color del tema', splashColor: 'Color de splash', offlineMode: 'Modo sin conexión', splashPreview: 'Vista previa de splash',
    // auditoria
    search: 'Buscar…', user: 'Usuario', actionType: 'Tipo de acción', all: 'Todos', date: 'Fecha', action: 'Acción', detail: 'Detalle',
    export: 'Exportar registro',
    tipos: { Creación: 'Creación', Edición: 'Edición', Eliminación: 'Eliminación', Acceso: 'Acceso', Seguridad: 'Seguridad' } as Record<AuditLogEntry['tipo'], string>,
    // seguridad
    activeSessions: 'Sesiones activas', current: 'Actual', revoke: 'Revocar', twoFactor: 'Autenticación de dos factores (2FA)',
    autoLogout: 'Cerrar sesión automáticamente por inactividad', permMatrix: 'Matriz de roles y permisos', savePerms: 'Guardar permisos',
  },
  en: {
    title: 'Settings & audit', subtitle: 'Global system settings · demo data',
    tabs: { general: 'General', seo: 'SEO', pwa: 'PWA', auditoria: 'Audit', seguridad: 'Security' } as Record<Tab, string>,
    name: 'Site name', slogan: 'Slogan', logo: 'Logo', dropLogo: 'Drag the logo or click to upload',
    brandColors: 'Brand colors', primary: 'Primary', secondary: 'Secondary', languages: 'Active languages',
    mainCurrency: 'Main currency', timezone: 'Timezone', save: 'Save changes',
    page: 'Page', slug: 'Slug', metaTitle: 'Meta title', metaDesc: 'Meta description', keywords: 'Keywords',
    googlePreview: 'Google search preview', ogPreview: 'Open Graph preview', chars: 'characters',
    appName: 'App name', shortName: 'Short name', icon: 'Icon', dropIcon: 'Drag the icon or click to upload',
    themeColor: 'Theme color', splashColor: 'Splash color', offlineMode: 'Offline mode', splashPreview: 'Splash preview',
    search: 'Search…', user: 'User', actionType: 'Action type', all: 'All', date: 'Date', action: 'Action', detail: 'Detail',
    export: 'Export log',
    tipos: { Creación: 'Creation', Edición: 'Edit', Eliminación: 'Deletion', Acceso: 'Access', Seguridad: 'Security' } as Record<AuditLogEntry['tipo'], string>,
    activeSessions: 'Active sessions', current: 'Current', revoke: 'Revoke', twoFactor: 'Two-factor authentication (2FA)',
    autoLogout: 'Automatically log out on inactivity', permMatrix: 'Roles & permissions matrix', savePerms: 'Save permissions',
  },
} as const;

function auditTone(t: AuditLogEntry['tipo']) {
  if (t === 'Eliminación' || t === 'Seguridad') return 'negativo';
  if (t === 'Creación') return 'positivo';
  return 'neutro';
}

export default function AdminSettingsPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'general';

  const { esReal } = useAdminAuth();
  const { confirmar } = useDialogo();
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  function mostrarAviso(texto: string, error = false) {
    setAviso({ texto, error });
    window.setTimeout(() => setAviso(null), 4000);
  }

  // Contacto real (lo que ve el sitio).
  const contactoActual = useContacto();
  const [contacto, setContacto] = useState<Record<string, string>>({ ...contactoActual });
  const [contactoTocado, setContactoTocado] = useState(false);
  useEffect(() => {
    if (!contactoTocado) setContacto({ ...contactoActual });
  }, [contactoActual, contactoTocado]);
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  async function guardarContacto() {
    setGuardandoContacto(true);
    const res = await guardarContactoAdmin(contacto);
    setGuardandoContacto(false);
    if (res.error) return mostrarAviso(res.error.message, true);
    setContactoTocado(false);
    refrescarContacto();
    mostrarAviso(lang === 'es' ? 'Datos de contacto guardados: ya se ven en el sitio.' : 'Contact details saved: now live on the site.');
  }

  // Auditoría y sesiones reales.
  const [auditoriaReal, setAuditoriaReal] = useState<AuditLogEntry[] | null>(null);
  const [sesionesReales, setSesionesReales] = useState<SesionAdmin[] | null>(null);
  const cargarSesiones = useCallback(async () => {
    const res = await misSesionesAdmin();
    if (res.error) return mostrarAviso(res.error.message, true);
    setSesionesReales(res.data);
  }, []);
  useEffect(() => {
    if (!esReal) return;
    if (tab === 'auditoria' && auditoriaReal === null) {
      void cargarAuditoriaAdmin().then((res) => {
        if (res.error) return mostrarAviso(res.error.message, true);
        setAuditoriaReal(res.data.map((e, i) => ({ id: String(i), fecha: fechaHora(e.fecha), usuario: e.usuario, accion: e.accion, tipo: e.tipo, detalle: e.detalle })));
      });
    }
    if (tab === 'seguridad' && sesionesReales === null) void cargarSesiones();
  }, [esReal, tab, auditoriaReal, sesionesReales, cargarSesiones]);

  async function cerrarSesionReal(s: SesionAdmin) {
    const ok = await confirmar(
      lang === 'es' ? `¿Cerrar la sesión de ${dispositivo(s.dispositivo)}? Tendrá que volver a iniciar sesión en ese dispositivo.` : `Sign out ${dispositivo(s.dispositivo)}?`,
      { peligro: true, textoAceptar: t.revoke }
    );
    if (!ok) return;
    const res = await cerrarSesionAdmin(s.id);
    if (res.error) return mostrarAviso(res.error.message, true);
    mostrarAviso(lang === 'es' ? 'Sesión cerrada.' : 'Session revoked.');
    void cargarSesiones();
  }

  const [general, setGeneral] = useState<ConfigGeneral>(demoConfigGeneral);
  const [seoPages] = useState<SeoPagina[]>(demoSeoPaginas);
  const [seoSelId, setSeoSelId] = useState(demoSeoPaginas[0].id);
  const [seoDraft, setSeoDraft] = useState<SeoPagina>(demoSeoPaginas[0]);
  const [pwa, setPwa] = useState<PwaConfig>(demoPwaConfig);
  const [sesiones, setSesiones] = useState<SesionActiva[]>(demoSesiones);
  const [twoFA, setTwoFA] = useState(true);
  const [autoLogout, setAutoLogout] = useState(false);
  const [matriz, setMatriz] = useState<Record<UserRole, Set<Permiso>>>(() => {
    const init: Record<UserRole, Set<Permiso>> = {} as Record<UserRole, Set<Permiso>>;
    ALL_ROLES.forEach((r) => { init[r] = new Set(ROLE_PERMISOS[r]); });
    return init;
  });

  const [buscarLog, setBuscarLog] = useState('');
  const [filtroTipoLog, setFiltroTipoLog] = useState<'todos' | AuditLogEntry['tipo']>('todos');

  const [savedGeneral, setSavedGeneral] = useState(false);
  const [savedPwa, setSavedPwa] = useState(false);
  const [savedPerms, setSavedPerms] = useState(false);

  function guardarGeneral() { setSavedGeneral(true); setTimeout(() => setSavedGeneral(false), 2000); }
  function guardarPwa() { setSavedPwa(true); setTimeout(() => setSavedPwa(false), 2000); }
  function guardarPerms() { setSavedPerms(true); setTimeout(() => setSavedPerms(false), 2000); }

  const tabs: { key: Tab; label: string; icon: typeof Settings2 }[] = [
    { key: 'general', label: t.tabs.general, icon: Settings2 },
    { key: 'seo', label: t.tabs.seo, icon: SearchIcon },
    { key: 'pwa', label: t.tabs.pwa, icon: Smartphone },
    { key: 'auditoria', label: t.tabs.auditoria, icon: ClipboardList },
    { key: 'seguridad', label: t.tabs.seguridad, icon: ShieldCheck },
  ];

  function seleccionarSeo(id: string) {
    setSeoSelId(id);
    const p = seoPages.find((s) => s.id === id);
    if (p) setSeoDraft(p);
  }

  function togglePermiso(rol: UserRole, permiso: Permiso) {
    setMatriz((prev) => {
      const next = { ...prev, [rol]: new Set(prev[rol]) };
      if (next[rol].has(permiso)) next[rol].delete(permiso);
      else next[rol].add(permiso);
      return next;
    });
  }

  function revocarSesion(id: string) {
    setSesiones((prev) => prev.filter((s) => s.id !== id));
  }

  const logFiltrado = useMemo(
    () =>
      (esReal ? auditoriaReal ?? [] : demoAuditLog).filter(
        (l) =>
          (filtroTipoLog === 'todos' || l.tipo === filtroTipoLog) &&
          (l.usuario.toLowerCase().includes(buscarLog.toLowerCase()) || l.accion.toLowerCase().includes(buscarLog.toLowerCase())),
      ),
    [buscarLog, filtroTipoLog, esReal, auditoriaReal],
  );

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">
            {esReal ? (lang === 'es' ? 'Ajustes globales del sistema · datos reales' : 'Global system settings · live data') : t.subtitle}
          </p>
        </div>
      </div>
      <AvisoFlotante aviso={aviso} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit space-y-1 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft">
          {tabs.map((tb) => {
            const Icon = tb.icon;
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setSearchParams({ tab: tb.key })}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  active ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/60 hover:bg-brand-50'
                }`}
              >
                <Icon size={16} />
                {tb.label}
              </button>
            );
          })}
        </aside>

        <div className="space-y-5">
          {tab === 'general' && esReal && (
            <section className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <div>
                <p className="text-sm font-bold text-ink">{lang === 'es' ? 'Datos de contacto del sitio' : 'Site contact details'}</p>
                <p className="mt-1 text-xs text-ink/50">
                  {lang === 'es'
                    ? 'Se muestran en el Home, la página de Contacto, el pie de página y el botón de WhatsApp. Al guardar se actualizan en el sitio.'
                    : 'Shown on the Home page, the Contact page, the footer and the WhatsApp button. Saving updates the site.'}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {CAMPOS_CONTACTO.map((c) => (
                  <div key={c.clave}>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{c[lang]}</label>
                    <input
                      value={contacto[c.clave] ?? ''}
                      placeholder={c.ayuda}
                      onChange={(e) => {
                        setContactoTocado(true);
                        setContacto((prev) => ({ ...prev, [c.clave]: e.target.value }));
                      }}
                      className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => void guardarContacto()}
                disabled={guardandoContacto || !contactoTocado}
                className="flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-soft hover:opacity-90 disabled:opacity-50"
              >
                <Save size={15} />
                {t.save}
              </button>
              <div className="rounded-2xl bg-brand-50/60 px-4 py-3 text-xs leading-relaxed text-ink/55">
                {lang === 'es'
                  ? `Próximamente editable: nombre del sitio (${general.nombre}), eslogan, logo, colores de marca, idiomas (ES/EN), moneda principal (${general.monedaPrincipal}) y zona horaria (${general.zonaHoraria}). Hoy están definidos en el código del sitio.`
                  : `Coming soon: site name, slogan, logo, brand colors, languages, main currency and timezone. They are currently defined in the site code.`}
              </div>
            </section>
          )}

          {tab === 'general' && !esReal && (
            <section className="space-y-5 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.name}</label>
                  <input value={general.nombre} onChange={(e) => setGeneral({ ...general, nombre: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.slogan}</label>
                  <input value={general.eslogan} onChange={(e) => setGeneral({ ...general, eslogan: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.logo}</label>
                <button className="flex h-20 w-full max-w-xs flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 text-ink/40 hover:bg-brand-50">
                  <ImagePlus size={18} />
                  <span className="text-xs">{t.dropLogo}</span>
                </button>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.brandColors}</p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <input type="color" value={general.colorPrimario} onChange={(e) => setGeneral({ ...general, colorPrimario: e.target.value })} className="h-9 w-9 cursor-pointer rounded-lg border border-brand-100" />
                    <div>
                      <p className="text-[11px] text-ink/40">{t.primary}</p>
                      <input value={general.colorPrimario} onChange={(e) => setGeneral({ ...general, colorPrimario: e.target.value })} className="h-8 w-24 rounded-lg border border-brand-200 px-2 font-mono text-xs text-ink outline-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={general.colorSecundario} onChange={(e) => setGeneral({ ...general, colorSecundario: e.target.value })} className="h-9 w-9 cursor-pointer rounded-lg border border-brand-100" />
                    <div>
                      <p className="text-[11px] text-ink/40">{t.secondary}</p>
                      <input value={general.colorSecundario} onChange={(e) => setGeneral({ ...general, colorSecundario: e.target.value })} className="h-8 w-24 rounded-lg border border-brand-200 px-2 font-mono text-xs text-ink outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.languages}</p>
                <div className="flex gap-4">
                  {[{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }].map((l) => (
                    <label key={l.code} className="flex items-center gap-2 text-sm text-ink/70">
                      <input
                        type="checkbox"
                        checked={general.idiomasActivos.includes(l.code)}
                        onChange={(e) =>
                          setGeneral((g) => ({
                            ...g,
                            idiomasActivos: e.target.checked ? [...g.idiomasActivos, l.code] : g.idiomasActivos.filter((c) => c !== l.code),
                          }))
                        }
                        className="h-4 w-4 rounded border-brand-300 text-brand-600"
                      />
                      {l.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.mainCurrency}</label>
                  <input value={general.monedaPrincipal} onChange={(e) => setGeneral({ ...general, monedaPrincipal: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.timezone}</label>
                  <input value={general.zonaHoraria} onChange={(e) => setGeneral({ ...general, zonaHoraria: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
                </div>
              </div>

              <button onClick={guardarGeneral} className="flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-soft hover:opacity-90">
                <Save size={15} />
                {savedGeneral ? '✓ Guardado' : t.save}
              </button>
            </section>
          )}

          {(tab === 'seo' || tab === 'pwa') && esReal && (
            <p className="rounded-3xl border border-brand-100 bg-white p-5 text-sm text-ink/60 shadow-soft">
              {lang === 'es'
                ? `Próximamente. Hoy ${tab === 'seo' ? 'los títulos y descripciones de cada página' : 'la configuración de la app instalable (PWA)'} se definen en el código del sitio.`
                : `Coming soon. ${tab === 'seo' ? 'Page titles and descriptions' : 'The installable app (PWA) settings'} are currently defined in the site code.`}
            </p>
          )}

          {tab === 'seo' && !esReal && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
              <div className="h-fit space-y-1 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft">
                {seoPages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => seleccionarSeo(p.id)}
                    className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                      seoSelId === p.id ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/60 hover:bg-brand-50'
                    }`}
                  >
                    {p.pagina}
                  </button>
                ))}
              </div>

              <section className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.slug}</label>
                  <input value={seoDraft.slug} onChange={(e) => setSeoDraft({ ...seoDraft, slug: e.target.value })} className="h-9 w-full rounded-xl border border-brand-200 px-3 font-mono text-xs text-ink outline-none" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.metaTitle}</label>
                    <span className="text-[10px] text-ink/35">{seoDraft.metaTitulo.length}/60 {t.chars}</span>
                  </div>
                  <input value={seoDraft.metaTitulo} onChange={(e) => setSeoDraft({ ...seoDraft, metaTitulo: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.metaDesc}</label>
                    <span className="text-[10px] text-ink/35">{seoDraft.metaDescripcion.length}/160 {t.chars}</span>
                  </div>
                  <textarea value={seoDraft.metaDescripcion} onChange={(e) => setSeoDraft({ ...seoDraft, metaDescripcion: e.target.value })} rows={2} className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.keywords}</label>
                  <input value={seoDraft.keywords} onChange={(e) => setSeoDraft({ ...seoDraft, keywords: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.googlePreview}</p>
                  <div className="rounded-2xl border border-brand-100 bg-white p-3">
                    <p className="truncate text-xs text-emerald-700">psiqueamor.com{seoDraft.slug}</p>
                    <p className="mt-0.5 truncate text-base text-blue-700">{seoDraft.metaTitulo}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink/55">{seoDraft.metaDescripcion}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.ogPreview}</p>
                  <div className="overflow-hidden rounded-2xl border border-brand-100">
                    <div className="flex h-24 items-center justify-center bg-mist-gradient text-xs text-ink/30">Psique Amor</div>
                    <div className="bg-brand-50/50 p-3">
                      <p className="truncate text-[11px] uppercase tracking-wide text-ink/40">psiqueamor.com</p>
                      <p className="truncate text-sm font-semibold text-ink">{seoDraft.metaTitulo}</p>
                      <p className="line-clamp-1 text-xs text-ink/50">{seoDraft.metaDescripcion}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {tab === 'pwa' && !esReal && (
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_220px]">
              <div className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.appName}</label>
                    <input value={pwa.appName} onChange={(e) => setPwa({ ...pwa, appName: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.shortName}</label>
                    <input value={pwa.shortName} onChange={(e) => setPwa({ ...pwa, shortName: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.icon}</label>
                  <button className="flex h-20 w-full max-w-xs flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 text-ink/40 hover:bg-brand-50">
                    <ImagePlus size={18} />
                    <span className="text-xs">{t.dropIcon}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <input type="color" value={pwa.themeColor} onChange={(e) => setPwa({ ...pwa, themeColor: e.target.value })} className="h-9 w-9 cursor-pointer rounded-lg border border-brand-100" />
                    <div>
                      <p className="text-[11px] text-ink/40">{t.themeColor}</p>
                      <input value={pwa.themeColor} onChange={(e) => setPwa({ ...pwa, themeColor: e.target.value })} className="h-8 w-24 rounded-lg border border-brand-200 px-2 font-mono text-xs text-ink outline-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={pwa.splashColor} onChange={(e) => setPwa({ ...pwa, splashColor: e.target.value })} className="h-9 w-9 cursor-pointer rounded-lg border border-brand-100" />
                    <div>
                      <p className="text-[11px] text-ink/40">{t.splashColor}</p>
                      <input value={pwa.splashColor} onChange={(e) => setPwa({ ...pwa, splashColor: e.target.value })} className="h-8 w-24 rounded-lg border border-brand-200 px-2 font-mono text-xs text-ink outline-none" />
                    </div>
                  </div>
                </div>

                <label className="flex items-center justify-between text-sm text-ink/70">
                  {t.offlineMode}
                  <input type="checkbox" checked={pwa.offlineMode} onChange={(e) => setPwa({ ...pwa, offlineMode: e.target.checked })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
                </label>

                <button onClick={guardarPwa} className="flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-soft hover:opacity-90">
                  <Save size={15} />
                  {savedPwa ? '✓ Guardado' : t.save}
                </button>
              </div>

              <div className="flex flex-col items-center">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.splashPreview}</p>
                <div className="flex h-72 w-40 flex-col items-center justify-center gap-3 rounded-[2rem] border-4 border-ink/10 shadow-soft" style={{ backgroundColor: pwa.splashColor }}>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-bold text-white shadow-soft" style={{ backgroundColor: pwa.themeColor }}>
                    {pwa.shortName.slice(0, 2).toUpperCase()}
                  </span>
                  <p className="px-3 text-center text-xs font-semibold text-ink/70">{pwa.appName}</p>
                </div>
              </div>
            </section>
          )}

          {tab === 'auditoria' && (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft">
                <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-3">
                  <SearchIcon size={15} className="text-ink/35" />
                  <input value={buscarLog} onChange={(e) => setBuscarLog(e.target.value)} placeholder={t.search} className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35" />
                </div>
                <select value={filtroTipoLog} onChange={(e) => setFiltroTipoLog(e.target.value as typeof filtroTipoLog)} className="h-9 rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none">
                  <option value="todos">{t.all} · {t.actionType}</option>
                  {(['Creación', 'Edición', 'Eliminación', 'Acceso', 'Seguridad'] as AuditLogEntry['tipo'][]).map((tp) => (
                    <option key={tp} value={tp}>{t.tipos[tp]}</option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    exportarCSV('auditoria.csv', [t.date, t.user, t.action, t.detail, t.actionType], logFiltrado.map((l) => [l.fecha, l.usuario, l.accion, l.detalle, t.tipos[l.tipo]]))
                  }
                  className="ml-auto flex items-center gap-1.5 rounded-xl border border-brand-200 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50"
                >
                  <ClipboardList size={14} />
                  {t.export}
                </button>
              </div>

              <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                        <th className="px-5 py-3 font-semibold">{t.date}</th>
                        <th className="px-5 py-3 font-semibold">{t.user}</th>
                        <th className="px-5 py-3 font-semibold">{t.action}</th>
                        <th className="px-5 py-3 font-semibold">{t.detail}</th>
                        <th className="px-5 py-3 font-semibold">{t.actionType}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-50">
                      {logFiltrado.map((l) => (
                        <tr key={l.id} className="hover:bg-brand-50/50">
                          <td className="whitespace-nowrap px-5 py-3 text-ink/45">{l.fecha}</td>
                          <td className="px-5 py-3 font-semibold text-ink">{l.usuario}</td>
                          <td className="px-5 py-3 text-ink/70">{l.accion}</td>
                          <td className="px-5 py-3 text-ink/45">{l.detalle}</td>
                          <td className="px-5 py-3">
                            <StatusBadge tone={auditTone(l.tipo)}>{t.tipos[l.tipo]}</StatusBadge>
                          </td>
                        </tr>
                      ))}
                      {esReal && logFiltrado.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink/40">{auditoriaReal === null ? '…' : lang === 'es' ? 'Sin registros.' : 'No entries.'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {tab === 'seguridad' && (
            <div className="space-y-5">
              <section className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink">
                  <Monitor size={16} className="text-brand-500" />
                  {t.activeSessions}
                </p>
                {esReal ? (
                  <div className="divide-y divide-brand-50">
                    {(sesionesReales ?? []).map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {dispositivo(s.dispositivo)}
                            {s.actual && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">{t.current}</span>}
                          </p>
                          <p className="text-xs text-ink/45">{s.ip ?? '—'} · {fechaHora(s.actividad)}</p>
                        </div>
                        {!s.actual && (
                          <button onClick={() => void cerrarSesionReal(s)} className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50">
                            <LogOut size={13} />
                            {t.revoke}
                          </button>
                        )}
                      </div>
                    ))}
                    {sesionesReales?.length === 0 && <p className="py-3 text-xs text-ink/40">—</p>}
                  </div>
                ) : (
                <div className="divide-y divide-brand-50">
                  {sesiones.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {s.dispositivo}
                          {s.actual && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">{t.current}</span>}
                        </p>
                        <p className="text-xs text-ink/45">{s.ubicacion} · {s.ultimaActividad}</p>
                      </div>
                      {!s.actual && (
                        <button onClick={() => revocarSesion(s.id)} className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50">
                          <LogOut size={13} />
                          {t.revoke}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </section>

              {esReal ? (
                <p className="rounded-3xl border border-brand-100 bg-white p-5 text-xs leading-relaxed text-ink/55 shadow-soft">
                  {lang === 'es'
                    ? 'Próximamente: autenticación en dos pasos (2FA) y cierre de sesión por inactividad. Hoy las sesiones duran hasta que cierras sesión o las revocas aquí; bloquear una cuenta en Usuarios cierra todas sus sesiones.'
                    : 'Coming soon: two-factor authentication and inactivity logout. Blocking an account in Users closes all its sessions.'}
                </p>
              ) : (
              <section className="space-y-2.5 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
                <label className="flex items-center justify-between text-sm text-ink/70">
                  {t.twoFactor}
                  <input type="checkbox" checked={twoFA} onChange={(e) => setTwoFA(e.target.checked)} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
                </label>
                <label className="flex items-center justify-between text-sm text-ink/70">
                  {t.autoLogout}
                  <input type="checkbox" checked={autoLogout} onChange={(e) => setAutoLogout(e.target.checked)} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
                </label>
              </section>
              )}

              <section className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
                <p className="mb-3 text-sm font-bold text-ink">{t.permMatrix}</p>
                {esReal && (
                  <p className="mb-3 text-xs text-ink/50">
                    {lang === 'es'
                      ? 'Así funcionan hoy los roles (definidos en la base de datos, no editables aquí). Los roles de cada persona se asignan en Usuarios.'
                      : 'This is how roles work today (defined in the database, not editable here). Assign roles in Users.'}
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                        <th className="px-3 py-2 font-semibold">Permiso</th>
                        {ALL_ROLES.map((r) => (
                          <th key={r} className="px-3 py-2 text-center font-semibold">{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-50">
                      {ALL_PERMISOS.map((p) => (
                        <tr key={p}>
                          <td className="px-3 py-2 text-ink/70">{p}</td>
                          {ALL_ROLES.map((r) => (
                            <td key={r} className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={matriz[r]?.has(p) ?? false}
                                disabled={esReal}
                                onChange={() => togglePermiso(r, p)}
                                className="h-4 w-4 rounded border-brand-300 text-brand-600"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!esReal && (
                <button onClick={guardarPerms} className="mt-4 flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-soft hover:opacity-90">
                  <Save size={15} />
                  {savedPerms ? '✓ Guardado' : t.savePerms}
                </button>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
