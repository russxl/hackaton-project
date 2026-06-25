"use client";

import { Fragment, useState } from "react";
import type { RiskItem } from "@/lib/types";
import { php, pct, shortDate } from "@/lib/format";
import RiskBadge from "./RiskBadge";

const BAND_COLOR: Record<
  RiskItem["riskBand"],
  { bar: string; text: string; track: string }
> = {
  Critical: { bar: "bg-danger", text: "text-danger", track: "bg-danger/10" },
  High: { bar: "bg-pumpkin", text: "text-pumpkin", track: "bg-pumpkin/10" },
  Medium: { bar: "bg-warning", text: "text-warning", track: "bg-warning/10" },
  Low: { bar: "bg-positive", text: "text-positive", track: "bg-positive/10" },
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
      className={`h-4 w-4 text-ink-tertiary transition-transform duration-200 ${
        open ? "rotate-90" : ""
      }`}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

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
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink-secondary">{label}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
          {weightPct}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full ${bandBar}`}
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-ink-tertiary tabular-nums">{raw}</span>
        <span className="font-semibold text-ink tabular-nums">
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
    <div className="border-t border-line bg-canvas px-4 py-4 sm:px-6">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">
          Signal Breakdown
        </h4>
        <span className="text-xs text-ink-tertiary tabular-nums">
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
            Top signals
          </span>
          {item.topSignals.map((sig) => (
            <span
              key={sig}
              className="rounded-md border border-pumpkin/20 bg-pumpkin-subtle px-2 py-0.5 text-xs text-pumpkin"
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
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Risk-Scored Office Inventory
          </h2>
          <p className="mt-0.5 text-sm text-ink-tertiary">
            {items.length} active {items.length === 1 ? "office" : "offices"} ranked by
            churn &amp; under-utilization risk
          </p>
        </div>
        <p className="text-xs text-ink-tertiary">Click a row to inspect signals</p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-y border-line bg-canvas text-left text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">
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
                  ? "text-danger"
                  : expiryUrgent
                    ? "text-warning"
                    : "text-ink-tertiary";

              return (
                <Fragment key={item.occId}>
                  <tr
                    onClick={() => toggle(item.occId)}
                    className={`cursor-pointer border-b border-line transition-colors hover:bg-canvas ${
                      open ? "bg-canvas" : ""
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 align-top sm:px-6">
                      <div className="flex items-center gap-2">
                        <Chevron open={open} />
                        <span className="text-sm font-semibold text-ink-secondary tabular-nums">
                          {i + 1}
                        </span>
                      </div>
                    </td>

                    {/* Room */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-ink">
                        {item.officeName}
                      </div>
                      <div className="text-xs text-ink-tertiary">
                        {item.roomId} · {item.buildingName} · {item.floor}
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-ink">
                        {item.companyName}
                      </div>
                      <div className="text-xs text-ink-tertiary">
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
                      <div className="font-medium text-ink tabular-nums">
                        {item.unusedSeats}
                        <span className="text-ink-tertiary"> / {item.capacity}</span>
                      </div>
                      <div className="text-xs text-ink-tertiary tabular-nums">
                        {pct(item.signals.seatGapPct)} unused
                      </div>
                    </td>

                    {/* Expiry */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-ink-secondary tabular-nums">
                        {shortDate(item.expirationDate)}
                      </div>
                      <div className={`text-xs tabular-nums ${expiryColor}`}>
                        ({days} {days === 1 ? "day" : "days"})
                      </div>
                    </td>

                    {/* Revenue at risk */}
                    <td className="px-4 py-3 pr-4 text-right align-top sm:pr-6">
                      <span className="font-semibold text-positive tabular-nums">
                        {php(item.revenueAtRisk7d)}
                      </span>
                    </td>
                  </tr>

                  {open && (
                    <tr className="border-b border-line">
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
        <div className="px-6 py-10 text-center text-sm text-ink-tertiary">
          No active offices to score.
        </div>
      )}
    </section>
  );
}
