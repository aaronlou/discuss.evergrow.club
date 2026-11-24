import type { ProviderRecord } from '../types';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export type ModelEvent =
  | { type: 'text'; text: string }
  | { type: 'usage'; inputTokens?: number; outputTokens?: number }
  | { type: 'finish'; reason?: string };

export interface StreamRequest {
  provider: ProviderRecord;
  model: string;
  system: string;
  turns: ChatTurn[];
  temperature: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Used by the mock provider to stay in character. */
  speakerName?: string;
  topic?: string;
}

export class LLMError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'LLMError';
    this.status = status;
  }

  static async fromResponse(response: Response, context: string): Promise<LLMError> {
    const text = await response.text().catch(() => '');
    let detail = text.trim();
    try {
      const parsed = JSON.parse(text) as {
        error?: { message?: string } | string;
        message?: string;
      };
      if (typeof parsed.error === 'string') detail = parsed.error;
      else if (parsed.error?.message) detail = parsed.error.message;
      else if (parsed.message) detail = parsed.message;
    } catch {
      // keep raw text
    }
    if (detail.length > 500) detail = `${detail.slice(0, 500)}…`;

    const hints: Record<number, string> = {
      401: 'API Key 无效或没有权限',
      403: '该 Key 没有访问权限',
      404: '接口地址或模型不存在',
      429: '请求太频繁或额度不足',
    };
    const hint = hints[response.status];
    const message = [context, hint, detail].filter(Boolean).join(' · ');
    return new LLMError(message, response.status);
  }
}
