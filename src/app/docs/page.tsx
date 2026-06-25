"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ *
 * DeskYield API — Reference & Live Console
 * A drafting-console aesthetic: editorial serif over technical mono,
 * blueprint grid, instrument-panel readouts. Every "Run" fires against
 * the live endpoints on this same origin.
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
  {
    id: "actions-execute",
    method: "POST",
    path: "/api/actions/execute",
    title: "Execute an Action (simulated)",
    desc: "Fire a recovery play. Returns realistic per-target results — sent / listed / dispatched — tagged simulated:true. No real emails or webhooks are sent, so it is safe to run live.",
    query: [
      {
        name: "key",
        type: "select",
        options: ["reengagement", "resale", "broker"],
        note: "Which play to run.",
      },
    ],
    body: null,
    returns: "ExecutionResult { summary, count, results[], simulated }",
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
        chip: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
        btn: "bg-emerald-400 text-emerald-950 hover:bg-emerald-300 shadow-emerald-400/20",
        dot: "bg-emerald-400",
      }
    : {
        chip: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
        btn: "bg-amber-300 text-amber-950 hover:bg-amber-200 shadow-amber-300/20",
        dot: "bg-amber-300",
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
      <div className="flex h-full min-h-[8rem] items-center justify-center rounded-lg border border-dashed border-white/10 px-4 py-6 text-center">
        <span className={`${mono} text-[11px] tracking-wide text-slate-600`}>
          awaiting request …
        </span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-slate-950/80">
      {/* viewfinder corner brackets */}
      <span className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 border-l border-t border-white/20" />
      <span className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 border-r border-t border-white/20" />
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b border-l border-white/20" />
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b border-r border-white/20" />

      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        {loading ? (
          <span className={`${mono} text-[11px] text-slate-400`}>
            <span className="mr-2 inline-block h-2 w-2 animate-ping rounded-full bg-sky-400 align-middle" />
            running…
          </span>
        ) : error ? (
          <span className={`${mono} text-[11px] text-rose-300`}>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-400 align-middle" />
            network error
          </span>
        ) : result ? (
          <>
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                result.ok ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <span
              className={`${mono} text-[11px] font-medium ${
                result.ok ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {result.status} {result.ok ? "OK" : "ERR"}
            </span>
            <span className={`${mono} ml-auto text-[11px] text-slate-500`}>
              {result.ms} ms · {new Blob([result.text]).size} B
            </span>
          </>
        ) : null}
      </div>

      <pre
        className={`${mono} max-h-[26rem] overflow-auto px-4 py-3 text-[12px] leading-relaxed`}
      >
        {error ? (
          <span className="text-rose-300">{error}</span>
        ) : result ? (
          <code
            dangerouslySetInnerHTML={{ __html: highlightJson(result.text) }}
          />
        ) : (
          <span className="text-slate-600">…</span>
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
      className={`${mono} shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-400 transition hover:border-white/25 hover:text-slate-200`}
    >
      {done ? "copied" : "copy"}
    </button>
  );
}

/* --- REST try panel ------------------------------------------------- */
function TryPanel({ ep, base, origin: parentOrigin }: { ep: Endpoint; base: string; origin: string }) {
  const [q, setQ] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of ep.query) {
      // Pre-select the first concrete option so a required select isn't empty.
      if (p.type === "select" && p.options && p.options[0] !== "") {
        init[p.name] = p.options[0];
      }
    }
    return init;
  });
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
  const origin = base || parentOrigin;

  const curl = useMemo(() => {
    const u = `${origin}${fullPath}`;
    if (ep.method === "GET") return `curl ${u}`;
    if (ep.body === null) return `curl -X POST ${u}`;
    return `curl -X POST ${u} \\\n  -H 'content-type: application/json' \\\n  -d '<dataset json>'`;
  }, [origin, fullPath, ep.method, ep.body]);

  async function run() {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const init: RequestInit = { method: ep.method };
      if (ep.method === "POST") {
        init.headers = { "content-type": "application/json" };
        if (ep.body !== null) init.body = bodyText;
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
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
          <span
            className={`${mono} rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${tone.chip}`}
          >
            {ep.method}
          </span>
          <span className={`${mono} truncate text-[12px] text-slate-300`}>
            {fullPath}
          </span>
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className={`${mono} ml-auto shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider shadow-lg transition disabled:opacity-50 ${tone.btn}`}
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
                  className={`${mono} text-[10px] uppercase tracking-widest text-slate-500`}
                >
                  {p.name}
                </span>
                {p.type === "select" ? (
                  <select
                    value={q[p.name] ?? ""}
                    onChange={(e) =>
                      setQ((s) => ({ ...s, [p.name]: e.target.value }))
                    }
                    className={`${mono} rounded-md border border-white/10 bg-slate-900/60 px-2 py-1.5 text-[12px] text-slate-200 outline-none focus:border-emerald-400/40`}
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
                    className={`${mono} rounded-md border border-white/10 bg-slate-900/60 px-2 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-400/40`}
                  />
                )}
              </label>
            ))}
          </div>
        )}

        {/* body editor */}
        {ep.method === "POST" && ep.body !== null && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span
                className={`${mono} text-[10px] uppercase tracking-widest text-slate-500`}
              >
                request body · Dataset
              </span>
              <button
                type="button"
                onClick={() => setBodyText(ep.body ?? "")}
                className={`${mono} text-[10px] uppercase tracking-widest text-slate-500 transition hover:text-amber-300`}
              >
                ↺ reset sample
              </button>
            </div>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              spellCheck={false}
              rows={10}
              className={`${mono} resize-y rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 text-[11.5px] leading-relaxed text-slate-300 outline-none focus:border-amber-300/40`}
            />
          </div>
        )}

        {/* curl */}
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
          <span className={`${mono} truncate text-[11px] text-slate-500`}>
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
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
          <span
            className={`${mono} rounded bg-indigo-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-400/25`}
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
            className={`${mono} min-w-0 flex-1 truncate rounded-md border border-white/10 bg-slate-900/60 px-2 py-1 text-[12px] text-slate-200 outline-none focus:border-indigo-400/40`}
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
            className={`${mono} ml-auto shrink-0 rounded-md bg-indigo-400 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-950 shadow-lg shadow-indigo-400/20 transition hover:bg-indigo-300 disabled:opacity-50`}
          >
            {loading ? "···" : "Call ▸"}
          </button>
        </div>

        <p className="text-[13px] leading-relaxed text-slate-400">{tool.desc}</p>

        {tool.args.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {tool.args.map((a) => (
              <label key={a.name} className="flex flex-col gap-1">
                <span
                  className={`${mono} flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500`}
                >
                  {a.name}
                  {a.optional && (
                    <span className="rounded bg-white/5 px-1 text-[9px] normal-case tracking-normal text-slate-500">
                      optional
                    </span>
                  )}
                </span>
                {a.type === "select" ? (
                  <select
                    value={args[`${tool.name}.${a.name}`] ?? ""}
                    onChange={(e) => setArg(`${tool.name}.${a.name}`, e.target.value)}
                    className={`${mono} rounded-md border border-white/10 bg-slate-900/60 px-2 py-1.5 text-[12px] text-slate-200 outline-none focus:border-indigo-400/40`}
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
                    className={`${mono} resize-y rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-[11.5px] leading-relaxed text-slate-300 placeholder:text-slate-600 outline-none focus:border-indigo-400/40`}
                  />
                ) : (
                  <input
                    type={a.type}
                    defaultValue={a.default}
                    placeholder={a.placeholder}
                    onChange={(e) => setArg(`${tool.name}.${a.name}`, e.target.value)}
                    className={`${mono} rounded-md border border-white/10 bg-slate-900/60 px-2 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-400/40`}
                  />
                )}
                <span className="text-[11px] text-slate-600">{a.note}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className={`${mono} text-[11px] text-slate-600`}>
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
    <section id={id} className="scroll-mt-24 border-t border-white/[0.07] pt-12">
      <div className="mb-6 flex items-baseline gap-4">
        <span className={`${mono} text-[11px] tracking-widest text-slate-600`}>
          {index}
        </span>
        <div>
          <div
            className={`${mono} mb-1 text-[10px] uppercase tracking-[0.25em] text-emerald-400/70`}
          >
            {kicker}
          </div>
          <h2 className={`${display} text-2xl text-slate-100`}>{title}</h2>
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
  { id: "chat", label: "Chat Agent", kind: "chat" as const },
  { id: "widget", label: "Widget Embed", kind: "widget" as const },
  { id: "mcp", label: "MCP Console", kind: "mcp" as const },
];

/* --- Widget embed guide -------------------------------------------- */
function WidgetCode({ children }: { children: string }) {
  return (
    <pre
      className={`${mono} overflow-x-auto rounded-lg border border-white/10 bg-slate-950/70 p-3.5 text-[11.5px] leading-relaxed text-slate-300`}
    >
      {children}
    </pre>
  );
}

function WidgetPanel({
  tag,
  title,
  children,
}: {
  tag: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`${mono} rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300`}>
          {tag}
        </span>
        <h3 className="text-[13px] font-semibold text-slate-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function WidgetEmbed({ origin }: { origin: string }) {
  const host = origin || "<origin>";
  const [live, setLive] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/widget-token");
        const data = (await res.json()) as {
          enabled?: boolean;
          origin?: string;
          token?: string;
        };
        if (cancelled || !data.enabled || !data.token || !data.origin) return;
        setLive(true);
        const s = document.createElement("script");
        s.async = true;
        s.src = `${data.origin}/deskyield-chat.js`;
        s.onload = () => {
          const w = window as unknown as {
            DeskYieldChat?: { mount: (o: Record<string, string>) => void };
          };
          w.DeskYieldChat?.mount({
            host: data.origin!,
            token: data.token!,
            title: "DeskYield",
            subtitle: "Empty-desk revenue analyst",
          });
        };
        document.body.appendChild(s);
      } catch {
        /* demo not configured — guide stays static */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* live status */}
      {live ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-[13px] text-slate-300">
          <span className="mr-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live
          </span>
          The widget is live on this page — click the launcher (bottom-right).
          Ask which seats are at risk this week, or to draft a re-engagement email.
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-[13px] text-slate-300">
          Live demo off. Set{" "}
          <code className={`${mono} text-slate-200`}>DESKYIELD_DEMO_API_KEY</code>{" "}
          (see Service setup below) to mount it here.
        </div>
      )}

      {/* embed — integrating apps */}
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold text-slate-100">
            Embed the widget
          </h3>
          <span className={`${mono} rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30`}>
            integrating apps
          </span>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
          Hand the app an API key (<code className={`${mono} text-slate-300`}>dsky_…</code>)
          you issued, plus these two steps. No env vars, no OpenAI key on their side.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <WidgetPanel tag="1 · backend" title="Get a visitor token">
            <p className="mb-3 text-[12px] text-slate-500">
              Call once per session with the API key. Pass the returned token to
              the frontend.
            </p>
            <WidgetCode>{`const res = await fetch("${host}/api/chat/token", {
  method: "POST",
  headers: { authorization: "Bearer dsky_…" },
});
const { token } = await res.json();
// token -> "dyv.…"`}</WidgetCode>
          </WidgetPanel>
          <WidgetPanel tag="2 · frontend" title="Mount the widget">
            <p className="mb-3 text-[12px] text-slate-500">
              Load the script and mount with the token from step 1.
            </p>
            <WidgetCode>{`<script src="${host}/deskyield-chat.js"></script>
<script>
  DeskYieldChat.mount({
    host: "${host}",
    token,            // the dyv.… from step 1
  });
</script>`}</WidgetCode>
          </WidgetPanel>
        </div>
        <p className="mt-3 text-[12px] text-slate-500">
          A launcher button and chat panel appear, style-isolated via Shadow DOM.
          Optional mount options:{" "}
          <code className={`${mono} text-slate-400`}>title</code>,{" "}
          <code className={`${mono} text-slate-400`}>subtitle</code>.
        </p>
      </div>

      {/* service setup — operator */}
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold text-slate-100">
            Service setup
          </h3>
          <span className={`${mono} rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30`}>
            operator
          </span>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
          Done on <strong>your</strong> deployment. Integrating apps never see
          these.
        </p>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[12px] text-slate-500">
              Generate a token secret and an initial API key:
            </p>
            <WidgetCode>{`openssl rand -hex 32                      # -> DESKYIELD_TOKEN_SECRET
node scripts/issue-key.mjs ${host}   # -> prints key + DESKYIELD_API_KEYS line`}</WidgetCode>
          </div>
          <div>
            <p className="mb-2 text-[12px] text-slate-500">
              Add to <code className={`${mono} text-slate-300`}>.env.local</code>{" "}
              (dev) or your host&apos;s env store:
            </p>
            <WidgetCode>{`OPENAI_API_KEY=sk-…
DESKYIELD_TOKEN_SECRET=<from openssl, set once>
DESKYIELD_API_KEYS=[{"id":"<id>","hash":"<hash>","origins":["${host}"]}]
DESKYIELD_DEMO_API_KEY=dsky_…   # optional: enables the live demo above`}</WidgetCode>
          </div>
          <div>
            <p className="mb-2 text-[12px] text-slate-500">
              Issue a key for a new app — bound to <strong>their</strong> origin;
              visitor tokens from anywhere else are rejected:
            </p>
            <WidgetCode>{`node scripts/issue-key.mjs https://their-app.com
# -> dsky_… (hand THIS to the integrating app, with the embed snippet)
# -> DESKYIELD_API_KEYS record (add it to YOUR env)`}</WidgetCode>
          </div>
        </div>
      </div>

      {/* reference */}
      <div>
        <h3 className="mb-3 text-[15px] font-semibold text-slate-100">Reference</h3>
        <div className="overflow-x-auto rounded-lg border border-white/[0.07]">
          <table className="w-full text-left text-[12px]">
            <thead className={`${mono} bg-white/[0.03] text-slate-500`}>
              <tr>
                <th className="px-4 py-2 font-medium">Endpoint</th>
                <th className="px-4 py-2 font-medium">Credential</th>
                <th className="px-4 py-2 font-medium">Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-slate-300">
              <tr>
                <td className={`${mono} px-4 py-2 text-slate-200`}>POST /api/chat/token</td>
                <td className={`${mono} px-4 py-2 text-indigo-300`}>dsky_…</td>
                <td className="px-4 py-2">Mint a visitor token</td>
              </tr>
              <tr>
                <td className={`${mono} px-4 py-2 text-slate-200`}>POST /api/chat</td>
                <td className={`${mono} px-4 py-2 text-emerald-300`}>dyv.…</td>
                <td className="px-4 py-2">Stream a chat turn (SSE)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-1.5 text-[12px] text-slate-500">
          <li>• Tokens are origin-bound and expire (default 1h); mint a fresh one when needed.</li>
          <li>• Visitor tokens can&apos;t mint tokens — only API keys can.</li>
          <li>• The agent is read-only: it queries the engine and drafts artifacts, never sends.</li>
        </ul>
      </div>
    </div>
  );
}

export default function ApiDocs() {
  const [base, setBase] = useState("");
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [active, setActive] = useState("overview");
  const main = useRef<HTMLDivElement>(null);

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
    <div className="relative min-h-screen text-slate-300">
      {/* injected styles: tokens, grid, motion */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          html { scroll-behavior: smooth; }
          .tok-key  { color:#7dd3fc; }
          .tok-str  { color:#6ee7b7; }
          .tok-num  { color:#fcd34d; }
          .tok-bool { color:#c4b5fd; }
          .tok-null { color:#64748b; }
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
          backgroundColor: "#020617",
          backgroundImage:
            "radial-gradient(60rem 40rem at 12% -8%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(50rem 40rem at 100% 0%, rgba(99,102,241,0.08), transparent 55%), linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "auto, auto, 44px 44px, 44px 44px",
        }}
      />

      <div className="mx-auto flex max-w-7xl gap-10 px-5 sm:px-8">
        {/* sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto py-8 lg:flex">
          <Link href="/" className="group flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-lg ring-1 ring-emerald-500/30">
              🪑
            </span>
            <span>
              <span className={`${display} block text-[15px] leading-none text-slate-100`}>
                DeskYield
              </span>
              <span className={`${mono} block text-[10px] uppercase tracking-[0.2em] text-slate-500`}>
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
                      ? "bg-white/[0.06] text-slate-100"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {"method" in n ? (
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        n.method === "GET" ? "bg-emerald-400" : "bg-amber-300"
                      }`}
                    />
                  ) : (
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        n.kind === "mcp"
                          ? "bg-indigo-400"
                          : n.kind === "chat"
                            ? "bg-sky-400"
                            : n.kind === "widget"
                              ? "bg-emerald-400"
                              : "bg-slate-600"
                      }`}
                    />
                  )}
                  <span className="truncate">{n.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/[0.07] pt-4">
            <div className={`${mono} mb-1 text-[10px] uppercase tracking-widest text-slate-600`}>
              base url
            </div>
            <input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder={origin || "same origin"}
              className={`${mono} w-full rounded-md border border-white/10 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-300 placeholder:text-slate-600 outline-none focus:border-emerald-400/40`}
            />
            <p className="mt-1.5 text-[10px] leading-snug text-slate-600">
              Blank = this origin. Requests fire live from your browser.
            </p>
          </div>
        </aside>

        {/* main */}
        <div ref={main} className="min-w-0 flex-1 py-12">
          {/* hero */}
          <header className="dy-rise mb-4">
            <div className={`${mono} mb-4 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em]`}>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-300 ring-1 ring-emerald-400/20">
                REST + MCP
              </span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-400 ring-1 ring-white/10">
                CORS · open
              </span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-400 ring-1 ring-white/10">
                no auth
              </span>
            </div>
            <h1 className={`${display} text-[2.7rem] leading-[1.05] text-slate-50 sm:text-6xl`}>
              The Empty Desk API
              <span className="dy-cursor ml-1 text-emerald-400">_</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400">
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
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                  >
                    <div className={`${mono} text-[10px] uppercase tracking-widest text-slate-500`}>
                      {k}
                    </div>
                    <div className={`${mono} mt-1 text-[13px] text-slate-200`}>{v}</div>
                    <div className="mt-1 text-[12px] leading-snug text-slate-500">
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
                <p className="mb-2 max-w-2xl text-[14px] leading-relaxed text-slate-400">
                  {ep.desc}
                </p>
                <p className={`${mono} mb-5 text-[11px] text-slate-600`}>
                  → returns&nbsp;
                  <span className="text-slate-400">{ep.returns}</span>
                </p>
                <TryPanel ep={ep} base={base} origin={origin} />
              </Section>
            ))}

            {/* Chat agent */}
            <Section
              id="chat"
              index={String(REST.length + 1).padStart(2, "0")}
              kicker="sse · /api/chat · auth required"
              title="Chat Agent"
            >
              <p className="mb-2 max-w-2xl text-[14px] leading-relaxed text-slate-400">
                A conversational agent that streams answers (SSE) and grounds every
                PHP figure via read-only tool calls over the same engine. Two-token
                auth: an API key (<span className={`${mono} text-slate-300`}>dsky_…</span>)
                for server-to-server, or a short-lived visitor token
                (<span className={`${mono} text-slate-300`}>dyv.…</span>) for browser
                widgets — minted via{" "}
                <span className={`${mono} text-slate-300`}>POST /api/chat/token</span>.
              </p>
              <p className={`${mono} mb-5 text-[11px] text-slate-600`}>
                → event-stream&nbsp;
                <span className="text-slate-400">
                  {`{ type: "delta" | "tool_call" | "tool_result" | "done" | "error" }`}
                </span>
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Auth", "Bearer dsky_… / dyv.…", "API key = server-to-server. Visitor token = browser, origin-checked."],
                  ["Tools", "6 read-only", "get_recovery_actions · get_risk_items · get_vacancies · get_totals · build_email_draft · build_resale_listing"],
                  ["Scope", "read-only", "The model can never send email or publish listings — only draft artifacts."],
                  ["Embed", "#widget", "Drop the chat agent into any app — see Widget Embed below."],
                ].map(([k, v, note]) => (
                  <div
                    key={k}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                  >
                    <div className={`${mono} text-[10px] uppercase tracking-widest text-slate-500`}>
                      {k}
                    </div>
                    <div className={`${mono} mt-1 text-[13px] text-slate-200`}>{v}</div>
                    <div className="mt-1 text-[12px] leading-snug text-slate-500">{note}</div>
                  </div>
                ))}
              </div>

              <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-slate-400">
                Want it in your own app? The{" "}
                <a href="#widget" className="text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:text-sky-200">
                  Widget Embed
                </a>{" "}
                section below has the live demo and the 2-step embed.
              </p>
            </Section>

            {/* Widget embed */}
            <Section
              id="widget"
              index={String(REST.length + 2).padStart(2, "0")}
              kicker="embed · /deskyield-chat.js"
              title="Widget Embed"
            >
              <p className="mb-6 max-w-2xl text-[14px] leading-relaxed text-slate-400">
                Drop the chat agent into any app. Two roles: <strong>you</strong>{" "}
                (operator) configure the service and issue API keys;{" "}
                <strong>integrating apps</strong> embed the widget with a key you
                give them. The launcher is style-isolated via Shadow DOM.
              </p>
              <WidgetEmbed origin={origin} />
            </Section>

            {/* MCP */}
            <Section
              id="mcp"
              index={String(REST.length + 3).padStart(2, "0")}
              kicker="streamable-http · /api/mcp"
              title="MCP Console"
            >
              <p className="mb-2 max-w-2xl text-[14px] leading-relaxed text-slate-400">
                The same engine as a Model Context Protocol server over streamable
                HTTP — stateless, no Redis. Add{" "}
                <span className={`${mono} text-slate-300`}>
                  {(origin || "<origin>") + "/api/mcp"}
                </span>{" "}
                as a remote MCP server in any client, or call a tool below. Responses
                arrive as SSE; the console unwraps the tool result for you.
              </p>
              <p className={`${mono} mb-5 text-[11px] text-slate-600`}>
                → JSON-RPC&nbsp;
                <span className="text-slate-400">tools/call</span>
              </p>
              <McpRunner base={base} />
            </Section>
          </div>

          <footer className="mt-16 border-t border-white/[0.07] pt-6">
            <p className={`${mono} text-[11px] text-slate-600`}>
              DeskYield · deterministic multi-signal model — Days to Expiry 40% ·
              Seat Gap 30% · Lease Term 20% · Account Status 10%.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
