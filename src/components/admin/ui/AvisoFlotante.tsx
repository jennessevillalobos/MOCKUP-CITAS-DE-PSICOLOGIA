// Aviso flotante (abajo a la derecha) tras una acción del panel admin.
export default function AvisoFlotante({ aviso }: { aviso: { texto: string; error?: boolean } | null }) {
  if (!aviso) return null;
  return (
    <p
      role="status"
      className={`fixed bottom-6 right-6 z-[60] max-w-sm rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
        aviso.error ? 'bg-rose-600' : 'bg-emerald-600'
      }`}
    >
      {aviso.texto}
    </p>
  );
}
