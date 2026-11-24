import { z } from 'zod';

export const providerKindSchema = z.enum(['openai', 'anthropic', 'mock']);

export const providerInputSchema = z.object({
  name: z.string().trim().min(1, '请填写名称').max(40),
  kind: providerKindSchema,
  baseUrl: z.string().trim().max(300).default(''),
  apiKey: z.string().trim().max(500).optional().nullable(),
  models: z.array(z.string().trim().min(1).max(120)).max(200).optional(),
});

export const providerTestSchema = z.object({
  providerId: z.string().trim().min(1).optional(),
  name: z.string().trim().max(40).optional(),
  kind: providerKindSchema,
  baseUrl: z.string().trim().max(300).default(''),
  apiKey: z.string().trim().max(500).optional().nullable(),
  model: z.string().trim().max(120).optional(),
});

export const agentInputSchema = z.object({
  name: z.string().trim().min(1, '请填写角色名').max(24),
  emoji: z.string().trim().min(1).max(8).default('◐'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, '颜色需要是 #RRGGBB')
    .default('#C6492B'),
  persona: z.string().trim().max(4000).default(''),
  providerId: z.string().trim().min(1, '请选择模型接入'),
  model: z.string().trim().max(120).default(''),
  temperature: z.number().min(0).max(2).default(0.8),
});

export const createRoomSchema = z.object({
  title: z.string().trim().min(1, '给这场讨论起个名字').max(80),
  agentIds: z.array(z.string().trim().min(1)).min(1, '至少邀请一位角色').max(24),
});

export const updateRoomSchema = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
    agentIds: z.array(z.string().trim().min(1)).min(1).max(24).optional(),
    activeAgentIds: z.array(z.string().trim().min(1)).min(1).max(24).optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.agentIds !== undefined ||
      value.activeAgentIds !== undefined,
    { message: '没有需要更新的内容' },
  );

export const messageInputSchema = z.object({
  content: z.string().trim().min(1, '说点什么吧').max(8000),
  mentions: z.array(z.string().trim().min(1)).max(24).optional(),
});

export const roundInputSchema = z.object({
  agentIds: z.array(z.string().trim().min(1)).max(24).optional(),
});
