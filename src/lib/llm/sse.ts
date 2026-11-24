export interface SseFrame {
  event?: string;
  data: string;
}

/**
 * Minimal SSE reader that tolerates chunk boundaries, CRLF and multi-line data.
 * Exported for unit tests.
 */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseFrame> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const frame = parseFrame(raw);
        if (frame) yield frame;
        boundary = buffer.indexOf('\n\n');
      }
    }

    buffer += decoder.decode();
    buffer = buffer.replace(/\r\n/g, '\n');
    if (buffer.trim()) {
      const frame = parseFrame(buffer);
      if (frame) yield frame;
    }
  } finally {
    reader.releaseLock();
  }
}

export function parseFrame(raw: string): SseFrame | null {
  let event: string | undefined;
  const dataLines: string[] = [];

  for (const line of raw.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
      continue;
    }
    // Some gateways send bare JSON payloads without the `data:` prefix.
    if (line.trim().startsWith('{') || line.trim() === '[DONE]') {
      dataLines.push(line.trim());
    }
  }

  if (dataLines.length === 0) return event ? { event, data: '' } : null;
  return { event, data: dataLines.join('\n') };
}

export function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};
