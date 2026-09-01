import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function AdminDrawer({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-brand-100 bg-white shadow-lift">
        <div className="flex items-start justify-between gap-3 border-b border-brand-100 px-6 py-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-ink/50">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink/40 hover:bg-brand-50 hover:text-ink" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-brand-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
