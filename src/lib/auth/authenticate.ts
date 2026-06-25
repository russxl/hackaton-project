import { verifyApiKey } from "./keys";
import { verifyVisitorToken } from "./tokens";
import { originAllowed } from "./origin";
import type { ApiKeyRecord } from "./config";

/**
 * Verified principal derived from a request's `Authorization: Bearer …` header.
 *
 * Two credential kinds are accepted on every protected endpoint:
 *  - API key  (`dsky_…`)              — server-to-server. No origin check.
 *  - Visitor token (`dyv.…`)          — browser widget. Origin must be in the
 *                                       token's allowlist.
 */
export type Principal =
  | { kind: "apikey"; id: string; origins: string[] }
  | { kind: "visitor"; id: string; origins: string[] };

export type AuthError = {
  status: 401 | 403;
  code: "missing_token" | "invalid_token" | "origin_not_allowed";
  message: string;
};

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Authenticate a request. Resolves to a Principal, or an AuthError describing
 * why it was rejected (call sites map these to JSON responses).
 */
export function authenticate(
  request: Request,
  opts: { requireOriginForVisitor?: boolean } = {},
): Principal | AuthError {
  const token = bearer(request);
  if (!token) {
    return {
      status: 401,
      code: "missing_token",
      message: "Missing Authorization header. Expected 'Bearer dsky_…' or 'Bearer dyv.…'.",
    };
  }

  // --- API key path (server-to-server) ---
  if (token.startsWith("dsky_")) {
    const record: ApiKeyRecord | null = verifyApiKey(token);
    if (!record) {
      return {
        status: 401,
        code: "invalid_token",
        message: "Unknown or invalid API key.",
      };
    }
    return { kind: "apikey", id: record.id, origins: record.origins };
  }

  // --- Visitor token path (browser widget) ---
  if (token.startsWith("dyv.")) {
    const visitor = verifyVisitorToken(token);
    if (!visitor) {
      return {
        status: 401,
        code: "invalid_token",
        message: "Visitor token is invalid or expired.",
      };
    }
    if (opts.requireOriginForVisitor !== false) {
      const origin = request.headers.get("origin");
      if (!originAllowed(origin, visitor.origins)) {
        return {
          status: 403,
          code: "origin_not_allowed",
          message: `Origin '${origin ?? "(none)"}' is not permitted for this token.`,
        };
      }
    }
    return { kind: "visitor", id: visitor.kid, origins: visitor.origins };
  }

  return {
    status: 401,
    code: "invalid_token",
    message: "Unrecognized credential format.",
  };
}

export function isAuthError(v: Principal | AuthError): v is AuthError {
  return v !== null && typeof v === "object" && "status" in v;
}

/** Stable rate-limit key for a principal. */
export function principalKey(p: Principal): string {
  return `${p.kind}:${p.id}`;
}
