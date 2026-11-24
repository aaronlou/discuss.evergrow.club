import { errorMessage } from './errors';
import { SSE_HEADERS, sseFrame } from './llm/sse';
import type { Emit } from './round';

export const PING_INTERVAL_MS = 15_000;

/**
 * Wraps a long-running round in an SSE response. Handles client disconnects,
 * keep-alive pings, fatal errors and stream cleanup.
 */
export function createSseResponse(
  request: Request,
  abort: AbortController,
  runner: (send: Emit, signal: AbortSignal) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const send: Emit = (event, data) => {
        if (closed) return;
        try {
          streamController.enqueue(encoder.encode(sseFrame(event, data)));
        } catch {
          closed = true;
        }
      };

      const onAbort = () => abort.abort();
      request.signal.addEventListener('abort', onAbort);
      const ping = setInterval(() => {
        if (closed) return;
        try {
          streamController.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          closed = true;
        }
      }, PING_INTERVAL_MS);

      try {
        await runner(send, abort.signal);
      } catch (error) {
        send('fatal', { message: errorMessage(error) });
      } finally {
        clearInterval(ping);
        request.signal.removeEventListener('abort', onAbort);
        closed = true;
        try {
          streamController.close();
        } catch {
          // already closed by the client
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
