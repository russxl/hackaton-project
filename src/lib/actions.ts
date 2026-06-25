import type { RiskItem, VacantItem } from "./types";
import { php } from "./format";

export type EmailDraft = { to: string; subject: string; body: string };
export type WebhookPayload = Record<string, unknown>;
export type ResaleListing = {
  headline: string;
  marketplace: string;
  payload: WebhookPayload;
};

const TS_PLACEHOLDER = "2026-06-24T09:00:00+08:00";

/** Derive a domain slug from a company name: lowercase, strip suffixes, spaces -> hyphen. */
function companyDomain(companyName: string): string {
  const cleaned = companyName
    .replace(/\b(Inc\.?|Corp\.?|Corporation|Co\.?|Ltd\.?|LLC|LLP|Pte\.?)\b/gi, "")
    .replace(/[.,]/g, "")
    .trim()
    .toLowerCase();
  const slug = cleaned
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "client";
}

/** Derive the local part of an email from a person's full name: lowercase, dot-separated. */
function contactLocalPart(primaryContact: string): string {
  const local = primaryContact
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
  return local || "contact";
}

function firstName(primaryContact: string): string {
  const part = primaryContact.trim().split(/\s+/)[0];
  return part || primaryContact.trim() || "there";
}

// Action 1: re-engagement email via Resend
export function buildEmailDraft(item: RiskItem): EmailDraft {
  const to = `${contactLocalPart(item.primaryContact)}@${companyDomain(item.companyName)}.com`;
  const office = `${item.officeName}, ${item.buildingName} ${item.floor}`;
  const subject = `Lock your rate at ${office} before ${item.expirationDate}`;

  const body = [
    `Hi ${firstName(item.primaryContact)},`,
    ``,
    `Your agreement for ${office} is set to expire on ${item.expirationDate}, and our records show ${item.unusedSeats} unused seats on the floor at a current rate of ${php(item.monthlyRate)}/month.`,
    `Because this account is currently flagged ${item.riskBand} risk, I wanted to reach out personally before anything lapses.`,
    `We'd like to lock in your current rate and offer a term extension so your team keeps the space at today's pricing — no increase at renewal.`,
    `If it's helpful, we can also right-size the agreement to match your active headcount so you're not paying for seats you aren't using.`,
    ``,
    `Would you have 15 minutes this week to review the renewal? I can send the paperwork the same day.`,
    ``,
    `Warm regards,`,
    `KMC Workspace Solutions — Account Management`,
  ].join("\n");

  return { to, subject, body };
}

// Action 3: sales pipeline alert
export function buildPipelineWebhook(item: RiskItem): WebhookPayload {
  return {
    event: "floor_inventory.at_risk",
    roomId: item.roomId,
    building: `${item.buildingName} ${item.floor}`,
    client: item.companyName,
    accountStatus: item.accountStatus,
    riskScore: item.riskScore,
    riskBand: item.riskBand,
    unusedSeats: item.unusedSeats,
    expiringOn: item.expirationDate,
    weeklyRevenueAtRisk: item.revenueAtRisk7d,
    recommendedAction:
      "Engage account owner to lock current rate and extend term before expiry; flag for retention review.",
    ts: TS_PLACEHOLDER,
  };
}

// Action 2: flexible-market listing
export function buildResaleListing(v: VacantItem): ResaleListing {
  const building = `${v.buildingName} ${v.floor}`;
  const headline = `Flexible 7-day sprint — ${v.officeName}, ${building} (${v.capacity} seats)`;
  const premiumDailyRate = Math.round(v.dailyRate * 1.3 * 100) / 100;

  const payload: WebhookPayload = {
    event: "listing.publish",
    roomId: v.roomId,
    building,
    capacity: v.capacity,
    premiumDailyRate,
    term: "7 days",
    estimatedYield: v.resaleYield7d,
    ts: TS_PLACEHOLDER,
  };

  return { headline, marketplace: "FlexDesk Marketplace", payload };
}
