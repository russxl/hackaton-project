import { NextResponse, type NextRequest } from "next/server";
import { CORS_HEADERS } from "@/lib/http";

/**
 * Proxy (Next.js 16's rename of "middleware").
 *
 * Scoped to `/api/chat/:path*` only — the existing open REST + MCP endpoints
 * are left untouched.
 *
 * Per the Next.js 16 guidance, Proxy is used here for CORS and an OPTIMISTIC
 * fast-fail only (reject requests with no Authorization header before they
 * reach the handler). Full cryptographic verification still happens inside
 * each route handler — never rely on Proxy alone for authorization.
 */

function corsHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

export function proxy(request: NextRequest) {
  // CORS preflight for the (cross-origin) chat widget.
  if (request.method === "OPTIONS") {
    return corsHeaders(new NextResponse(null, { status: 204 }));
  }

  // Optimistic gate: any chat request must carry a Bearer credential.
  const auth = request.headers.get("authorization");
  if (!auth || !/^bearer\s+\S+/i.test(auth)) {
    return corsHeaders(
      NextResponse.json(
        {
          error: "missing_token",
          message:
            "Missing Authorization header. Expected 'Bearer dsky_…' or 'Bearer dyv.…'.",
        },
        { status: 401 },
      ),
    );
  }

  return corsHeaders(NextResponse.next());
}

export const config = {
  matcher: "/api/chat/:path*",
};
