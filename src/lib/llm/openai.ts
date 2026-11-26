import { joinUrl, requireKey, timeoutSignal } from './shared';
import { parseSseStream } from './sse';
import { LLMError, type ModelEvent, type StreamRequest } from './types';

interface OpenAiChunk {
  error?: { message?: string };
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

/**
 * Some reasoning models (notably Kimi via Tencent TokenHub) reject the
 * `temperature` field with a generic 400. Remember that per provider+model and
 * stop sending it after the first rejection.
 */
const temperatureUnsupported = new Set<string>();

function capabilityKey(req: StreamRequest): string {
  return `${req.provider.id}:${req.model}`;
}

export async function* streamOpenAi(req: StreamRequest): AsyncGenerator<ModelEvent> {
  const apiKey = requireKey(req.provider.name, req.provider.apiKey);
  const base = req.provider.baseUrl || 'https://api.openai.com/v1';
  const endpoint = joinUrl(base, 'chat/completions');

  const makeBody = (includeTemperature: boolean) =>
    JSON.stringify({
      model: req.model,
      messages: [{ role: 'system', content: req.system }, ...req.turns],
      ...(includeTemperature ? { temperature: req.temperature } : {}),
      stream: true,
      ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
    });

  const post = (includeTemperature: boolean) =>
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: makeBody(includeTemperature),
      signal: timeoutSignal(req.signal, 240_000),
    });

  const cacheKey = capabilityKey(req);
  let includeTemperature = !temperatureUnsupported.has(cacheKey);
  let response = await post(includeTemperature);

  if (response.status === 400 && includeTemperature) {
    // Drain the rejected body, then retry once without the optional field.
    await response.text().catch(() => '');
    temperatureUnsupported.add(cacheKey);
    includeTemperature = false;
    response = await post(false);
  }

  if (!response.ok) throw await LLMError.fromResponse(response, `${req.provider.name} 返回错误`);
  if (!response.body) throw new LLMError('模型服务没有返回数据流');

  let usageSent = false;
  for await (const frame of parseSseStream(response.body)) {
    if (!frame.data) continue;
    if (frame.data === '[DONE]') {
      yield { type: 'finish' };
      return;
    }

    let chunk: OpenAiChunk;
    try {
      chunk = JSON.parse(frame.data) as OpenAiChunk;
    } catch {
      continue;
    }

    if (chunk.error?.message) throw new LLMError(chunk.error.message);
    if (chunk.usage) {
      usageSent = true;
      yield {
        type: 'usage',
        inputTokens: chunk.usage.prompt_tokens,
        outputTokens: chunk.usage.completion_tokens,
      };
    }

    const choice = chunk.choices?.[0];
    const text = choice?.delta?.content;
    if (typeof text === 'string' && text) yield { type: 'text', text };
    if (choice?.finish_reason) yield { type: 'finish', reason: choice.finish_reason };
  }

  if (!usageSent) {
    // Usage is optional for OpenAI-compatible gateways.
    return;
  }
}
