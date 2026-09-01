// Utilidad CORS para las Edge Functions de Supabase.
// Devuelve los encabezados y responde automáticamente a las solicitudes
// OPTIONS (preflight) del navegador.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

export function handleOptions(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response('ok', { headers: corsHeaders });
}
