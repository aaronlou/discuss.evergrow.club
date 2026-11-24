import { parseSseStream } from './llm/sse';
import { ApiError } from './api-client';

export interface StreamEvent {
  event: string;
  data: unknown;
}

/**
 * Opens a POST SSE stream and hands decoded events to the callback.
 * Resolves when the server closes the stream; throws ApiError for pre-stream errors.
 */
export async function openEventStream(
  url: string,
  body: unknown,
  onEvent: (event: string, data: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new ApiError(payload?.error?.message ?? `请求失败（${response.status}）`, response.status);
  }
  if (!response.body) throw new ApiError('连接中断，没有收到数据流', 0);

  for await (const frame of parseSseStream(response.body)) {
    if (!frame.data) continue;
    let data: unknown;
    try {
      data = JSON.parse(frame.data);
    } catch {
      continue;
    }
    onEvent(frame.event ?? 'message', data);
  }
}
