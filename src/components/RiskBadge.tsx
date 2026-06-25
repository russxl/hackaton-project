import type { RiskItem } from "@/lib/types";

const BAND_STYLES: Record<RiskItem["riskBand"], string> = {
  Critical: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  High: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  Medium: "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30",
  Low: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
};

export default function RiskBadge({ band }: { band: RiskItem["riskBand"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${BAND_STYLES[band]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {band}
    </span>
  );
}
