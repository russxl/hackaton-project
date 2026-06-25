import { getAnalysis } from "@/lib/service";
import { checkDataset } from "@/lib/validate";
import { json, preflight, badRequest, readBody } from "@/lib/http";
import type { Dataset } from "@/lib/types";

export function OPTIONS() {
  return preflight();
}

export function GET() {
  return json(getAnalysis());
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await readBody(request);
  } catch {
    return badRequest("Request body is not valid JSON");
  }
  const check = checkDataset(body);
  if (!check.ok) return badRequest("Invalid dataset", check.issues);
  // Forward the ORIGINAL object so no fields are stripped by validation.
  return json(getAnalysis(body as unknown as Dataset));
}
