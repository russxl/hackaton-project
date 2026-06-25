import type OpenAI from "openai";
import {
  getActions,
  getAnalysis,
  getRiskItems,
  getVacancies,
  emailDraftFor,
  resaleListingFor,
} from "@/lib/service";
import type { RiskItem } from "@/lib/types";

/**
 * Read-only tool definitions exposed to the chat model. Each tool wraps the
 * deterministic `service.ts` facade — the model never computes figures itself,
 * so every PHP number it cites comes straight from `analyse()`.
 *
 * Tools are intentionally read-only: the model can inspect risk, vacancies,
 * actions and draft outreach artifacts, but cannot send or publish anything.
 */

export type ToolSchema = OpenAI.ChatCompletionTool;

function tool(name: string, description: string, parameters: Record<string, unknown>): ToolSchema {
  return {
    type: "function",
    function: { name, description, parameters },
  } as ToolSchema;
}

export const CHAT_TOOLS: ToolSchema[] = [
  tool(
    "get_recovery_actions",
    "Return the top 3 ranked revenue-recovery actions (re-engagement, resale, broker) with PHP recovery estimates and the target room/client ids. Use this for 'what should we do' questions.",
    {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  ),
  tool(
    "get_risk_items",
    "List active seat agreements scored by their risk of going unused in the next 7 days, each with seat gap, daily/monthly rate, risk score & band, and 7-day revenue at risk (PHP). Filter by risk band, client (clientId or company name substring), and a row limit.",
    {
      type: "object",
      properties: {
        band: {
          type: "string",
          enum: ["Critical", "High", "Medium", "Low"],
          description: "Optional risk-band filter.",
        },
        client: {
          type: "string",
          description: "clientId (exact) or company name substring.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description: "Cap the number of rows returned.",
        },
      },
      additionalProperties: false,
    },
  ),
  tool(
    "get_vacancies",
    "List cold vacant rooms (no active occupancy) with capacity, daily/monthly rate, and 7-day resale yield at the 1.3x short-term premium (PHP).",
    {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  ),
  tool(
    "get_totals",
    "Return the headline 7-day recovery KPIs in PHP: total revenue at risk, re-engagement recoverable, resale yield, broker pipeline value, and grand total recoverable.",
    {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  ),
  tool(
    "build_email_draft",
    "Build a client re-engagement email draft (to/subject/body) for a specific at-risk account. `id` may be an occId, roomId, or clientId. Use after get_risk_items to act on a flagged account.",
    {
      type: "object",
      properties: {
        id: { type: "string", description: "occId, roomId, or clientId." },
      },
      required: ["id"],
      additionalProperties: false,
    },
  ),
  tool(
    "build_resale_listing",
    "Build a flexible-market resale listing (headline + payload) for a cold vacant room, identified by roomId. Use after get_vacancies.",
    {
      type: "object",
      properties: {
        roomId: { type: "string", description: "A vacant roomId." },
      },
      required: ["roomId"],
      additionalProperties: false,
    },
  ),
];

/** Compact, token-friendly view of a RiskItem that keeps all monetary figures. */
function projectRisk(r: RiskItem) {
  return {
    occId: r.occId,
    roomId: r.roomId,
    officeName: r.officeName,
    location: `${r.buildingName} ${r.floor}`.trim(),
    companyName: r.companyName,
    clientId: r.clientId,
    accountStatus: r.accountStatus,
    accountTier: r.accountTier,
    capacity: r.capacity,
    billableSeats: r.billableSeats,
    unusedSeats: r.unusedSeats,
    monthlyRate: r.monthlyRate,
    dailyRate: r.dailyRate,
    leaseTermMonths: r.leaseTermMonths,
    expirationDate: r.expirationDate,
    daysToExpiry: r.signals.daysToExpiry,
    riskScore: r.riskScore,
    riskBand: r.riskBand,
    revenueAtRisk7d: r.revenueAtRisk7d,
    topSignals: r.topSignals,
  };
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function asInt(v: unknown, min: number, max: number): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const n = Math.trunc(v);
  return n >= min && n <= max ? n : undefined;
}

export type ToolExecResult = {
  ok: boolean;
  /** JSON string to feed back to the model. */
  content: string;
  /** Whether the model's turn should end after this (always false here). */
};

/** Execute a tool by name. Returns JSON content for the model. */
export function executeTool(name: string, args: Record<string, unknown>): ToolExecResult {
  try {
    switch (name) {
      case "get_recovery_actions":
        return ok(getActions());

      case "get_totals":
        return ok(getAnalysis().totals);

      case "get_vacancies":
        return ok(getVacancies());

      case "get_risk_items": {
        const band = asString(args.band);
        const client = asString(args.client);
        const limit = asInt(args.limit, 1, 50);
        const items = getRiskItems({ band, client, limit });
        return ok(items.map(projectRisk));
      }

      case "build_email_draft": {
        const id = asString(args.id);
        if (!id) return fail("`id` is required.");
        const draft = emailDraftFor(id);
        return draft ? ok(draft) : fail(`No at-risk account found for id: ${id}`);
      }

      case "build_resale_listing": {
        const roomId = asString(args.roomId);
        if (!roomId) return fail("`roomId` is required.");
        const listing = resaleListingFor(roomId);
        return listing
          ? ok(listing)
          : fail(`No vacant room found for roomId: ${roomId}`);
      }

      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Tool execution failed.");
  }
}

function ok(data: unknown): ToolExecResult {
  return { ok: true, content: JSON.stringify(data) };
}

function fail(message: string): ToolExecResult {
  return { ok: false, content: JSON.stringify({ error: message }) };
}
