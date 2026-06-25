import type {
  Dataset,
  RiskItem,
  VacantItem,
  ActionItem,
  Analysis,
  Occupancy,
  Client,
} from "./types";

const WORKING_DAYS = 22;
const EXPIRY_WINDOW = 45; // days
const RESALE_MARKUP = 1.3;
const WEEK = 7;

// Risk weights (per problem spec)
const W_EXPIRY = 0.4;
const W_GAP = 0.3;
const W_LEASE = 0.2;
const W_STATUS = 0.1;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function daysBetween(today: string, target: string): number {
  const a = new Date(today + "T00:00:00Z").getTime();
  const b = new Date(target + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

// --- Signal normalisers (each → 0..1) ---

// Days to expiry: risk climbs as expiry nears within the 45-day window.
// >45 days = 0 risk; expired-but-active (<=0) = max risk 1.
export function expiryScore(daysToExpiry: number): number {
  if (daysToExpiry <= 0) return 1;
  if (daysToExpiry >= EXPIRY_WINDOW) return 0;
  return 1 - daysToExpiry / EXPIRY_WINDOW;
}

// Seat gap %: (capacity - billable) / capacity.
export function seatGapScore(capacity: number, billable: number): number {
  if (capacity <= 0) return 0;
  return (capacity - billable) / capacity;
}

// Lease term: <= 6 months volatile (1.0), else stable (0.2).
export function leaseWeight(months: number): number {
  return months <= 6 ? 1.0 : 0.2;
}

// Account status from CRM health.
export function statusWeight(status: string): number {
  const s = status.trim().toLowerCase();
  if (s === "at risk") return 1.0;
  if (s === "watch") return 0.6;
  return 0.1; // Active / default
}

function band(score: number): RiskItem["riskBand"] {
  if (score >= 0.6) return "Critical";
  if (score >= 0.45) return "High";
  if (score >= 0.3) return "Medium";
  return "Low";
}

// Monthly seat rate: prefer occupancy seat_rate; fall back to published rate.
// Ignore non-PHP rates (USD entries store small numbers) — use published.
function resolveMonthlyRate(occ: Occupancy, publishedRate: number): number {
  const raw = typeof occ.seatRate === "number" ? occ.seatRate : Number(occ.seatRate);
  // USD/staff-leasing rows carry small values (<2000) or are flagged; use published PHP rate.
  if (!raw || raw <= 0 || raw < 2000) return publishedRate;
  return raw;
}

export function dailyRate(monthlyRate: number): number {
  return monthlyRate / WORKING_DAYS;
}

function buildTopSignals(r: {
  daysToExpiry: number;
  seatGapPct: number;
  leaseTermMonths: number;
  accountStatus: string;
  expiryScore: number;
  seatGapScore: number;
  leaseW: number;
  statusW: number;
}): string[] {
  const contrib: { label: string; weighted: number }[] = [
    {
      label:
        r.daysToExpiry <= 0
          ? "Agreement already past expiry"
          : `Expires in ${r.daysToExpiry} days`,
      weighted: r.expiryScore * W_EXPIRY,
    },
    {
      label: `Seat gap ${Math.round(r.seatGapPct * 100)}% (underutilised)`,
      weighted: r.seatGapScore * W_GAP,
    },
    {
      label:
        r.leaseTermMonths <= 6
          ? `Short ${r.leaseTermMonths}-month lease`
          : `${r.leaseTermMonths}-month lease`,
      weighted: r.leaseW * W_LEASE,
    },
    {
      label: `Account: ${r.accountStatus}`,
      weighted: r.statusW * W_STATUS,
    },
  ];
  return contrib
    .filter((c) => c.weighted > 0)
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 3)
    .map((c) => c.label);
}

export function analyse(data: Dataset): Analysis {
  const today = data.today;
  const clientById = new Map<string, Client>(
    data.clients.map((c) => [c.clientId, c]),
  );
  const roomById = new Map(data.rooms.map((r) => [r.roomId, r]));

  // active occupancy = currently reserved seats that could go unused
  const activeOcc = data.occupancy.filter((o) => o.isActive);

  const riskItems: RiskItem[] = activeOcc.map((o) => {
    const room = roomById.get(o.roomId);
    const client = clientById.get(o.clientId);
    const capacity = o.seatCapacity || room?.capacity || 0;
    const billable = o.billableSeats;
    const unused = Math.max(capacity - billable, 0);
    const dte = daysBetween(today, o.expirationDate);
    const publishedRate = room?.publishedSeatRate ?? 0;
    const monthlyRate = resolveMonthlyRate(o, publishedRate);
    const daily = dailyRate(monthlyRate);
    const accountStatus = client?.accountStatus ?? "Active";

    const eScore = expiryScore(dte);
    const gScore = seatGapScore(capacity, billable);
    const gapPct = capacity > 0 ? (capacity - billable) / capacity : 0;
    const lW = leaseWeight(o.leaseTermMonths);
    const sW = statusWeight(accountStatus);

    const riskScore = round2(
      eScore * W_EXPIRY + gScore * W_GAP + lW * W_LEASE + sW * W_STATUS,
    );

    const revenueAtRisk7d = round2(daily * unused * WEEK);

    return {
      occId: o.occId,
      roomId: o.roomId,
      buildingName: room?.buildingName ?? "",
      floor: room?.floor ?? "",
      officeName: room?.officeName ?? "",
      clientId: o.clientId,
      companyName: o.companyName,
      primaryContact: client?.primaryContact ?? "",
      contactTitle: client?.contactTitle ?? "",
      accountStatus,
      accountTier: client?.accountTier ?? "",
      capacity,
      billableSeats: billable,
      unusedSeats: unused,
      monthlyRate,
      dailyRate: round2(daily),
      leaseTermMonths: o.leaseTermMonths,
      expirationDate: o.expirationDate,
      signals: {
        daysToExpiry: dte,
        daysToExpiryScore: round2(eScore),
        seatGapPct: round2(gapPct),
        seatGapScore: round2(gScore),
        leaseWeight: lW,
        statusWeight: sW,
      },
      riskScore,
      riskBand: band(riskScore),
      revenueAtRisk7d,
      topSignals: buildTopSignals({
        daysToExpiry: dte,
        seatGapPct: gapPct,
        leaseTermMonths: o.leaseTermMonths,
        accountStatus,
        expiryScore: eScore,
        seatGapScore: gScore,
        leaseW: lW,
        statusW: sW,
      }),
    };
  });

  riskItems.sort(
    (a, b) => b.riskScore - a.riskScore || b.revenueAtRisk7d - a.revenueAtRisk7d,
  );

  // Vacant rooms with no active occupancy = pure lost opportunity (cold vacancy)
  const activeRoomIds = new Set(activeOcc.map((o) => o.roomId));
  const vacantItems: VacantItem[] = data.rooms
    .filter((r) => r.status === "Vacant" && !activeRoomIds.has(r.roomId))
    .map((r) => {
      const daily = dailyRate(r.publishedSeatRate);
      return {
        roomId: r.roomId,
        buildingName: r.buildingName,
        floor: r.floor,
        officeName: r.officeName,
        capacity: r.capacity,
        monthlyRate: r.publishedSeatRate,
        dailyRate: round2(daily),
        resaleYield7d: round2(r.capacity * RESALE_MARKUP * daily * WEEK),
      };
    })
    .sort((a, b) => b.resaleYield7d - a.resaleYield7d);

  // --- Action grouping ---

  // Action 1: Re-engagement — active agreements expiring within 45 days.
  const reengageTargets = riskItems.filter(
    (r) => r.signals.daysToExpiry > 0 && r.signals.daysToExpiry <= EXPIRY_WINDOW,
  );
  const reengagementRecovery = round2(
    reengageTargets.reduce((s, r) => s + r.revenueAtRisk7d, 0),
  );

  // Action 2: Short-term resale — vacant rooms + active rooms with large seat gaps.
  const resaleGapTargets = riskItems.filter((r) => r.signals.seatGapPct >= 0.25);
  const resaleGapYield = round2(
    resaleGapTargets.reduce(
      (s, r) => s + r.unusedSeats * RESALE_MARKUP * r.dailyRate * WEEK,
      0,
    ),
  );
  const vacantYield = round2(
    vacantItems.reduce((s, v) => s + v.resaleYield7d, 0),
  );
  const resaleYield7d = round2(vacantYield + resaleGapYield);

  // Action 3: Broker / pipeline alerts — At Risk accounts or highly vacant rooms.
  const brokerTargets = riskItems.filter(
    (r) => r.accountStatus === "At Risk" || r.signals.seatGapPct >= 0.5,
  );
  const brokerPipelineValue = round2(
    brokerTargets.reduce((s, r) => s + r.revenueAtRisk7d, 0) + vacantYield,
  );

  const totalRevenueAtRisk7d = round2(
    riskItems.reduce((s, r) => s + r.revenueAtRisk7d, 0),
  );

  const actions: ActionItem[] = [
    {
      rank: 1,
      key: "reengagement",
      title: "Targeted Re-engagement Offers",
      systemAction:
        "Auto-draft a rate-lock / term-extension email (Resend) to each near-expiry client.",
      targets: reengageTargets.map((r) => r.roomId),
      estimatedRecovery: reengagementRecovery,
      detail: `${reengageTargets.length} active agreements expire within ${EXPIRY_WINDOW} days. Lock rates before the seats clear.`,
    },
    {
      rank: 2,
      key: "resale",
      title: "Short-Term Resale Optimization",
      systemAction:
        "List vacant + underutilised capacity on the flexible market at a 1.3× premium.",
      targets: [
        ...vacantItems.map((v) => v.roomId),
        ...resaleGapTargets.map((r) => r.roomId),
      ],
      estimatedRecovery: resaleYield7d,
      detail: `${vacantItems.length} cold-vacant rooms + ${resaleGapTargets.length} underutilised rooms can be sprinted for 7 days at premium.`,
    },
    {
      rank: 3,
      key: "broker",
      title: "Operational Broker & Pipeline Alerts",
      systemAction:
        "Fire pipeline webhooks to internal sales to match warm leads to clearing floor inventory.",
      targets: Array.from(
        new Set([
          ...brokerTargets.map((r) => r.roomId),
          ...vacantItems.map((v) => v.roomId),
        ]),
      ),
      estimatedRecovery: brokerPipelineValue,
      detail: `${brokerTargets.length} At-Risk / heavily-vacant blocks flagged for the sales desk.`,
    },
  ];

  return {
    today,
    riskItems,
    vacantItems,
    actions,
    totals: {
      totalRevenueAtRisk7d,
      reengagementRecovery,
      resaleYield7d,
      brokerPipelineValue,
      grandTotalRecoverable: round2(reengagementRecovery + vacantYield),
    },
  };
}
