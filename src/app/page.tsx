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

export default function Home() {
  const analysis = analyse(rawData as Dataset);
  const eastbridge = analysis.riskItems.filter(
    (r) => r.companyName === "Eastbridge Solutions",
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Intro */}
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-ink-secondary">
          Predicts which reserved seats will go unused in the next 7 days and
          surfaces the top 3 revenue recovery actions — with PHP estimates.
        </p>
        <div className="shrink-0 text-right text-xs text-ink-tertiary">
          <div>
            Analysis date{" "}
            <span className="font-semibold text-ink-secondary">
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
  );
}
