import type { RiskItem } from "@/lib/types";
import { php, php0 } from "@/lib/format";

const STATUS_BADGE: Record<string, string> = {
  "At Risk": "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Watch: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export default function EastbridgeSpotlight({ items }: { items: RiskItem[] }) {
  const totalUnused = items.reduce((sum, r) => sum + r.unusedSeats, 0);
  const totalAtRisk = items.reduce((sum, r) => sum + r.revenueAtRisk7d, 0);

  const client = items[0];
  const status = client?.accountStatus ?? "At Risk";
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE["At Risk"];

  return (
    <section className="relative overflow-hidden rounded-xl border border-rose-500/40 bg-slate-900/60 p-6 shadow-[0_0_60px_-20px_rgba(244,63,94,0.45)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-rose-500/20 to-amber-500/10 blur-3xl"
      />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-rose-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
            Live Demo Scenario
          </span>
          {client && (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge}`}
            >
              {status}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-100">
              {client?.companyName ?? "Eastbridge"}
            </h2>
            {client && (
              <p className="text-sm text-slate-400">
                {client.primaryContact} · {client.contactTitle}
              </p>
            )}
          </div>
          <p className="text-sm text-slate-400">
            3 offices · Meridian Business Hub 14F · expiring 31 Jul 2026 (37 days) ·
            6-month lease
          </p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5 font-medium">Room</th>
                <th className="px-4 py-2.5 font-medium text-right">Capacity</th>
                <th className="px-4 py-2.5 font-medium text-right">Billable</th>
                <th className="px-4 py-2.5 font-medium text-right">Empty Gap</th>
                <th className="px-4 py-2.5 font-medium text-right">Monthly Rate</th>
                <th className="px-4 py-2.5 font-medium text-right">Daily Rate</th>
                <th className="px-4 py-2.5 font-medium text-right">
                  7-Day Revenue at Risk
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {items.map((r) => (
                <tr key={r.occId} className="text-slate-300">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{r.officeName}</div>
                    <div className="text-xs text-slate-500">{r.roomId}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.capacity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.billableSeats}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-300">
                    {r.unusedSeats}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {php0(r.monthlyRate)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {php(r.dailyRate)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-400">
                    {php(r.revenueAtRisk7d)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700 bg-slate-950/60 font-semibold text-slate-100">
                <td className="px-4 py-3 uppercase tracking-wider text-xs text-slate-400">
                  Total
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular-nums text-rose-300">
                  {totalUnused}
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular-nums text-emerald-400">
                  {php(totalAtRisk)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-[11px] uppercase tracking-widest text-emerald-400/80">
            Recoverable this week
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            <span className="text-emerald-400">{php(totalAtRisk)}</span> leaked revenue
            recoverable from Eastbridge this week.
          </p>
        </div>
      </div>
    </section>
  );
}
