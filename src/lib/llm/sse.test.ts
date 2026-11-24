import { describe, expect, it } from 'vitest';

import { parseSseStream, sseFrame } from './sse';

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(chunks: string[]) {
  const frames = [];
  for await (const frame of parseSseStream(streamFrom(chunks))) frames.push(frame);
  return frames;
}

describe('parseSseStream', () => {
  it('parses events split across arbitrary chunk boundaries', async () => {
    const frames = await collect([
      'event: mess',
      'age\nda',
      'ta: {"a":1}\n',
      '\ndata: sec',
      'ond\n\n',
    ]);
    expect(frames).toEqual([
      { event: 'message', data: '{"a":1}' },
      { event: undefined, data: 'second' },
    ]);
  });

  it('supports CRLF, comments and multi-line data', async () => {
    const frames = await collect([
      ': ping\r\n\r\n',
      'event: delta\r\ndata: line 1\r\ndata: line 2\r\n\r\n',
      ': keep-alive\r\n\r\n',
      'data: [DONE]\r\n\r\n',
    ]);
    expect(frames).toEqual([
      { event: 'delta', data: 'line 1\nline 2' },
      { event: undefined, data: '[DONE]' },
    ]);
  });

  it('emits a trailing frame without a final separator', async () => {
    expect(await collect(['data: tail'])).toEqual([{ event: undefined, data: 'tail' }]);
  });

  it('accepts bare JSON payloads from non-standard gateways', async () => {
    expect(await collect(['{"choices":[]}\n\n'])).toEqual([
      { event: undefined, data: '{"choices":[]}' },
    ]);
  });
});

describe('sseFrame', () => {
  it('serializes a single event', () => {
    expect(sseFrame('delta', { text: '你' })).toBe('event: delta\ndata: {"text":"你"}\n\n');
  });
});
