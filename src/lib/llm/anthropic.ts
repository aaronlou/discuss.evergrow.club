import { joinUrl, requireKey, timeoutSignal } from './shared';
import { parseSseStream } from './sse';
import { LLMError, type ChatTurn, type ModelEvent, type StreamRequest } from './types';

interface AnthropicEvent {
  type?: string;
  error?: { message?: string };
  message?: {
    usage?: { input_tokens?: number };
  };
  usage?: { output_tokens?: number };
  delta?: {
    type?: string;
    text?: string;
    stop_reason?: string | null;
  };
}

export function anthropicEndpoint(baseUrl: string): string {
  const base = (baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '');
  if (base.endsWith('/messages')) return base;
  return base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`;
}

/** Anthropic wants alternating turns; merge neighbours with the same role. */
export function mergeTurns(turns: ChatTurn[]): ChatTurn[] {
  const merged: ChatTurn[] = [];
  for (const turn of turns) {
    if (!turn.content.trim()) continue;
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) {
      last.content = `${last.content}\n\n${turn.content}`;
    } else {
      merged.push({ ...turn });
    }
  }
  return merged;
}

export async function* streamAnthropic(req: StreamRequest): AsyncGenerator<ModelEvent> {
  const apiKey = requireKey(req.provider.name, req.provider.apiKey);
  const endpoint = anthropicEndpoint(req.provider.baseUrl);
  const turns = mergeTurns(req.turns);
  if (turns.length === 0) throw new LLMError('这场讨论还没有任何上下文');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: req.model,
      system: req.system,
      messages: turns,
      max_tokens: req.maxTokens ?? 2048,
      temperature: Math.min(1, Math.max(0, req.temperature)),
      stream: true,
    }),
    signal: timeoutSignal(req.signal, 240_000),
  });

  if (!response.ok) throw await LLMError.fromResponse(response, `${req.provider.name} 返回错误`);
  if (!response.body) throw new LLMError('模型服务没有返回数据流');

  for await (const frame of parseSseStream(response.body)) {
    if (!frame.data || frame.data === '[DONE]') continue;
    let event: AnthropicEvent;
    try {
      event = JSON.parse(frame.data) as AnthropicEvent;
    } catch {
      continue;
    }

    if (event.type === 'error' || event.error?.message) {
      throw new LLMError(event.error?.message ?? 'Anthropic 返回错误');
    }
    if (event.type === 'message_start' && event.message?.usage?.input_tokens !== undefined) {
      yield { type: 'usage', inputTokens: event.message.usage.input_tokens };
    }
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      const text = event.delta.text;
      if (text) yield { type: 'text', text };
    }
    if (event.type === 'message_delta') {
      if (event.usage?.output_tokens !== undefined) {
        yield { type: 'usage', outputTokens: event.usage.output_tokens };
      }
      if (event.delta?.stop_reason) {
        yield { type: 'finish', reason: event.delta.stop_reason };
      }
    }
  }
}
