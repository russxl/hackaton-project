export type Room = {
  roomId: string;
  buildingId: string;
  buildingName: string;
  floor: string;
  officeName: string;
  roomType: string;
  capacity: number;
  sizeSqm: number;
  publishedSeatRate: number;
  hasManagersCabin: string;
  status: "Active" | "Vacant" | string;
};

export type Occupancy = {
  occId: string;
  roomId: string;
  clientId: string;
  companyName: string;
  service: string;
  seatRate: number | string;
  billableSeats: number;
  seatCapacity: number;
  seatGap: number;
  leaseTermMonths: number;
  effectivityDate: string;
  expirationDate: string;
  isActive: boolean;
  notes: string;
};

export type Client = {
  clientId: string;
  companyName: string;
  primaryContact: string;
  contactTitle: string;
  accountTier: string;
  accountStatus: "Active" | "Watch" | "At Risk" | string;
};

export type Dataset = {
  rooms: Room[];
  occupancy: Occupancy[];
  clients: Client[];
  today: string;
};

export type SignalBreakdown = {
  daysToExpiry: number;
  daysToExpiryScore: number;
  seatGapPct: number;
  seatGapScore: number;
  leaseWeight: number;
  statusWeight: number;
};

export type RiskItem = {
  occId: string;
  roomId: string;
  buildingName: string;
  floor: string;
  officeName: string;
  clientId: string;
  companyName: string;
  primaryContact: string;
  contactTitle: string;
  accountStatus: string;
  accountTier: string;
  capacity: number;
  billableSeats: number;
  unusedSeats: number;
  monthlyRate: number;
  dailyRate: number;
  leaseTermMonths: number;
  expirationDate: string;
  signals: SignalBreakdown;
  riskScore: number;
  riskBand: "Critical" | "High" | "Medium" | "Low";
  revenueAtRisk7d: number;
  topSignals: string[];
};

export type VacantItem = {
  roomId: string;
  buildingName: string;
  floor: string;
  officeName: string;
  capacity: number;
  monthlyRate: number;
  dailyRate: number;
  resaleYield7d: number; // 1.3x premium, full capacity, 7 days
};

export type ActionItem = {
  rank: number;
  key: "reengagement" | "resale" | "broker";
  title: string;
  systemAction: string;
  targets: string[]; // roomIds or clientIds
  estimatedRecovery: number;
  detail: string;
};

export type Analysis = {
  today: string;
  riskItems: RiskItem[];
  vacantItems: VacantItem[];
  actions: ActionItem[];
  totals: {
    totalRevenueAtRisk7d: number;
    reengagementRecovery: number;
    resaleYield7d: number;
    brokerPipelineValue: number;
    grandTotalRecoverable: number;
  };
};
