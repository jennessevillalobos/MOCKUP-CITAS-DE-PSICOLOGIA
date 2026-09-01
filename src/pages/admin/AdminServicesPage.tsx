import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HeartHandshake, UserRound, MapPin, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminDrawer from '@/components/admin/ui/AdminDrawer';
import { useAdminLanguage } from '@/context/AdminLanguageContext';
import {
  demoServicios, demoProfesionales, demoLugares, ESPECIALIDADES_DISPONIBLES, DIAS_SEMANA,
  type ServicioRecord, type ProfesionalRecord, type LugarRecord,
} from '@/data/admin/servicesData';

type Tab = 'serv' | 'prof' | 'lug';

const text = {
  es: {
    title: 'Servicios, profesionales y lugares', subtitle: 'Catálogo operativo · datos de demostración',
    newBtn: { serv: 'Nuevo servicio', prof: 'Nuevo profesional', lug: 'Nuevo lugar' } as Record<Tab, string>,
    tabs: { serv: 'Servicios / Terapias', prof: 'Profesionales', lug: 'Lugares / Sedes' } as Record<Tab, string>,
    search: 'Buscar…', all: 'Todos', active: 'Activo', inactive: 'Inactivo', status: 'Estado',
    // servicios
    service: 'Servicio', duration: 'Duración', modality: 'Modalidad', price: 'Precio', min: 'min',
    description: 'Descripción', currency: 'Moneda', activeToggle: '¿Servicio activo?', edit: 'Editar', delete: 'Eliminar', save: 'Guardar',
    newService: 'Nuevo servicio', editService: 'Editar servicio',
    // profesionales
    specialty: 'Especialidad principal', specialties: 'Especialidades', services2: 'Servicios que ofrece',
    locations: 'Sedes', availability: 'Disponibilidad', from: 'Desde', to: 'Hasta',
    newProf: 'Nuevo profesional', editProf: 'Editar profesional', email: 'Correo', phone: 'Teléfono',
    assignedAt: 'sedes asignadas', full: 'Agenda llena', available: 'Disponible',
    // lugares
    place: 'Lugar', address: 'Dirección', type: 'Tipo', capacity: 'Capacidad', schedule: 'Horario',
    notes: 'Notas', assignedPros: 'profesionales asignados', newPlace: 'Nuevo lugar', editPlace: 'Editar lugar',
    consultorio: 'Consultorio', sedeAdmin: 'Sede administrativa', espacioComp: 'Espacio compartido',
    cancel: 'Cancelar', people: 'personas',
  },
  en: {
    title: 'Services, professionals and locations', subtitle: 'Operational catalog · demo data',
    newBtn: { serv: 'New service', prof: 'New professional', lug: 'New location' } as Record<Tab, string>,
    tabs: { serv: 'Services / Therapies', prof: 'Professionals', lug: 'Locations' } as Record<Tab, string>,
    search: 'Search…', all: 'All', active: 'Active', inactive: 'Inactive', status: 'Status',
    service: 'Service', duration: 'Duration', modality: 'Modality', price: 'Price', min: 'min',
    description: 'Description', currency: 'Currency', activeToggle: 'Active service?', edit: 'Edit', delete: 'Delete', save: 'Save',
    newService: 'New service', editService: 'Edit service',
    specialty: 'Main specialty', specialties: 'Specialties', services2: 'Offered services',
    locations: 'Locations', availability: 'Availability', from: 'From', to: 'To',
    newProf: 'New professional', editProf: 'Edit professional', email: 'Email', phone: 'Phone',
    assignedAt: 'assigned locations', full: 'Fully booked', available: 'Available',
    newPlace: 'New location', editPlace: 'Edit location', place: 'Location', address: 'Address', type: 'Type',
    capacity: 'Capacity', schedule: 'Schedule', notes: 'Notes', assignedPros: 'assigned professionals',
    consultorio: 'Office', sedeAdmin: 'Admin site', espacioComp: 'Shared space',
    cancel: 'Cancel', people: 'people',
  },
} as const;

function initials(nombre: string) {
  const parts = nombre.replace(/^(Dra?\.|Lic\.)\s*/i, '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

function chip(active: boolean) {
  return `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
    active ? 'border-brand-300 bg-brand-100 text-brand-700' : 'border-brand-100 bg-white text-ink/50 hover:bg-brand-50'
  }`;
}

export default function AdminServicesPage() {
  const { lang } = useAdminLanguage();
  const t = text[lang];
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'serv';

  const [servicios, setServicios] = useState<ServicioRecord[]>(demoServicios);
  const [profesionales, setProfesionales] = useState<ProfesionalRecord[]>(demoProfesionales);
  const [lugares, setLugares] = useState<LugarRecord[]>(demoLugares);

  const [buscar, setBuscar] = useState('');
  const [servicioEdit, setServicioEdit] = useState<ServicioRecord | 'new' | null>(null);
  const [profEdit, setProfEdit] = useState<ProfesionalRecord | 'new' | null>(null);
  const [lugarEdit, setLugarEdit] = useState<LugarRecord | 'new' | null>(null);

  const tabs: { key: Tab; label: string; icon: typeof HeartHandshake }[] = [
    { key: 'serv', label: t.tabs.serv, icon: HeartHandshake },
    { key: 'prof', label: t.tabs.prof, icon: UserRound },
    { key: 'lug', label: t.tabs.lug, icon: MapPin },
  ];

  const serviciosFiltrados = useMemo(
    () => servicios.filter((s) => s.nombre.toLowerCase().includes(buscar.toLowerCase())),
    [servicios, buscar],
  );
  const profesionalesFiltrados = useMemo(
    () => profesionales.filter((p) => p.nombre.toLowerCase().includes(buscar.toLowerCase())),
    [profesionales, buscar],
  );
  const lugaresFiltrados = useMemo(
    () => lugares.filter((l) => l.nombre.toLowerCase().includes(buscar.toLowerCase())),
    [lugares, buscar],
  );

  function nuevoBtn() {
    setBuscar(buscar); // no-op keep filter
    if (tab === 'serv') setServicioEdit('new');
    if (tab === 'prof') setProfEdit('new');
    if (tab === 'lug') setLugarEdit('new');
  }

  function eliminarServicio(id: string) {
    setServicios((prev) => prev.filter((s) => s.id !== id));
  }
  function eliminarProf(id: string) {
    setProfesionales((prev) => prev.filter((p) => p.id !== id));
  }
  function eliminarLugar(id: string) {
    setLugares((prev) => prev.filter((l) => l.id !== id));
  }

  function guardarServicio(s: ServicioRecord) {
    setServicios((prev) => {
      const existe = prev.some((x) => x.id === s.id);
      return existe ? prev.map((x) => (x.id === s.id ? s : x)) : [...prev, s];
    });
    setServicioEdit(null);
  }
  function guardarProf(p: ProfesionalRecord) {
    setProfesionales((prev) => {
      const existe = prev.some((x) => x.id === p.id);
      return existe ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
    });
    setProfEdit(null);
  }
  function guardarLugar(l: LugarRecord) {
    setLugares((prev) => {
      const existe = prev.some((x) => x.id === l.id);
      return existe ? prev.map((x) => (x.id === l.id ? l : x)) : [...prev, l];
    });
    setLugarEdit(null);
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-ink/50">{t.subtitle}</p>
        </div>
        <button
          onClick={nuevoBtn}
          className="flex h-10 items-center gap-2 rounded-2xl bg-brand-gradient px-4 text-sm font-bold text-white shadow-soft"
        >
          <Plus size={16} />
          {t.newBtn[tab]}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full max-w-xl gap-1 rounded-2xl border border-brand-100 bg-white p-1">
          {tabs.map((tb) => {
            const Icon = tb.icon;
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => { setSearchParams({ tab: tb.key }); setBuscar(''); }}
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
        <div className="flex h-10 flex-1 min-w-[180px] max-w-xs items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3">
          <Search size={14} className="text-ink/35" />
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder={t.search}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
          />
        </div>
      </div>

      {tab === 'serv' && (
        <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-5 py-3 font-semibold">{t.service}</th>
                  <th className="px-5 py-3 font-semibold">{t.duration}</th>
                  <th className="px-5 py-3 font-semibold">{t.modality}</th>
                  <th className="px-5 py-3 font-semibold">{t.price}</th>
                  <th className="px-5 py-3 font-semibold">{t.status}</th>
                  <th className="px-5 py-3 font-semibold text-right">{t.edit}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {serviciosFiltrados.map((s) => (
                  <tr key={s.id} className="hover:bg-brand-50/50">
                    <td className="px-5 py-3 font-semibold text-ink">{s.nombre}</td>
                    <td className="px-5 py-3 text-ink/60">{s.duracionMin} {t.min}</td>
                    <td className="px-5 py-3 text-ink/60">{s.modalidad}</td>
                    <td className="px-5 py-3 font-semibold text-ink">{s.moneda} {s.precio}</td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={s.activo ? 'positivo' : 'neutro'}>{s.activo ? t.active : t.inactive}</StatusBadge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setServicioEdit(s)} className="rounded-lg p-1.5 text-ink/40 hover:bg-brand-50 hover:text-brand-600" aria-label={t.edit}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => eliminarServicio(s.id)} className="rounded-lg p-1.5 text-ink/40 hover:bg-rose-50 hover:text-rose-600" aria-label={t.delete}>
                          <Trash2 size={15} />
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

      {tab === 'prof' && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {profesionalesFiltrados.map((p) => (
            <div key={p.id} className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                    {initials(p.nombre)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{p.nombre}</p>
                    <p className="text-xs text-ink/45">{p.especialidad}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setProfEdit(p)} className="rounded-lg p-1.5 text-ink/40 hover:bg-brand-50 hover:text-brand-600" aria-label={t.edit}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => eliminarProf(p.id)} className="rounded-lg p-1.5 text-ink/40 hover:bg-rose-50 hover:text-rose-600" aria-label={t.delete}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.especialidades.map((e) => (
                  <span key={e} className="rounded-full bg-lilac-50 px-2 py-0.5 text-[10px] font-semibold text-lilac-700">{e}</span>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-xs text-ink/55">
                <p>{t.locations}: {p.sedes.join(', ')}</p>
                <p>{t.modality}: {p.modalidad}</p>
                <p>{t.availability}: {p.diasDisponibles.join(', ')} · {p.desde}–{p.hasta}</p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <StatusBadge tone={p.estado === 'Disponible' ? 'positivo' : 'alerta'}>{p.estado === 'Disponible' ? t.available : t.full}</StatusBadge>
                {!p.activo && <StatusBadge tone="neutro">{t.inactive}</StatusBadge>}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'lug' && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {lugaresFiltrados.map((l) => (
            <div key={l.id} className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin size={17} className="text-brand-500" />
                  <p className="font-display text-lg font-semibold text-ink">{l.nombre}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setLugarEdit(l)} className="rounded-lg p-1.5 text-ink/40 hover:bg-brand-50 hover:text-brand-600" aria-label={t.edit}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => eliminarLugar(l.id)} className="rounded-lg p-1.5 text-ink/40 hover:bg-rose-50 hover:text-rose-600" aria-label={t.delete}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink/60">{l.direccion}</p>
              <p className="mt-1 text-xs text-ink/45">{l.horario}</p>
              <p className="mt-1 text-xs text-ink/45">{t.capacity}: {l.capacidad} {t.people}</p>
              <p className="mt-3 text-xs font-semibold text-brand-600">{l.profesionales} {t.assignedPros}</p>
            </div>
          ))}
        </section>
      )}

      {servicioEdit && (
        <ServicioDrawer t={t} value={servicioEdit === 'new' ? null : servicioEdit} onClose={() => setServicioEdit(null)} onSave={guardarServicio} />
      )}
      {profEdit && (
        <ProfDrawer t={t} value={profEdit === 'new' ? null : profEdit} onClose={() => setProfEdit(null)} onSave={guardarProf} />
      )}
      {lugarEdit && (
        <LugarDrawer t={t} value={lugarEdit === 'new' ? null : lugarEdit} onClose={() => setLugarEdit(null)} onSave={guardarLugar} />
      )}
    </AdminLayout>
  );
}

type T = typeof text.es | typeof text.en;

function ServicioDrawer({ t, value, onClose, onSave }: { t: T; value: ServicioRecord | null; onClose: () => void; onSave: (s: ServicioRecord) => void }) {
  const [form, setForm] = useState<ServicioRecord>(
    value ?? { id: `s${Date.now()}`, nombre: '', descripcion: '', duracionMin: 50, modalidad: 'Online y presencial', precio: 0, moneda: 'USD', activo: true },
  );
  return (
    <AdminDrawer
      title={value ? t.editService : t.newService}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">{t.cancel}</button>
          <button onClick={() => onSave(form)} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">{t.save}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.service}</label>
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.description}</label>
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.duration} ({t.min})</label>
            <input type="number" value={form.duracionMin} onChange={(e) => setForm({ ...form, duracionMin: Number(e.target.value) })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.price}</label>
            <div className="flex gap-1">
              <input value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className="h-10 w-16 rounded-xl border border-brand-200 px-2 text-sm text-ink outline-none" />
              <input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.modality}</label>
          <select value={form.modalidad} onChange={(e) => setForm({ ...form, modalidad: e.target.value as ServicioRecord['modalidad'] })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none">
            <option>Online</option>
            <option>Presencial</option>
            <option>Online y presencial</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
          {t.activeToggle}
        </label>
      </div>
    </AdminDrawer>
  );
}

function ProfDrawer({ t, value, onClose, onSave }: { t: T; value: ProfesionalRecord | null; onClose: () => void; onSave: (p: ProfesionalRecord) => void }) {
  const [form, setForm] = useState<ProfesionalRecord>(
    value ?? {
      id: `p${Date.now()}`, nombre: '', correo: '', telefono: '', especialidad: '', especialidades: [],
      servicios: [], sedes: [], modalidad: 'Online y presencial', diasDisponibles: [], desde: '09:00', hasta: '17:00',
      estado: 'Disponible', activo: true,
    },
  );

  function toggleEspecialidad(e: string) {
    setForm((f) => ({ ...f, especialidades: f.especialidades.includes(e) ? f.especialidades.filter((x) => x !== e) : [...f.especialidades, e] }));
  }
  function toggleServicio(s: string) {
    setForm((f) => ({ ...f, servicios: f.servicios.includes(s) ? f.servicios.filter((x) => x !== s) : [...f.servicios, s] }));
  }
  function toggleSede(s: string) {
    setForm((f) => ({ ...f, sedes: f.sedes.includes(s) ? f.sedes.filter((x) => x !== s) : [...f.sedes, s] }));
  }
  function toggleDia(d: string) {
    setForm((f) => ({ ...f, diasDisponibles: f.diasDisponibles.includes(d) ? f.diasDisponibles.filter((x) => x !== d) : [...f.diasDisponibles, d] }));
  }

  return (
    <AdminDrawer
      title={value ? t.editProf : t.newProf}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">{t.cancel}</button>
          <button onClick={() => onSave(form)} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">{t.save}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-gradient text-lg font-semibold text-white">
            {form.nombre ? initials(form.nombre) : '?'}
          </span>
          <div className="flex-1 space-y-2">
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder={t.newProf} className="h-9 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
            <input value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} placeholder={t.specialty} className="h-9 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.email}</label>
            <input value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.phone}</label>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.specialties}</label>
          <div className="flex flex-wrap gap-1.5">
            {ESPECIALIDADES_DISPONIBLES.map((e) => (
              <button key={e} type="button" onClick={() => toggleEspecialidad(e)} className={chip(form.especialidades.includes(e))}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.services2}</label>
          <div className="flex flex-wrap gap-1.5">
            {demoServicios.map((s) => (
              <button key={s.id} type="button" onClick={() => toggleServicio(s.nombre)} className={chip(form.servicios.includes(s.nombre))}>{s.nombre}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.locations}</label>
          <div className="flex flex-wrap gap-1.5">
            {demoLugares.map((l) => (
              <button key={l.id} type="button" onClick={() => toggleSede(l.nombre)} className={chip(form.sedes.includes(l.nombre))}>{l.nombre}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.availability}</label>
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA.map((d) => (
              <button key={d} type="button" onClick={() => toggleDia(d)} className={chip(form.diasDisponibles.includes(d))}>{d}</button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.from}</label>
              <input type="time" value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} className="h-9 w-full rounded-xl border border-brand-200 px-2 text-sm text-ink outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.to}</label>
              <input type="time" value={form.hasta} onChange={(e) => setForm({ ...form, hasta: e.target.value })} className="h-9 w-full rounded-xl border border-brand-200 px-2 text-sm text-ink outline-none" />
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
          {t.activeToggle}
        </label>
      </div>
    </AdminDrawer>
  );
}

function LugarDrawer({ t, value, onClose, onSave }: { t: T; value: LugarRecord | null; onClose: () => void; onSave: (l: LugarRecord) => void }) {
  const [form, setForm] = useState<LugarRecord>(
    value ?? { id: `l${Date.now()}`, nombre: '', direccion: '', tipo: 'Consultorio', capacidad: 1, horario: '', notas: '', profesionales: 0, activo: true },
  );
  return (
    <AdminDrawer
      title={value ? t.editPlace : t.newPlace}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-brand-100 py-2.5 text-sm font-bold text-ink/60 hover:bg-brand-50">{t.cancel}</button>
          <button onClick={() => onSave(form)} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft">{t.save}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.place}</label>
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.address}</label>
          <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.type}</label>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as LugarRecord['tipo'] })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none">
              <option value="Consultorio">{t.consultorio}</option>
              <option value="Sede administrativa">{t.sedeAdmin}</option>
              <option value="Espacio compartido">{t.espacioComp}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.capacity}</label>
            <input type="number" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: Number(e.target.value) })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.schedule}</label>
          <input value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} className="h-10 w-full rounded-xl border border-brand-200 px-3 text-sm text-ink outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">{t.notes}</label>
          <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink outline-none" />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
          {t.activeToggle}
        </label>
      </div>
    </AdminDrawer>
  );
}
