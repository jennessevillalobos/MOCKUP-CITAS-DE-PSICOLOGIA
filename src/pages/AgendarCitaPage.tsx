import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Clock3, CreditCard, Lock,
  Mail, MapPin, MonitorSmartphone, Phone, ShieldCheck, User, Loader2, PartyPopper,
} from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { useSiteLanguage } from '@/context/SiteLanguageContext';
import { useSiteAuth } from '@/context/SiteAuthContext';
import { useInstructorAgenda } from '@/context/InstructorAgendaContext';
import { bookAppointment } from '@/lib/api/edgeFunctions';
import { SERVICIOS_PUBLICOS } from '@/data/servicesPageData';
import { PROFESIONALES_PUBLICOS } from '@/data/professionalsPageData';
import { SEDES } from '@/data/contactPageData';

type Modalidad = 'Online' | 'Presencial';

const text = {
  es: {
    breadcrumbHome: 'Inicio', breadcrumbCurrent: 'Agendar una cita',
    title: 'Agenda tu cita', subtitle: 'Reserva en unos minutos: elige el servicio, el profesional y el horario que mejor te acomode.',
    steps: ['Servicio', 'Profesional', 'Modalidad', 'Fecha y hora', 'Tus datos', 'Pago'],
    atras: 'Atrás', continuar: 'Continuar',
    paso1Sub: 'Elige el servicio que se ajusta a lo que buscas.',
    paso2Sub: 'Elige con quién quieres tener tu sesión.',
    paso3Sub: 'Elige cómo prefieres tu sesión.',
    online: 'Online', presencial: 'Presencial', fecha: 'Fecha',
    onlineDesc: 'Videollamada segura desde donde estés', presencialDesc: 'En una de nuestras sedes',
    paso3Sede: 'Selecciona la sede',
    sinPreferencia: 'Sin preferencia', sinCostoReserva: 'Sin costo de reserva', canceleGratis: 'Cancela gratis hasta 24h antes',
    paso4Sub: 'Elige el día y la hora que prefieras.',
    sinCupos: 'No hay horarios disponibles ese día, elige otra fecha.',
    paso5Sub: 'Estos datos se usarán para confirmar tu cita.',
    nombreCompleto: 'Nombre completo', correo: 'Correo electrónico', telefono: 'Teléfono (opcional)',
    crearCuenta: 'Crear una cuenta para ver y gestionar esta cita desde tu Portal Paciente',
    contrasena: 'Crea una contraseña', confirmarContrasena: 'Confirma la contraseña',
    sinBackendNota: 'Aún no tenemos backend en esta demo — no se almacena de forma segura, pero te permitirá entrar de nuevo con este correo.',
    yaSesion: 'Reservando como', noEresTu: '¿No eres tú?',
    paso6Sub: 'Completa el pago para confirmar tu cita.',
    resumen: 'Resumen de tu cita', servicio: 'Servicio', profesional: 'Profesional', fechaHora: 'Fecha y hora', modalidad: 'Modalidad', duracion: 'Duración', total: 'Total a pagar',
    datosTarjeta: 'Datos de la tarjeta', numeroTarjeta: 'Número de tarjeta', nombreTarjeta: 'Nombre en la tarjeta', vencimiento: 'MM/AA', cvv: 'CVV',
    pagoSimuladoAviso: 'Pago simulado — esta demo aún no tiene backend, no se realiza ningún cargo real.',
    pagar: 'Pagar', pagando: 'Procesando pago…',
    confTitle: '¡Tu cita quedó confirmada!', confSub: 'Guardamos todos los detalles, aquí tienes tu resumen.',
    confId: 'N.º de confirmación', confCorreoAviso: (correo: string) => `Te enviamos la confirmación a ${correo} (simulado — esta demo aún no envía correos reales).`,
    confCuentaCreada: 'Creamos tu acceso al Portal Paciente con este correo — desde ahí podrás ver, reagendar o cancelar tu cita.',
    irPortal: 'Ir a mi Portal Paciente', volverInicio: 'Volver al inicio',
    sedeCentro: 'Sede Centro',
    faltaServicio: 'Selecciona un servicio para continuar.',
    faltaProfesional: 'Selecciona un profesional para continuar.',
    faltaModalidad: 'Elige una modalidad para continuar.',
    faltaFechaHora: 'Elige una fecha y una hora para continuar.',
  },
  en: {
    breadcrumbHome: 'Home', breadcrumbCurrent: 'Book an appointment',
    title: 'Book your session', subtitle: 'Book in a few minutes: choose the service, the professional, and the time that suits you best.',
    steps: ['Service', 'Professional', 'Mode', 'Date & time', 'Your info', 'Payment'],
    atras: 'Back', continuar: 'Continue',
    paso1Sub: 'Choose the service that fits what you need.',
    paso2Sub: 'Choose who you want your session with.',
    paso3Sub: 'Choose how you prefer your session.',
    online: 'Online', presencial: 'In-person', fecha: 'Date',
    onlineDesc: 'Secure video call from wherever you are', presencialDesc: 'At one of our locations',
    paso3Sede: 'Select the location',
    sinPreferencia: 'No preference', sinCostoReserva: 'No booking fee', canceleGratis: 'Free cancellation up to 24h before',
    paso4Sub: 'Choose the day and time you prefer.',
    sinCupos: 'No slots available that day, pick another date.',
    paso5Sub: "We'll use this info to confirm your appointment.",
    nombreCompleto: 'Full name', correo: 'Email', telefono: 'Phone (optional)',
    crearCuenta: 'Create an account to view and manage this appointment from your Patient Portal',
    contrasena: 'Create a password', confirmarContrasena: 'Confirm password',
    sinBackendNota: "This demo has no backend yet — it isn't stored securely, but it will let you log back in with this email.",
    yaSesion: 'Booking as', noEresTu: 'Not you?',
    paso6Sub: 'Complete payment to confirm your appointment.',
    resumen: 'Your appointment summary', servicio: 'Service', profesional: 'Professional', fechaHora: 'Date & time', modalidad: 'Mode', duracion: 'Duration', total: 'Total due',
    datosTarjeta: 'Card details', numeroTarjeta: 'Card number', nombreTarjeta: 'Name on card', vencimiento: 'MM/YY', cvv: 'CVV',
    pagoSimuladoAviso: 'Simulated payment — this demo has no backend yet, no real charge is made.',
    pagar: 'Pay', pagando: 'Processing payment…',
    confTitle: 'Your appointment is confirmed!', confSub: "We've saved all the details — here's your summary.",
    confId: 'Confirmation No.', confCorreoAviso: (correo: string) => `We sent the confirmation to ${correo} (simulated — this demo doesn't send real emails yet).`,
    confCuentaCreada: 'We created your Patient Portal access with this email — from there you can view, reschedule or cancel your appointment.',
    irPortal: 'Go to my Patient Portal', volverInicio: 'Back to home',
    sedeCentro: 'Downtown location',
    faltaServicio: 'Select a service to continue.',
    faltaProfesional: 'Select a professional to continue.',
    faltaModalidad: 'Choose a mode to continue.',
    faltaFechaHora: 'Choose a date and time to continue.',
  },
} as const;

const HORAS_COMPLETAS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
const HORAS_SABADO = ['09:00', '10:00', '11:00', '12:00'];

function proximosDias(cantidad: number): string[] {
  const dias: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1); // empieza mañana
  while (dias.length < cantidad) {
    if (cursor.getDay() !== 0) dias.push(cursor.toISOString().slice(0, 10)); // sin domingos
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function formatearDiaChip(fechaISO: string, language: 'es' | 'en') {
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'short', day: 'numeric' });
}

function formatearFechaLarga(fechaISO: string, language: 'es' | 'en') {
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Guarda el progreso del wizard (pasos 1-6) en localStorage para que no se
// pierda si la persona recarga la página o vuelve más tarde — a propósito
// NO se guardan datos de la tarjeta ni la contraseña, esos siempre se
// vuelven a pedir. Se borra apenas la reserva queda confirmada (paso 7),
// ya que a partir de ahí la cita real vive en InstructorAgendaContext.
const PROGRESO_KEY = 'psiqueAgendarProgreso';

interface ProgresoGuardado {
  paso: number;
  servicioKey: string | null;
  profesionalKey: string | null;
  modalidad: Modalidad | null;
  sedeKey: string | null;
  fechaISO: string | null;
  hora: string | null;
  nombre: string;
  correo: string;
  telefono: string;
  crearCuenta: boolean;
}

function leerProgresoGuardado(): ProgresoGuardado | null {
  try {
    const raw = localStorage.getItem(PROGRESO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.paso === 'number') return parsed as ProgresoGuardado;
    return null;
  } catch {
    return null;
  }
}

export default function AgendarCitaPage() {
  const { language } = useSiteLanguage();
  const t = text[language];
  const navigate = useNavigate();
  const { user, login, isRealAuth, registerWithPassword } = useSiteAuth();
  const { citas, agregarCita } = useInstructorAgenda();
  const [searchParams] = useSearchParams();

  // Si llegamos desde la página de un servicio (p. ej. "Agendar este
  // servicio" en /servicios/:key), ese servicio viene en la URL y debe
  // quedar preseleccionado apenas se abre el wizard.
  const servicioDesdeUrl = useMemo(() => {
    const key = searchParams.get('servicio');
    return key && SERVICIOS_PUBLICOS.some((s) => s.key === key) ? key : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progresoInicial = useMemo(() => leerProgresoGuardado(), []);
  // Si el servicio de la URL es distinto al que traía el progreso guardado,
  // arrancamos limpio en el paso 1 con ese servicio ya elegido — el resto de
  // selecciones (profesional, modalidad, fecha) dependían del servicio anterior.
  const progresoAplicable =
    servicioDesdeUrl && servicioDesdeUrl !== progresoInicial?.servicioKey ? null : progresoInicial;
  const pasoInicial =
    servicioDesdeUrl && servicioDesdeUrl !== progresoInicial?.servicioKey
      ? 1
      : progresoAplicable && progresoAplicable.paso >= 1 && progresoAplicable.paso <= 6
        ? progresoAplicable.paso
        : 1;

  const [paso, setPaso] = useState(pasoInicial); // 1..6, 7 = confirmación
  const [servicioKey, setServicioKey] = useState<string | null>(servicioDesdeUrl ?? progresoAplicable?.servicioKey ?? null);
  const [profesionalKey, setProfesionalKey] = useState<string | null>(progresoAplicable?.profesionalKey ?? null);
  const [modalidad, setModalidad] = useState<Modalidad | null>(progresoAplicable?.modalidad ?? null);
  const [sedeKey, setSedeKey] = useState<string | null>(progresoAplicable?.sedeKey ?? null);
  const [fechaISO, setFechaISO] = useState<string | null>(progresoAplicable?.fechaISO ?? null);
  const [hora, setHora] = useState<string | null>(progresoAplicable?.hora ?? null);

  const esPaciente = user?.rol === 'paciente';
  const [nombre, setNombre] = useState(esPaciente ? user!.nombre : progresoInicial?.nombre ?? '');
  const [correo, setCorreo] = useState(esPaciente ? user!.correo : progresoInicial?.correo ?? '');
  const [telefono, setTelefono] = useState(esPaciente ? user?.telefono ?? '' : progresoInicial?.telefono ?? '');
  const [crearCuenta, setCrearCuenta] = useState(progresoInicial?.crearCuenta ?? true);
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');

  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [nombreTarjeta, setNombreTarjeta] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvv, setCvv] = useState('');
  const [pagando, setPagando] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [citaConfirmada, setCitaConfirmada] = useState<{ id: string; correo: string; cuentaCreada: boolean } | null>(null);

  const servicio = useMemo(() => SERVICIOS_PUBLICOS.find((s) => s.key === servicioKey) ?? null, [servicioKey]);
  const profesional = useMemo(() => PROFESIONALES_PUBLICOS.find((p) => p.key === profesionalKey) ?? null, [profesionalKey]);
  const sedeSeleccionada = useMemo(() => SEDES.find((s) => s.key === sedeKey) ?? null, [sedeKey]);

  // La persona siempre puede elegir Online o Presencial para su cita,
  // independientemente de cómo esté descrita la modalidad del servicio o
  // del profesional en su ficha — esas fichas son solo informativas.
  const modalidadesDisponibles: Modalidad[] = ['Online', 'Presencial'];

  const dias = useMemo(() => proximosDias(21), []);
  const horasDelDia = useMemo(() => {
    if (!fechaISO) return [];
    const d = new Date(`${fechaISO}T00:00:00`);
    return d.getDay() === 6 ? HORAS_SABADO : HORAS_COMPLETAS;
  }, [fechaISO]);
  const horasDisponibles = useMemo(() => {
    if (!fechaISO || !profesional) return horasDelDia;
    return horasDelDia.filter(
      (h) => !citas.some((c) => c.profesional === profesional.name && c.fechaISO === fechaISO && c.hora === h && c.estado === 'Programada')
    );
  }, [horasDelDia, fechaISO, profesional, citas]);

  // Sincroniza el progreso del wizard a localStorage en cada cambio, mientras
  // no se haya llegado a la confirmación — así recargar la página (o volver
  // más tarde) retoma exactamente donde se quedó, sin perder las selecciones.
  useEffect(() => {
    if (paso >= 7) return;
    try {
      const progreso: ProgresoGuardado = { paso, servicioKey, profesionalKey, modalidad, sedeKey, fechaISO, hora, nombre, correo, telefono, crearCuenta };
      localStorage.setItem(PROGRESO_KEY, JSON.stringify(progreso));
    } catch {
      // localStorage no disponible; el progreso solo vive en memoria durante esta visita.
    }
  }, [paso, servicioKey, profesionalKey, modalidad, sedeKey, fechaISO, hora, nombre, correo, telefono, crearCuenta]);

  function irA(pasoDestino: number) {
    setPaso(pasoDestino);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function avanzarDesdeProfesional() {
    // La modalidad siempre se elige explícitamente en el paso 3 (ver
    // modalidadesDisponibles) — aquí solo se limpia cualquier selección
    // previa de una sesión anterior antes de mostrar ese paso.
    setModalidad(null);
    setSedeKey(null);
    irA(3);
  }

  const datosValidos =
    nombre.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) &&
    (esPaciente || !crearCuenta || (contrasena.length >= 6 && contrasena === confirmarContrasena));

  async function confirmarPago(event: FormEvent) {
    event.preventDefault();
    if (!servicio || !profesional || !modalidad || !fechaISO || !hora) return;
    setPagando(true);

    // ── Ruta real: Supabase está configurado y el usuario tiene sesión ──
    if (isRealAuth) {
      // Si el usuario no tiene sesión y quiere crear cuenta, la creamos primero
      if (!esPaciente && crearCuenta && contrasena.length >= 6) {
        await registerWithPassword(correo.trim(), contrasena, nombre.trim(), 'paciente');
      }

      // IDs numéricos: en el wizard usamos datos estáticos, necesitamos el ID
      // del servicio y profesional en la BD. Por ahora usamos el índice + 1
      // como aproximación; el equipo deberá ajustar cuando haya IDs reales.
      const servicioId = SERVICIOS_PUBLICOS.findIndex((s) => s.key === servicioKey) + 1;
      const profesionalId = PROFESIONALES_PUBLICOS.findIndex((p) => p.key === profesionalKey) + 1;
      const modalidadId = modalidad === 'Online' ? 1 : 2; // 1=virtual, 2=presencial

      const res = await bookAppointment({
        servicio_id: servicioId,
        profesional_id: profesionalId,
        modalidad_id: modalidadId,
        fecha: fechaISO,
        hora: hora,
      });

      setPagando(false);
      if (res.data) {
        setCitaConfirmada({ id: res.data.cita_id, correo: correo.trim(), cuentaCreada: !esPaciente && crearCuenta });
        irA(7);
      } else {
        // Mostrar error en el UI sin romper el flujo
        console.error('[book-appointment]', res.error);
        setBookingError(res.error?.message ?? 'Error al reservar la cita. Intenta de nuevo.');
      }
      return;
    }

    // ── Ruta demo: sin Supabase — guarda en localStorage ──
    window.setTimeout(() => {
      let cuentaCreada = false;
      if (!esPaciente && crearCuenta && user?.rol !== 'profesional') {
        login(correo.trim(), 'paciente', nombre.trim());
        cuentaCreada = true;
      }
      const id = agregarCita({
        fechaISO,
        hora,
        duracionMin: servicio.duracionMin,
        paciente: nombre.trim(),
        correo: correo.trim(),
        telefono: telefono.trim() || undefined,
        servicio: servicio.titulo.es,
        profesional: profesional.name,
        modalidad,
        lugar: modalidad === 'Presencial' ? (sedeSeleccionada ? `${sedeSeleccionada.nombre} — ${sedeSeleccionada.direccion[language]}` : t.sedeCentro) : undefined,
        estado: 'Programada',
        notas: '',
        precio: servicio.precio,
        origenReserva: true,
      });
      setCitaConfirmada({ id, correo: correo.trim(), cuentaCreada });
      setPagando(false);
      try {
        localStorage.removeItem(PROGRESO_KEY);
      } catch {
        // localStorage no disponible; no hay progreso que limpiar.
      }
      irA(7);
    }, 900);
  }

  const stepperVisible = paso <= 6;

  return (
    <div className="overflow-hidden bg-white">
      <SiteHeader />

      <main className="pt-[82px] sm:pt-[86px]">
        <section className="relative isolate overflow-hidden bg-mist-gradient py-12 sm:py-16">
          <div className="pointer-events-none absolute -right-32 top-0 -z-10 h-[420px] w-[420px] rounded-full bg-brand-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-[-120px] -z-10 h-[360px] w-[360px] rounded-full bg-lilac-300/30 blur-3xl" />
          <div className="container-wide text-center">
            <nav className="mb-4 text-sm text-ink/45">
              <a href="/" className="hover:text-brand-600">{t.breadcrumbHome}</a>
              <span className="mx-1.5">/</span>
              <span className="font-semibold text-ink">{t.breadcrumbCurrent}</span>
            </nav>
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t.title}</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/60 sm:text-base">{t.subtitle}</p>
          </div>
        </section>

        <section className="container-wide py-10">
          {stepperVisible && (
            <div className="mx-auto mb-10 flex max-w-3xl items-center justify-between">
              {t.steps.map((label, i) => {
                const n = i + 1;
                const activo = n === paso;
                const hecho = n < paso;
                return (
                  <div key={label} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                          hecho ? 'bg-brand-600 text-white' : activo ? 'bg-brand-gradient text-white shadow-soft' : 'bg-brand-50 text-ink/40'
                        }`}
                      >
                        {hecho ? <Check size={15} /> : n}
                      </span>
                      <span className={`hidden text-[11px] font-semibold sm:block ${activo ? 'text-brand-700' : 'text-ink/40'}`}>{label}</span>
                    </div>
                    {n < t.steps.length && <div className={`mx-2 h-px flex-1 ${hecho ? 'bg-brand-500' : 'bg-brand-100'}`} />}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mx-auto max-w-5xl">
          {paso <= 6 && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="min-w-0">
            {paso === 1 && (
              <div>
                <p className="mb-5 text-center text-sm text-ink/55">{t.paso1Sub}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {SERVICIOS_PUBLICOS.map((s) => {
                    const Icon = s.icon;
                    const seleccionado = s.key === servicioKey;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setServicioKey(s.key)}
                        className={`flex flex-col items-start gap-3 rounded-3xl border p-5 text-left shadow-soft transition ${
                          seleccionado ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-200' : 'border-brand-100 bg-white hover:border-brand-300'
                        }`}
                      >
                        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${s.colorClases}`}>
                          <Icon size={20} strokeWidth={1.6} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-ink">{s.titulo[language]}</p>
                          <p className="mt-1 text-xs leading-5 text-ink/55">{s.descripcion[language]}</p>
                        </div>
                        <div className="flex w-full items-center justify-between text-xs text-ink/50">
                          <span className="inline-flex items-center gap-1"><Clock3 size={13} />{s.duracionMin} min</span>
                          <span className="font-display text-base font-semibold text-brand-700">${s.precio} <span className="text-[10px] font-normal text-ink/40">USD</span></span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {paso === 2 && (
              <div>
                <p className="mb-5 text-center text-sm text-ink/55">{t.paso2Sub}</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {PROFESIONALES_PUBLICOS.map((p) => {
                    const seleccionado = p.key === profesionalKey;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setProfesionalKey(p.key)}
                        className={`overflow-hidden rounded-3xl border text-left shadow-soft transition ${
                          seleccionado ? 'border-brand-500 ring-2 ring-brand-200' : 'border-brand-100 hover:border-brand-300'
                        }`}
                      >
                        <div className="relative h-36 overflow-hidden">
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-4">
                          <p className="font-semibold text-ink">{p.name}</p>
                          <p className="mt-0.5 text-xs text-brand-600">{p.specialty[language]}</p>
                          <p className="mt-1 text-[11px] text-ink/45">{p.modality[language]}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {paso === 3 && (
              <div>
                <p className="mb-5 text-center text-sm text-ink/55">{t.paso3Sub}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {modalidadesDisponibles.map((m) => {
                    const seleccionado = m === modalidad;
                    const Icon = m === 'Online' ? MonitorSmartphone : Building2;
                    return (
                      <button
                        key={m}
                        onClick={() => { setModalidad(m); if (m !== 'Presencial') setSedeKey(null); }}
                        className={`flex flex-col items-start gap-3 rounded-3xl border p-6 text-left shadow-soft transition ${
                          seleccionado ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-200' : 'border-brand-100 bg-white hover:border-brand-300'
                        }`}
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                          <Icon size={20} strokeWidth={1.6} />
                        </span>
                        <span>
                          <span className="block font-display text-lg font-semibold text-ink">{m === 'Online' ? t.online : t.presencial}</span>
                          <span className="mt-1 block text-xs leading-5 text-ink/55">{m === 'Online' ? t.onlineDesc : t.presencialDesc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {modalidad === 'Presencial' && (
                  <label className="mt-5 block">
                    <span className="text-xs font-bold text-ink/70">{t.paso3Sede}</span>
                    <select
                      value={sedeKey ?? ''}
                      onChange={(e) => setSedeKey(e.target.value || null)}
                      className="mt-2 w-full rounded-2xl border border-transparent bg-brand-50/60 px-4 py-3 text-sm text-ink outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                    >
                      <option value="" disabled>{t.paso3Sede}</option>
                      {SEDES.map((s) => (
                        <option key={s.key} value={s.key}>{s.nombre} — {s.direccion[language]}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            {paso === 4 && (
              <div>
                <p className="mb-5 text-center text-sm text-ink/55">{t.paso4Sub}</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dias.map((f) => {
                    const seleccionado = f === fechaISO;
                    return (
                      <button
                        key={f}
                        onClick={() => { setFechaISO(f); setHora(null); }}
                        className={`shrink-0 rounded-2xl border px-4 py-3 text-center text-xs font-semibold capitalize transition ${
                          seleccionado ? 'border-brand-500 bg-brand-gradient text-white shadow-soft' : 'border-brand-100 bg-white text-ink/60 hover:border-brand-300'
                        }`}
                      >
                        {formatearDiaChip(f, language)}
                      </button>
                    );
                  })}
                </div>

                {fechaISO && (
                  <div className="mt-6">
                    <p className="mb-3 text-sm font-semibold capitalize text-ink">{formatearFechaLarga(fechaISO, language)}</p>
                    {horasDisponibles.length === 0 ? (
                      <p className="rounded-2xl bg-amber-50 p-4 text-center text-sm text-amber-700">{t.sinCupos}</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {horasDisponibles.map((h) => {
                          const seleccionado = h === hora;
                          return (
                            <button
                              key={h}
                              onClick={() => setHora(h)}
                              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                                seleccionado ? 'border-brand-500 bg-brand-50/70 text-brand-700 ring-2 ring-brand-200' : 'border-brand-100 bg-white text-ink/60 hover:border-brand-300'
                              }`}
                            >
                              {h}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {paso === 5 && (
              <div>
                <p className="mb-5 text-center text-sm text-ink/55">{t.paso5Sub}</p>
                <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft sm:p-8">
                  {esPaciente ? (
                    <div className="mb-5 flex items-center gap-3 rounded-2xl bg-brand-50/70 p-3 text-sm">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-white"><User size={16} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink/50">{t.yaSesion}</p>
                        <p className="truncate font-semibold text-ink">{user!.nombre} · {user!.correo}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={esPaciente ? 'pointer-events-none opacity-60' : ''}>
                      <span className="text-xs font-bold text-ink/70">{t.nombreCompleto}</span>
                      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-transparent bg-brand-50/60 px-4 py-3 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
                        <User size={15} className="text-ink/35" />
                        <input value={nombre} disabled={esPaciente} onChange={(e) => setNombre(e.target.value)} className="w-full bg-transparent text-sm text-ink outline-none" />
                      </div>
                    </label>
                    <label className={esPaciente ? 'pointer-events-none opacity-60' : ''}>
                      <span className="text-xs font-bold text-ink/70">{t.correo}</span>
                      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-transparent bg-brand-50/60 px-4 py-3 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
                        <Mail size={15} className="text-ink/35" />
                        <input type="email" value={correo} disabled={esPaciente} onChange={(e) => setCorreo(e.target.value)} className="w-full bg-transparent text-sm text-ink outline-none" />
                      </div>
                    </label>
                    <label className="sm:col-span-2">
                      <span className="text-xs font-bold text-ink/70">{t.telefono}</span>
                      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-transparent bg-brand-50/60 px-4 py-3 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
                        <Phone size={15} className="text-ink/35" />
                        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-transparent text-sm text-ink outline-none" />
                      </div>
                    </label>
                  </div>

                  {!esPaciente && (
                    <div className="mt-5 border-t border-brand-50 pt-5">
                      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink/70">
                        <input type="checkbox" checked={crearCuenta} onChange={(e) => setCrearCuenta(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                        {t.crearCuenta}
                      </label>
                      {crearCuenta && (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <label>
                            <span className="text-xs font-bold text-ink/70">{t.contrasena}</span>
                            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-transparent bg-brand-50/60 px-4 py-3 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
                              <Lock size={15} className="text-ink/35" />
                              <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} className="w-full bg-transparent text-sm text-ink outline-none" />
                            </div>
                          </label>
                          <label>
                            <span className="text-xs font-bold text-ink/70">{t.confirmarContrasena}</span>
                            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-transparent bg-brand-50/60 px-4 py-3 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
                              <Lock size={15} className="text-ink/35" />
                              <input type="password" value={confirmarContrasena} onChange={(e) => setConfirmarContrasena(e.target.value)} className="w-full bg-transparent text-sm text-ink outline-none" />
                            </div>
                          </label>
                          <p className="text-xs leading-5 text-ink/45 sm:col-span-2">{t.sinBackendNota}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {paso === 6 && servicio && profesional && modalidad && fechaISO && hora && (
              <form onSubmit={confirmarPago}>
                <p className="mb-5 text-center text-sm text-ink/55">{t.paso6Sub}</p>
                {bookingError && (
                  <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <span>⚠️</span>
                    <span>{bookingError}</span>
                  </div>
                )}
                <div className="mx-auto max-w-xl">
                  <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
                    <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-ink"><CreditCard size={18} className="text-brand-600" />{t.datosTarjeta}</h2>
                    <div className="grid gap-4">
                      <label>
                        <span className="text-xs font-bold text-ink/70">{t.numeroTarjeta}</span>
                        <input required maxLength={19} placeholder="4242 4242 4242 4242" value={numeroTarjeta} onChange={(e) => setNumeroTarjeta(e.target.value)} className="mt-2 w-full rounded-2xl border border-transparent bg-brand-50/60 px-4 py-3 text-sm text-ink outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
                      </label>
                      <label>
                        <span className="text-xs font-bold text-ink/70">{t.nombreTarjeta}</span>
                        <input required value={nombreTarjeta} onChange={(e) => setNombreTarjeta(e.target.value)} className="mt-2 w-full rounded-2xl border border-transparent bg-brand-50/60 px-4 py-3 text-sm text-ink outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <label>
                          <span className="text-xs font-bold text-ink/70">{t.vencimiento}</span>
                          <input required placeholder="MM/AA" maxLength={5} value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className="mt-2 w-full rounded-2xl border border-transparent bg-brand-50/60 px-4 py-3 text-sm text-ink outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
                        </label>
                        <label>
                          <span className="text-xs font-bold text-ink/70">{t.cvv}</span>
                          <input required maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value)} className="mt-2 w-full rounded-2xl border border-transparent bg-brand-50/60 px-4 py-3 text-sm text-ink outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
                        </label>
                      </div>
                    </div>
                    <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink/45"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-400" />{t.pagoSimuladoAviso}</p>
                    <button
                      type="submit"
                      disabled={pagando}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-3.5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pagando ? (<><Loader2 size={16} className="animate-spin" />{t.pagando}</>) : (<>{t.pagar} ${servicio.precio} ({language === 'es' ? 'simulado' : 'simulated'})<ArrowRight size={15} /></>)}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {stepperVisible && (
              <div className="mt-8 flex items-center justify-between">
                {paso > 1 ? (
                  <button onClick={() => irA(paso - 1)} className="flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink">
                    <ArrowLeft size={15} />{t.atras}
                  </button>
                ) : <span />}

                {paso === 1 && (
                  <button disabled={!servicio} title={!servicio ? t.faltaServicio : undefined} onClick={() => irA(2)} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
                    {t.continuar}<ArrowRight size={15} />
                  </button>
                )}
                {paso === 2 && (
                  <button disabled={!profesional} title={!profesional ? t.faltaProfesional : undefined} onClick={avanzarDesdeProfesional} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
                    {t.continuar}<ArrowRight size={15} />
                  </button>
                )}
                {paso === 3 && (
                  <button
                    disabled={!modalidad || (modalidad === 'Presencial' && !sedeKey)}
                    title={!modalidad || (modalidad === 'Presencial' && !sedeKey) ? t.faltaModalidad : undefined}
                    onClick={() => irA(4)}
                    className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    {t.continuar}<ArrowRight size={15} />
                  </button>
                )}
                {paso === 4 && (
                  <button disabled={!fechaISO || !hora} title={!fechaISO || !hora ? t.faltaFechaHora : undefined} onClick={() => irA(5)} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
                    {t.continuar}<ArrowRight size={15} />
                  </button>
                )}
                {paso === 5 && (
                  <button disabled={!datosValidos} onClick={() => irA(6)} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
                    {t.continuar}<ArrowRight size={15} />
                  </button>
                )}
                {paso === 6 && <span />}
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-brand-100 bg-brand-50/60 p-6 shadow-soft lg:sticky lg:top-28">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">{t.resumen}</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink/50">{t.servicio}</dt><dd className="text-right font-semibold text-ink">{servicio ? servicio.titulo[language] : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink/50">{t.profesional}</dt><dd className="text-right font-semibold text-ink">{profesional ? profesional.name : t.sinPreferencia}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink/50">{t.modalidad}</dt><dd className="text-right font-semibold text-ink">
                {modalidad === 'Online' ? t.online : modalidad === 'Presencial' ? `${t.presencial}${sedeSeleccionada ? ` · ${sedeSeleccionada.nombre}` : ''}` : '—'}
              </dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink/50">{t.fecha}</dt><dd className="text-right font-semibold capitalize text-ink">
                {fechaISO ? `${formatearFechaLarga(fechaISO, language)}${hora ? ` · ${hora}` : ''}` : '—'}
              </dd></div>
            </dl>
            <div className="mt-4 flex justify-between border-t border-brand-200/60 pt-4">
              <span className="font-semibold text-ink">{t.total}</span>
              <span className="font-display text-xl font-semibold text-brand-700">
                {servicio ? (<>${servicio.precio} <span className="text-xs font-normal text-ink/40">USD</span></>) : '—'}
              </span>
            </div>
            <ul className="mt-4 space-y-2 border-t border-brand-200/60 pt-4 text-xs text-ink/60">
              <li className="flex items-center gap-2"><Check size={13} className="text-emerald-600" />{t.sinCostoReserva}</li>
              <li className="flex items-center gap-2"><Check size={13} className="text-emerald-600" />{t.canceleGratis}</li>
            </ul>
          </aside>
          </div>
          )}

            {paso === 7 && citaConfirmada && servicio && profesional && modalidad && fechaISO && hora && (
              <div className="mx-auto max-w-2xl rounded-3xl border border-brand-100 bg-white p-8 text-center shadow-soft sm:p-10">
                <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><PartyPopper size={28} /></span>
                <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.confTitle}</h2>
                <p className="mt-2 text-sm text-ink/55">{t.confSub}</p>

                <div className="mx-auto mt-8 max-w-md rounded-2xl bg-brand-50/70 p-6 text-left">
                  <dl className="space-y-2.5 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-ink/50">{t.servicio}</dt><dd className="text-right font-semibold text-ink">{servicio.titulo[language]}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-ink/50">{t.profesional}</dt><dd className="text-right font-semibold text-ink">{profesional.name}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-ink/50">{t.fechaHora}</dt><dd className="text-right font-semibold capitalize text-ink">{formatearFechaLarga(fechaISO, language)} · {hora}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-ink/50">{t.modalidad}</dt><dd className="text-right font-semibold text-ink">
                      {modalidad === 'Online' ? t.online : (<span className="inline-flex items-center gap-1"><MapPin size={13} />{t.presencial}</span>)}
                    </dd></div>
                    <div className="flex justify-between gap-3 border-t border-brand-200/60 pt-2.5"><dt className="font-semibold text-ink">{t.total}</dt><dd className="flex items-center gap-1.5 text-right font-semibold text-emerald-600"><CheckCircle2 size={15} />${servicio.precio} USD</dd></div>
                  </dl>
                  <p className="mt-4 text-xs text-ink/40">{t.confId}: <span className="font-mono font-semibold text-ink/60">{citaConfirmada.id.toUpperCase()}</span></p>
                </div>

                <p className="mx-auto mt-6 max-w-md text-xs leading-5 text-ink/45">{t.confCorreoAviso(citaConfirmada.correo)}</p>
                {citaConfirmada.cuentaCreada && (
                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-brand-600">{t.confCuentaCreada}</p>
                )}

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  {(esPaciente || citaConfirmada.cuentaCreada) ? (
                    <button onClick={() => navigate('/portal-paciente')} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                      {t.irPortal}<ArrowRight size={15} />
                    </button>
                  ) : null}
                  <button onClick={() => navigate('/')} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-brand-300 bg-white/50 px-6 text-sm font-bold text-brand-700 transition hover:-translate-y-1 hover:bg-white">
                    {t.volverInicio}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
