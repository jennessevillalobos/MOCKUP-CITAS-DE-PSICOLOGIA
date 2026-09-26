import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

// Diálogos propios de la app (confirmar, pedir texto, avisar) en lugar de
// window.confirm/prompt/alert: los navegadores integrados (p. ej. el panel de
// vista previa) bloquean los nativos y los responden "Cancelar" al instante.

interface OpcionesDialogo {
  // Pinta el botón de aceptar en rojo (acciones destructivas).
  peligro?: boolean;
  textoAceptar?: string;
}

interface DialogoContextValue {
  confirmar: (mensaje: string, opciones?: OpcionesDialogo) => Promise<boolean>;
  pedirTexto: (mensaje: string, opciones?: OpcionesDialogo & { valorInicial?: string }) => Promise<string | null>;
  avisar: (mensaje: string) => Promise<void>;
}

type Pendiente =
  | { tipo: 'confirmar'; mensaje: string; opciones: OpcionesDialogo; resolver: (v: boolean) => void }
  | { tipo: 'texto'; mensaje: string; opciones: OpcionesDialogo; resolver: (v: string | null) => void }
  | { tipo: 'aviso'; mensaje: string; opciones: OpcionesDialogo; resolver: () => void };

const text = {
  es: { aceptar: 'Aceptar', cancelar: 'Cancelar' },
  en: { aceptar: 'OK', cancelar: 'Cancel' },
} as const;

const DialogoContext = createContext<DialogoContextValue | undefined>(undefined);

export function DialogoProvider({ children }: { children: ReactNode }) {
  const { language } = useSiteLanguage();
  const t = text[language];
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [valor, setValor] = useState('');
  const aceptarRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const confirmar = useCallback(
    (mensaje: string, opciones: OpcionesDialogo = {}) =>
      new Promise<boolean>((resolver) => setPendiente({ tipo: 'confirmar', mensaje, opciones, resolver })),
    []
  );
  const pedirTexto = useCallback(
    (mensaje: string, opciones: OpcionesDialogo & { valorInicial?: string } = {}) =>
      new Promise<string | null>((resolver) => {
        setValor(opciones.valorInicial ?? '');
        setPendiente({ tipo: 'texto', mensaje, opciones, resolver });
      }),
    []
  );
  const avisar = useCallback(
    (mensaje: string) => new Promise<void>((resolver) => setPendiente({ tipo: 'aviso', mensaje, opciones: {}, resolver })),
    []
  );

  const cerrar = useCallback((aceptado: boolean) => {
    setPendiente((p) => {
      if (!p) return null;
      if (p.tipo === 'confirmar') p.resolver(aceptado);
      else if (p.tipo === 'texto') p.resolver(aceptado ? valor : null);
      else p.resolver();
      return null;
    });
  }, [valor]);

  useEffect(() => {
    if (!pendiente) return;
    (pendiente.tipo === 'texto' ? inputRef.current : aceptarRef.current)?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(false);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [pendiente, cerrar]);

  const value = useMemo(() => ({ confirmar, pedirTexto, avisar }), [confirmar, pedirTexto, avisar]);

  return (
    <DialogoContext.Provider value={value}>
      {children}
      {pendiente && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4" onClick={() => cerrar(false)}>
          <form
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              cerrar(true);
            }}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft"
          >
            <p className="whitespace-pre-line text-sm text-ink">{pendiente.mensaje}</p>
            {pendiente.tipo === 'texto' && (
              <input
                ref={inputRef}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                maxLength={300}
                className="mt-3 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none"
              />
            )}
            <div className="mt-5 flex justify-end gap-2">
              {pendiente.tipo !== 'aviso' && (
                <button type="button" onClick={() => cerrar(false)} className="rounded-full border border-brand-200 px-4 py-2 text-xs font-bold text-ink/60 hover:bg-brand-50">
                  {t.cancelar}
                </button>
              )}
              <button
                ref={aceptarRef}
                type="submit"
                className={`rounded-full px-4 py-2 text-xs font-bold text-white ${pendiente.opciones.peligro ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-gradient hover:opacity-90'}`}
              >
                {pendiente.opciones.textoAceptar ?? t.aceptar}
              </button>
            </div>
          </form>
        </div>
      )}
    </DialogoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDialogo() {
  const ctx = useContext(DialogoContext);
  if (!ctx) throw new Error('useDialogo debe usarse dentro de <DialogoProvider>');
  return ctx;
}
