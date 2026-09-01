export type UserRole = 'Visitante' | 'Estudiante' | 'Instructor' | 'Admin';
export type UserEstado = 'Activo' | 'Inactivo' | 'Bloqueado';
export type ActividadTipo = 'sesion' | 'compra' | 'rol' | 'cuenta' | 'cita' | 'seguridad';

export const ALL_ROLES: UserRole[] = ['Visitante', 'Estudiante', 'Instructor', 'Admin'];

export const ALL_PERMISOS = [
  'Reservar y tomar terapias',
  'Acceso a cursos inscritos',
  'Publicar / dictar cursos',
  'Panel administrativo',
] as const;
export type Permiso = (typeof ALL_PERMISOS)[number];

// Qué permisos otorga cada rol — un usuario puede tener varios roles a la vez,
// y sus permisos efectivos son la unión de todos.
export const ROLE_PERMISOS: Record<UserRole, Permiso[]> = {
  Visitante: ['Reservar y tomar terapias'],
  Estudiante: ['Reservar y tomar terapias', 'Acceso a cursos inscritos'],
  Instructor: ['Publicar / dictar cursos'],
  Admin: ['Panel administrativo'],
};

export function permisosEfectivos(roles: UserRole[]): Set<Permiso> {
  const set = new Set<Permiso>();
  roles.forEach((r) => ROLE_PERMISOS[r].forEach((p) => set.add(p)));
  return set;
}

export interface ActividadEntry {
  tipo: ActividadTipo;
  label: string;
  fecha: string;
}

export interface AdminUserRecord {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  roles: UserRole[];
  estado: UserEstado;
  creado: string;
  ultimoAcceso: string | null;
  actividad: ActividadEntry[];
}

export const demoUsers: AdminUserRecord[] = [
  {
    id: 'u1',
    nombre: 'Ana Torres',
    correo: 'ana.torres@gmail.com',
    telefono: '+58 412-555-0176',
    roles: ['Estudiante'],
    estado: 'Activo',
    creado: '2026-05-14',
    ultimoAcceso: 'Hoy · 09:30',
    actividad: [
      { tipo: 'sesion', label: 'Inició sesión', fecha: '2026-08-01 · 09:30' },
      { tipo: 'compra', label: 'Compró curso: Manejo de ansiedad', fecha: '2026-07-28 · 18:12' },
      { tipo: 'rol', label: 'Rol actualizado: + Estudiante', fecha: '2026-07-28 · 18:13' },
      { tipo: 'cuenta', label: 'Cuenta creada', fecha: '2026-05-14 · 11:02' },
    ],
  },
  {
    id: 'u2',
    nombre: 'Dra. Valeria Ríos',
    correo: 'v.rios@psiqueamor.com',
    telefono: '+58 414-555-0198',
    roles: ['Instructor', 'Admin'],
    estado: 'Activo',
    creado: '2024-11-02',
    ultimoAcceso: 'Hoy · 08:05',
    actividad: [
      { tipo: 'sesion', label: 'Inició sesión', fecha: '2026-08-01 · 08:05' },
      { tipo: 'rol', label: 'Rol actualizado: + Admin', fecha: '2026-02-10 · 10:00' },
      { tipo: 'cuenta', label: 'Cuenta creada', fecha: '2024-11-02 · 09:00' },
    ],
  },
  {
    id: 'u3',
    nombre: 'Marco Peña',
    correo: 'marco.pena@outlook.com',
    telefono: '+58 416-555-0110',
    roles: ['Estudiante'],
    estado: 'Inactivo',
    creado: '2026-03-21',
    ultimoAcceso: 'Ayer · 21:40',
    actividad: [
      { tipo: 'sesion', label: 'Inició sesión', fecha: '2026-07-31 · 21:40' },
      { tipo: 'compra', label: 'Compró sesión: Terapia de pareja', fecha: '2026-06-15 · 12:00' },
      { tipo: 'cuenta', label: 'Cuenta creada', fecha: '2026-03-21 · 15:20' },
    ],
  },
  {
    id: 'u4',
    nombre: 'Lic. Diego Duarte',
    correo: 'd.duarte@psiqueamor.com',
    telefono: '+58 424-555-0142',
    roles: ['Instructor'],
    estado: 'Activo',
    creado: '2025-01-18',
    ultimoAcceso: 'Hoy · 07:12',
    actividad: [
      { tipo: 'sesion', label: 'Inició sesión', fecha: '2026-08-01 · 07:12' },
      { tipo: 'cuenta', label: 'Cuenta creada', fecha: '2025-01-18 · 08:30' },
    ],
  },
  {
    id: 'u5',
    nombre: 'Roberto Salas',
    correo: 'rsalas@gmail.com',
    telefono: '+58 412-555-0223',
    roles: ['Visitante'],
    estado: 'Bloqueado',
    creado: '2026-07-19',
    ultimoAcceso: '2026-07-30',
    actividad: [
      { tipo: 'seguridad', label: 'Cuenta bloqueada por intentos fallidos', fecha: '2026-07-30 · 16:40' },
      { tipo: 'sesion', label: 'Inició sesión', fecha: '2026-07-30 · 16:15' },
      { tipo: 'cuenta', label: 'Cuenta creada', fecha: '2026-07-19 · 10:05' },
    ],
  },
  {
    id: 'u6',
    nombre: 'Camila Rivas',
    correo: 'camila.rivas@gmail.com',
    telefono: '+58 414-555-0300',
    roles: ['Visitante'],
    estado: 'Activo',
    creado: '2026-08-01',
    ultimoAcceso: null,
    actividad: [{ tipo: 'cuenta', label: 'Cuenta creada', fecha: '2026-08-01 · 09:00' }],
  },
  {
    id: 'u7',
    nombre: 'Diana Cruz',
    correo: 'diana.cruz@example.com',
    telefono: '+58 412-555-0223',
    roles: ['Estudiante'],
    estado: 'Inactivo',
    creado: '2026-07-30',
    ultimoAcceso: '2026-07-30 · 19:00',
    actividad: [
      { tipo: 'compra', label: 'Compró curso: Manejo de ansiedad', fecha: '2026-07-30 · 19:05' },
      { tipo: 'cuenta', label: 'Cuenta creada', fecha: '2026-07-30 · 18:58' },
    ],
  },
  {
    id: 'u8',
    nombre: 'Grupo Bienestar S.A.',
    correo: 'contacto@grupobienestar.com',
    telefono: '+58 212-555-0300',
    roles: ['Visitante'],
    estado: 'Activo',
    creado: '2026-02-14',
    ultimoAcceso: '2026-08-01 · 10:00',
    actividad: [{ tipo: 'compra', label: 'Pagó factura corporativa', fecha: '2026-08-01 · 10:00' }],
  },
];
