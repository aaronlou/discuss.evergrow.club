import type { ProviderKind, ProviderRecord } from '../types';
import { anthropicEndpoint } from './anthropic';
import { joinUrl, requireKey, timeoutSignal } from './shared';
import { LLMError } from './types';

export interface ProviderTestInput {
  kind: ProviderKind;
  baseUrl: string;
  apiKey?: string | null;
  model?: string;
  name?: string;
}

export interface ProviderTestResult {
  ok: boolean;
  latencyMs: number;
  message: string;
  models?: string[];
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function testProvider(input: ProviderTestInput): Promise<ProviderTestResult> {
  const started = Date.now();
  const name = input.name || '模型接入';

  if (input.kind === 'mock') {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return { ok: true, latencyMs: Date.now() - started, message: '演示模式已就绪' };
  }

  const apiKey = requireKey(name, input.apiKey ?? null);

  try {
    if (input.kind === 'openai') {
      const base = input.baseUrl || 'https://api.openai.com/v1';
      const response = await fetch(joinUrl(base, 'models'), {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: timeoutSignal(undefined, 15_000),
      });

      if (response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          data?: Array<{ id?: string }>;
        };
        const models = (body.data ?? [])
          .map((item) => item.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);
        return {
          ok: true,
          latencyMs: Date.now() - started,
          message: models.length
            ? `连接成功，发现 ${models.length} 个模型`
            : '连接成功（该服务未返回模型列表）',
          models,
        };
      }

      // Some compatible gateways do not expose /models; fall back to a tiny completion.
      if (response.status === 404 || response.status === 405) {
        const model = input.model || 'gpt-4o-mini';
        const fallback = await fetch(joinUrl(base, 'chat/completions'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 16,
            stream: false,
          }),
          signal: timeoutSignal(undefined, 20_000),
        });
        if (!fallback.ok) throw await LLMError.fromResponse(fallback, `${name} 返回错误`);
        return {
          ok: true,
          latencyMs: Date.now() - started,
          message: `连接成功（已用 ${model} 验证）`,
        };
      }

      throw await LLMError.fromResponse(response, `${name} 返回错误`);
    }

    const model = input.model || 'claude-haiku-4-5';
    const response = await fetch(anthropicEndpoint(input.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: timeoutSignal(undefined, 20_000),
    });
    if (!response.ok) throw await LLMError.fromResponse(response, `${name} 返回错误`);
    return {
      ok: true,
      latencyMs: Date.now() - started,
      message: `连接成功（已用 ${model} 验证）`,
    };
  } catch (error) {
    if (error instanceof LLMError) throw error;
    throw new LLMError(`连接失败：${errorText(error)}`);
  }
}

export async function fetchProviderModels(provider: ProviderRecord): Promise<string[]> {
  if (provider.kind === 'mock') return provider.models;
  if (provider.kind === 'anthropic') return provider.models;

  const apiKey = requireKey(provider.name, provider.apiKey);
  const response = await fetch(joinUrl(provider.baseUrl || 'https://api.openai.com/v1', 'models'), {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: timeoutSignal(undefined, 15_000),
  });
  if (!response.ok) throw await LLMError.fromResponse(response, `${provider.name} 返回错误`);

  const body = (await response.json().catch(() => ({}))) as {
    data?: Array<{ id?: string }>;
  };
  return (body.data ?? [])
    .map((item) => item.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .sort((a, b) => a.localeCompare(b));
}
