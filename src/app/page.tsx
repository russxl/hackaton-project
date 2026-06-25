import { analyse } from "@/lib/engine";
import type { Dataset } from "@/lib/types";
import rawData from "@/data/dataset.json";
import Landing from "@/components/Landing";

export default function Home() {
  const analysis = analyse(rawData as Dataset);
  const eastbridge = analysis.riskItems.filter(
    (r) => r.companyName === "Eastbridge Solutions",
  );
  const topVacancy = analysis.vacantItems[0] ?? null;

  const data = {
    today: analysis.today,
    totals: analysis.totals,
    actions: analysis.actions,
    riskCount: analysis.riskItems.length,
    vacantCount: analysis.vacantItems.length,
    bandCounts: analysis.riskItems.reduce<Record<string, number>>((acc, r) => {
      acc[r.riskBand] = (acc[r.riskBand] ?? 0) + 1;
      return acc;
    }, {}),
    eastbridge: eastbridge.map((r) => ({
      roomId: r.roomId,
      capacity: r.capacity,
      billableSeats: r.billableSeats,
      unusedSeats: r.unusedSeats,
      dailyRate: r.dailyRate,
      revenueAtRisk7d: r.revenueAtRisk7d,
      expirationDate: r.expirationDate,
      accountStatus: r.accountStatus,
      daysToExpiry: r.signals.daysToExpiry,
      leaseTermMonths: r.leaseTermMonths,
    })),
    topVacancy: topVacancy
      ? {
          roomId: topVacancy.roomId,
          buildingName: topVacancy.buildingName,
          floor: topVacancy.floor,
          capacity: topVacancy.capacity,
          resaleYield7d: topVacancy.resaleYield7d,
        }
      : null,
  };

  return <Landing data={data} />;
}
