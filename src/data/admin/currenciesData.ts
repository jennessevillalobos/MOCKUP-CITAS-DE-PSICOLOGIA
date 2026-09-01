export interface MonedaRecord {
  id: string;
  codigo: string;
  nombre: string;
  simbolo: string;
  tasa: number; // unidades de esta moneda por 1 USD (moneda base)
  activa: boolean;
  actualizada: string;
}

// USD es la moneda base del sistema (tasa fija 1).
export const demoMonedas: MonedaRecord[] = [
  { id: 'usd', codigo: 'USD', nombre: 'Dólar estadounidense', simbolo: '$', tasa: 1, activa: true, actualizada: '2026-08-12' },
  { id: 'ves', codigo: 'VES', nombre: 'Bolívar', simbolo: 'Bs.', tasa: 172.35, activa: true, actualizada: '2026-08-12' },
  { id: 'eur', codigo: 'EUR', nombre: 'Euro', simbolo: '€', tasa: 0.92, activa: true, actualizada: '2026-08-10' },
  { id: 'cop', codigo: 'COP', nombre: 'Peso colombiano', simbolo: 'COL$', tasa: 4120, activa: false, actualizada: '2026-07-28' },
];

export interface TasaHistorial {
  id: string;
  monedaId: string;
  tasa: number;
  fecha: string;
  fuente: 'Manual' | 'Automática';
}

export const demoHistorialTasas: TasaHistorial[] = [
  { id: 'h1', monedaId: 'ves', tasa: 172.35, fecha: '2026-08-12', fuente: 'Manual' },
  { id: 'h2', monedaId: 'ves', tasa: 169.8, fecha: '2026-08-08', fuente: 'Manual' },
  { id: 'h3', monedaId: 'ves', tasa: 165.2, fecha: '2026-08-01', fuente: 'Automática' },
  { id: 'h4', monedaId: 'eur', tasa: 0.92, fecha: '2026-08-10', fuente: 'Automática' },
  { id: 'h5', monedaId: 'cop', tasa: 4120, fecha: '2026-07-28', fuente: 'Manual' },
];

export interface PrecioMonedaRecord {
  id: string;
  servicio: string;
  modo: 'Automático' | 'Fijo';
  precioFijo?: number;
}

export const demoPreciosPorMoneda: PrecioMonedaRecord[] = [
  { id: 'pm1', servicio: 'Terapia individual', modo: 'Automático' },
  { id: 'pm2', servicio: 'Terapia de pareja', modo: 'Automático' },
  { id: 'pm3', servicio: 'Curso: Manejo de ansiedad', modo: 'Fijo', precioFijo: 75 },
  { id: 'pm4', servicio: 'Evaluación inicial', modo: 'Automático' },
];

export interface OrdenAbono {
  id: string;
  monto: number;
  moneda: string;
  tasaAlPagar: number;
  fecha: string;
  metodo: string;
}

export interface OrdenItem {
  concepto: string;
  cantidad: number;
  precioUnitario: number;
}

export interface OrdenRecord {
  id: string;
  cliente: string;
  fecha: string;
  moneda: string;
  total: number;
  items: OrdenItem[];
  abonos: OrdenAbono[];
  estado: 'Pagada' | 'Parcial' | 'Pendiente' | 'Vencida';
}

export const demoOrdenes: OrdenRecord[] = [
  {
    id: 'ORD-1042', cliente: 'Roberto Salas', fecha: '2026-07-15', moneda: 'USD', total: 480,
    items: [{ concepto: 'Terapia individual · 8 sesiones', cantidad: 8, precioUnitario: 60 }],
    abonos: [
      { id: 'ab1', monto: 120, moneda: 'USD', tasaAlPagar: 1, fecha: '2026-07-15', metodo: 'Tarjeta' },
      { id: 'ab2', monto: 120, moneda: 'USD', tasaAlPagar: 1, fecha: '2026-07-29', metodo: 'Transferencia' },
      { id: 'ab3', monto: 120, moneda: 'USD', tasaAlPagar: 1, fecha: '2026-08-12', metodo: 'Transferencia' },
    ],
    estado: 'Parcial',
  },
  {
    id: 'ORD-1043', cliente: 'Grupo Bienestar S.A.', fecha: '2026-08-06', moneda: 'USD', total: 400,
    items: [{ concepto: 'Curso: Liderazgo consciente (grupal)', cantidad: 10, precioUnitario: 40 }],
    abonos: [{ id: 'ab4', monto: 400, moneda: 'USD', tasaAlPagar: 1, fecha: '2026-08-06', metodo: 'Transferencia' }],
    estado: 'Pagada',
  },
  {
    id: 'ORD-1044', cliente: 'Diego Duarte', fecha: '2026-07-20', moneda: 'USD', total: 300,
    items: [{ concepto: 'Terapia de pareja · 4 sesiones', cantidad: 4, precioUnitario: 75 }],
    abonos: [{ id: 'ab5', monto: 75, moneda: 'USD', tasaAlPagar: 1, fecha: '2026-07-20', metodo: 'Transferencia' }],
    estado: 'Vencida',
  },
  {
    id: 'ORD-1045', cliente: 'Camila Rivas', fecha: '2026-08-01', moneda: 'USD', total: 60,
    items: [{ concepto: 'Terapia individual', cantidad: 1, precioUnitario: 60 }],
    abonos: [],
    estado: 'Pendiente',
  },
];
