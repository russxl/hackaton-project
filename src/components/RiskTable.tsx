"use client";

import { Fragment, useState } from "react";
import type { RiskItem } from "@/lib/types";
import { php, pct, shortDate } from "@/lib/format";
import RiskBadge from "./RiskBadge";

// Risk band → accent color, used consistently across the table.
const BAND_COLOR: Record<
  RiskItem["riskBand"],
  { bar: string; text: string; track: string }
> = {
  Critical: { bar: "bg-rose-500", text: "text-rose-300", track: "bg-rose-500/10" },
  High: { bar: "bg-amber-500", text: "text-amber-300", track: "bg-amber-500/10" },
  Medium: { bar: "bg-yellow-500", text: "text-yellow-300", track: "bg-yellow-500/10" },
  Low: { bar: "bg-emerald-500", text: "text-emerald-300", track: "bg-emerald-500/10" },
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
        open ? "rotate-90" : ""
      }`}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// A single weighted signal contribution rendered inside the expanded panel.
function SignalContribution({
  label,
  weightPct,
  normalized,
  bandBar,
  raw,
}: {
  label: string;
  weightPct: number;
  normalized: number;
  bandBar: string;
  raw: string;
}) {
  const clamped = Math.max(0, Math.min(1, normalized));
  const weight = weightPct / 100;
  const points = clamped * weight;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {weightPct}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${bandBar}`}
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-400 tabular-nums">{raw}</span>
        <span className="font-semibold text-slate-200 tabular-nums">
          +{points.toFixed(2)} pts
        </span>
      </div>
    </div>
  );
}

function ExpandedPanel({ item }: { item: RiskItem }) {
  const { signals } = item;
  const band = BAND_COLOR[item.riskBand];
  return (
    <div className="border-t border-slate-800 bg-slate-950/50 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Signal Breakdown
        </h4>
        <span className="text-xs text-slate-500 tabular-nums">
          composite {(item.riskScore * 100).toFixed(0)} / 100
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SignalContribution
          label="Days to Expiry"
          weightPct={40}
          normalized={signals.daysToExpiryScore}
          bandBar={band.bar}
          raw={`${signals.daysToExpiry} days`}
        />
        <SignalContribution
          label="Seat Gap"
          weightPct={30}
          normalized={signals.seatGapScore}
          bandBar={band.bar}
          raw={pct(signals.seatGapPct)}
        />
        <SignalContribution
          label="Lease Term"
          weightPct={20}
          normalized={signals.leaseWeight}
          bandBar={band.bar}
          raw={`${item.leaseTermMonths}-mo`}
        />
        <SignalContribution
          label="Account Status"
          weightPct={10}
          normalized={signals.statusWeight}
          bandBar={band.bar}
          raw={item.accountStatus}
        />
      </div>

      {item.topSignals.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Top signals
          </span>
          {item.topSignals.map((sig) => (
            <span
              key={sig}
              className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300"
            >
              {sig}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RiskTable({ items }: { items: RiskItem[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(occId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(occId)) next.delete(occId);
      else next.add(occId);
      return next;
    });
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Risk-Scored Office Inventory
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {items.length} active {items.length === 1 ? "office" : "offices"} ranked by
            churn &amp; under-utilization risk
          </p>
        </div>
        <p className="text-xs text-slate-500">Click a row to inspect signals</p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-800 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5 sm:px-6">#</th>
              <th className="px-4 py-2.5">Room</th>
              <th className="px-4 py-2.5">Client</th>
              <th className="px-4 py-2.5 w-[220px]">Risk</th>
              <th className="px-4 py-2.5">Seat Gap</th>
              <th className="px-4 py-2.5">Expiry</th>
              <th className="px-4 py-2.5 pr-4 text-right sm:pr-6">
                7-Day Revenue at Risk
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const open = expanded.has(item.occId);
              const band = BAND_COLOR[item.riskBand];
              const days = item.signals.daysToExpiry;
              const expiryUrgent = days <= 45;
              const expiryColor =
                days <= 15
                  ? "text-rose-300"
                  : expiryUrgent
                    ? "text-amber-300"
                    : "text-slate-400";

              return (
                <Fragment key={item.occId}>
                  <tr
                    onClick={() => toggle(item.occId)}
                    className={`cursor-pointer border-b border-slate-800 transition-colors hover:bg-slate-800/40 ${
                      open ? "bg-slate-800/30" : ""
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 align-top sm:px-6">
                      <div className="flex items-center gap-2">
                        <Chevron open={open} />
                        <span className="text-sm font-semibold text-slate-300 tabular-nums">
                          {i + 1}
                        </span>
                      </div>
                    </td>

                    {/* Room */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-200">
                        {item.officeName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.roomId} · {item.buildingName} · {item.floor}
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-200">
                        {item.companyName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.accountStatus}
                      </div>
                    </td>

                    {/* Risk meter */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-2 flex-1 overflow-hidden rounded-full ${band.track}`}
                        >
                          <div
                            className={`h-full rounded-full ${band.bar}`}
                            style={{
                              width: `${Math.max(2, item.riskScore * 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`w-9 text-right text-sm font-semibold tabular-nums ${band.text}`}
                        >
                          {(item.riskScore * 100).toFixed(0)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <RiskBadge band={item.riskBand} />
                      </div>
                    </td>

                    {/* Seat Gap */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-200 tabular-nums">
                        {item.unusedSeats}
                        <span className="text-slate-500"> / {item.capacity}</span>
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {pct(item.signals.seatGapPct)} unused
                      </div>
                    </td>

                    {/* Expiry */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-300 tabular-nums">
                        {shortDate(item.expirationDate)}
                      </div>
                      <div className={`text-xs tabular-nums ${expiryColor}`}>
                        ({days} {days === 1 ? "day" : "days"})
                      </div>
                    </td>

                    {/* Revenue at risk */}
                    <td className="px-4 py-3 pr-4 text-right align-top sm:pr-6">
                      <span className="font-semibold text-emerald-400 tabular-nums">
                        {php(item.revenueAtRisk7d)}
                      </span>
                    </td>
                  </tr>

                  {open && (
                    <tr className="border-b border-slate-800">
                      <td colSpan={7} className="p-0">
                        <ExpandedPanel item={item} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="px-6 py-10 text-center text-sm text-slate-500">
          No active offices to score.
        </div>
      )}
    </section>
  );
}
