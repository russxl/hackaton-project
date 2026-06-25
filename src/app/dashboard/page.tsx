import Link from "next/link";
import { analyse } from "@/lib/engine";
import type { Dataset } from "@/lib/types";
import rawData from "@/data/dataset.json";
import { shortDate } from "@/lib/format";

import KpiBar from "@/components/KpiBar";
import EastbridgeSpotlight from "@/components/EastbridgeSpotlight";
import ActionCenter from "@/components/ActionCenter";
import RiskTable from "@/components/RiskTable";
import VacancyTable from "@/components/VacancyTable";
import LogicPanel from "@/components/LogicPanel";

export default function Dashboard() {
  const analysis = analyse(rawData as Dataset);
  const eastbridge = analysis.riskItems.filter(
    (r) => r.companyName === "Eastbridge Solutions",
  );

  return (
    <main className="min-h-screen bg-canvas text-ink-secondary">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-pumpkin-subtle text-lg ring-1 ring-pumpkin/30 transition hover:bg-pumpkin-subtle-hover"
                aria-label="Back to home"
              >
                🪑
              </Link>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                DeskYield
              </h1>
              <span className="rounded-full bg-pumpkin-subtle px-2 py-0.5 text-xs font-medium text-pumpkin ring-1 ring-pumpkin/30">
                Empty Desk Revenue Recovery
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
              Predicts which reserved seats will go unused in the next 7 days and
              surfaces the top 3 revenue recovery actions — with PHP estimates.
            </p>
          </div>
          <div className="text-right text-xs text-ink-tertiary">
            <div className="mb-2 flex justify-end gap-3">
              <Link
                href="/"
                className="rounded-md border border-line px-2.5 py-1 font-medium text-ink-secondary transition hover:border-line-strong hover:text-ink"
              >
                ← Home
              </Link>
              <Link
                href="/docs"
                className="rounded-md border border-line px-2.5 py-1 font-medium text-ink-secondary transition hover:border-line-strong hover:text-ink"
              >
                API Docs
              </Link>
            </div>
            <div>
              Analysis date{" "}
              <span className="font-medium text-ink-secondary">
                {shortDate(analysis.today)}
              </span>
            </div>
            <div className="mt-0.5">7-day forward window</div>
          </div>
        </header>

        <div className="flex flex-col gap-8">
          <KpiBar analysis={analysis} />
          <EastbridgeSpotlight items={eastbridge} />
          <ActionCenter analysis={analysis} />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <VacancyTable items={analysis.vacantItems} />
            </div>
            <div className="lg:col-span-1">
              <LogicPanel />
            </div>
          </div>

          <RiskTable items={analysis.riskItems} />
        </div>

        <footer className="mt-12 border-t border-line pt-6 text-xs text-ink-tertiary">
          Deterministic multi-signal model · Days to Expiry 40% · Seat Gap 30% ·
          Lease Term 20% · Account Status 10%. Figures derived from the provided
          ERP dataset ({analysis.riskItems.length} active agreements,{" "}
          {analysis.vacantItems.length} cold vacancies).
        </footer>
      </div>
    </main>
  );
}
