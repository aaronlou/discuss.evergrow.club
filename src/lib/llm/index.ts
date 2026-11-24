import { streamAnthropic } from './anthropic';
import { streamMock } from './mock';
import { streamOpenAi } from './openai';
import type { ModelEvent, StreamRequest } from './types';
import { LLMError } from './types';

export * from './types';
export { parseSseStream, sseFrame, SSE_HEADERS } from './sse';

export function streamChat(req: StreamRequest): AsyncGenerator<ModelEvent> {
  if (!req.model.trim()) {
    throw new LLMError('这个角色还没有选择模型');
  }

  switch (req.provider.kind) {
    case 'openai':
      return streamOpenAi(req);
    case 'anthropic':
      return streamAnthropic(req);
    case 'mock':
      return streamMock(req);
    default:
      throw new LLMError('不支持的接入类型');
  }
}
