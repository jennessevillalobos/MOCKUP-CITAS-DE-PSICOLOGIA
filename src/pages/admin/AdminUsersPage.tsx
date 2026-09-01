import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Mail, Phone, MoreVertical, Check, Minus, KeyRound, Lock, Unlock, Power } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import AdminModal from '@/components/admin/ui/AdminModal';
import {
  demoUsers,
  ALL_ROLES,
  ALL_PERMISOS,
  permisosEfectivos,
  type AdminUserRecord,
  type UserRole,
  type UserEstado,
} from '@/data/admin/usersData';

function initials(nombre: string) {
  const parts = nombre.replace(/^(Dra?\.|Lic\.)\s*/i, '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

function estadoTone(estado: UserEstado) {
  if (estado === 'Activo') return 'positivo';
  if (estado === 'Bloqueado') return 'negativo';
  return 'alerta';
}

const roleTone: Record<UserRole, string> = {
  Visitante: 'bg-brand-50 text-ink/60',
  Estudiante: 'bg-brand-100 text-brand-700',
  Instructor: 'bg-lilac-100 text-lilac-700',
  Admin: 'bg-amber-100 text-amber-700',
};

const actividadColor: Record<string, string> = {
  sesion: 'bg-brand-500',
  compra: 'bg-lilac-500',
  rol: 'bg-amber-500',
  cuenta: 'bg-emerald-500',
  cita: 'bg-brand-500',
  seguridad: 'bg-rose-500',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>(demoUsers);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<'Todos' | UserRole>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | UserEstado>('Todos');
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const [rolesEnEdicion, setRolesEnEdicion] = useState<UserRole[]>([]);
  const [guardado, setGuardado] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const seleccionado = users.find((u) => u.id === seleccionadoId) || null;

  useEffect(() => {
    if (seleccionado) setRolesEnEdicion(seleccionado.roles);
  }, [seleccionado?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbiertoId(null);
    }
    document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return users.filter((u) => {
      const matchQ = !q || u.nombre.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q);
      const matchRol = filtroRol === 'Todos' || u.roles.includes(filtroRol);
      const matchEstado = filtroEstado === 'Todos' || u.estado === filtroEstado;
      return matchQ && matchRol && matchEstado;
    });
  }, [users, busqueda, filtroRol, filtroEstado]);

  function limpiarFiltros() {
    setBusqueda('');
    setFiltroRol('Todos');
    setFiltroEstado('Todos');
  }

  function agregarActividad(id: string, tipo: 'rol' | 'seguridad', label: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, actividad: [{ tipo, label, fecha: 'Justo ahora' }, ...u.actividad] } : u
      )
    );
  }

  function cambiarEstado(id: string, estado: UserEstado, motivo: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, estado } : u)));
    agregarActividad(id, 'seguridad', motivo);
  }

  function restablecerClave(id: string) {
    agregarActividad(id, 'seguridad', 'Contraseña restablecida por un administrador');
    setMenuAbiertoId(null);
  }

  function toggleRolEnEdicion(rol: UserRole) {
    setRolesEnEdicion((prev) => (prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol]));
    setGuardado(false);
  }

  function guardarRoles() {
    if (!seleccionado) return;
    const antes = seleccionado.roles;
    const agregados = rolesEnEdicion.filter((r) => !antes.includes(r));
    const quitados = antes.filter((r) => !rolesEnEdicion.includes(r));
    const cambios = [...agregados.map((r) => `+ ${r}`), ...quitados.map((r) => `- ${r}`)];
    setUsers((prev) =>
      prev.map((u) =>
        u.id === seleccionado.id
          ? {
              ...u,
              roles: rolesEnEdicion,
              actividad:
                cambios.length > 0
                  ? [{ tipo: 'rol', label: `Rol actualizado: ${cambios.join(', ')}`, fecha: 'Justo ahora' }, ...u.actividad]
                  : u.actividad,
            }
          : u
      )
    );
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1800);
  }

  const permisosActuales = permisosEfectivos(rolesEnEdicion);

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Usuarios</h1>
          <p className="mt-1 text-sm text-ink/50">{users.length} usuarios registrados · datos de demostración</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-brand-100 bg-white p-3 shadow-soft">
        <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-3">
          <Search size={15} className="text-ink/35" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
            placeholder="Buscar por nombre o correo…"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink/50">
          Rol
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value as 'Todos' | UserRole)}
            className="h-9 rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none"
          >
            <option value="Todos">— Todos</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink/50">
          Estado
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as 'Todos' | UserEstado)}
            className="h-9 rounded-xl border border-brand-100 bg-white px-2 text-xs font-semibold text-ink outline-none"
          >
            <option value="Todos">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Bloqueado">Bloqueado</option>
          </select>
        </label>
        <button onClick={limpiarFiltros} className="text-xs font-semibold text-brand-600 hover:underline">
          Limpiar
        </button>
        <span className="ml-auto text-xs text-ink/40">{filtrados.length} resultados</span>
      </div>

      <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-ink/40">
                <th className="px-5 py-3 font-semibold">Nombre</th>
                <th className="px-5 py-3 font-semibold">Correo</th>
                <th className="px-5 py-3 font-semibold">Roles</th>
                <th className="px-5 py-3 font-semibold">Creación</th>
                <th className="px-5 py-3 font-semibold">Último acceso</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filtrados.map((u) => (
                <tr key={u.id} className="transition hover:bg-brand-50/50">
                  <td className="cursor-pointer px-5 py-3" onClick={() => setSeleccionadoId(u.id)}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                        {initials(u.nombre)}
                      </span>
                      <span className="font-semibold text-ink">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="cursor-pointer px-5 py-3 text-ink/60" onClick={() => setSeleccionadoId(u.id)}>
                    {u.correo}
                  </td>
                  <td className="cursor-pointer px-5 py-3" onClick={() => setSeleccionadoId(u.id)}>
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.map((r) => (
                        <span key={r} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleTone[r]}`}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="cursor-pointer px-5 py-3 text-ink/50" onClick={() => setSeleccionadoId(u.id)}>
                    {u.creado}
                  </td>
                  <td className="cursor-pointer px-5 py-3 text-ink/50" onClick={() => setSeleccionadoId(u.id)}>
                    {u.ultimoAcceso || '—'}
                  </td>
                  <td className="cursor-pointer px-5 py-3" onClick={() => setSeleccionadoId(u.id)}>
                    <StatusBadge tone={estadoTone(u.estado)}>{u.estado}</StatusBadge>
                  </td>
                  <td className="relative px-3 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAbiertoId(menuAbiertoId === u.id ? null : u.id);
                      }}
                      className="rounded-lg p-1.5 text-ink/40 hover:bg-brand-50 hover:text-ink"
                      aria-label="Más acciones"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {menuAbiertoId === u.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-3 top-11 z-10 w-52 overflow-hidden rounded-2xl border border-brand-100 bg-white text-left shadow-lift"
                      >
                        <button
                          onClick={() => {
                            setSeleccionadoId(u.id);
                            setMenuAbiertoId(null);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-ink hover:bg-brand-50"
                        >
                          Ver detalle
                        </button>
                        <button
                          onClick={() =>
                            cambiarEstado(
                              u.id,
                              u.estado === 'Activo' ? 'Inactivo' : 'Activo',
                              u.estado === 'Activo' ? 'Cuenta desactivada por un administrador' : 'Cuenta activada por un administrador'
                            )
                          }
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-ink hover:bg-brand-50"
                        >
                          <Power size={13} />
                          {u.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() =>
                            cambiarEstado(
                              u.id,
                              u.estado === 'Bloqueado' ? 'Activo' : 'Bloqueado',
                              u.estado === 'Bloqueado' ? 'Cuenta desbloqueada por un administrador' : 'Cuenta bloqueada por un administrador'
                            )
                          }
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          {u.estado === 'Bloqueado' ? <Unlock size={13} /> : <Lock size={13} />}
                          {u.estado === 'Bloqueado' ? 'Desbloquear' : 'Bloquear'}
                        </button>
                        <button
                          onClick={() => restablecerClave(u.id)}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-ink hover:bg-brand-50"
                        >
                          <KeyRound size={13} />
                          Restablecer clave
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink/40">
                    No se encontraron usuarios con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {seleccionado && (
        <AdminModal title="Detalle del usuario" onClose={() => setSeleccionadoId(null)}>
          <div className="space-y-6 text-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                {initials(seleccionado.nombre)}
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-ink">{seleccionado.nombre}</p>
                <p className="text-xs text-ink/50">{seleccionado.correo}</p>
                <div className="mt-1">
                  <StatusBadge tone={estadoTone(seleccionado.estado)}>{seleccionado.estado}</StatusBadge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-ink/55">
              <span className="flex items-center gap-1.5">
                <Mail size={13} />
                {seleccionado.correo}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={13} />
                {seleccionado.telefono}
              </span>
            </div>

            {/* Roles */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-ink/40">Roles asignados</h4>
                <span className="text-[11px] text-ink/35">Permite combinar roles</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map((r) => (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                      rolesEnEdicion.includes(r) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-brand-100 text-ink/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={rolesEnEdicion.includes(r)}
                      onChange={() => toggleRolEnEdicion(r)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    {r}
                  </label>
                ))}
              </div>
              <button
                onClick={guardarRoles}
                className="focus-ring mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5"
              >
                {guardado ? (
                  <>
                    <Check size={15} />
                    Roles guardados
                  </>
                ) : (
                  'Guardar roles'
                )}
              </button>
            </div>

            {/* Permisos efectivos */}
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/40">Permisos efectivos</h4>
              <ul className="space-y-1.5 rounded-2xl border border-brand-100 p-3">
                {ALL_PERMISOS.map((p) => (
                  <li key={p} className="flex items-center justify-between text-sm text-ink/70">
                    {p}
                    {permisosActuales.has(p) ? (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                        <Check size={12} />
                      </span>
                    ) : (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-50 text-ink/30">
                        <Minus size={12} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actividad */}
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/40">Historial de actividad</h4>
              <ul className="space-y-3 border-l border-brand-100 pl-4">
                {seleccionado.actividad.map((a, i) => (
                  <li key={i} className="relative">
                    <span
                      className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${actividadColor[a.tipo] || 'bg-ink/30'}`}
                    />
                    <p className="font-semibold text-ink">{a.label}</p>
                    <p className="text-xs text-ink/40">{a.fecha}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Acciones de cuenta */}
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/40">Acciones de cuenta</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    cambiarEstado(
                      seleccionado.id,
                      seleccionado.estado === 'Activo' ? 'Inactivo' : 'Activo',
                      seleccionado.estado === 'Activo' ? 'Cuenta desactivada por un administrador' : 'Cuenta activada por un administrador'
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-2xl border border-brand-100 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50"
                >
                  <Power size={14} />
                  {seleccionado.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() =>
                    cambiarEstado(
                      seleccionado.id,
                      seleccionado.estado === 'Bloqueado' ? 'Activo' : 'Bloqueado',
                      seleccionado.estado === 'Bloqueado' ? 'Cuenta desbloqueada por un administrador' : 'Cuenta bloqueada por un administrador'
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  {seleccionado.estado === 'Bloqueado' ? <Unlock size={14} /> : <Lock size={14} />}
                  {seleccionado.estado === 'Bloqueado' ? 'Desbloquear' : 'Bloquear'}
                </button>
                <button
                  onClick={() => restablecerClave(seleccionado.id)}
                  className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-brand-100 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50"
                >
                  <KeyRound size={14} />
                  Restablecer clave
                </button>
              </div>
            </div>
          </div>
        </AdminModal>
      )}
    </AdminLayout>
  );
}
