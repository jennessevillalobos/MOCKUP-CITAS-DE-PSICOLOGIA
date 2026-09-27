/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  // "true" cuando Stripe/PayPal tengan claves: muestra tarjeta y PayPal en el pago de citas.
  readonly VITE_PAGOS_EN_LINEA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
