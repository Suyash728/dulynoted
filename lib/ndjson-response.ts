import type { StreamEvent } from './types';

/** Wraps an event generator as an NDJSON streaming Response. A crash becomes a final error event. */
export function ndjsonResponse(events: AsyncIterable<StreamEvent>, label: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(ev)}\n`));
      try {
        for await (const ev of events) send(ev);
      } catch (err) {
        console.error(`[${label}] stream crashed:`, err instanceof Error ? err.message : 'unknown');
        send({ type: 'error', error: 'Something went wrong. Please retry.' });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}
