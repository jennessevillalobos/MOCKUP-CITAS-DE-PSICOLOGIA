import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2 } from 'lucide-react';
import PortalLayout from '@/components/site/PortalLayout';
import { INSTRUCTOR_NAV_LABELS, buildInstructorNav } from '@/components/site/instructorNav';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

type Tab = 'datos' | 'seguridad' | 'preferencias';

// Mismo patrón que PatientProfilePage.tsx ("Mi perfil" del paciente), pero
// para el profesional: mismos campos/mecánica de useSiteAuth (updateProfile,
// foto como data URL), adaptando solo las etiquetas de contexto (rol,
// preferencias de notificación relevantes para su día a día).
const text = {
  es: {
    volverPanel: 'Volver al panel',
    titulo: 'Mi perfil', subtitulo: 'Gestiona tu información, seguridad y preferencias.',
    cuentaActiva: 'Cuenta activa',
    cuentaCreada: 'Cuenta creada', ultimoAcceso: 'Último acceso', rolActivo: 'Rol activo', profesional: 'Profesional',
    tabDatos: 'Datos personales', tabSeguridad: 'Seguridad', tabPreferencias: 'Preferencias',
    guardado: 'Cambios guardados correctamente.',
    nombreCompleto: 'Nombre completo', correo: 'Correo', telefono: 'Teléfono', idiomaPreferido: 'Idioma preferido', sobreMi: 'Sobre mí',
    sobreMiPlaceholder: 'Cuéntales a tus pacientes sobre tu especialidad y enfoque terapéutico…',
    cancelar: 'Cancelar', guardarCambios: 'Guardar cambios',
    cambiarContrasena: 'Cambiar contraseña', contrasenaActual: 'Contraseña actual', nuevaContrasena: 'Nueva contraseña', confirmarContrasena: 'Confirmar contraseña',
    actualizarContrasena: 'Actualizar contraseña',
    verificacionDosPasos: 'Verificación en dos pasos', verificacionDetalle: 'Añade una capa extra de seguridad a tu cuenta profesional.',
    sesionesActivas: 'Sesiones activas', sesionInfo: 'Este navegador · ahora', cerrarTodas: 'cerrar todas',
    idiomaPlataforma: 'Idioma de la plataforma',
    notifPrefs: 'Notificaciones', recordatoriosCitas: 'Recordatorios de mis citas', nuevasReservas: 'Nuevas reservas de pacientes',
    mensajesPacientes: 'Mensajes de pacientes y estudiantes', promociones: 'Novedades de la plataforma',
    guardarPreferencias: 'Guardar preferencias',
    zonaRiesgo: 'Zona de riesgo', zonaRiesgoDetalle: 'Desactivar tu cuenta cerrará tu sesión. Puedes volver a entrar cuando quieras.',
    desactivarCuenta: 'Desactivar cuenta',
    confirmarDesactivar: '¿Seguro que quieres desactivar tu cuenta? Se cerrará tu sesión.',
    cambiarFoto: 'Cambiar foto',
  },
  en: {
    volverPanel: 'Back to dashboard',
    titulo: 'My profile', subtitulo: 'Manage your information, security and preferences.',
    cuentaActiva: 'Active account',
    cuentaCreada: 'Created', ultimoAcceso: 'Last login', rolActivo: 'Active role', profesional: 'Professional',
    tabDatos: 'Personal info', tabSeguridad: 'Security', tabPreferencias: 'Preferences',
    guardado: 'Changes saved successfully.',
    nombreCompleto: 'Full name', correo: 'Email', telefono: 'Phone', idiomaPreferido: 'Preferred language', sobreMi: 'About me',
    sobreMiPlaceholder: 'Tell your patients about your specialty and therapeutic approach…',
    cancelar: 'Cancel', guardarCambios: 'Save changes',
    cambiarContrasena: 'Change password', contrasenaActual: 'Current password', nuevaContrasena: 'New password', confirmarContrasena: 'Confirm password',
    actualizarContrasena: 'Update password',
    verificacionDosPasos: 'Two-factor authentication', verificacionDetalle: 'Add an extra layer of security to your professional account.',
    sesionesActivas: 'Active sessions', sesionInfo: 'This browser · now', cerrarTodas: 'sign out all',
    idiomaPlataforma: 'Platform language',
    notifPrefs: 'Notifications', recordatoriosCitas: 'Reminders for my appointments', nuevasReservas: 'New patient bookings',
    mensajesPacientes: 'Messages from patients and students', promociones: 'Platform updates',
    guardarPreferencias: 'Save preferences',
    zonaRiesgo: 'Danger zone', zonaRiesgoDetalle: 'Deactivating your account signs you out. You can log back in anytime.',
    desactivarCuenta: 'Deactivate account',
    confirmarDesactivar: 'Are you sure you want to deactivate your account? This will sign you out.',
    cambiarFoto: 'Change photo',
  },
} as const;

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

export default function InstructorProfilePage() {
  const { user, updateProfile, logout } = useSiteAuth();
  const { language, setLanguage } = useSiteLanguage();
  const navigate = useNavigate();
  const t = text[language];
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('datos');
  const [guardado, setGuardado] = useState(false);

  const [nombre, setNombre] = useState(user?.nombre || '');
  const [correo, setCorreo] = useState(user?.correo || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [sobreMi, setSobreMi] = useState(user?.sobreMi || '');

  const [dosFactor, setDosFactor] = useState(false);
  const [notifCitas, setNotifCitas] = useState(true);
  const [notifReservas, setNotifReservas] = useState(true);
  const [notifMensajes, setNotifMensajes] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);

  const navItems = buildInstructorNav(
    INSTRUCTOR_NAV_LABELS,
    ['perfil'],
    ['constructor', 'citas', 'cursos', 'vivo', 'evaluaciones', 'notif', 'agenda', 'perfil']
  );

  function mostrarGuardado() {
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 2500);
  }

  function guardarDatos(e: FormEvent) {
    e.preventDefault();
    updateProfile({ nombre: nombre.trim() || user?.nombre, correo: correo.trim(), telefono: telefono.trim(), sobreMi: sobreMi.trim() });
    mostrarGuardado();
  }

  function guardarSeguridad(e: FormEvent) {
    e.preventDefault();
    mostrarGuardado();
  }

  function guardarPreferencias(e: FormEvent) {
    e.preventDefault();
    mostrarGuardado();
  }

  function onFotoSeleccionada(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') updateProfile({ foto: reader.result });
    };
    reader.readAsDataURL(file);
  }

  function desactivarCuenta() {
    if (!window.confirm(t.confirmarDesactivar)) return;
    logout();
    navigate('/');
  }

  const avatarStyle = user?.foto ? { backgroundImage: `url(${user.foto})` } : undefined;

  return (
    <PortalLayout
      navItems={navItems}
      activeKey="perfil"
      onNavigate={() => {}}
      roleBadge={{ es: 'Instructor', en: 'Instructor' }}
      backTo="/instructor"
      backLabel={{ es: t.volverPanel, en: t.volverPanel }}
    >
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.titulo}</h1>
        <p className="mt-1 text-sm text-ink/50">{t.subtitulo}</p>
      </div>

      {/* Cabecera con estado de cuenta */}
      <div className="flex flex-col items-start gap-6 rounded-3xl border border-brand-100 bg-white p-6 shadow-soft sm:flex-row">
        <div className="relative shrink-0">
          <div
            className="grid h-24 w-24 place-items-center rounded-2xl bg-brand-gradient bg-cover bg-center font-display text-3xl font-semibold text-white"
            style={avatarStyle}
          >
            {!user?.foto && iniciales(user?.nombre || nombre || '?')}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            title={t.cambiarFoto}
            aria-label={t.cambiarFoto}
            className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-white shadow-lift"
          >
            <Camera size={15} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFotoSeleccionada} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl font-semibold text-ink">{user?.nombre || nombre}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">● {t.cuentaActiva}</span>
          </div>
          <p className="mt-1 text-sm text-ink/50">{user?.correo || correo}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink/45">{t.cuentaCreada}</p>
              <p className="text-ink">{language === 'es' ? '18 mar 2023' : 'Mar 18, 2023'}</p>
            </div>
            <div>
              <p className="text-xs text-ink/45">{t.ultimoAcceso}</p>
              <p className="text-ink">{language === 'es' ? '29 ago 2026 · 09:14' : 'Aug 29, 2026 · 9:14 AM'}</p>
            </div>
            <div>
              <p className="text-xs text-ink/45">{t.rolActivo}</p>
              <p className="text-ink">{t.profesional}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-6 overflow-x-auto border-b border-brand-100">
        {(['datos', 'seguridad', 'preferencias'] as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => { setTab(k); setGuardado(false); }}
            className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-semibold transition ${
              tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink/45 hover:text-ink/70'
            }`}
          >
            {k === 'datos' ? t.tabDatos : k === 'seguridad' ? t.tabSeguridad : t.tabPreferencias}
          </button>
        ))}
      </div>

      {guardado && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> {t.guardado}
        </div>
      )}

      {tab === 'datos' && (
        <form onSubmit={guardarDatos} className="space-y-4 rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">{t.nombreCompleto}</label>
              <input
                type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink focus:border-brand-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">{t.correo}</label>
              <input
                type="email" value={correo} onChange={(e) => setCorreo(e.target.value)}
                className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink focus:border-brand-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">{t.telefono}</label>
              <input
                type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink focus:border-brand-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">{t.idiomaPreferido}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
                className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink focus:border-brand-400"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-ink">{t.sobreMi}</label>
              <textarea
                rows={3} value={sobreMi} onChange={(e) => setSobreMi(e.target.value)}
                placeholder={t.sobreMiPlaceholder}
                className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink focus:border-brand-400"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/instructor')} className="rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-ink/60 hover:bg-brand-50">
              {t.cancelar}
            </button>
            <button type="submit" className="rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90">
              {t.guardarCambios}
            </button>
          </div>
        </form>
      )}

      {tab === 'seguridad' && (
        <form onSubmit={guardarSeguridad} className="max-w-lg space-y-4 rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
          <h3 className="font-display font-semibold text-ink">{t.cambiarContrasena}</h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">{t.contrasenaActual}</label>
            <input type="password" className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink focus:border-brand-400" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">{t.nuevaContrasena}</label>
            <input type="password" className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink focus:border-brand-400" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">{t.confirmarContrasena}</label>
            <input type="password" className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-ink focus:border-brand-400" />
          </div>
          <button type="submit" className="rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90">
            {t.actualizarContrasena}
          </button>
          <hr className="border-brand-100" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">{t.verificacionDosPasos}</p>
              <p className="text-xs text-ink/45">{t.verificacionDetalle}</p>
            </div>
            <button
              type="button"
              onClick={() => setDosFactor((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${dosFactor ? 'bg-brand-600' : 'bg-brand-100'}`}
              aria-pressed={dosFactor}
              aria-label={t.verificacionDosPasos}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${dosFactor ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="pt-2">
            <p className="mb-1 text-sm font-medium text-ink">{t.sesionesActivas}</p>
            <p className="text-xs text-ink/45">
              {t.sesionInfo} · <button type="button" className="text-rose-500 hover:underline">{t.cerrarTodas}</button>
            </p>
          </div>
        </form>
      )}

      {tab === 'preferencias' && (
        <>
          <form onSubmit={guardarPreferencias} className="max-w-lg space-y-5 rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">{t.idiomaPlataforma}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('es')}
                  className={`flex-1 rounded-full border py-2 text-sm font-semibold transition ${
                    language === 'es' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-brand-200 text-ink/50 hover:text-ink'
                  }`}
                >
                  Español
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex-1 rounded-full border py-2 text-sm font-semibold transition ${
                    language === 'en' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-brand-200 text-ink/50 hover:text-ink'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-ink">{t.notifPrefs}</p>
              <div className="space-y-3 text-sm">
                {[
                  { label: t.recordatoriosCitas, value: notifCitas, set: setNotifCitas },
                  { label: t.nuevasReservas, value: notifReservas, set: setNotifReservas },
                  { label: t.mensajesPacientes, value: notifMensajes, set: setNotifMensajes },
                  { label: t.promociones, value: notifPromos, set: setNotifPromos },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-ink">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => item.set((v) => !v)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${item.value ? 'bg-brand-600' : 'bg-brand-100'}`}
                      aria-pressed={item.value}
                      aria-label={item.label}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${item.value ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90">
                {t.guardarPreferencias}
              </button>
            </div>
          </form>

          <div className="max-w-lg rounded-3xl border border-rose-200 bg-white p-6">
            <p className="mb-1 text-sm font-medium text-ink">{t.zonaRiesgo}</p>
            <p className="mb-3 text-xs text-ink/45">{t.zonaRiesgoDetalle}</p>
            <button onClick={desactivarCuenta} className="rounded-full border border-rose-300 px-5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
              {t.desactivarCuenta}
            </button>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
