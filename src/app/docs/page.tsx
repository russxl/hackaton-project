"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ *
 * DeskYield API — Reference & Live Console
 * Themed to the KMC ERP Core App: light canvas, pumpkin brand accent,
 * informative/positive/warning/danger semantics, Karla + Barlow.
 * ------------------------------------------------------------------ */

const SAMPLE_DATASET = `{
  "today": "2026-06-25",
  "rooms": [
    {
      "roomId": "RM-101", "buildingId": "B1", "buildingName": "Demo Tower",
      "floor": "5F", "officeName": "Suite A", "roomType": "Private Office",
      "capacity": 8, "sizeSqm": 40, "publishedSeatRate": 12000,
      "hasManagersCabin": "No", "status": "Active"
    },
    {
      "roomId": "RM-102", "buildingId": "B1", "buildingName": "Demo Tower",
      "floor": "5F", "officeName": "Suite B", "roomType": "Private Office",
      "capacity": 6, "sizeSqm": 30, "publishedSeatRate": 11000,
      "hasManagersCabin": "No", "status": "Vacant"
    }
  ],
  "occupancy": [
    {
      "occId": "OCC-1", "roomId": "RM-101", "clientId": "CLT-1",
      "companyName": "Acme Corp", "service": "Private Office", "seatRate": 12000,
      "billableSeats": 5, "seatCapacity": 8, "seatGap": 3, "leaseTermMonths": 6,
      "effectivityDate": "2026-01-01", "expirationDate": "2026-07-10",
      "isActive": true, "notes": ""
    }
  ],
  "clients": [
    {
      "clientId": "CLT-1", "companyName": "Acme Corp",
      "primaryContact": "Jane Cruz", "contactTitle": "Operations Lead",
      "accountTier": "Silver", "accountStatus": "Watch"
    }
  ]
}`;

type QueryParam = {
  name: string;
  type: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
  note: string;
};

type Endpoint = {
  id: string;
  method: "GET" | "POST";
  path: string;
  title: string;
  desc: string;
  query: QueryParam[];
  body: string | null;
  returns: string;
};

const RISK_FILTERS: QueryParam[] = [
  {
    name: "band",
    type: "select",
    options: ["", "Critical", "High", "Medium", "Low"],
    note: "Filter to one risk band. Demo data tops out at High.",
  },
  {
    name: "client",
    type: "text",
    placeholder: "Eastbridge  ·  CLT-004",
    note: "Match by clientId (exact) or company name (substring).",
  },
  {
    name: "limit",
    type: "number",
    placeholder: "5",
    note: "Cap the number of rows returned.",
  },
];

const REST: Endpoint[] = [
  {
    id: "discovery",
    method: "GET",
    path: "/api",
    title: "Service Discovery",
    desc: "A machine-readable index of every endpoint plus MCP metadata. Start here.",
    query: [],
    body: null,
    returns: "{ service, version, endpoints, mcp }",
  },
  {
    id: "analysis",
    method: "GET",
    path: "/api/analysis",
    title: "Full Analysis",
    desc: "The complete run over the bundled demo dataset — risk items, cold vacancies, ranked actions and recoverable PHP totals in one payload.",
    query: [],
    body: null,
    returns: "Analysis { today, riskItems[], vacantItems[], actions[], totals }",
  },
  {
    id: "analysis-post",
    method: "POST",
    path: "/api/analysis",
    title: "Analyse a Custom Dataset",
    desc: "Run the engine over your own ERP snapshot. The body is a bare Dataset. Invalid shapes return 400 with a list of issues — try emptying rooms to see it.",
    query: [],
    body: SAMPLE_DATASET,
    returns: "Analysis  ·  400 { error, details[] }",
  },
  {
    id: "risk",
    method: "GET",
    path: "/api/risk",
    title: "Risk-Scored Agreements",
    desc: "Active seat agreements scored by their risk of going unused in the next 7 days. Filter by band, client and limit.",
    query: RISK_FILTERS,
    body: null,
    returns: "RiskItem[]",
  },
  {
    id: "risk-post",
    method: "POST",
    path: "/api/risk",
    title: "Risk Over a Custom Dataset",
    desc: "The same filters, scored over a Dataset you supply in the body.",
    query: RISK_FILTERS,
    body: SAMPLE_DATASET,
    returns: "RiskItem[]",
  },
  {
    id: "vacancies",
    method: "GET",
    path: "/api/vacancies",
    title: "Cold Vacancies",
    desc: "Vacant rooms with their 7-day resale yield at the 1.3× short-term premium.",
    query: [],
    body: null,
    returns: "VacantItem[]",
  },
  {
    id: "actions",
    method: "GET",
    path: "/api/actions",
    title: "Recovery Actions",
    desc: "The top 3 ranked revenue-recovery plays — re-engagement, resale, broker — each with a PHP recovery estimate and target rooms.",
    query: [],
    body: null,
    returns: "ActionItem[]",
  },
];

type McpArg = {
  name: string;
  type: "text" | "number" | "select" | "json";
  options?: string[];
  placeholder?: string;
  default?: string;
  optional?: boolean;
  note: string;
};

type McpTool = {
  name: string;
  desc: string;
  args: McpArg[];
};

const MCP_TOOLS: McpTool[] = [
  {
    name: "analyse_dataset",
    desc: "Run the full engine. Omit dataset for demo data, or paste a Dataset to score your own.",
    args: [
      {
        name: "dataset",
        type: "json",
        optional: true,
        note: "Optional Dataset JSON. Leave blank for the bundled demo.",
      },
    ],
  },
  {
    name: "get_risk_items",
    desc: "Risk-scored agreements over the demo dataset, with optional filters.",
    args: [
      {
        name: "band",
        type: "select",
        options: ["", "Critical", "High", "Medium", "Low"],
        optional: true,
        note: "Risk band filter.",
      },
      {
        name: "client",
        type: "text",
        placeholder: "Eastbridge",
        optional: true,
        note: "clientId or company name.",
      },
      {
        name: "limit",
        type: "number",
        placeholder: "5",
        optional: true,
        note: "Row cap.",
      },
    ],
  },
  {
    name: "get_recovery_actions",
    desc: "The top 3 ranked recovery actions with PHP estimates.",
    args: [],
  },
  {
    name: "build_email_draft",
    desc: "Generate a re-engagement email draft for a risk item.",
    args: [
      {
        name: "id",
        type: "text",
        default: "RM-007",
        note: "occId, roomId, or clientId.",
      },
    ],
  },
  {
    name: "build_resale_listing",
    desc: "Generate a marketplace resale listing for a vacant room.",
    args: [
      {
        name: "roomId",
        type: "text",
        default: "RM-004",
        note: "A vacant roomId.",
      },
    ],
  },
];

/* --- tiny JSON syntax highlighter ----------------------------------- */
function highlightJson(json: string): string {
  const esc = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "tok-num";
      if (/^"/.test(match)) cls = /:$/.test(match) ? "tok-key" : "tok-str";
      else if (/true|false/.test(match)) cls = "tok-bool";
      else if (/null/.test(match)) cls = "tok-null";
      return `<span class="${cls}">${match}</span>`;
    },
  );
}

const display = "[font-family:var(--font-fraunces)]";
const mono = "[font-family:var(--font-ibm-plex-mono)]";

function methodTone(method: "GET" | "POST") {
  return method === "GET"
    ? {
        chip: "bg-positive-subtle text-positive ring-positive/25",
        btn: "bg-positive text-white hover:bg-positive/90 shadow-positive/20",
        dot: "bg-positive",
      }
    : {
        chip: "bg-warning-subtle text-warning ring-warning/25",
        btn: "bg-warning text-white hover:bg-warning/90 shadow-warning/20",
        dot: "bg-warning",
      };
}

/* --- response readout ----------------------------------------------- */
type Result = {
  status: number;
  ms: number;
  text: string;
  ok: boolean;
} | null;

function ResponseReadout({
  loading,
  result,
  error,
}: {
  loading: boolean;
  result: Result;
  error: string | null;
}) {
  if (!loading && !result && !error) {
    return (
      <div className="flex h-full min-h-[8rem] items-center justify-center rounded-lg border border-dashed border-line px-4 py-6 text-center">
        <span className={`${mono} text-[11px] tracking-wide text-ink-tertiary`}>
          awaiting request …
        </span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-canvas">
      {/* viewfinder corner brackets */}
      <span className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 border-l border-t border-ink-tertiary/30" />
      <span className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 border-r border-t border-ink-tertiary/30" />
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b border-l border-ink-tertiary/30" />
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b border-r border-ink-tertiary/30" />

      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
        {loading ? (
          <span className={`${mono} text-[11px] text-ink-tertiary`}>
            <span className="mr-2 inline-block h-2 w-2 animate-ping rounded-full bg-informative align-middle" />
            running…
          </span>
        ) : error ? (
          <span className={`${mono} text-[11px] text-danger`}>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-danger align-middle" />
            network error
          </span>
        ) : result ? (
          <>
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                result.ok ? "bg-positive" : "bg-danger"
              }`}
            />
            <span
              className={`${mono} text-[11px] font-medium ${
                result.ok ? "text-positive" : "text-danger"
              }`}
            >
              {result.status} {result.ok ? "OK" : "ERR"}
            </span>
            <span className={`${mono} ml-auto text-[11px] text-ink-tertiary`}>
              {result.ms} ms · {new Blob([result.text]).size} B
            </span>
          </>
        ) : null}
      </div>

      <pre
        className={`${mono} max-h-[26rem] overflow-auto px-4 py-3 text-[12px] leading-relaxed`}
      >
        {error ? (
          <span className="text-danger">{error}</span>
        ) : result ? (
          <code
            dangerouslySetInnerHTML={{ __html: highlightJson(result.text) }}
          />
        ) : (
          <span className="text-ink-tertiary">…</span>
        )}
      </pre>
    </div>
  );
}

/* --- copy button ---------------------------------------------------- */
function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
      className={`${mono} shrink-0 rounded-md border border-line px-2 py-1 text-[10px] uppercase tracking-widest text-ink-tertiary transition hover:border-line-strong hover:text-ink`}
    >
      {done ? "copied" : "copy"}
    </button>
  );
}

/* --- REST try panel ------------------------------------------------- */
function TryPanel({ ep, base }: { ep: Endpoint; base: string }) {
  const [q, setQ] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState(ep.body ?? "");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    for (const p of ep.query) {
      const v = q[p.name];
      if (v) params.set(p.name, v);
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [q, ep.query]);

  const fullPath = `${ep.path}${queryString}`;
  const origin = base || (typeof window !== "undefined" ? window.location.origin : "");

  const curl = useMemo(() => {
    const u = `${origin}${fullPath}`;
    if (ep.method === "GET") return `curl ${u}`;
    return `curl -X POST ${u} \\\n  -H 'content-type: application/json' \\\n  -d '<dataset json>'`;
  }, [origin, fullPath, ep.method]);

  async function run() {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const init: RequestInit = { method: ep.method };
      if (ep.method === "POST") {
        init.headers = { "content-type": "application/json" };
        init.body = bodyText;
      }
      const res = await fetch(`${base}${fullPath}`, init);
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* leave raw */
      }
      setResult({
        status: res.status,
        ms: Math.round(performance.now() - t0),
        text: pretty,
        ok: res.ok,
      });
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const tone = methodTone(ep.method);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        {/* request line */}
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2">
          <span
            className={`${mono} rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${tone.chip}`}
          >
            {ep.method}
          </span>
          <span className={`${mono} truncate text-[12px] text-ink-secondary`}>
            {fullPath}
          </span>
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className={`${mono} ml-auto shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider shadow-md transition disabled:opacity-50 ${tone.btn}`}
          >
            {loading ? "···" : "Run ▸"}
          </button>
        </div>

        {/* query params */}
        {ep.query.length > 0 && (
          <div className="grid gap-2.5 sm:grid-cols-3">
            {ep.query.map((p) => (
              <label key={p.name} className="flex flex-col gap-1">
                <span
                  className={`${mono} text-[10px] uppercase tracking-widest text-ink-tertiary`}
                >
                  {p.name}
                </span>
                {p.type === "select" ? (
                  <select
                    value={q[p.name] ?? ""}
                    onChange={(e) =>
                      setQ((s) => ({ ...s, [p.name]: e.target.value }))
                    }
                    className={`${mono} rounded-md border border-line bg-surface px-2 py-1.5 text-[12px] text-ink outline-none focus:border-pumpkin/50`}
                  >
                    {p.options!.map((o) => (
                      <option key={o} value={o}>
                        {o === "" ? "— any —" : o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={p.type}
                    value={q[p.name] ?? ""}
                    placeholder={p.placeholder}
                    onChange={(e) =>
                      setQ((s) => ({ ...s, [p.name]: e.target.value }))
                    }
                    className={`${mono} rounded-md border border-line bg-surface px-2 py-1.5 text-[12px] text-ink placeholder:text-ink-tertiary outline-none focus:border-pumpkin/50`}
                  />
                )}
              </label>
            ))}
          </div>
        )}

        {/* body editor */}
        {ep.method === "POST" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span
                className={`${mono} text-[10px] uppercase tracking-widest text-ink-tertiary`}
              >
                request body · Dataset
              </span>
              <button
                type="button"
                onClick={() => setBodyText(ep.body ?? "")}
                className={`${mono} text-[10px] uppercase tracking-widest text-ink-tertiary transition hover:text-warning`}
              >
                ↺ reset sample
              </button>
            </div>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              spellCheck={false}
              rows={10}
              className={`${mono} resize-y rounded-lg border border-line bg-canvas px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-secondary outline-none focus:border-pumpkin/50`}
            />
          </div>
        )}

        {/* curl */}
        <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
          <span className={`${mono} truncate text-[11px] text-ink-tertiary`}>
            {curl.split("\n")[0]}
            {ep.method === "POST" ? " …" : ""}
          </span>
          <span className="ml-auto" />
          <Copy text={curl} />
        </div>
      </div>

      <ResponseReadout loading={loading} result={result} error={error} />
    </div>
  );
}

/* --- MCP runner ----------------------------------------------------- */
function McpRunner({ base }: { base: string }) {
  const [toolName, setToolName] = useState(MCP_TOOLS[0].name);
  const tool = MCP_TOOLS.find((t) => t.name === toolName)!;
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setArg(name: string, v: string) {
    setArgs((s) => ({ ...s, [name]: v }));
  }

  function buildArguments(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const a of tool.args) {
      const raw = args[`${tool.name}.${a.name}`] ?? a.default ?? "";
      if (!raw) continue;
      if (a.type === "number") out[a.name] = Number(raw);
      else if (a.type === "json") {
        try {
          out[a.name] = JSON.parse(raw);
        } catch {
          throw new Error(`Argument "${a.name}" is not valid JSON`);
        }
      } else out[a.name] = raw;
    }
    return out;
  }

  async function run() {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: tool.name, arguments: buildArguments() },
      };
      const res = await fetch(`${base}/api/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      // streamable HTTP returns SSE — pull the data line
      const line = raw
        .split("\n")
        .find((l) => l.startsWith("data: "));
      const envelope = line ? JSON.parse(line.slice(6)) : JSON.parse(raw);
      const inner = envelope?.result?.content?.[0]?.text ?? JSON.stringify(envelope, null, 2);
      const isErr = Boolean(envelope?.result?.isError || envelope?.error);
      let pretty = inner;
      try {
        pretty = JSON.stringify(JSON.parse(inner), null, 2);
      } catch {
        /* keep text (e.g. error strings) */
      }
      setResult({
        status: res.status,
        ms: Math.round(performance.now() - t0),
        text: pretty,
        ok: res.ok && !isErr,
      });
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2">
          <span
            className={`${mono} rounded bg-pumpkin-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-pumpkin ring-1 ring-pumpkin/25`}
          >
            tool
          </span>
          <select
            value={toolName}
            onChange={(e) => {
              setToolName(e.target.value);
              setResult(null);
              setError(null);
            }}
            className={`${mono} min-w-0 flex-1 truncate rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-pumpkin/50`}
          >
            {MCP_TOOLS.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className={`${mono} ml-auto shrink-0 rounded-md bg-pumpkin px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white shadow-md shadow-pumpkin/20 transition hover:bg-pumpkin-hover disabled:opacity-50`}
          >
            {loading ? "···" : "Call ▸"}
          </button>
        </div>

        <p className="text-[13px] leading-relaxed text-ink-secondary">{tool.desc}</p>

        {tool.args.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {tool.args.map((a) => (
              <label key={a.name} className="flex flex-col gap-1">
                <span
                  className={`${mono} flex items-center gap-2 text-[10px] uppercase tracking-widest text-ink-tertiary`}
                >
                  {a.name}
                  {a.optional && (
                    <span className="rounded bg-canvas px-1 text-[9px] normal-case tracking-normal text-ink-tertiary">
                      optional
                    </span>
                  )}
                </span>
                {a.type === "select" ? (
                  <select
                    value={args[`${tool.name}.${a.name}`] ?? ""}
                    onChange={(e) => setArg(`${tool.name}.${a.name}`, e.target.value)}
                    className={`${mono} rounded-md border border-line bg-surface px-2 py-1.5 text-[12px] text-ink outline-none focus:border-pumpkin/50`}
                  >
                    {a.options!.map((o) => (
                      <option key={o} value={o}>
                        {o === "" ? "— any —" : o}
                      </option>
                    ))}
                  </select>
                ) : a.type === "json" ? (
                  <textarea
                    value={args[`${tool.name}.${a.name}`] ?? ""}
                    onChange={(e) => setArg(`${tool.name}.${a.name}`, e.target.value)}
                    placeholder="{ }  — leave blank for demo data"
                    spellCheck={false}
                    rows={6}
                    className={`${mono} resize-y rounded-lg border border-line bg-canvas px-3 py-2 text-[11.5px] leading-relaxed text-ink-secondary placeholder:text-ink-tertiary outline-none focus:border-pumpkin/50`}
                  />
                ) : (
                  <input
                    type={a.type}
                    defaultValue={a.default}
                    placeholder={a.placeholder}
                    onChange={(e) => setArg(`${tool.name}.${a.name}`, e.target.value)}
                    className={`${mono} rounded-md border border-line bg-surface px-2 py-1.5 text-[12px] text-ink placeholder:text-ink-tertiary outline-none focus:border-pumpkin/50`}
                  />
                )}
                <span className="text-[11px] text-ink-tertiary">{a.note}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className={`${mono} text-[11px] text-ink-tertiary`}>
            no arguments — just call it
          </p>
        )}
      </div>

      <ResponseReadout loading={loading} result={result} error={error} />
    </div>
  );
}

/* --- section shell -------------------------------------------------- */
function Section({
  id,
  index,
  kicker,
  title,
  children,
}: {
  id: string;
  index: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-12">
      <div className="mb-6 flex items-baseline gap-4">
        <span className={`${mono} text-[11px] tracking-widest text-ink-tertiary`}>
          {index}
        </span>
        <div>
          <div
            className={`${mono} mb-1 text-[10px] uppercase tracking-[0.25em] text-pumpkin`}
          >
            {kicker}
          </div>
          <h2 className={`${display} text-2xl text-ink`}>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

const NAV = [
  { id: "overview", label: "Overview", kind: "ref" as const },
  ...REST.map((e) => ({
    id: e.id,
    label: e.title,
    kind: "rest" as const,
    method: e.method,
  })),
  { id: "mcp", label: "MCP Console", kind: "mcp" as const },
];

export default function ApiDocs() {
  const [base, setBase] = useState("");
  const [origin, setOrigin] = useState("");
  const [active, setActive] = useState("overview");
  const main = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const ids = NAV.map((n) => n.id);
    const obs = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) setActive(en.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen text-ink-secondary">
      {/* injected styles: tokens, grid, motion */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          html { scroll-behavior: smooth; }
          .tok-key  { color:#3062D4; }
          .tok-str  { color:#1D7C4D; }
          .tok-num  { color:#FF7200; }
          .tok-bool { color:#7c3aed; }
          .tok-null { color:#7e8b99; }
          @keyframes dy-rise { from { opacity:0; transform:translateY(10px);} to {opacity:1; transform:none;} }
          .dy-rise { animation: dy-rise .6s cubic-bezier(.2,.7,.2,1) both; }
          @keyframes dy-blink { 0%,49%{opacity:1;} 50%,100%{opacity:0;} }
          .dy-cursor { animation: dy-blink 1.1s steps(1) infinite; }
        `,
        }}
      />

      {/* atmosphere */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundColor: "#f9fafb",
          backgroundImage:
            "radial-gradient(60rem 40rem at 12% -8%, rgba(255,114,0,0.07), transparent 60%), radial-gradient(50rem 40rem at 100% 0%, rgba(48,98,212,0.06), transparent 55%), linear-gradient(rgba(39,46,53,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(39,46,53,0.035) 1px, transparent 1px)",
          backgroundSize: "auto, auto, 44px 44px, 44px 44px",
        }}
      />

      <div className="mx-auto flex max-w-7xl gap-10 px-5 sm:px-8">
        {/* sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto py-8 lg:flex">
          <Link href="/" className="group flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-pumpkin-subtle text-lg ring-1 ring-pumpkin/30">
              🪑
            </span>
            <span>
              <span className={`${display} block text-[15px] leading-none text-ink`}>
                DeskYield
              </span>
              <span className={`${mono} block text-[10px] uppercase tracking-[0.2em] text-ink-tertiary`}>
                API · v1
              </span>
            </span>
          </Link>

          <nav className="flex flex-col gap-0.5">
            {NAV.map((n) => {
              const isActive = active === n.id;
              return (
                <a
                  key={n.id}
                  href={`#${n.id}`}
                  className={`${mono} flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition ${
                    isActive
                      ? "bg-pumpkin-subtle text-pumpkin"
                      : "text-ink-tertiary hover:text-ink-secondary"
                  }`}
                >
                  {"method" in n ? (
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        n.method === "GET" ? "bg-positive" : "bg-warning"
                      }`}
                    />
                  ) : (
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        n.kind === "mcp" ? "bg-informative" : "bg-ink-tertiary"
                      }`}
                    />
                  )}
                  <span className="truncate">{n.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-line pt-4">
            <div className={`${mono} mb-1 text-[10px] uppercase tracking-widest text-ink-tertiary`}>
              base url
            </div>
            <input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder={origin || "same origin"}
              className={`${mono} w-full rounded-md border border-line bg-surface px-2 py-1.5 text-[11px] text-ink placeholder:text-ink-tertiary outline-none focus:border-pumpkin/50`}
            />
            <p className="mt-1.5 text-[10px] leading-snug text-ink-tertiary">
              Blank = this origin. Requests fire live from your browser.
            </p>
          </div>
        </aside>

        {/* main */}
        <div ref={main} className="min-w-0 flex-1 py-12">
          {/* hero */}
          <header className="dy-rise mb-4">
            <div className={`${mono} mb-4 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em]`}>
              <span className="rounded-full bg-pumpkin-subtle px-2.5 py-1 text-pumpkin ring-1 ring-pumpkin/20">
                REST + MCP
              </span>
              <span className="rounded-full bg-canvas px-2.5 py-1 text-ink-tertiary ring-1 ring-line">
                CORS · open
              </span>
              <span className="rounded-full bg-canvas px-2.5 py-1 text-ink-tertiary ring-1 ring-line">
                no auth
              </span>
            </div>
            <h1 className={`${display} text-[2.7rem] leading-[1.05] text-ink sm:text-6xl`}>
              The Empty Desk API
              <span className="dy-cursor ml-1 text-pumpkin">_</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-secondary">
              One deterministic engine, two surfaces. Score reserved seats at risk
              of going unused in the next 7 days, surface ranked recovery actions
              with PHP estimates, and draft the outreach — over plain REST or as an
              MCP server any agent can call. Every panel below runs against the live
              endpoint.
            </p>
          </header>

          <div className="flex flex-col gap-2">
            {/* overview */}
            <section id="overview" className="scroll-mt-24 pt-10">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Base", origin || "—", "All paths are relative to this."],
                  ["Auth", "none", "Public demo. Do not send secrets."],
                  [
                    "Datasets",
                    "GET = demo · POST = yours",
                    "GET runs bundled data; POST scores a Dataset you send.",
                  ],
                  [
                    "Errors",
                    "400 + details[]",
                    "Bad dataset returns a list of validation issues.",
                  ],
                ].map(([k, v, note]) => (
                  <div
                    key={k}
                    className="rounded-xl border border-line bg-surface p-4"
                  >
                    <div className={`${mono} text-[10px] uppercase tracking-widest text-ink-tertiary`}>
                      {k}
                    </div>
                    <div className={`${mono} mt-1 text-[13px] text-ink`}>{v}</div>
                    <div className="mt-1 text-[12px] leading-snug text-ink-tertiary">
                      {note}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* REST endpoints */}
            {REST.map((ep, i) => (
              <Section
                key={ep.id}
                id={ep.id}
                index={String(i + 1).padStart(2, "0")}
                kicker={`${ep.method} · ${ep.path}`}
                title={ep.title}
              >
                <p className="mb-2 max-w-2xl text-[14px] leading-relaxed text-ink-secondary">
                  {ep.desc}
                </p>
                <p className={`${mono} mb-5 text-[11px] text-ink-tertiary`}>
                  → returns&nbsp;
                  <span className="text-ink-secondary">{ep.returns}</span>
                </p>
                <TryPanel ep={ep} base={base} />
              </Section>
            ))}

            {/* MCP */}
            <Section
              id="mcp"
              index={String(REST.length + 1).padStart(2, "0")}
              kicker="streamable-http · /api/mcp"
              title="MCP Console"
            >
              <p className="mb-2 max-w-2xl text-[14px] leading-relaxed text-ink-secondary">
                The same engine as a Model Context Protocol server over streamable
                HTTP — stateless, no Redis. Add{" "}
                <span className={`${mono} text-ink`}>
                  {(origin || "<origin>") + "/api/mcp"}
                </span>{" "}
                as a remote MCP server in any client, or call a tool below. Responses
                arrive as SSE; the console unwraps the tool result for you.
              </p>
              <p className={`${mono} mb-5 text-[11px] text-ink-tertiary`}>
                → JSON-RPC&nbsp;
                <span className="text-ink-secondary">tools/call</span>
              </p>
              <McpRunner base={base} />
            </Section>
          </div>

          <footer className="mt-16 border-t border-line pt-6">
            <p className={`${mono} text-[11px] text-ink-tertiary`}>
              DeskYield · deterministic multi-signal model — Days to Expiry 40% ·
              Seat Gap 30% · Lease Term 20% · Account Status 10%.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
