// Respuestas JSON consistentes para todas las Edge Functions.
// Formato: { data, error, request_id } con el código HTTP correspondiente.

import { corsHeaders } from './cors.ts';

export interface ErrorBody {
  code: string;
  message: string;
}

export function jsonOk(data: unknown, status = 200, requestId?: string): Response {
  return new Response(JSON.stringify({ data, error: null, request_id: requestId ?? null }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function jsonError(code: string, message: string, status = 400, requestId?: string): Response {
  const error: ErrorBody = { code, message };
  return new Response(JSON.stringify({ data: null, error, request_id: requestId ?? null }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
