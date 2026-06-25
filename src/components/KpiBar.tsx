import type { Analysis } from "@/lib/types";
import { php } from "@/lib/format";

type Props = { analysis: Analysis };

type Card = {
  label: string;
  value: number;
  sublabel: string;
  grand?: boolean;
};

export default function KpiBar({ analysis }: Props) {
  const { totals } = analysis;

  const cards: Card[] = [
    {
      label: "7-Day Revenue at Risk",
      value: totals.totalRevenueAtRisk7d,
      sublabel: "Unused seats on expiring leases",
    },
    {
      label: "Re-engagement Recoverable",
      value: totals.reengagementRecovery,
      sublabel: "Win-back on at-risk accounts",
    },
    {
      label: "Resale Yield (7-day)",
      value: totals.resaleYield7d,
      sublabel: "Cold vacancies at 1.3× premium",
    },
    {
      label: "Grand Total Recoverable",
      value: totals.grandTotalRecoverable,
      sublabel: "Combined 7-day opportunity",
      grand: true,
    },
  ];

  return (
    <section aria-label="Key revenue metrics" className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Revenue Recovery — 7-Day Window
        </h2>
        <p className="text-xs text-slate-400 tabular-nums">
          <span className="text-rose-400">{analysis.riskItems.length}</span> risk
          items
          <span className="mx-1.5 text-slate-700">·</span>
          <span className="text-slate-200">{analysis.vacantItems.length}</span>{" "}
          vacant rooms
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={[
              "group relative overflow-hidden rounded-xl border bg-slate-900/60 p-4",
              card.grand
                ? "border-emerald-800/60 ring-1 ring-emerald-500/30"
                : "border-slate-800",
            ].join(" ")}
          >
            <div
              aria-hidden
              className={[
                "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl",
                card.grand ? "bg-emerald-500/15" : "bg-indigo-500/5",
              ].join(" ")}
            />
            <p className="relative text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {card.label}
            </p>
            <p className="relative mt-2 text-2xl font-semibold tabular-nums text-emerald-400 md:text-[1.75rem]">
              {php(card.value)}
            </p>
            <p className="relative mt-1.5 text-[11px] leading-tight text-slate-400">
              {card.sublabel}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
