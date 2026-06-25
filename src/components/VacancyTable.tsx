import type { VacantItem } from "@/lib/types";
import { php, php0 } from "@/lib/format";

type Props = { items: VacantItem[] };

const HEADLINE_ROOM = "RM-008";

export default function VacancyTable({ items }: Props) {
  const totalYield = items.reduce((sum, it) => sum + it.resaleYield7d, 0);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold text-ink">
          Cold Vacancies — Quickest Wins
        </h2>
        <p className="mt-0.5 text-sm text-ink-tertiary">
          Empty rooms ranked by 7-day resale yield at a 1.3× premium. Resell
          first.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-canvas text-left text-[11px] uppercase tracking-wide text-ink-tertiary">
              <th className="px-5 py-2.5 font-semibold">Room</th>
              <th className="px-5 py-2.5 text-right font-semibold">Capacity</th>
              <th className="px-5 py-2.5 text-right font-semibold">Monthly Rate</th>
              <th className="px-5 py-2.5 text-right font-semibold">Daily Rate</th>
              <th className="px-5 py-2.5 text-right font-semibold">
                7-Day Resale Yield @1.3×
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => {
              const isHeadline = item.roomId === HEADLINE_ROOM;
              return (
                <tr
                  key={item.roomId}
                  className={[
                    "transition-colors hover:bg-canvas",
                    isHeadline ? "bg-pumpkin-subtle/60" : "",
                  ].join(" ")}
                >
                  <td
                    className={[
                      "px-5 py-3",
                      isHeadline ? "border-l-2 border-pumpkin" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{item.roomId}</span>
                      <span className="text-ink-secondary">{item.officeName}</span>
                      {isHeadline && (
                        <span className="rounded bg-pumpkin-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pumpkin">
                          Headline
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-tertiary">
                      {item.buildingName} · Floor {item.floor}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">
                    {item.capacity}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">
                    {php0(item.monthlyRate)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">
                    {php(item.dailyRate)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-positive">
                    {php(item.resaleYield7d)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-canvas">
              <td
                className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-tertiary"
                colSpan={4}
              >
                Total Resale Yield ({items.length} rooms)
              </td>
              <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-positive">
                {php(totalYield)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
