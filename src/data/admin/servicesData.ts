export interface ServicioRecord {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  modalidad: 'Online' | 'Presencial' | 'Online y presencial';
  precio: number;
  moneda: string;
  activo: boolean;
}

export const demoServicios: ServicioRecord[] = [
  { id: 's1', nombre: 'Terapia individual', descripcion: 'Sesión de acompañamiento psicológico individual.', duracionMin: 50, modalidad: 'Online y presencial', precio: 60, moneda: 'USD', activo: true },
  { id: 's2', nombre: 'Terapia de pareja', descripcion: 'Sesión conjunta enfocada en la relación de pareja.', duracionMin: 60, modalidad: 'Online y presencial', precio: 75, moneda: 'USD', activo: true },
  { id: 's3', nombre: 'Terapia familiar', descripcion: 'Sesión con varios integrantes del núcleo familiar.', duracionMin: 60, modalidad: 'Presencial', precio: 80, moneda: 'USD', activo: true },
  { id: 's4', nombre: 'Evaluación inicial', descripcion: 'Primera sesión de valoración y diagnóstico.', duracionMin: 45, modalidad: 'Online', precio: 40, moneda: 'USD', activo: true },
  { id: 's5', nombre: 'Seguimiento', descripcion: 'Sesión breve de seguimiento entre procesos.', duracionMin: 30, modalidad: 'Online', precio: 35, moneda: 'USD', activo: false },
];

export interface ProfesionalRecord {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  especialidad: string;
  especialidades: string[];
  servicios: string[];
  sedes: string[];
  modalidad: string;
  diasDisponibles: string[];
  desde: string;
  hasta: string;
  estado: 'Disponible' | 'Agenda llena';
  activo: boolean;
}

export const demoProfesionales: ProfesionalRecord[] = [
  {
    id: 'p1', nombre: 'Dra. Valentina Ríos', correo: 'valentina.rios@psiqueamor.com', telefono: '+58 412 000 1122',
    especialidad: 'Psicología clínica', especialidades: ['Ansiedad', 'Depresión', 'Duelo'],
    servicios: ['Terapia individual', 'Evaluación inicial', 'Seguimiento'],
    sedes: ['Sede Centro'], modalidad: 'Online y presencial',
    diasDisponibles: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], desde: '08:00', hasta: '16:00',
    estado: 'Disponible', activo: true,
  },
  {
    id: 'p2', nombre: 'Lic. Andrés Duarte', correo: 'andres.duarte@psiqueamor.com', telefono: '+58 412 000 3344',
    especialidad: 'Terapia de pareja y familia', especialidades: ['Pareja', 'Familia', 'Comunicación'],
    servicios: ['Terapia de pareja', 'Terapia familiar'],
    sedes: ['Sede Norte'], modalidad: 'Online y presencial',
    diasDisponibles: ['Lun', 'Mié', 'Vie', 'Sáb'], desde: '10:00', hasta: '18:00',
    estado: 'Disponible', activo: true,
  },
  {
    id: 'p3', nombre: 'Lic. Sofía Herrera', correo: 'sofia.herrera@psiqueamor.com', telefono: '+58 412 000 5566',
    especialidad: 'Bienestar emocional', especialidades: ['Estrés', 'Autoestima', 'Bienestar'],
    servicios: ['Terapia individual'],
    sedes: ['Sede Centro', 'Sede Norte'], modalidad: 'Online',
    diasDisponibles: ['Mar', 'Jue'], desde: '09:00', hasta: '13:00',
    estado: 'Agenda llena', activo: true,
  },
];

export interface LugarRecord {
  id: string;
  nombre: string;
  direccion: string;
  tipo: 'Consultorio' | 'Sede administrativa' | 'Espacio compartido';
  capacidad: number;
  horario: string;
  notas: string;
  profesionales: number;
  activo: boolean;
}

export const demoLugares: LugarRecord[] = [
  { id: 'l1', nombre: 'Sede Centro', direccion: 'Av. Principal, Edif. Aurora, piso 3', tipo: 'Consultorio', capacidad: 4, horario: 'Lun–Vie 8:00–18:00', notas: 'Cuenta con sala de espera y 2 consultorios privados.', profesionales: 2, activo: true },
  { id: 'l2', nombre: 'Sede Norte', direccion: 'Calle Los Naranjos, Local 5', tipo: 'Consultorio', capacidad: 3, horario: 'Lun–Sáb 9:00–17:00', notas: 'Ingreso independiente, estacionamiento disponible.', profesionales: 2, activo: true },
];

export const ESPECIALIDADES_DISPONIBLES = ['Ansiedad', 'Depresión', 'Duelo', 'Pareja', 'Familia', 'Comunicación', 'Estrés', 'Autoestima', 'Bienestar', 'Adolescentes'];
export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
