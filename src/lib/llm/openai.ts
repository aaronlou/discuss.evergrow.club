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

export async function* streamOpenAi(req: StreamRequest): AsyncGenerator<ModelEvent> {
  const apiKey = requireKey(req.provider.name, req.provider.apiKey);
  const base = req.provider.baseUrl || 'https://api.openai.com/v1';
  const endpoint = joinUrl(base, 'chat/completions');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      messages: [{ role: 'system', content: req.system }, ...req.turns],
      temperature: req.temperature,
      stream: true,
      ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
    }),
    signal: timeoutSignal(req.signal, 240_000),
  });

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
