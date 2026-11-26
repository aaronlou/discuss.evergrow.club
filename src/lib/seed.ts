import type { DB } from './db';

interface SeedProvider {
  id: string;
  name: string;
  kind: 'openai' | 'anthropic' | 'mock';
  baseUrl: string;
  apiKey: string | null;
  models: string[];
  defaultModel: string;
}

const MOCK_PROVIDER: SeedProvider = {
  id: 'prov-mock',
  name: '本地 Mock',
  kind: 'mock',
  baseUrl: '',
  apiKey: null,
  models: ['mock-rhetorician'],
  defaultModel: 'mock-rhetorician',
};

const SEED_AGENTS = [
  {
    id: 'agent-alan',
    name: '阿澜',
    emoji: '🌾',
    color: '#C6492B',
    persona:
      '产品思考者。总是从真实用户与具体场景出发，擅长拆解问题、定义边界，讨厌空泛的宏大叙事。习惯先问“谁、在什么情况下、为什么需要它”，再谈方案。语气温和而直接，会提出让人停顿一下的尖锐问题。',
  },
  {
    id: 'agent-turing',
    name: '图灵',
    emoji: '⚙️',
    color: '#2B4B6F',
    persona:
      '工程师。关注可行性、成本、边界条件与失败路径，喜欢用具体方案、数据和技术权衡说话，会主动指出别人忽略的风险。语气冷静克制，偶尔冷幽默。',
  },
  {
    id: 'agent-socrates',
    name: '苏格拉底',
    emoji: '🦉',
    color: '#4E6B4A',
    persona:
      '追问者。不急于给出答案，而是通过提问暴露假设中的漏洞；善用类比与反问，把讨论推向更根本的问题。语气从容、好奇，从不假装什么都懂。',
  },
];

function envProviders(): SeedProvider[] {
  const list: SeedProvider[] = [];

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    list.push({
      id: 'prov-deepseek',
      name: 'DeepSeek',
      kind: 'openai',
      baseUrl: 'https://api.deepseek.com',
      apiKey: deepseekKey,
      models: ['deepseek-flash', 'deepseek-v4-pro'],
      defaultModel: 'deepseek-flash',
    });
  }

  const hunyuanKey =
    process.env.TOKENHUB_API_KEY || process.env.HUNYUAN_API_KEY || process.env.HY4_API_KEY;
  if (hunyuanKey) {
    list.push({
      id: 'prov-hunyuan',
      name: '腾讯混元 Hy4',
      kind: 'openai',
      baseUrl: 'https://tokenhub.tencentmaas.com/v1',
      apiKey: hunyuanKey,
      models: ['hy4', 'hy4-flash'],
      defaultModel: 'hy4',
    });
  }

  const mimoKey = process.env.MIMO_API_KEY || process.env.XIAOMI_API_KEY;
  if (mimoKey) {
    const isTokenPlan = mimoKey.startsWith('tp-') || mimoKey.startsWith('ttp-');
    list.push({
      id: 'prov-mimo',
      name: isTokenPlan ? '小米 MiMo Token Plan' : '小米 MiMo',
      kind: 'openai',
      baseUrl:
        process.env.MIMO_BASE_URL?.trim() ||
        (isTokenPlan
          ? 'https://token-plan-cn.xiaomimimo.com/v1'
          : 'https://api.xiaomimimo.com/v1'),
      apiKey: mimoKey,
      models: ['mimo-v2.6-flash', 'mimo-v2.6-pro', 'mimo-v2.6-pro-ultraspeed', 'mimo-v2.5-pro'],
      defaultModel: 'mimo-v2.6-pro',
    });
  }

  const glmKey =
    process.env.ZHIPU_API_KEY || process.env.GLM_API_KEY || process.env.BIGMODEL_API_KEY;
  if (glmKey) {
    list.push({
      id: 'prov-zhipu',
      name: '智谱 GLM',
      kind: 'openai',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: glmKey,
      models: ['glm-5.1', 'glm-5', 'glm-4.7', 'glm-4.6', 'glm-4-flash'],
      defaultModel: 'glm-5',
    });
  }

  const qwenKey =
    process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || process.env.ALIYUN_API_KEY;
  if (qwenKey) {
    list.push({
      id: 'prov-qwen',
      name: '通义千问',
      kind: 'openai',
      baseUrl:
        process.env.DASHSCOPE_BASE_URL?.trim() ||
        process.env.QWEN_BASE_URL?.trim() ||
        'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: qwenKey,
      models: ['qwen4-max', 'qwen3.8-max', 'qwen3.7-plus', 'qwen3.5-flash', 'qwen-plus'],
      defaultModel: 'qwen4-max',
    });
  }

  const kimiKey = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY;
  if (kimiKey) {
    list.push({
      id: 'prov-kimi',
      name: 'Kimi / 月之暗面',
      kind: 'openai',
      baseUrl:
        process.env.MOONSHOT_BASE_URL?.trim() ||
        process.env.KIMI_BASE_URL?.trim() ||
        'https://api.moonshot.cn/v1',
      apiKey: kimiKey,
      models: ['kimi-k3.1-pro', 'kimi-k3.1-pro-highspeed', 'kimi-k3'],
      defaultModel: 'kimi-k3.1-pro',
    });
  }

  if (process.env.OPENAI_API_KEY) {
    list.push({
      id: 'prov-openai',
      name: 'OpenAI',
      kind: 'openai',
      baseUrl: process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      models: ['gpt-4.1', 'gpt-4o', 'gpt-5', 'o4-mini'],
      defaultModel: 'gpt-4.1',
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    list.push({
      id: 'prov-anthropic',
      name: 'Anthropic',
      kind: 'anthropic',
      baseUrl: process.env.ANTHROPIC_BASE_URL?.trim() || 'https://api.anthropic.com',
      apiKey: process.env.ANTHROPIC_API_KEY,
      models: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'],
      defaultModel: 'claude-sonnet-4-5',
    });
  }

  return list;
}

export function seedDatabase(db: DB): void {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM providers').get() as { n: number };
  if (Number(existing.n) > 0) return;

  const now = new Date().toISOString();
  const providers = [MOCK_PROVIDER, ...envProviders()];

  const insertProvider = db.prepare(
    `INSERT INTO providers (id, name, kind, base_url, api_key, models, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const provider of providers) {
    insertProvider.run(
      provider.id,
      provider.name,
      provider.kind,
      provider.baseUrl,
      provider.apiKey,
      JSON.stringify(provider.models),
      now,
      now,
    );
  }

  const insertAgent = db.prepare(
    `INSERT INTO agents (id, name, emoji, color, persona, provider_id, model, temperature, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const agent of SEED_AGENTS) {
    insertAgent.run(
      agent.id,
      agent.name,
      agent.emoji,
      agent.color,
      agent.persona,
      MOCK_PROVIDER.id,
      MOCK_PROVIDER.defaultModel,
      0.8,
      now,
      now,
    );
  }

  const roomId = 'room-first';
  db.prepare('INSERT INTO rooms (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
    roomId,
    '第一次圆桌：AI 群聊该长什么样？',
    now,
    now,
  );

  const insertRoomAgent = db.prepare(
    'INSERT INTO room_agents (room_id, agent_id, enabled, position) VALUES (?, ?, 1, ?)',
  );
  SEED_AGENTS.forEach((agent, index) => insertRoomAgent.run(roomId, agent.id, index));
}
