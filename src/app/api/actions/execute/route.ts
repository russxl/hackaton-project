import { executeAction, isActionKey } from "@/lib/service";
import { json, preflight, badRequest, notFound, readBody } from "@/lib/http";

export function OPTIONS() {
  return preflight();
}

/**
 * Simulated execution of a recovery action.
 * `key` may come from the query string (?key=reengagement) or the JSON body
 * ({ "key": "reengagement" }). No external side effects are performed.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  let body: Record<string, unknown> = {};
  try {
    body = await readBody(request);
  } catch {
    return badRequest("Request body is not valid JSON");
  }

  const key = (searchParams.get("key") || (body.key as string) || "").trim();
  if (!key) {
    return badRequest("Missing 'key' — one of: reengagement, resale, broker");
  }
  if (!isActionKey(key)) {
    return badRequest(`Invalid key: ${key}`, [
      "Allowed values: reengagement, resale, broker",
    ]);
  }

  const result = executeAction(key);
  if (!result) return notFound(`No action available for key: ${key}`);
  return json(result);
}
