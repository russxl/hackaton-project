import { getRiskItems } from "@/lib/service";
import { checkDataset } from "@/lib/validate";
import { json, preflight, badRequest, readBody } from "@/lib/http";
import type { Dataset } from "@/lib/types";

export function OPTIONS() {
  return preflight();
}

function parseFilters(request: Request) {
  const { searchParams } = new URL(request.url);
  const band = searchParams.get("band") ?? undefined;
  const client = searchParams.get("client") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  return {
    band,
    client,
    limit: Number.isFinite(limit) ? limit : undefined,
  };
}

export function GET(request: Request) {
  return json(getRiskItems(parseFilters(request)));
}

export async function POST(request: Request) {
  const filters = parseFilters(request);
  let body: Record<string, unknown>;
  try {
    body = await readBody(request);
  } catch {
    return badRequest("Request body is not valid JSON");
  }
  const check = checkDataset(body);
  if (!check.ok) return badRequest("Invalid dataset", check.issues);
  return json(getRiskItems({ ...filters, dataset: body as unknown as Dataset }));
}
