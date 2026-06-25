/**
 * Centralized, read-once access to the auth + chat environment configuration.
 *
 * All secrets live in the environment (`.env.local` in dev, the platform's env
 * store in prod). Nothing here is ever shipped to the browser.
 *
 *  OPENAI_API_KEY           OpenAI secret key (server-only).
 *  OPENAI_MODEL             Chat model id (default: gpt-4o-mini).
 *  DESKYIELD_TOKEN_SECRET   HMAC secret used to sign visitor tokens and hash
 *                           API keys. Generate with: openssl rand -hex 32
 *  DESKYIELD_API_KEYS       JSON array of API key records:
 *                           [{ "id", "hash", "origins": [] }]
 *  DESKYIELD_TOKEN_TTL      Visitor token lifetime in seconds (default 3600).
 *  DESKYIELD_CHAT_LIMIT     Max chat requests per principal per minute (default 20).
 *  DESKYIELD_DEMO_API_KEY   Optional full demo API key used by the /docs#widget
 *                           live demo to mint itself a visitor token server-side
 *                           (via GET /api/widget-token).
 */

export type ApiKeyRecord = {
  id: string;
  /** sha256(secret) as lowercase hex. */
  hash: string;
  /** Origins permitted to use visitor tokens minted by this key. */
  origins: string[];
};

let cachedKeys: ApiKeyRecord[] | null = null;

function parseApiKeys(raw: string | undefined): ApiKeyRecord[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is ApiKeyRecord =>
          r &&
          typeof r === "object" &&
          typeof r.id === "string" &&
          typeof r.hash === "string" &&
          Array.isArray(r.origins),
      )
      .map((r) => ({
        id: r.id,
        hash: r.hash.toLowerCase(),
        origins: r.origins.map((o: string) => o.trim().toLowerCase()),
      }));
  } catch {
    return [];
  }
}

export function getApiKeys(): ApiKeyRecord[] {
  if (cachedKeys) return cachedKeys;
  cachedKeys = parseApiKeys(process.env.DESKYIELD_API_KEYS);
  return cachedKeys;
}

export function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function getTokenSecret(): string {
  const secret = process.env.DESKYIELD_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "DESKYIELD_TOKEN_SECRET is missing or too short (need >=32 chars). Generate with: openssl rand -hex 32",
    );
  }
  return secret;
}

export function getTokenTtlSeconds(): number {
  const n = Number(process.env.DESKYIELD_TOKEN_TTL);
  return Number.isFinite(n) && n > 0 ? n : 3600;
}

export function getChatLimitPerMinute(): number {
  const n = Number(process.env.DESKYIELD_CHAT_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

export function getDemoApiKey(): string | undefined {
  return process.env.DESKYIELD_DEMO_API_KEY;
}
