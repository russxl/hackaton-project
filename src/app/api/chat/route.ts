import { authenticate, isAuthError, principalKey } from "@/lib/auth/authenticate";
import { rateLimit } from "@/lib/ratelimit";
import { json, preflight, badRequest } from "@/lib/http";
import { runChat, isOpenAIConfigured, describeError, type ChatMessage } from "@/lib/chat/runner";
import { sseResponse } from "@/lib/chat/sse";

/**
 * POST /api/chat
 *
 * Conversational, streamed (SSE) access to the DeskYield engine via OpenAI
 * tool-calling. Accepts either an API key (server-to-server) or a visitor
 * token (browser widget) as a Bearer credential. Strictly read-only.
 *
 * Request body: { messages: { role: 'user'|'assistant', content: string }[] }
 * Response:     text/event-stream of { type, ... } frames (see src/lib/chat/sse.ts)
 */

export function OPTIONS() {
  return preflight();
}

function authErrorBody(code: string, message: string, status: number) {
  return json({ error: code, message }, { status });
}

export async function POST(request: Request) {
  // 1. Auth — verify the credential (API key or visitor token).
  const principal = authenticate(request);
  if (isAuthError(principal)) {
    return authErrorBody(principal.code, principal.message, principal.status);
  }

  // 2. Rate limit — protect the OpenAI spend, per principal.
  const rl = rateLimit(principalKey(principal));
  if (!rl.ok) {
    return json(
      { error: "rate_limited", message: "Too many chat requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // 3. Guard — the OpenAI key must be configured server-side.
  if (!isOpenAIConfigured()) {
    return json(
      { error: "chat_unavailable", message: "OpenAI is not configured on the server." },
      { status: 503 },
    );
  }

  // 4. Parse + validate the message history.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body is not valid JSON");
  }

  const messages = extractMessages(body);
  if (!messages.ok) return badRequest(messages.message);

  // 5. Stream the conversation.
  return sseResponse((emit) => runChat(messages.value, emit).catch((err) => {
    emit({ type: "error", message: describeError(err) });
  }));
}

type MessagesResult =
  | { ok: true; value: ChatMessage[] }
  | { ok: false; message: string };

function extractMessages(body: unknown): MessagesResult {
  if (!body || typeof body !== "object" || !Array.isArray((body as { messages?: unknown }).messages)) {
    return { ok: false, message: "Expected { messages: [...] }." };
  }
  const raw = (body as { messages: unknown[] }).messages;
  if (raw.length === 0) {
    return { ok: false, message: "`messages` must contain at least one message." };
  }
  if (raw.length > 50) {
    return { ok: false, message: "`messages` is limited to 50 entries." };
  }

  const out: ChatMessage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, message: "Each message must be an object." };
    }
    const msg = entry as { role?: unknown; content?: unknown };
    if (msg.role !== "user" && msg.role !== "assistant") {
      return { ok: false, message: "Message `role` must be 'user' or 'assistant'." };
    }
    if (typeof msg.content !== "string" || msg.content.trim() === "") {
      return { ok: false, message: "Message `content` must be a non-empty string." };
    }
    if (msg.content.length > 4000) {
      return { ok: false, message: "Message `content` exceeds 4000 characters." };
    }
    out.push({ role: msg.role, content: msg.content });
  }

  if (out[out.length - 1].role !== "user") {
    return { ok: false, message: "The last message must have role 'user'." };
  }
  return { ok: true, value: out };
}
