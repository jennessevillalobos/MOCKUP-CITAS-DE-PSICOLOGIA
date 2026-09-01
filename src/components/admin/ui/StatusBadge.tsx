import type { ReactNode } from 'react';

const styles: Record<string, string> = {
  positivo: 'bg-emerald-50 text-emerald-600',
  neutro: 'bg-brand-50 text-ink/60',
  alerta: 'bg-amber-50 text-amber-600',
  negativo: 'bg-rose-50 text-rose-600',
};

export default function StatusBadge({
  children,
  tone = 'neutro',
}: {
  children: ReactNode;
  tone?: 'positivo' | 'neutro' | 'alerta' | 'negativo';
}) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[tone]}`}>{children}</span>;
}
