import Link from "next/link";
import { headers } from "next/headers";
import { mintVisitorToken } from "@/lib/auth/tokens";
import { getDemoApiKey } from "@/lib/auth/config";

/**
 * /widget — live embeddable-chat demo + integration guide, scoped by role:
 *  - Operator (you): one-time service config + per-app key issuance.
 *  - Integrating app: the 2-step embed (mint token, mount widget).
 * When DESKYIELD_DEMO_API_KEY is set, the page mints its own visitor token
 * server-side and mounts the widget.
 */

function requestOrigin(hdrs: Headers): string {
  const host = hdrs.get("host");
  if (!host) return "";
  const proto = hdrs.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-slate-300">
      {children}
    </pre>
  );
}

function Panel({
  tag,
  title,
  children,
}: {
  tag: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          {tag}
        </span>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Scope({
  tone,
  children,
}: {
  tone: "integrator" | "operator";
  children: React.ReactNode;
}) {
  const cls =
    tone === "integrator"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

export default async function WidgetDemo() {
  const hdrs = await headers();
  const origin = requestOrigin(hdrs);
  const demoKey = getDemoApiKey();
  const host = origin || "<origin>";

  const enabled = Boolean(demoKey && origin);
  const token = enabled
    ? mintVisitorToken({ kid: "demo", origins: [origin] })
    : "";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-lg ring-1 ring-emerald-500/30">
            🪑
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Chat Widget
          </h1>
          {enabled && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Embed DeskYield in any app. Two roles:{" "}
          <Scope tone="operator">you (operator)</Scope> configure the service and
          issue API keys;{" "}
          <Scope tone="integrator">integrating apps</Scope> embed the widget with
          a key you give them.
        </p>
      </header>

      {/* Live status */}
      {enabled ? (
        <div className="mb-10 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-slate-300">
          The widget is live on this page — click the launcher (bottom-right). Try
          asking which seats are at risk this week, or to draft a re-engagement
          email.
        </div>
      ) : (
        <div className="mb-10 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-slate-300">
          Live demo off. Complete <strong>Service setup</strong> below (and set{" "}
          <code className="text-slate-200">DESKYIELD_DEMO_API_KEY</code>) to run it
          here.
        </div>
      )}

      {/* Embed — for integrating apps */}
      <section className="mb-12">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-100">Embed the widget</h2>
          <Scope tone="integrator">For integrating apps</Scope>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          Hand the app an API key (<code className="text-slate-300">dsky_…</code>)
          you issued, plus these two steps. They need nothing else — no env vars,
          no OpenAI key.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel tag="1 · backend" title="Get a visitor token">
            <p className="mb-3 text-xs text-slate-400">
              Call once per session with the API key. Pass the returned token to
              the frontend.
            </p>
            <Code>{`const res = await fetch("${host}/api/chat/token", {
  method: "POST",
  headers: { authorization: "Bearer dsky_…" },
});
const { token } = await res.json();
// token -> "dyv.…"`}</Code>
          </Panel>

          <Panel tag="2 · frontend" title="Mount the widget">
            <p className="mb-3 text-xs text-slate-400">
              Load the script and mount with the token from step 1.
            </p>
            <Code>{`<script src="${host}/deskyield-chat.js"></script>
<script>
  DeskYieldChat.mount({
    host: "${host}",
    token,            // the dyv.… from step 1
  });
</script>`}</Code>
          </Panel>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          A launcher button and chat panel appear, style-isolated via Shadow DOM.
          Optional mount options: <code className="text-slate-400">title</code>,{" "}
          <code className="text-slate-400">subtitle</code>.
        </p>
      </section>

      {/* Service setup — for the operator */}
      <section className="mb-12">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-100">Service setup</h2>
          <Scope tone="operator">For you · operator</Scope>
        </div>
        <p className="mb-6 text-sm text-slate-400">
          Done on <strong>your</strong> DeskYield deployment. Integrating apps
          never see these.
        </p>

        <div className="space-y-8">
          {/* One-time config */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
                once
              </span>
              <h3 className="text-sm font-semibold text-slate-100">
                Configure the service
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs text-slate-500">
                  Generate a token secret and an initial API key:
                </p>
                <Code>{`openssl rand -hex 32                      # -> DESKYIELD_TOKEN_SECRET
node scripts/issue-key.mjs ${host}   # -> prints key + DESKYIELD_API_KEYS line`}</Code>
              </div>
              <div>
                <p className="mb-2 text-xs text-slate-500">
                  Add to <code>.env.local</code> (dev) or your host&apos;s env
                  store:
                </p>
                <Code>{`OPENAI_API_KEY=sk-…
DESKYIELD_TOKEN_SECRET=<from openssl, set once>
DESKYIELD_API_KEYS=[{"id":"<id>","hash":"<hash>","origins":["${host}"]}]
DESKYIELD_DEMO_API_KEY=dsky_…   # optional: enables THIS demo page`}</Code>
              </div>
            </div>
          </div>

          {/* Per-app key issuance */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
                per new app
              </span>
              <h3 className="text-sm font-semibold text-slate-100">
                Issue a key for a new app
              </h3>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Pass the integrating app&apos;s <strong>origin</strong> (where its
              frontend is served). The key is bound to that origin — visitor tokens
              from anywhere else are rejected.
            </p>
            <Code>{`node scripts/issue-key.mjs https://their-app.com
# -> dsky_… (hand THIS to the integrating app, with the embed snippet above)
# -> DESKYIELD_API_KEYS record (add it to YOUR env so the key is recognized)`}</Code>
            <p className="mt-2 text-xs text-slate-500">
              That&apos;s all the integrating app ever receives: a{" "}
              <code className="text-slate-400">dsky_…</code> key + the 2-step
              embed. Your <code className="text-slate-400">OPENAI_API_KEY</code>{" "}
              and token secret stay on your server.
            </p>
          </div>
        </div>
      </section>

      {/* Reference */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-100">Reference</h2>
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Endpoint</th>
                <th className="px-4 py-2 font-medium">Credential</th>
                <th className="px-4 py-2 font-medium">Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="px-4 py-2 font-mono text-slate-200">POST /api/chat/token</td>
                <td className="px-4 py-2 font-mono text-indigo-300">dsky_…</td>
                <td className="px-4 py-2">Mint a visitor token</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-slate-200">POST /api/chat</td>
                <td className="px-4 py-2 font-mono text-emerald-300">dyv.…</td>
                <td className="px-4 py-2">Stream a chat turn (SSE)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
          <li>• Tokens are origin-bound and expire (default 1h); mint a fresh one when needed.</li>
          <li>• Visitor tokens can&apos;t mint tokens — only API keys can.</li>
          <li>• The agent is read-only: it queries the engine and drafts artifacts, never sends.</li>
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Full REST + MCP reference at{" "}
          <Link
            href="/docs"
            className="text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:text-sky-200"
          >
            /docs
          </Link>
          .
        </p>
      </section>

      {enabled && (
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(d,s){var f=d.createElement(s);f.async=true;" +
              "f.src=" + JSON.stringify(`${origin}/deskyield-chat.js`) + ";" +
              "f.onload=function(){window.DeskYieldChat&&window.DeskYieldChat.mount({host:" +
              JSON.stringify(origin) + ",token:" + JSON.stringify(token) +
              ',title:"DeskYield",subtitle:"Empty-desk revenue analyst"});};' +
              "d.body.appendChild(f);})(document,\"script\");",
          }}
        />
      )}
    </main>
  );
}
