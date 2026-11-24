import type { ProviderKind } from './types';

export const AGENT_COLORS = [
  '#C2452A',
  '#2B4B6F',
  '#4E6B4A',
  '#A9772F',
  '#6B4E71',
  '#2F6B6B',
  '#8C3B3B',
  '#3F5D3A',
  '#7A4E2D',
  '#405C7A',
];

export const AGENT_EMOJIS = [
  '🌾',
  '⚙️',
  '🦉',
  '🪶',
  '🎭',
  '🧭',
  '🔭',
  '🪞',
  '🎲',
  '🕯️',
  '🧩',
  '🌊',
  '🪐',
  '✒️',
  '🗿',
  '🌱',
];

export const KIND_LABELS: Record<ProviderKind, string> = {
  openai: 'OpenAI 兼容',
  anthropic: 'Anthropic',
  mock: '演示模式',
};

export interface ProviderPreset {
  id: string;
  label: string;
  note: string;
  kind: ProviderKind;
  baseUrl: string;
  models: string[];
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    note: 'V4 Flash / Pro',
    kind: 'openai',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-flash', 'deepseek-v4-pro'],
  },
  {
    id: 'hunyuan',
    label: '混元 Hy4',
    note: '腾讯云 TokenHub',
    kind: 'openai',
    baseUrl: 'https://tokenhub.tencentmaas.com/v1',
    models: ['hy4', 'hy4-flash'],
  },
  {
    id: 'mimo',
    label: '小米 MiMo',
    note: 'Token Plan（tp-）',
    kind: 'openai',
    baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
    models: ['mimo-v2.6-flash', 'mimo-v2.6-pro', 'mimo-v2.6-pro-ultraspeed', 'mimo-v2.5-pro'],
  },
  {
    id: 'mimo-payg',
    label: 'MiMo 按量',
    note: 'Pay-as-you-go（sk-）',
    kind: 'openai',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    models: ['mimo-v2.6-flash', 'mimo-v2.6-pro', 'mimo-v2.6-pro-ultraspeed'],
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    note: 'GLM-5 / 4.7',
    kind: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-5.1', 'glm-5', 'glm-4.7', 'glm-4.6', 'glm-4-flash'],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    note: 'GPT / o 系列',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4.1', 'gpt-4o', 'gpt-5', 'o4-mini'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    note: 'Claude 原生协议',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'],
  },
  {
    id: 'moonshot',
    label: 'Kimi / 月之暗面',
    note: 'OpenAI 兼容',
    kind: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['kimi-k2-0711-preview', 'moonshot-v1-8k'],
  },
  {
    id: 'qwen',
    label: '通义千问',
    note: '阿里云百炼兼容模式',
    kind: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
  },
  {
    id: 'ollama',
    label: 'Ollama',
    note: '本机模型',
    kind: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.2', 'qwen2.5:7b'],
  },
  {
    id: 'custom',
    label: '自定义',
    note: '任何兼容服务',
    kind: 'openai',
    baseUrl: '',
    models: [],
  },
];


export const STARTER_PROMPTS = [
  '多智能体群聊，应该像 QQ 群，还是像一场有主持人的圆桌？',
  '如果所有 AI 角色意见一致，这场讨论还有价值吗？',
  '为这个产品设计一个“第一分钟就让人上瘾”的瞬间。',
];
