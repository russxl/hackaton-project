/**
 * Origin allowlist helpers. Used to enforce that browser-originated visitor
 * tokens are only used from origins the issuing API key registered.
 *
 * Server-to-server calls (API keys) carry no reliable Origin header and are
 * not origin-restricted — the API key itself is the credential.
 */

export function normalizeOrigin(origin: string): string {
  return origin.trim().toLowerCase().replace(/\/+$/, "");
}

/** True if `origin` is permitted by `allow`. `null` allow = permissive (dev). */
export function originAllowed(origin: string | null, allow: string[]): boolean {
  if (!origin) return false;
  const normalized = normalizeOrigin(origin);
  if (allow.length === 0) return false;
  return allow.some((a) => normalizeOrigin(a) === normalized);
}
