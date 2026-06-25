import OpenAI, { APIError } from "openai";
import { getOpenAIKey, getModel } from "@/lib/auth/config";
import { CHAT_TOOLS, executeTool } from "./tools";

type ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;
type ChatCompletionMessageToolCall = OpenAI.ChatCompletionMessageToolCall;

/**
 * The chat runner. A single request runs a bounded tool-calling loop:
 *
 *   stream turn -> forward text deltas to the client -> if the model emitted
 *   tool calls, execute each read-only tool against `service.ts`, feed the
 *   results back, and stream another turn. End when the model stops calling
 *   tools.
 *
 * All numbers the model can possibly cite originate from `executeTool`, which
 * wraps the deterministic engine. The model narrates; the engine computes.
 */

export type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "tool_call"; name: string }
  | { type: "tool_result"; name: string; ok: boolean }
  | { type: "done" }
  | { type: "error"; message: string };

export type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_TOOL_ROUNDS = 6;

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const key = getOpenAIKey();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it in the environment to enable chat.",
    );
  }
  if (!cachedClient) cachedClient = new OpenAI({ apiKey: key });
  return cachedClient;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getOpenAIKey());
}

const SYSTEM_PROMPT = [
  "You are DeskYield, an analyst for a coworking/serviced-office operator.",
  "You answer questions about reserved seats at risk of going unused in the next 7 days,",
  "cold-vacant rooms, ranked revenue-recovery actions, and PHP (Philippine Peso) figures.",
  "",
  "STRICT RULES:",
  "- You are READ-ONLY. You can never send email, publish listings, or change data.",
  "- NEVER invent numbers. For ANY figure (rates, gaps, revenue, scores, dates, counts),",
  "  call a tool and report exactly what it returns. If a tool returns nothing, say so.",
  "- Always express money in Philippine Peso using the peso sign (e.g. ₱103,345.45).",
  "- When you reference a room or account, include its id (roomId / occId / clientId).",
  "- Prefer targeted tools (get_risk_items, get_vacancies, get_recovery_actions) over",
  "  get_totals; only summarize headline KPIs when asked for the big picture.",
  "- Keep answers concise and skimmable. Use short tables or bullets when comparing rooms.",
  "- If a user asks to actually send/publish something, explain it's out of scope here",
  "  and show the draft artifact instead (build_email_draft / build_resale_listing).",
].join("\n");

type AccToolCall = {
  id: string;
  name: string;
  arguments: string;
};

function messageText(msg: ChatMessage): ChatCompletionMessageParam {
  return { role: msg.role, content: msg.content };
}

/**
 * Run a chat turn. Emits events via `emit`. Resolves when the model stops
 * calling tools (or the round cap is hit).
 */
export async function runChat(
  history: ChatMessage[],
  emit: (event: ChatEvent) => void,
): Promise<void> {
  const client = getOpenAIClient();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map(messageText),
  ];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const toolCalls = new Map<number, AccToolCall>();

    const stream = await client.chat.completions.create({
      model: getModel(),
      messages,
      tools: CHAT_TOOLS,
      stream: true,
    });

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta;

      if (typeof delta?.content === "string" && delta.content) {
        emit({ type: "delta", text: delta.content });
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          const acc = toolCalls.get(idx) ?? {
            id: "",
            name: "",
            arguments: "",
          };
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name && !acc.name) acc.name = tc.function.name;
          if (tc.function?.arguments) acc.arguments += tc.function.arguments;
          toolCalls.set(idx, acc);
        }
      }
    }

    const calls = [...toolCalls.values()].filter((c) => c.id || c.name);

    // No tool calls -> the model produced its final answer; we're done.
    if (calls.length === 0) {
      emit({ type: "done" });
      return;
    }

    // Append the assistant turn (with tool calls) to the running message list.
    const assistantToolCalls: ChatCompletionMessageToolCall[] = calls.map((c) => ({
      id: c.id,
      type: "function",
      function: { name: c.name, arguments: c.arguments || "{}" },
    }));
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: assistantToolCalls,
    } as ChatCompletionMessageParam);

    // Execute each tool and append the tool result message.
    for (const call of calls) {
      emit({ type: "tool_call", name: call.name });
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = call.arguments
          ? (JSON.parse(call.arguments) as Record<string, unknown>)
          : {};
      } catch {
        // Malformed args — let the tool's own validation report the issue.
      }
      const result = executeTool(call.name, parsedArgs);
      emit({ type: "tool_result", name: call.name, ok: result.ok });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.content,
      });
    }

    // Loop: stream the next turn with tool results in context.
  }

  // Exceeded the tool-round cap; stop gracefully.
  emit({
    type: "delta",
    text: "\n\n_(Reached the tool-call limit for this turn; stopping here.)_",
  });
  emit({ type: "done" });
}

/** Normalize an OpenAI error into a user-safe message. */
export function describeError(err: unknown): string {
  if (err instanceof APIError) {
    return `OpenAI error (${err.status ?? "?"}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Unexpected error.";
}
