import type { RiskItem } from "@/lib/types";
import { php, php0 } from "@/lib/format";

const STATUS_BADGE: Record<string, string> = {
  "At Risk": "bg-danger-subtle text-danger",
  Watch: "bg-warning-subtle text-warning",
  Active: "bg-positive-subtle text-positive",
};

export default function EastbridgeSpotlight({ items }: { items: RiskItem[] }) {
  const totalUnused = items.reduce((sum, r) => sum + r.unusedSeats, 0);
  const totalAtRisk = items.reduce((sum, r) => sum + r.revenueAtRisk7d, 0);

  const client = items[0];
  const status = client?.accountStatus ?? "At Risk";
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE["At Risk"];

  return (
    <section className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="h-1.5 w-full bg-pumpkin" aria-hidden />
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pumpkin-subtle px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-pumpkin">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pumpkin" />
            Live Demo Scenario
          </span>
          {client && (
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${badge}`}
            >
              {status}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-barlow text-2xl font-bold tracking-wide text-ink">
              {client?.companyName ?? "Eastbridge"}
            </h2>
            {client && (
              <p className="text-sm text-ink-tertiary">
                {client.primaryContact} · {client.contactTitle}
              </p>
            )}
          </div>
          <p className="text-sm text-ink-tertiary">
            3 offices · Meridian Business Hub 14F · expiring 31 Jul 2026 (37 days) ·
            6-month lease
          </p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas text-left text-[11px] uppercase tracking-wider text-ink-tertiary">
                <th className="px-4 py-2.5 font-semibold">Room</th>
                <th className="px-4 py-2.5 text-right font-semibold">Capacity</th>
                <th className="px-4 py-2.5 text-right font-semibold">Billable</th>
                <th className="px-4 py-2.5 text-right font-semibold">Empty Gap</th>
                <th className="px-4 py-2.5 text-right font-semibold">Monthly Rate</th>
                <th className="px-4 py-2.5 text-right font-semibold">Daily Rate</th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  7-Day Revenue at Risk
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((r) => (
                <tr key={r.occId} className="text-ink-secondary">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{r.officeName}</div>
                    <div className="text-xs text-ink-tertiary">{r.roomId}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.capacity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.billableSeats}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-danger">
                    {r.unusedSeats}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {php0(r.monthlyRate)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {php(r.dailyRate)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-positive">
                    {php(r.revenueAtRisk7d)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-canvas font-semibold text-ink">
                <td className="px-4 py-3 text-xs uppercase tracking-wider text-ink-tertiary">
                  Total
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular-nums text-danger">
                  {totalUnused}
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular-nums text-positive">
                  {php(totalAtRisk)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 rounded-lg border border-positive/20 bg-positive-subtle p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-positive">
            Recoverable this week
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">
            <span className="text-positive">{php(totalAtRisk)}</span> leaked revenue
            recoverable from Eastbridge this week.
          </p>
        </div>
      </div>
    </section>
  );
}
