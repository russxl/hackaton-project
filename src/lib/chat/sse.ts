import type { ChatEvent } from "./runner";

const ENCODER = new TextEncoder();

/** Serialize one SSE `data:` frame: `data: {json}\n\n`. */
export function sseFrame(event: ChatEvent): Uint8Array {
  return ENCODER.encode(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Build a streaming Response from an async producer of ChatEvents.
 * Frames are flushed eagerly so the client sees tokens as they arrive.
 */
export function sseResponse(produce: (emit: (e: ChatEvent) => void) => Promise<void>): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ChatEvent) => {
        try {
          controller.enqueue(sseFrame(event));
        } catch {
          /* controller already closed */
        }
      };
      try {
        await produce(emit);
      } catch (err) {
        emit({
          type: "error",
          message: err instanceof Error ? err.message : "Stream failed.",
        });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
