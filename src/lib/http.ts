/**
 * Shared HTTP helpers for the REST route handlers: open CORS (this is a public
 * read-only demo service) and JSON response shaping.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init.headers ?? {}) },
  });
}

/** CORS preflight response. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function badRequest(error: string, details?: unknown): Response {
  return json({ error, details }, { status: 400 });
}

export function notFound(error: string): Response {
  return json({ error }, { status: 404 });
}

/**
 * Parse a JSON request body and extract an optional `dataset`. Returns the
 * remaining top-level fields too (e.g. filters). Throws on malformed JSON.
 */
export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as Record<string, unknown>;
}
