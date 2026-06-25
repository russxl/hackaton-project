type Signal = {
  label: string;
  weight: number;
  width: string;
  bar: string;
  note: string;
};

const SIGNALS: Signal[] = [
  {
    label: "Days to Expiry",
    weight: 40,
    width: "w-2/5",
    bar: "bg-rose-500",
    note: "1 − days/45 within a 45-day window; 0 if >45 days, 1 if already expired.",
  },
  {
    label: "Seat Gap %",
    weight: 30,
    width: "w-[30%]",
    bar: "bg-amber-500",
    note: "(capacity − billable) / capacity.",
  },
  {
    label: "Lease Term",
    weight: 20,
    width: "w-1/5",
    bar: "bg-yellow-400",
    note: "≤6 months = 1.0 (volatile); otherwise 0.2 (stable).",
  },
  {
    label: "Account Status",
    weight: 10,
    width: "w-[10%]",
    bar: "bg-indigo-400",
    note: "Active 0.1 · Watch 0.6 · At Risk 1.0.",
  },
];

const REVENUE_FORMULAS: { label: string; formula: string }[] = [
  { label: "Daily rate", formula: "monthly / 22 working days" },
  { label: "Revenue at risk", formula: "daily × unused seats × 7" },
  { label: "Resale yield", formula: "seats × 1.3 × daily × 7" },
];

export default function LogicPanel() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <header>
        <h2 className="text-base font-semibold text-slate-100">
          How the Risk Score Works
        </h2>
        <p className="mt-0.5 text-sm text-slate-400">
          A weighted blend of four normalized signals, each scaled to 0–1 then
          weighted.
        </p>
      </header>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm">
        <span className="font-medium text-slate-200">Risk</span>
        <span className="mx-1.5 text-slate-500">=</span>
        <span className="text-slate-300">Days to Expiry</span>
        <span className="text-rose-400"> (40%)</span>
        <span className="mx-1 text-slate-600">+</span>
        <span className="text-slate-300">Seat Gap %</span>
        <span className="text-amber-400"> (30%)</span>
        <span className="mx-1 text-slate-600">+</span>
        <span className="text-slate-300">Lease Term</span>
        <span className="text-yellow-300"> (20%)</span>
        <span className="mx-1 text-slate-600">+</span>
        <span className="text-slate-300">Account Status</span>
        <span className="text-indigo-300"> (10%)</span>
      </div>

      <ul className="mt-4 space-y-3.5">
        {SIGNALS.map((s) => (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-200">
                {s.label}
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-400">
                {s.weight}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${s.width} ${s.bar}`}
                aria-hidden
              />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              {s.note}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-slate-800 pt-4">
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-slate-400">
          Revenue Formulas
        </h3>
        <dl className="mt-3 space-y-2">
          {REVENUE_FORMULAS.map((f) => (
            <div
              key={f.label}
              className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
            >
              <dt className="text-sm font-medium text-slate-200 sm:w-32 sm:shrink-0">
                {f.label}
              </dt>
              <dd className="font-mono text-xs text-emerald-400/90">
                {f.formula}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
