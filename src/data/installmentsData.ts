// Contenido de demostración para la página de Pagos y cuotas del Aula
// Virtual, basado en PsiqueAmor_18_InscripcionCuotas.html (vista "Mis
// cuotas" — la vista de elegir plan es parte del flujo de inscripción desde
// el detalle del curso, no del Aula Virtual). Reutiliza el curso "Manejo de
// la ansiedad" y el monto de `CUOTA_PENDIENTE` en `aulaVirtualData.ts` para
// mantener consistencia con el resto del sitio.
export const PLAN_CUOTAS = {
  curso: { es: 'Manejo de la ansiedad', en: 'Managing anxiety' },
  totalCuotas: 4,
  montoCuota: 14,
  totalPlan: 56,
  pagado: 28,
  vencido: 14,
  porVencer: 14,
};

export type EstadoCuota = 'pagada' | 'vencida' | 'pendiente';

export interface Cuota {
  numero: number;
  monto: number;
  estado: EstadoCuota;
  vence: { es: string; en: string };
  detalle: { es: string; en: string };
}

export const CUOTAS: Cuota[] = [
  {
    numero: 1,
    monto: 14,
    estado: 'pagada',
    vence: { es: '20 jun 2026', en: 'Jun 20, 2026' },
    detalle: { es: 'Pagada 19 jun', en: 'Paid Jun 19' },
  },
  {
    numero: 2,
    monto: 14,
    estado: 'pagada',
    vence: { es: '5 jul 2026', en: 'Jul 5, 2026' },
    detalle: { es: 'Pagada 4 jul', en: 'Paid Jul 4' },
  },
  {
    numero: 3,
    monto: 14,
    estado: 'vencida',
    vence: { es: '3 ago 2026', en: 'Aug 3, 2026' },
    detalle: { es: 'Vencida hace 3 semanas', en: 'Overdue 3 weeks ago' },
  },
  {
    numero: 4,
    monto: 14,
    estado: 'pendiente',
    vence: { es: '15 sep 2026', en: 'Sep 15, 2026' },
    detalle: { es: 'Vence en 22 días', en: 'Due in 22 days' },
  },
];
