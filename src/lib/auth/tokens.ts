import { createHmac, timingSafeEqual } from "node:crypto";
import { getTokenSecret, getTokenTtlSeconds } from "./config";

/**
 * Stateless, HMAC-signed visitor tokens.
 *
 * Format:  dyv.<base64url(payloadJson)>.<base64url(hmac)>
 *
 * The embedding app's backend mints one of these using its API key (via
 * POST /api/chat/token). The browser widget only ever holds this short-lived
 * token — never the API key. Verification is stateless: recompute the HMAC and
 * check the expiry. No database required.
 */

export const VISITOR_PREFIX = "dyv.";
const VERSION = 1;

export type VisitorPayload = {
  v: number;
  /** Id of the API key that minted this token. */
  kid: string;
  /** Origins this token may be used from. */
  origins: string[];
  iat: number; // issued-at (seconds)
  exp: number; // expiry (seconds)
};

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getTokenSecret())
    .update(payloadB64, "utf8")
    .digest("base64url");
}

/** Inputs needed to mint a visitor token. */
export type VisitorTokenSeed = {
  /** Id of the API key minting this token. */
  kid: string;
  /** Origins this token may be used from. */
  origins: string[];
};

/** Mint a visitor token bound to an API key id + origin allowlist. */
export function mintVisitorToken(seed: VisitorTokenSeed): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: VisitorPayload = {
    v: VERSION,
    kid: seed.kid,
    origins: seed.origins,
    iat: now,
    exp: now + getTokenTtlSeconds(),
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${VISITOR_PREFIX}${payloadB64}.${sign(payloadB64)}`;
}

export type VerifiedVisitor = {
  kid: string;
  origins: string[];
};

/**
 * Verify a visitor token's signature + expiry. Does NOT check the Origin
 * header — do that with `originAllowed()` at the call site.
 */
export function verifyVisitorToken(token: string): VerifiedVisitor | null {
  if (!token.startsWith(VISITOR_PREFIX)) return null;
  const rest = token.slice(VISITOR_PREFIX.length);
  const sep = rest.lastIndexOf(".");
  if (sep <= 0) return null;
  const payloadB64 = rest.slice(0, sep);
  const sig = rest.slice(sep + 1);
  const expected = sign(payloadB64);

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  let payload: VisitorPayload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  if (payload.v !== VERSION) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || now >= payload.exp) return null;
  return { kid: payload.kid, origins: payload.origins ?? [] };
}
