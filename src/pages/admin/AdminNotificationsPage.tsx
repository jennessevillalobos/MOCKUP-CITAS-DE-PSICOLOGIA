import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bell, Zap, FileText, Plug, Calendar, MessageCircle, Mail, CheckCheck,
  Smartphone, ArrowRight, Settings2, Check,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import {
  demoNotificaciones, demoReglasNotificacion, demoPlantillas, demoIntegraciones,
  type NotificacionRecord, type TipoNotificacion, type ReglaNotificacion, type CanalNotificacion,
  type PlantillaNotificacion,
} from '@/data/admin/notificationsData';

type Tab = 'centro' | 'reglas' | 'plantillas' | 'integraciones';

const text = {
  es: {
    title: 'Notificaciones y automatizaciones', subtitle: 'Centro, reglas, plantillas e integraciones · datos de demostración',
    tabs: { centro: 'Centro', reglas: 'Reglas', plantillas: 'Plantillas', integraciones: 'Integraciones' } as Record<Tab, string>,
    all: 'Todas', unread: 'No leídas', markAllRead: 'Marcar todo como leído',
    tipos: { Cita: 'Citas', Pago: 'Pagos', Curso: 'Cursos', Sistema: 'Sistema' } as Record<TipoNotificacion, string>,
    noNotifications: 'No hay notificaciones.',
    newRule: 'Nueva regla', trigger: 'Disparador', channel: 'Canal', template: 'Plantilla', active: 'Activa', inactive: 'Inactiva',
    ruleFlow: 'Vista previa del flujo', createRule: 'Crear regla', ruleName: 'Nombre de la regla',
    templateEditor: 'Editor de plantilla', subject: 'Asunto', body: 'Cuerpo', variables: 'Variables disponibles', channels: 'Canales compatibles',
    save: 'Guardar plantilla',
    gcalTitle: 'Google Calendar', gcalDesc: 'Sincroniza automáticamente las citas del panel con el calendario del profesional.',
    connected: 'Conectada', disconnected: 'No conectada', connect: 'Conectar', disconnect: 'Desconectar', settings: 'Configuración',
    whatsappTitle: 'WhatsApp Business', whatsappDesc: 'Envía recordatorios y confirmaciones directamente por WhatsApp.',
    smtpTitle: 'SMTP personalizado', smtpDesc: 'Usa tu propio servidor de correo para el envío de notificaciones por email.',
  },
  en: {
    title: 'Notifications & automations', subtitle: 'Center, rules, templates and integrations · demo data',
    tabs: { centro: 'Center', reglas: 'Rules', plantillas: 'Templates', integraciones: 'Integrations' } as Record<Tab, string>,
    all: 'All', unread: 'Unread', markAllRead: 'Mark all as read',
    tipos: { Cita: 'Appointments', Pago: 'Payments', Curso: 'Courses', Sistema: 'System' } as Record<TipoNotificacion, string>,
    noNotifications: 'No notifications.',
    newRule: 'New rule', trigger: 'Trigger', channel: 'Channel', template: 'Template', active: 'Active', inactive: 'Inactive',
    ruleFlow: 'Flow preview', createRule: 'Create rule', ruleName: 'Rule name',
    templateEditor: 'Template editor', subject: 'Subject', body: 'Body', variables: 'Available variables', channels: 'Supported channels',
    save: 'Save template',
    gcalTitle: 'Google Calendar', gcalDesc: 'Automatically syncs panel appointments with the professional’s calendar.',
    connected: 'Connected', disconnected: 'Not connected', connect: 'Connect', disconnect: 'Disconnect', settings: 'Settings',
    whatsappTitle: 'WhatsApp Business', whatsappDesc: 'Send reminders and confirmations directly via WhatsApp.',
    smtpTitle: 'Custom SMTP', smtpDesc: 'Use your own mail server to send email notifications.',
  },
} as const;

const canalIcon: Record<CanalNotificacion, typeof Mail> = { Email: Mail, SMS: Smartphone, WhatsApp: MessageCircle, Push: Bell };

export default function AdminNotificationsPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'centro';

  const [notificaciones, setNotificaciones] = useState<NotificacionRecord[]>(demoNotificaciones);
  const [filtroTipo, setFiltroTipo] = useState<'todas' | TipoNotificacion>('todas');
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);

  const [reglas, setReglas] = useState<ReglaNotificacion[]>(demoReglasNotificacion);
  const [plantillas] = useState<PlantillaNotificacion[]>(demoPlantillas);
  const [plantillaSelId, setPlantillaSelId] = useState(demoPlantillas[0].id);
  const [idiomaEdit, setIdiomaEdit] = useState<'es' | 'en'>('es');

  const [integraciones, setIntegraciones] = useState(demoIntegraciones);

  const tabs: { key: Tab; label: string; icon: typeof Bell }[] = [
    { key: 'centro', label: t.tabs.centro, icon: Bell },
    { key: 'reglas', label: t.tabs.reglas, icon: Zap },
    { key: 'plantillas', label: t.tabs.plantillas, icon: FileText },
    { key: 'integraciones', label: t.tabs.integraciones, icon: Plug },
  ];

  const conteos = useMemo(() => {
    const porTipo: Record<TipoNotificacion, number> = { Cita: 0, Pago: 0, Curso: 0, Sistema: 0 };
    notificaciones.forEach((n) => { porTipo[n.tipo]++; });
    return porTipo;
  }, [notificaciones]);

  const notisFiltradas = useMemo(
    () => notificaciones.filter((n) => (filtroTipo === 'todas' || n.tipo === filtroTipo) && (!soloNoLeidas || !n.leida)),
    [notificaciones, filtroTipo, soloNoLeidas],
  );

  function marcarTodoLeido() {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  }
  function marcarLeida(id: string) {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
  }
  function toggleRegla(id: string) {
    setReglas((prev) => prev.map((r) => (r.id === id ? { ...r, activa: !r.activa } : r)));
  }
  function toggleIntegracion(id: string) {
    setIntegraciones((prev) => prev.map((i) => (i.id === id ? { ...i, conectada: !i.conectada } : i)));
  }

  const plantillaSel = plantillas.find((p) => p.id === plantillaSelId) ?? plantillas[0];

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">{t.subtitle}</p>
        </div>
      </div>

      <div className="flex w-full max-w-2xl gap-1 rounded-2xl border border-brand-100 bg-white p-1">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setSearchParams({ tab: tb.key })}
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

      {tab === 'centro' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFiltroTipo('todas')}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                filtroTipo === 'todas' ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 bg-white text-ink/55 hover:bg-brand-50'
              }`}
            >
              {t.all} ({notificaciones.length})
            </button>
            {(Object.keys(conteos) as TipoNotificacion[]).map((tp) => (
              <button
                key={tp}
                onClick={() => setFiltroTipo(tp)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  filtroTipo === tp ? 'border-transparent bg-brand-gradient text-white shadow-soft' : 'border-brand-100 bg-white text-ink/55 hover:bg-brand-50'
                }`}
              >
                {t.tipos[tp]} ({conteos[tp]})
              </button>
            ))}
            <label className="ml-2 flex items-center gap-1.5 text-xs font-semibold text-ink/55">
              <input type="checkbox" checked={soloNoLeidas} onChange={(e) => setSoloNoLeidas(e.target.checked)} className="h-3.5 w-3.5 rounded border-brand-300 text-brand-600" />
              {t.unread}
            </label>
            <button onClick={marcarTodoLeido} className="ml-auto flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline">
              <CheckCheck size={14} />
              {t.markAllRead}
            </button>
          </div>

          <section className="divide-y divide-brand-50 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
            {notisFiltradas.map((n) => (
              <button
                key={n.id}
                onClick={() => marcarLeida(n.id)}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-brand-50/40 ${!n.leida ? 'bg-brand-50/20' : ''}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.leida ? 'bg-transparent' : 'bg-brand-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm ${n.leida ? 'font-medium text-ink/70' : 'font-bold text-ink'}`}>{n.titulo}</p>
                    <span className="shrink-0 text-[11px] text-ink/35">{n.fecha}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink/50">{n.mensaje}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">{t.tipos[n.tipo]}</span>
                </div>
              </button>
            ))}
            {notisFiltradas.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink/40">{t.noNotifications}</p>}
          </section>
        </>
      )}

      {tab === 'reglas' && (
        <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
          <div className="divide-y divide-brand-50">
            {reglas.map((r) => {
              const plantilla = plantillas.find((p) => p.id === r.plantillaId);
              const CanalIcon = canalIcon[r.canal];
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{r.nombre}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-ink/50">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{r.disparador}</span>
                      <ArrowRight size={12} className="text-ink/25" />
                      <span className="flex items-center gap-1 rounded-full bg-lilac-50 px-2 py-0.5 text-lilac-700">
                        <CanalIcon size={11} />
                        {r.canal}
                      </span>
                      <ArrowRight size={12} className="text-ink/25" />
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-ink/60">{plantilla?.nombre}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleRegla(r.id)}>
                    <StatusBadge tone={r.activa ? 'positivo' : 'neutro'}>{r.activa ? t.active : t.inactive}</StatusBadge>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'plantillas' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          <div className="h-fit space-y-1 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft">
            {plantillas.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlantillaSelId(p.id)}
                className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  plantillaSelId === p.id ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/60 hover:bg-brand-50'
                }`}
              >
                {p.nombre}
              </button>
            ))}
          </div>

          <section className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <FileText size={16} className="text-brand-500" />
                {t.templateEditor}
              </p>
              <div className="flex gap-1 rounded-2xl border border-brand-100 bg-brand-50/40 p-1">
                {(['es', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setIdiomaEdit(l)}
                    className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                      idiomaEdit === l ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink/50 hover:bg-white'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.subject}</label>
              <input defaultValue={plantillaSel[idiomaEdit].asunto} key={`${plantillaSel.id}-${idiomaEdit}-asunto`} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.body}</label>
              <textarea defaultValue={plantillaSel[idiomaEdit].cuerpo} key={`${plantillaSel.id}-${idiomaEdit}-cuerpo`} rows={4} className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink outline-none" />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.variables}</p>
              <div className="flex flex-wrap gap-1.5">
                {plantillaSel.variables.map((v) => (
                  <span key={v} className="rounded-full bg-lilac-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-lilac-700">{v}</span>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.channels}</p>
              <div className="flex flex-wrap gap-1.5">
                {plantillaSel.canales.map((c) => {
                  const Icon = canalIcon[c];
                  return (
                    <span key={c} className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                      <Icon size={12} />
                      {c}
                    </span>
                  );
                })}
              </div>
            </div>

            <button className="rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-soft">{t.save}</button>
          </section>
        </div>
      )}

      {tab === 'integraciones' && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {integraciones.map((i) => {
            const Icon = i.id === 'gcal' ? Calendar : i.id === 'whatsapp' ? MessageCircle : Mail;
            const title = i.id === 'gcal' ? t.gcalTitle : i.id === 'whatsapp' ? t.whatsappTitle : t.smtpTitle;
            const desc = i.id === 'gcal' ? t.gcalDesc : i.id === 'whatsapp' ? t.whatsappDesc : t.smtpDesc;
            return (
              <div key={i.id} className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon size={20} />
                  </span>
                  <StatusBadge tone={i.conectada ? 'positivo' : 'neutro'}>{i.conectada ? t.connected : t.disconnected}</StatusBadge>
                </div>
                <p className="mt-4 font-display text-lg font-semibold text-ink">{title}</p>
                <p className="mt-1 text-xs text-ink/50">{desc}</p>
                {i.conectada && i.detalle && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-ink/45">
                    <Check size={13} className="text-emerald-500" />
                    {i.detalle}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => toggleIntegracion(i.id)}
                    className={`flex-1 rounded-2xl py-2 text-xs font-bold ${
                      i.conectada ? 'border border-rose-200 text-rose-600 hover:bg-rose-50' : 'bg-brand-gradient text-white shadow-soft'
                    }`}
                  >
                    {i.conectada ? t.disconnect : t.connect}
                  </button>
                  {i.conectada && (
                    <button className="rounded-2xl border border-brand-100 px-3 text-ink/50 hover:bg-brand-50" aria-label={t.settings}>
                      <Settings2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </AdminLayout>
  );
}
