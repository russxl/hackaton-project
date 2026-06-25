import rawData from "@/data/dataset.json";
import { analyse } from "./engine";
import { buildEmailDraft, buildResaleListing, buildPipelineWebhook } from "./actions";
import type {
  Dataset,
  Analysis,
  RiskItem,
  VacantItem,
  ActionItem,
} from "./types";
import type { EmailDraft, WebhookPayload, ResaleListing } from "./actions";

/**
 * Service facade — single source of truth shared by the REST routes and the
 * MCP server. Everything funnels through the pure `analyse()` engine. Pass a
 * custom `dataset` to run on supplied data; omit it to use the bundled demo.
 */

export const defaultDataset = rawData as Dataset;

export function getAnalysis(dataset?: Dataset): Analysis {
  return analyse(dataset ?? defaultDataset);
}

export type RiskFilter = {
  band?: string;
  client?: string;
  limit?: number;
  dataset?: Dataset;
};

export function getRiskItems(filter: RiskFilter = {}): RiskItem[] {
  let items = getAnalysis(filter.dataset).riskItems;

  if (filter.band) {
    const band = filter.band.toLowerCase();
    items = items.filter((r) => r.riskBand.toLowerCase() === band);
  }
  if (filter.client) {
    const q = filter.client.toLowerCase();
    items = items.filter(
      (r) =>
        r.clientId.toLowerCase() === q ||
        r.companyName.toLowerCase().includes(q),
    );
  }
  if (filter.limit && filter.limit > 0) {
    items = items.slice(0, filter.limit);
  }
  return items;
}

export function getVacancies(dataset?: Dataset): VacantItem[] {
  return getAnalysis(dataset).vacantItems;
}

export function getActions(dataset?: Dataset): ActionItem[] {
  return getAnalysis(dataset).actions;
}

/** Look up a risk item by occId, roomId, or clientId (first match). */
export function lookupRisk(id: string, dataset?: Dataset): RiskItem | undefined {
  return getAnalysis(dataset).riskItems.find(
    (r) => r.occId === id || r.roomId === id || r.clientId === id,
  );
}

export function lookupVacancy(
  roomId: string,
  dataset?: Dataset,
): VacantItem | undefined {
  return getAnalysis(dataset).vacantItems.find((v) => v.roomId === roomId);
}

/** Build a re-engagement email draft for a risk item id. */
export function emailDraftFor(
  id: string,
  dataset?: Dataset,
): EmailDraft | undefined {
  const item = lookupRisk(id, dataset);
  return item ? buildEmailDraft(item) : undefined;
}

/** Build a broker/CRM pipeline webhook payload for a risk item id. */
export function pipelineWebhookFor(
  id: string,
  dataset?: Dataset,
): WebhookPayload | undefined {
  const item = lookupRisk(id, dataset);
  return item ? buildPipelineWebhook(item) : undefined;
}

/** Build a resale listing for a vacant room id. */
export function resaleListingFor(
  roomId: string,
  dataset?: Dataset,
): ResaleListing | undefined {
  const v = lookupVacancy(roomId, dataset);
  return v ? buildResaleListing(v) : undefined;
}

/* ------------------------------------------------------------------ *
 * Simulated action execution
 * Fires the recovery plays for real-looking results WITHOUT any
 * external side effects (no emails sent, no webhooks posted). Every
 * result is tagged `simulated: true`. Safe for demos.
 * ------------------------------------------------------------------ */

export type ActionKey = "reengagement" | "resale" | "broker";

const ACTION_KEYS: ActionKey[] = ["reengagement", "resale", "broker"];

export function isActionKey(v: string): v is ActionKey {
  return (ACTION_KEYS as string[]).includes(v);
}

export type ExecutionResult = {
  action: ActionKey;
  title: string;
  executed: true;
  simulated: true;
  channel: string;
  at: string;
  count: number;
  estimatedRecovery: number;
  results: Array<Record<string, unknown>>;
  summary: string;
};

export function executeAction(
  key: ActionKey,
  dataset?: Dataset,
): ExecutionResult | undefined {
  const analysis = getAnalysis(dataset);
  const action = analysis.actions.find((a) => a.key === key);
  if (!action) return undefined;

  const at = new Date().toISOString();
  const results: Array<Record<string, unknown>> = [];
  let channel = "";

  if (key === "reengagement") {
    channel = "email · Resend (simulated)";
    action.targets.forEach((id, i) => {
      const item = analysis.riskItems.find(
        (r) => r.roomId === id || r.clientId === id || r.occId === id,
      );
      if (!item) return;
      const draft = buildEmailDraft(item);
      results.push({
        target: id,
        client: item.companyName,
        to: draft.to,
        subject: draft.subject,
        status: "sent",
        messageId: `sim-reengagement-${i + 1}`,
      });
    });
  } else if (key === "resale") {
    channel = "FlexDesk Marketplace (simulated)";
    action.targets.forEach((id, i) => {
      const v = analysis.vacantItems.find((x) => x.roomId === id);
      if (v) {
        const listing = buildResaleListing(v);
        results.push({
          target: id,
          headline: listing.headline,
          marketplace: listing.marketplace,
          status: "listed",
          listingId: `sim-resale-${i + 1}`,
        });
      } else {
        const r = analysis.riskItems.find((x) => x.roomId === id);
        results.push({
          target: id,
          headline: r
            ? `Underutilised capacity — ${r.officeName}, ${r.buildingName} ${r.floor}`
            : `Room ${id}`,
          marketplace: "FlexDesk Marketplace",
          status: "listed",
          listingId: `sim-resale-${i + 1}`,
        });
      }
    });
  } else {
    channel = "CRM webhook (simulated)";
    action.targets.forEach((id, i) => {
      const item = analysis.riskItems.find(
        (r) => r.roomId === id || r.clientId === id || r.occId === id,
      );
      if (!item) return;
      const payload = buildPipelineWebhook(item);
      results.push({
        target: id,
        event: payload.event,
        endpoint: "https://crm.internal/hooks/pipeline",
        status: "dispatched",
        deliveryId: `sim-broker-${i + 1}`,
      });
    });
  }

  const verb =
    key === "reengagement" ? "Sent" : key === "resale" ? "Listed" : "Dispatched";
  const noun =
    key === "reengagement"
      ? "re-engagement emails"
      : key === "resale"
        ? "marketplace listings"
        : "pipeline alerts";

  return {
    action: key,
    title: action.title,
    executed: true,
    simulated: true,
    channel,
    at,
    count: results.length,
    estimatedRecovery: action.estimatedRecovery,
    results,
    summary: `${verb} ${results.length} ${noun} (simulated — no external calls made).`,
  };
}
