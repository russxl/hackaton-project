import { mintVisitorToken } from "@/lib/auth/tokens";
import { getDemoApiKey } from "@/lib/auth/config";
import { json } from "@/lib/http";

function requestOrigin(hdrs: Headers): string {
  const host = hdrs.get("host");
  if (!host) return "";
  const proto = hdrs.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
}

/**
 * GET /api/widget-token
 *
 * Powers the live widget demo embedded in /docs. When DESKYIELD_DEMO_API_KEY
 * is set, mints a short-lived visitor token (dyv.…) bound to THIS deployment's
 * origin, server-side, so the docs page can mount the widget without exposing
 * any secret to the browser. When unset, returns { enabled: false }.
 *
 * This is the demo convenience path only — integrating apps mint tokens via
 * POST /api/chat/token with their own API key.
 */
export function GET(request: Request) {
  const demoKey = getDemoApiKey();
  const origin = requestOrigin(request.headers);
  const enabled = Boolean(demoKey && origin);

  if (!enabled) {
    return json({ enabled: false });
  }

  const token = mintVisitorToken({ kid: "demo", origins: [origin] });
  return json({ enabled: true, origin, token });
}
