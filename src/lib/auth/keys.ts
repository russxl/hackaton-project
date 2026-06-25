import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getApiKeys, type ApiKeyRecord } from "./config";

export const KEY_PREFIX = "dsky_";

/** sha256(input) as lowercase hex. */
function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Constant-time equality of two lowercase hex strings. */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export type IssuedApiKey = {
  /** The full secret — shown ONCE to the operator. */
  key: string;
  id: string;
  /** Record to persist in DESKYIELD_API_KEYS. */
  record: ApiKeyRecord;
};

/**
 * Mint a new API key + its persistable (hashed) record. The plaintext key is
 * returned once; only `record` should be stored in the environment.
 */
export function issueApiKey(origins: string[] = []): IssuedApiKey {
  const id = randomBytes(6).toString("hex"); // 12 hex chars
  const secret = randomBytes(24).toString("hex"); // 48 hex chars / 192 bits
  const key = `${KEY_PREFIX}${id}_${secret}`;
  return {
    key,
    id,
    record: {
      id,
      hash: sha256Hex(secret),
      origins: origins.map((o) => o.trim().toLowerCase()),
    },
  };
}

/** Parse a `dsky_<id>_<secret>` key into its id + secret, or null. */
export function parseApiKey(key: string): { id: string; secret: string } | null {
  if (!key.startsWith(KEY_PREFIX)) return null;
  const rest = key.slice(KEY_PREFIX.length);
  const sep = rest.indexOf("_");
  if (sep <= 0) return null;
  const id = rest.slice(0, sep);
  const secret = rest.slice(sep + 1);
  if (!id || !secret) return null;
  return { id, secret };
}

/**
 * Verify a presented API key against the configured records.
 * Returns the matching record, or null if unknown / mismatched.
 */
export function verifyApiKey(key: string): ApiKeyRecord | null {
  const parsed = parseApiKey(key);
  if (!parsed) return null;
  const record = getApiKeys().find((r) => r.id === parsed.id);
  if (!record) return null;
  return safeEqualHex(sha256Hex(parsed.secret), record.hash) ? record : null;
}
