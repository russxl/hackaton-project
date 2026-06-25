import type { Analysis } from "@/lib/types";
import { php } from "@/lib/format";

type Props = { analysis: Analysis };

type Card = {
  label: string;
  value: number;
  sublabel: string;
  card: string;
  valueText: string;
  labelClass?: string;
};

export default function KpiBar({ analysis }: Props) {
  const { totals } = analysis;

  const cards: Card[] = [
    {
      label: "7-Day Revenue at Risk",
      value: totals.totalRevenueAtRisk7d,
      sublabel: "Unused seats on expiring leases",
      card: "bg-danger-subtle",
      valueText: "text-danger",
    },
    {
      label: "Re-engagement Recoverable",
      value: totals.reengagementRecovery,
      sublabel: "Win-back on at-risk accounts",
      card: "bg-informative-subtle",
      valueText: "text-informative",
    },
    {
      label: "Resale Yield (7-day)",
      value: totals.resaleYield7d,
      sublabel: "Cold vacancies at 1.3× premium",
      card: "bg-warning-subtle",
      valueText: "text-warning",
    },
    {
      label: "Grand Total Recoverable",
      value: totals.grandTotalRecoverable,
      sublabel: "Combined 7-day opportunity",
      card: "bg-pumpkin",
      valueText: "text-white",
      labelClass: "text-white/80",
    },
  ];

  return (
    <section aria-label="Key revenue metrics" className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-tertiary">
          Revenue Recovery — 7-Day Window
        </h2>
        <p className="text-xs text-ink-tertiary tabular-nums">
          <span className="font-semibold text-danger">
            {analysis.riskItems.length}
          </span>{" "}
          risk items
          <span className="mx-1.5 text-line-strong">·</span>
          <span className="font-semibold text-ink-secondary">
            {analysis.vacantItems.length}
          </span>{" "}
          vacant rooms
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => {
          const filled = card.card === "bg-pumpkin";
          return (
            <div
              key={card.label}
              className={`flex flex-col gap-2 rounded-2xl p-5 ${card.card}`}
            >
              <h3
                className={`text-xs font-medium ${
                  filled ? "text-white/85" : "text-ink-secondary"
                }`}
              >
                {card.label}
              </h3>
              <p
                className={`text-2xl font-bold tabular-nums ${card.valueText}`}
              >
                {php(card.value)}
              </p>
              <p
                className={`text-xs leading-tight ${
                  filled ? "text-white/70" : "text-ink-tertiary"
                }`}
              >
                {card.sublabel}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
