import { authenticate, isAuthError } from "@/lib/auth/authenticate";
import { mintVisitorToken } from "@/lib/auth/tokens";
import { getTokenTtlSeconds } from "@/lib/auth/config";
import { json, preflight } from "@/lib/http";

/**
 * POST /api/chat/token
 *
 * Exchange a server-side API key (dsky_…) for a short-lived visitor token
 * (dyv.…). The embedding app's backend calls this once per session; the
 * browser widget then uses the visitor token against POST /api/chat.
 *
 * Visitor tokens are NOT accepted here — only API keys may mint new tokens.
 *
 * Response: { token, tokenType, expiresIn, origins }
 */

export function OPTIONS() {
  return preflight();
}

export function POST(request: Request) {
  const principal = authenticate(request, { requireOriginForVisitor: false });
  if (isAuthError(principal)) {
    return json({ error: principal.code, message: principal.message }, { status: principal.status });
  }

  if (principal.kind !== "apikey") {
    return json(
      {
        error: "invalid_credential",
        message: "Only an API key (dsky_…) may mint visitor tokens.",
      },
      { status: 403 },
    );
  }

  const ttl = getTokenTtlSeconds();
  const token = mintVisitorToken({
    kid: principal.id,
    origins: principal.origins,
  });

  return json({
    token,
    tokenType: "Bearer",
    expiresIn: ttl,
    origins: principal.origins,
  });
}
