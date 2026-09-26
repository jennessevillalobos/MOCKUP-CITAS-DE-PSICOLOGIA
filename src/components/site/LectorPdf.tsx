import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Loader2 } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy } from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Lector de PDF dentro de la página (pdf.js): no depende del visor del
// navegador, que en algunos (p. ej. navegadores integrados) descarga el
// archivo en vez de mostrarlo. Se carga de forma diferida desde la Biblioteca.

const text = {
  es: { pagina: 'Página', de: 'de', cargando: 'Abriendo el libro…', error: 'No se pudo abrir el archivo.' },
  en: { pagina: 'Page', de: 'of', cargando: 'Opening the book…', error: 'The file could not be opened.' },
} as const;

interface Props {
  url: string;
  // Marca de agua (correo del comprador).
  marca: string;
  language: 'es' | 'en';
}

export default function LectorPdf({ url, marca, language }: Props) {
  const t = text[language];
  const contenedor = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pagina, setPagina] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState(false);
  const [renderizando, setRenderizando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const tarea = pdfjs.getDocument({ url });
    tarea.promise
      .then((d) => { if (!cancelado) { setDoc(d); setPagina(1); } })
      .catch(() => { if (!cancelado) setError(true); });
    return () => {
      cancelado = true;
      void tarea.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (!doc || !lienzo.current || !contenedor.current) return;
    let cancelado = false;
    let tareaRender: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null = null;
    setRenderizando(true);
    void doc.getPage(pagina).then((p) => {
      if (cancelado || !lienzo.current || !contenedor.current) return;
      const base = p.getViewport({ scale: 1 });
      // Ajusta al ancho disponible y aplica el zoom; nitidez en pantallas HiDPI.
      const escala = ((contenedor.current.clientWidth - 2) / base.width) * zoom;
      const viewport = p.getViewport({ scale: escala });
      const ratio = window.devicePixelRatio || 1;
      const canvas = lienzo.current;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      tareaRender = p.render({ canvasContext: ctx, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
      tareaRender.promise.then(() => { if (!cancelado) setRenderizando(false); }).catch(() => undefined);
    });
    return () => {
      cancelado = true;
      tareaRender?.cancel();
    };
  }, [doc, pagina, zoom]);

  if (error) return <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{t.error}</p>;

  const total = doc?.numPages ?? 0;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-ink/60">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1} className="rounded p-1 hover:bg-brand-50 disabled:opacity-30" aria-label="Anterior">
            <ChevronLeft size={16} />
          </button>
          <span>{t.pagina} {pagina} {t.de} {total || '…'}</span>
          <button onClick={() => setPagina((p) => Math.min(total, p + 1))} disabled={pagina >= total} className="rounded p-1 hover:bg-brand-50 disabled:opacity-30" aria-label="Siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-ink/50">
          <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} className="rounded p-1 hover:bg-brand-50" aria-label="A-"><Minus size={14} /></button>
          <span className="text-xs">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(1)))} className="rounded p-1 hover:bg-brand-50" aria-label="A+"><Plus size={14} /></button>
        </div>
      </div>
      <div
        ref={contenedor}
        className="relative min-h-[420px] select-none overflow-auto rounded-2xl border border-brand-100 bg-[#faf7f0] shadow-lift"
        onContextMenu={(e) => e.preventDefault()}
      >
        {(!doc || renderizando) && (
          <div className="absolute inset-0 z-10 grid place-items-center text-sm text-ink/50">
            <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> {t.cargando}</span>
          </div>
        )}
        <canvas ref={lienzo} className="mx-auto block" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.08]">
          <span className="-rotate-12 font-display text-3xl font-semibold text-ink">{marca}</span>
        </div>
      </div>
    </div>
  );
}
