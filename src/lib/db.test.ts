import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type DB } from './db';
import { AppError } from './errors';
import {
  createAgent,
  deleteAgent,
  listAgentViews,
  listAgents,
} from './repo/agents';
import {
  createAgentPlaceholder,
  createUserMessage,
  getMessage,
  listMessages,
  updateMessage,
} from './repo/messages';
import {
  createProvider,
  deleteProvider,
  listProviders,
  toPublicProvider,
} from './repo/providers';
import {
  createRoom,
  getRoomBundle,
  listParticipants,
  listRoomSummaries,
  updateRoom,
} from './repo/rooms';

let db: DB | null = null;

afterEach(() => {
  db?.close();
  db = null;
});

describe('data layer', () => {
  it('seeds three agents and a first salon', () => {
    db = openDatabase(':memory:');
    const agents = listAgents(db);
    expect(agents).toHaveLength(3);
    expect(agents.map((agent) => agent.name)).toEqual(['阿澜', '图灵', '苏格拉底']);

    const rooms = listRoomSummaries(db);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].title).toContain('第一次圆桌');
    expect(rooms[0].participants).toHaveLength(3);
    expect(rooms[0].messageCount).toBe(0);

    const views = listAgentViews(db);
    expect(views[0].provider.kind).toBe('mock');
    expect(views[0].provider.hasKey).toBe(false);
  });

  it('seeds a Qwen provider from DASHSCOPE_API_KEY', () => {
    const previous = process.env.DASHSCOPE_API_KEY;
    process.env.DASHSCOPE_API_KEY = 'sk-test-qwen';
    try {
      db = openDatabase(':memory:');
      const qwen = listProviders(db).find((provider) => provider.id === 'prov-qwen');
      expect(qwen).toBeDefined();
      expect(qwen?.name).toBe('通义千问');
      expect(qwen?.baseUrl).toContain('dashscope.aliyuncs.com');
      expect(qwen?.models).toContain('qwen4-max');
    } finally {
      if (previous === undefined) delete process.env.DASHSCOPE_API_KEY;
      else process.env.DASHSCOPE_API_KEY = previous;
    }
  });

  it('seeds a Kimi provider from MOONSHOT_API_KEY', () => {
    const previous = process.env.MOONSHOT_API_KEY;
    process.env.MOONSHOT_API_KEY = 'sk-test-kimi';
    try {
      db = openDatabase(':memory:');
      const kimi = listProviders(db).find((provider) => provider.id === 'prov-kimi');
      expect(kimi).toBeDefined();
      expect(kimi?.baseUrl).toBe('https://api.moonshot.cn/v1');
      expect(kimi?.models).toContain('kimi-k3.1-pro');
    } finally {
      if (previous === undefined) delete process.env.MOONSHOT_API_KEY;
      else process.env.MOONSHOT_API_KEY = previous;
    }
  });

  it('creates rooms, stores messages and preserves history when an agent leaves', () => {
    db = openDatabase(':memory:');
    const agents = listAgents(db);
    const room = createRoom({ title: '测试圆桌', agentIds: [agents[0].id, agents[1].id] }, db);

    createUserMessage(room.id, '你好', db);
    const placeholder = createAgentPlaceholder(room.id, agents[0].id, db);
    updateMessage(placeholder.id, { content: '我先说', status: 'complete' }, db);

    const messages = listMessages(room.id, db);
    expect(messages.map((message) => message.role)).toEqual(['user', 'agent']);
    expect(messages[1].agent?.name).toBe(agents[0].name);

    const bundle = getRoomBundle(room.id, db);
    expect(bundle.participants).toHaveLength(2);

    deleteAgent(agents[0].id, db);
    const departed = getMessage(placeholder.id, db);
    expect(departed.agent).toBeNull();
    expect(departed.content).toBe('我先说');
  });

  it('toggles who participates in the next round', () => {
    db = openDatabase(':memory:');
    const agents = listAgents(db);
    const room = createRoom({ title: '席位测试', agentIds: agents.map((agent) => agent.id) }, db);

    updateRoom(room.id, { activeAgentIds: [agents[2].id] }, db);
    const participants = listParticipants(room.id, db);
    expect(participants.filter((participant) => participant.enabled)).toHaveLength(1);
    expect(participants.find((participant) => participant.agentId === agents[2].id)?.enabled).toBe(
      true,
    );

    expect(() => updateRoom(room.id, { activeAgentIds: [] }, db!)).toThrow(AppError);
  });

  it('masks keys and refuses to delete providers still in use', () => {
    db = openDatabase(':memory:');
    const provider = createProvider(
      {
        name: '测试接入',
        kind: 'openai',
        baseUrl: 'https://example.com/v1',
        apiKey: 'sk-super-secret-1234',
        models: ['test-model'],
      },
      db,
    );

    const publicView = toPublicProvider(provider);
    expect(publicView.hasKey).toBe(true);
    expect(publicView.keyHint).not.toContain('super-secret');
    expect(publicView.keyHint.endsWith('1234')).toBe(true);

    expect(() => deleteProvider(provider.id, db!)).not.toThrow();

    const again = createProvider(
      {
        name: '被引用的接入',
        kind: 'openai',
        baseUrl: 'https://example.com/v1',
        apiKey: 'sk-12345678',
        models: ['m'],
      },
      db,
    );
    createAgent(
      {
        name: '依赖者',
        emoji: '🧩',
        color: '#2B4B6F',
        persona: '',
        providerId: again.id,
        model: 'm',
        temperature: 0.8,
      },
      db,
    );

    expect(() => deleteProvider(again.id, db!)).toThrow(AppError);
  });
});
