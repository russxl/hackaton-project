import type { RiskItem } from "@/lib/types";

const BAND_STYLES: Record<RiskItem["riskBand"], string> = {
  Critical: "bg-danger-subtle text-danger",
  High: "bg-pumpkin-subtle text-pumpkin",
  Medium: "bg-warning-subtle text-warning",
  Low: "bg-positive-subtle text-positive",
};

export default function RiskBadge({ band }: { band: RiskItem["riskBand"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${BAND_STYLES[band]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {band}
    </span>
  );
}
