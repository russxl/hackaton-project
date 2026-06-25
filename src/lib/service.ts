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
