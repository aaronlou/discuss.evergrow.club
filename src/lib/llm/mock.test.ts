import { describe, expect, it } from 'vitest';

import { buildMockReply } from './mock';
import type { StreamRequest } from './types';

function request(overrides: Partial<StreamRequest> = {}): StreamRequest {
  return {
    provider: {
      id: 'prov-mock',
      name: '演示模式',
      kind: 'mock',
      baseUrl: '',
      apiKey: null,
      models: ['mock'],
      createdAt: '',
      updatedAt: '',
    },
    model: 'mock',
    system: '',
    turns: [{ role: 'user', content: '主持人：AI 群聊到底该像 QQ 群还是圆桌？' }],
    temperature: 0.8,
    speakerName: '阿澜',
    topic: 'AI 群聊该长什么样？',
    ...overrides,
  };
}

describe('buildMockReply', () => {
  it('stays in character and references the latest prompt', () => {
    const reply = buildMockReply(request());
    expect(reply).toContain('AI 群聊到底该像 QQ 群还是圆桌');
    expect(reply.length).toBeGreaterThan(80);
    expect(reply).toContain('？');
  });

  it('is deterministic for the same context', () => {
    expect(buildMockReply(request())).toBe(buildMockReply(request()));
  });
});
