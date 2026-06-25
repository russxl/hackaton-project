import type { VacantItem } from "@/lib/types";
import { php, php0 } from "@/lib/format";

type Props = { items: VacantItem[] };

const HEADLINE_ROOM = "RM-008";

export default function VacancyTable({ items }: Props) {
  const totalYield = items.reduce((sum, it) => sum + it.resaleYield7d, 0);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60">
      <header className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-100">
          Cold Vacancies — Quickest Wins
        </h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Empty rooms ranked by 7-day resale yield at a 1.3× premium. Resell
          first.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2.5 font-medium">Room</th>
              <th className="px-5 py-2.5 text-right font-medium">Capacity</th>
              <th className="px-5 py-2.5 text-right font-medium">Monthly Rate</th>
              <th className="px-5 py-2.5 text-right font-medium">Daily Rate</th>
              <th className="px-5 py-2.5 text-right font-medium">
                7-Day Resale Yield @1.3×
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {items.map((item) => {
              const isHeadline = item.roomId === HEADLINE_ROOM;
              return (
                <tr
                  key={item.roomId}
                  className={[
                    "transition-colors hover:bg-slate-800/30",
                    isHeadline
                      ? "bg-amber-500/[0.06] ring-1 ring-inset ring-amber-500/30"
                      : "",
                  ].join(" ")}
                >
                  <td
                    className={[
                      "px-5 py-3",
                      isHeadline ? "border-l-2 border-amber-400" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-100">
                        {item.roomId}
                      </span>
                      <span className="text-slate-300">{item.officeName}</span>
                      {isHeadline && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
                          Headline
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {item.buildingName} · Floor {item.floor}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                    {item.capacity}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                    {php0(item.monthlyRate)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                    {php(item.dailyRate)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-emerald-400">
                    {php(item.resaleYield7d)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700 bg-slate-900/80">
              <td
                className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-400"
                colSpan={4}
              >
                Total Resale Yield ({items.length} rooms)
              </td>
              <td className="px-5 py-3 text-right text-base font-semibold tabular-nums text-emerald-400">
                {php(totalYield)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
