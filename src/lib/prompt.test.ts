import { describe, expect, it } from 'vitest';

import { buildSystemPrompt, buildTurns, stripSpeakerPrefix } from './prompt';
import type { MessageView, Participant, RoomRecord } from './types';

function participant(overrides: Partial<Participant> & { agentId: string; name: string }): Participant {
  return {
    emoji: '🌾',
    color: '#C2452A',
    persona: '产品思考者。关注真实用户。',
    providerId: 'prov-mock',
    providerName: '演示模式',
    providerKind: 'mock',
    providerHasKey: false,
    model: 'mock-rhetorician',
    temperature: 0.8,
    enabled: true,
    position: 0,
    ...overrides,
  };
}

function message(overrides: Partial<MessageView> & Pick<MessageView, 'role' | 'content'>): MessageView {
  const agentId = overrides.agentId ?? null;
  return {
    id: `msg-${Math.random()}`,
    seq: 0,
    roomId: 'room-1',
    agentId,
    agent:
      agentId === null
        ? null
        : {
            id: agentId,
            name: agentId === 'a' ? '阿澜' : '图灵',
            emoji: '🌾',
            color: '#C2452A',
            model: 'mock',
            providerName: '演示模式',
          },
    status: 'complete',
    error: null,
    inputTokens: null,
    outputTokens: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const room: RoomRecord = {
  id: 'room-1',
  title: 'AI 群聊该长什么样？',
  createdAt: '',
  updatedAt: '',
};

describe('buildTurns', () => {
  it('maps own messages to assistant and labels everyone else', () => {
    const turns = buildTurns('a', [
      message({ role: 'user', content: '开场' }),
      message({ role: 'agent', agentId: 'a', content: '我先说' }),
      message({ role: 'agent', agentId: 'b', content: '我补充' }),
    ]);

    expect(turns).toEqual([
      { role: 'user', content: '主持人：开场' },
      { role: 'assistant', content: '我先说' },
      { role: 'user', content: '【图灵】我补充' },
    ]);
  });

  it('keeps different speakers as separate turns', () => {
    const turns = buildTurns('a', [
      message({ role: 'agent', agentId: 'b', content: '第一句' }),
      message({ role: 'agent', agentId: 'c', content: '第二句' }),
    ]);

    expect(turns).toHaveLength(2);
    expect(turns.map((turn) => turn.role)).toEqual(['user', 'user']);
    expect(turns[0].content).toContain('第一句');
    expect(turns[1].content).toContain('第二句');
  });

  it('ignores incomplete and empty messages', () => {
    const turns = buildTurns('a', [
      message({ role: 'user', content: '有效' }),
      message({ role: 'agent', agentId: 'b', content: '还在写', status: 'streaming' }),
      message({ role: 'agent', agentId: 'c', content: '   ' }),
    ]);

    expect(turns).toEqual([{ role: 'user', content: '主持人：有效' }]);
  });

  it('trims by character budget from the newest message', () => {
    const turns = buildTurns(
      'a',
      [
        message({ role: 'user', content: '很早以前的话' }),
        message({ role: 'agent', agentId: 'a', content: '较新的发言' }),
      ],
      { maxChars: 5 },
    );

    // Only the newest turn fits; the leading assistant turn gets a user preamble.
    expect(turns[0].role).toBe('user');
    expect(turns[turns.length - 1]).toEqual({ role: 'assistant', content: '较新的发言' });
    expect(turns.some((turn) => turn.content.includes('很早以前的话'))).toBe(false);
  });
});

describe('stripSpeakerPrefix', () => {
  it('removes an exact leading speaker label but keeps the name inside a sentence', () => {
    expect(stripSpeakerPrefix('【图灵】风险在于目标不清。', '图灵')).toBe('风险在于目标不清。');
    expect(stripSpeakerPrefix('**图灵**：我认为要拆开看。', '图灵')).toBe('我认为要拆开看。');
    expect(stripSpeakerPrefix('图灵：我补充一点。', '图灵')).toBe('我补充一点。');
    expect(stripSpeakerPrefix('图灵测试很有意思。', '图灵')).toBe('图灵测试很有意思。');
  });
});

describe('buildSystemPrompt', () => {
  it('contains the room, the character and who is listening', () => {
    const prompt = buildSystemPrompt(
      participant({ agentId: 'a', name: '阿澜' }),
      room,
      [
        participant({ agentId: 'a', name: '阿澜', persona: '产品思考者。关注用户。' }),
        participant({ agentId: 'b', name: '图灵', enabled: false, persona: '工程师。' }),
      ],
    );

    expect(prompt).toContain('AI 群聊该长什么样？');
    expect(prompt).toContain('你是「阿澜」');
    expect(prompt).toContain('图灵（本轮旁听）');
    expect(prompt).toContain('产品思考者');
    expect(prompt).toContain('现在轮到你发言');
  });
});
