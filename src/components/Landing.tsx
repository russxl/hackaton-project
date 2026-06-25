"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { php0, php, shortDate } from "@/lib/format";
import type { ActionItem } from "@/lib/types";
import ScrollVideo from "@/components/ScrollVideo";

/* ---------------------------------------------------------------- types */

type EastbridgeRow = {
  roomId: string;
  capacity: number;
  billableSeats: number;
  unusedSeats: number;
  dailyRate: number;
  revenueAtRisk7d: number;
  expirationDate: string;
  accountStatus: string;
  daysToExpiry: number;
  leaseTermMonths: number;
};

export type LandingData = {
  today: string;
  totals: {
    totalRevenueAtRisk7d: number;
    reengagementRecovery: number;
    resaleYield7d: number;
    brokerPipelineValue: number;
    grandTotalRecoverable: number;
  };
  actions: ActionItem[];
  riskCount: number;
  vacantCount: number;
  bandCounts: Record<string, number>;
  eastbridge: EastbridgeRow[];
  topVacancy: {
    roomId: string;
    buildingName: string;
    floor: string;
    capacity: number;
    resaleYield7d: number;
  } | null;
};

/* ---------------------------------------------------------------- hooks */

// Reveal-on-scroll: adds .is-visible to every [data-reveal] when it enters view.
function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// Scroll progress 0..1 + raw scrollY for parallax. rAF-throttled.
function useScroll() {
  const [progress, setProgress] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(h > 0 ? window.scrollY / h : 0);
        setY(window.scrollY);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return { progress, y };
}

// Count up to a target when the element scrolls into view.
function Counter({
  target,
  format = (n: number) => Math.round(n).toLocaleString(),
  className,
  duration = 1500,
}: {
  target: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const run = () => {
      if (done.current) return;
      done.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setVal(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) return run();
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);
  return (
    <span ref={ref} className={className}>
      {format(val)}
    </span>
  );
}

/* ---------------------------------------------------------------- bits */

function DeskGrid() {
  // Decorative desk lattice; a handful "go dark" on a loop = empty desks.
  const cells = Array.from({ length: 120 });
  const blinkers = new Set([7, 18, 26, 41, 53, 64, 72, 88, 95, 103, 111]);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 grid grid-cols-[repeat(12,1fr)] gap-2 p-8 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_78%)]"
    >
      {cells.map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-[3px] bg-pumpkin"
          style={
            blinkers.has(i)
              ? {
                  animation: `deskBlink ${6 + (i % 5)}s ${(i % 7) * 0.4}s infinite`,
                }
              : { opacity: 0.1 }
          }
        />
      ))}
    </div>
  );
}

function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-pumpkin">
      <span className="text-pumpkin/60">{n}</span>
      <span className="h-px w-8 bg-pumpkin/30" />
      {children}
    </div>
  );
}

const BAND_STYLE: Record<string, string> = {
  Critical: "bg-danger-subtle text-danger ring-danger/30",
  High: "bg-warning-subtle text-warning ring-warning/30",
  Medium: "bg-informative-subtle text-informative ring-informative/30",
  Low: "bg-positive-subtle text-positive ring-positive/30",
};

const ACTION_ACCENT: Record<string, { ring: string; text: string; dot: string }> = {
  reengagement: { ring: "ring-danger/25", text: "text-danger", dot: "bg-danger" },
  resale: { ring: "ring-warning/25", text: "text-warning", dot: "bg-warning" },
  broker: { ring: "ring-informative/25", text: "text-informative", dot: "bg-informative" },
};

const ACTION_ARTIFACT: Record<string, string> = {
  reengagement: "→ Resend email draft",
  resale: "→ Marketplace listing · 1.3×",
  broker: "→ Pipeline webhook (JSON)",
};

/* ---------------------------------------------------------------- signals */

const SIGNALS = [
  {
    name: "Days to Expiry",
    weight: 40,
    color: "bg-danger",
    note: "1 − days/45 inside a 45-day window. Closer expiry = hotter.",
  },
  {
    name: "Seat Gap %",
    weight: 30,
    color: "bg-warning",
    note: "(capacity − billable) / capacity. Reserved-but-uncontracted seats.",
  },
  {
    name: "Lease Term",
    weight: 20,
    color: "bg-informative",
    note: "≤ 6 months → 1.0 (volatile); otherwise 0.2 (stable).",
  },
  {
    name: "Account Status",
    weight: 10,
    color: "bg-positive",
    note: "CRM health — Active 0.1 · Watch 0.6 · At Risk 1.0.",
  },
] as const;

/* ---------------------------------------------------------------- page */

export default function Landing({ data }: { data: LandingData }) {
  useScrollReveal();
  const { progress, y } = useScroll();

  const ebTotal = data.eastbridge.reduce((s, r) => s + r.revenueAtRisk7d, 0);
  const ebUnused = data.eastbridge.reduce((s, r) => s + r.unusedSeats, 0);
  const bandOrder = ["Critical", "High", "Medium", "Low"];

  return (
    <div className="relative overflow-x-clip bg-canvas text-ink">
      {/* progress bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent">
        <div
          className="h-full origin-left bg-gradient-to-r from-pumpkin via-pumpkin-active to-warning"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* nav */}
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-pumpkin-subtle text-lg ring-1 ring-pumpkin/30">
              🪑
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              DeskYield
            </span>
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link
              href="/docs"
              className="rounded-md px-3 py-1.5 text-ink-secondary transition hover:text-ink"
            >
              API & MCP
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-pumpkin px-3.5 py-1.5 font-medium text-white transition hover:bg-pumpkin-hover"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* ---------------------------------------------------- scroll-scrubbed video */}
      <ScrollVideo grandTotal={data.totals.grandTotalRecoverable} />

      {/* ---------------------------------------------------- hero */}
      <header className="relative flex min-h-screen flex-col justify-center overflow-hidden px-5 pt-24">
        {/* atmosphere */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(39,46,53,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(39,46,53,0.04) 1px, transparent 1px)",
            backgroundSize: "56px 56px, 56px 56px",
            animation: "gridPan 18s linear infinite",
            maskImage:
              "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute left-1/2 top-[-10%] -z-10 h-[70vh] w-[70vw] -translate-x-1/2 rounded-full bg-pumpkin/10 blur-[120px]"
        />
        <div className="absolute inset-0 -z-10" style={{ transform: `translateY(${y * 0.25}px)` }}>
          <DeskGrid />
        </div>

        <div className="mx-auto w-full max-w-5xl">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-ink-secondary"
            data-reveal
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pumpkin" />
            KMC Solutions · Flexible Workspace Intelligence
          </div>

          <h1
            className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-ink sm:text-7xl lg:text-[5.5rem]"
            data-reveal
          >
            Every empty desk is{" "}
            <span className="font-serif italic font-normal text-gradient-pumpkin">
              revenue
            </span>{" "}
            you already lost.
          </h1>

          <p
            className="mt-7 max-w-xl text-lg leading-relaxed text-ink-secondary"
            data-reveal
            style={{ ["--reveal-delay" as string]: "120ms" }}
          >
            DeskYield predicts which reserved seats go unused in the next 7 days,
            then hands you the top 3 revenue-recovery actions — each priced in
            pesos. Deterministic. Auditable. Built on raw ERP seat inventory.
          </p>

          <div
            className="mt-9 flex flex-wrap items-center gap-3"
            data-reveal
            style={{ ["--reveal-delay" as string]: "240ms" }}
          >
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-lg bg-pumpkin px-5 py-3 font-medium text-white transition hover:bg-pumpkin-hover"
            >
              Open the dashboard
              <span className="transition group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-5 py-3 font-medium text-ink transition hover:border-pumpkin/50 hover:text-pumpkin"
            >
              Explore the API & MCP
            </Link>
          </div>

          {/* hero stat strip */}
          <div
            className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4"
            data-reveal
            style={{ ["--reveal-delay" as string]: "360ms" }}
          >
            {[
              { v: data.totals.grandTotalRecoverable, l: "Recoverable / 7d", money: true },
              { v: data.riskCount, l: "Active agreements" },
              { v: data.vacantCount, l: "Cold vacancies" },
              { v: 4, l: "Risk signals" },
            ].map((s, i) => (
              <div key={i} className="bg-surface px-4 py-5">
                <div className="font-display text-2xl font-bold text-pumpkin">
                  {s.money ? (
                    <Counter target={s.v} format={(n) => php0(n)} />
                  ) : (
                    <Counter target={s.v} />
                  )}
                </div>
                <div className="mt-1 text-xs text-ink-tertiary">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-tertiary">
          <span style={{ animation: "floatY 2.4s ease-in-out infinite", display: "inline-block" }}>
            scroll ↓
          </span>
        </div>
      </header>

      {/* ---------------------------------------------------- problem */}
      <section id="problem" className="relative mx-auto max-w-5xl px-5 py-32">
        <SectionLabel n="01">The blind spot</SectionLabel>
        <p
          className="font-serif text-3xl leading-snug text-ink-secondary sm:text-5xl"
          data-reveal
        >
          The ERP tells you a seat is{" "}
          <span className="text-ink">reserved</span>. It can&apos;t tell
          you when that seat sits{" "}
          <span className="text-danger">empty</span> — or when a vacant office
          could have been sold.
        </p>
        <div
          className="mt-12 flex flex-col gap-2 border-l-2 border-danger/50 pl-6"
          data-reveal
          style={{ ["--reveal-delay" as string]: "150ms" }}
        >
          <div className="font-mono text-sm text-ink-tertiary">
            Revenue at risk · next 7 days
          </div>
          <Counter
            target={data.totals.totalRevenueAtRisk7d}
            format={(n) => php(n)}
            className="font-display text-5xl font-extrabold text-danger sm:text-6xl"
          />
          <div className="mt-1 max-w-md text-sm text-ink-tertiary">
            Collected from clients, but no value delivered. Every empty desk
            inside an active agreement is a quiet refund waiting to happen.
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- engine */}
      <section id="engine" className="relative border-y border-line bg-surface px-5 py-32">
        <div className="mx-auto max-w-5xl">
          <SectionLabel n="02">The logic</SectionLabel>
          <h2
            className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl"
            data-reveal
          >
            One deterministic score.
            <br />
            <span className="text-ink-tertiary">Four signals. Zero black box.</span>
          </h2>
          <div
            className="mt-8 inline-block rounded-lg border border-line bg-canvas px-5 py-3 font-mono text-sm text-pumpkin"
            data-reveal
          >
            Risk = Expiry·0.40 + SeatGap·0.30 + Lease·0.20 + Status·0.10
          </div>

          <div className="mt-14 flex flex-col gap-6">
            {SIGNALS.map((s, i) => (
              <div
                key={s.name}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 110}ms` }}
                className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[200px_1fr_auto]"
              >
                <div className="font-display text-lg font-semibold text-ink">{s.name}</div>
                <div className="h-3 overflow-hidden rounded-full bg-line">
                  <div
                    className={`bar-fill h-full rounded-full ${s.color}`}
                    style={{ width: `${s.weight}%` }}
                  />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-2xl font-bold text-ink">
                    {s.weight}%
                  </span>
                </div>
                <p className="text-sm text-ink-tertiary sm:col-span-3 sm:pl-[200px]">
                  {s.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- bands */}
      <section id="bands" className="relative mx-auto max-w-5xl px-5 py-32">
        <SectionLabel n="03">Triage</SectionLabel>
        <h2 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl" data-reveal>
          Scores collapse into{" "}
          <span className="text-gradient-pumpkin">four bands</span>.
        </h2>
        <p className="mt-4 max-w-xl text-ink-secondary" data-reveal>
          Every active agreement lands in a triage tier — so the desk acts on the
          hottest leakage first, not the loudest.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {bandOrder.map((b, i) => (
            <div
              key={b}
              data-reveal
              style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
              className={`rounded-xl p-5 ring-1 ${BAND_STYLE[b]}`}
            >
              <div className="font-display text-4xl font-extrabold">
                <Counter target={data.bandCounts[b] ?? 0} />
              </div>
              <div className="mt-1 text-sm font-medium">{b}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 font-mono text-xs text-ink-tertiary" data-reveal>
          Critical ≥ 0.60 · High 0.45–0.59 · Medium 0.30–0.44 · Low &lt; 0.30
        </p>
      </section>

      {/* ---------------------------------------------------- actions */}
      <section id="actions" className="relative border-y border-line bg-surface px-5 py-32">
        <div className="mx-auto max-w-5xl">
          <SectionLabel n="04">The output</SectionLabel>
          <h2 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl" data-reveal>
            Top 3 recovery actions —
            <br />
            <span className="text-ink-tertiary">each one priced and ready to fire.</span>
          </h2>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {data.actions.map((a, i) => {
              const accent = ACTION_ACCENT[a.key] ?? ACTION_ACCENT.broker;
              return (
                <div
                  key={a.key}
                  data-reveal
                  style={{ ["--reveal-delay" as string]: `${i * 130}ms` }}
                  className={`flex flex-col rounded-2xl bg-canvas p-6 ring-1 ${accent.ring}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-ink-tertiary">
                      ACTION {a.rank}
                    </span>
                    <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold leading-tight text-ink">
                    {a.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm text-ink-secondary">{a.detail}</p>
                  <div className="mt-5">
                    <div className="font-mono text-xs text-ink-tertiary">
                      Est. recovery / 7d
                    </div>
                    <Counter
                      target={a.estimatedRecovery}
                      format={(n) => php0(n)}
                      className={`font-display text-3xl font-extrabold ${accent.text}`}
                    />
                  </div>
                  <div className={`mt-4 font-mono text-xs ${accent.text}`}>
                    {ACTION_ARTIFACT[a.key]}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-xs text-ink-tertiary" data-reveal>
            Each card previews the exact artifact a live system would send —
            email body, JSON webhook, marketplace listing. Integrations simulated
            for the demo; no external calls.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------- spotlight */}
      <section id="spotlight" className="relative mx-auto max-w-5xl px-5 py-32">
        <SectionLabel n="05">Live demo</SectionLabel>
        <h2 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl" data-reveal>
          Eastbridge Solutions.
        </h2>
        <p className="mt-4 max-w-2xl text-ink-secondary" data-reveal>
          3 offices in Meridian Business Hub 14F · 6-month lease ·{" "}
          <span className="rounded bg-danger-subtle px-1.5 py-0.5 font-medium text-danger ring-1 ring-danger/30">
            At Risk
          </span>{" "}
          · expiring{" "}
          {data.eastbridge[0]
            ? shortDate(data.eastbridge[0].expirationDate)
            : "soon"}
          .
        </p>

        <div
          className="mt-10 overflow-hidden rounded-2xl border border-line"
          data-reveal
        >
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas font-mono text-xs uppercase tracking-wider text-ink-tertiary">
              <tr>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3 text-right">Cap</th>
                <th className="px-4 py-3 text-right">Billable</th>
                <th className="px-4 py-3 text-right">Unused</th>
                <th className="px-4 py-3 text-right">Daily rate</th>
                <th className="px-4 py-3 text-right">7-day at risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.eastbridge.map((r) => (
                <tr key={r.roomId} className="bg-surface">
                  <td className="px-4 py-3 font-mono font-medium text-ink">
                    {r.roomId}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-secondary">{r.capacity}</td>
                  <td className="px-4 py-3 text-right text-ink-secondary">
                    {r.billableSeats}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-warning">
                    {r.unusedSeats}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-secondary">
                    {php(r.dailyRate)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-danger">
                    {php(r.revenueAtRisk7d)}
                  </td>
                </tr>
              ))}
              <tr className="bg-canvas font-semibold">
                <td className="px-4 py-3 text-ink">Total</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right text-warning">{ebUnused}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right text-danger">{php(ebTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {data.topVacancy && (
          <div
            className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-warning/30 bg-warning-subtle p-6 sm:flex-row sm:items-center"
            data-reveal
          >
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-warning">
                Cold vacancy · resale sprint @ 1.3×
              </div>
              <div className="mt-1 font-display text-lg font-semibold text-ink">
                {data.topVacancy.roomId} — {data.topVacancy.capacity} seats ·{" "}
                {data.topVacancy.buildingName} {data.topVacancy.floor}
              </div>
            </div>
            <Counter
              target={data.topVacancy.resaleYield7d}
              format={(n) => php(n)}
              className="font-display text-4xl font-extrabold text-warning"
            />
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- api / mcp */}
      <section id="api" className="relative border-y border-line bg-surface px-5 py-32">
        <div className="mx-auto max-w-5xl">
          <SectionLabel n="06">Not just a dashboard</SectionLabel>
          <h2 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl" data-reveal>
            The engine ships as an{" "}
            <span className="text-gradient-pumpkin">API</span> and an{" "}
            <span className="text-informative">MCP server</span>.
          </h2>
          <p className="mt-4 max-w-2xl text-ink-secondary" data-reveal>
            The same deterministic core powers the UI, a REST surface, and 5 MCP
            tools — so agents can query risk and draft recovery actions directly.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div
              className="rounded-2xl border border-line bg-canvas p-6"
              data-reveal
            >
              <div className="font-mono text-xs uppercase tracking-wider text-pumpkin">
                REST endpoints
              </div>
              <ul className="mt-4 flex flex-col gap-2 font-mono text-sm text-ink-secondary">
                {[
                  ["GET", "/api/analysis"],
                  ["GET", "/api/risk"],
                  ["GET", "/api/vacancies"],
                  ["GET", "/api/actions"],
                  ["POST", "/api/actions/execute"],
                ].map(([m, p]) => (
                  <li key={p} className="flex items-center gap-3">
                    <span className="w-12 rounded bg-positive-subtle px-1.5 py-0.5 text-center text-[11px] text-positive ring-1 ring-positive/30">
                      {m}
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-2xl border border-line bg-canvas p-6"
              data-reveal
              style={{ ["--reveal-delay" as string]: "120ms" }}
            >
              <div className="font-mono text-xs uppercase tracking-wider text-informative">
                MCP tools · 5
              </div>
              <ul className="mt-4 flex flex-col gap-2 font-mono text-sm text-ink-secondary">
                {[
                  "analyse_dataset",
                  "get_risk_items",
                  "get_recovery_actions",
                  "build_email_draft",
                  "build_resale_listing",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-informative" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8" data-reveal>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-5 py-3 font-medium text-ink transition hover:border-pumpkin/50 hover:text-pumpkin"
            >
              Open the interactive API console →
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- cta */}
      <section className="relative px-5 py-40 text-center">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 h-[40vh] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pumpkin/10 blur-[120px]"
        />
        <div className="mx-auto max-w-3xl">
          <div className="font-mono text-sm text-ink-tertiary" data-reveal>
            Recoverable in the next 7 days
          </div>
          <Counter
            target={data.totals.grandTotalRecoverable}
            format={(n) => php0(n)}
            className="mt-3 block font-display text-6xl font-extrabold tracking-tight text-gradient-pumpkin sm:text-7xl"
          />
          <h2
            className="mt-8 font-serif text-3xl italic text-ink sm:text-4xl"
            data-reveal
          >
            Stop refunding empty desks.
          </h2>
          <div className="mt-9 flex justify-center" data-reveal>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-lg bg-pumpkin px-7 py-4 text-lg font-medium text-white transition hover:bg-pumpkin-hover"
            >
              See it live on the dashboard
              <span className="transition group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-xs text-ink-tertiary sm:flex-row">
          <div>
            DeskYield · KMC Solutions · analysis date {shortDate(data.today)}
          </div>
          <div className="font-mono">
            {data.riskCount} active agreements · {data.vacantCount} cold vacancies
          </div>
        </div>
      </footer>
    </div>
  );
}
