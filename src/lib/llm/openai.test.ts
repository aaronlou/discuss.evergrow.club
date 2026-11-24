import { describe, expect, it, vi } from 'vitest';

import type { ProviderRecord } from '../types';
import { streamOpenAi } from './openai';
import { LLMError, type ModelEvent, type StreamRequest } from './types';

const provider: ProviderRecord = {
  id: 'prov-test',
  name: 'Test',
  kind: 'openai',
  baseUrl: 'https://example.com/v1',
  apiKey: 'sk-test',
  models: ['test-model'],
  createdAt: '',
  updatedAt: '',
};

function makeRequest(overrides: Partial<StreamRequest> = {}): StreamRequest {
  return {
    provider,
    model: 'test-model',
    system: 'system prompt',
    turns: [{ role: 'user', content: '你好' }],
    temperature: 0.7,
    ...overrides,
  };
}

function responseFrom(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status });
}

async function collect(request: StreamRequest): Promise<ModelEvent[]> {
  const events: ModelEvent[] = [];
  for await (const event of streamOpenAi(request)) events.push(event);
  return events;
}

describe('streamOpenAi', () => {
  it('streams text deltas and stop reasons', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        responseFrom([
          'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
          'data: [DONE]\n\n',
        ]),
      ),
    );

    const events = await collect(makeRequest());
    expect(events.filter((event) => event.type === 'text').map((event) => event.text).join('')).toBe(
      '你好',
    );
    expect(events.some((event) => event.type === 'finish' && event.reason === 'stop')).toBe(true);
  });

  it('surfaces provider errors with a helpful message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { message: 'invalid key' } }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    let caught: unknown;
    try {
      await collect(makeRequest());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(LLMError);
    expect((caught as LLMError).status).toBe(401);
    expect((caught as Error).message).toContain('API Key 无效');
  });

  it('requires an API key before touching the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      collect(makeRequest({ provider: { ...provider, apiKey: null } })),
    ).rejects.toThrow(/API Key/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
