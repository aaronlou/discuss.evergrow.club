import { AppError } from './errors';
import { errorMessage } from './errors';
import { streamChat } from './llm';
import { isAbortError } from './llm/shared';
import { LLMError } from './llm/types';
import { buildSystemPrompt, buildTurns, stripSpeakerPrefix } from './prompt';
import {
  createAgentPlaceholder,
  createUserMessage,
  listContextMessages,
  updateMessage,
} from './repo/messages';
import { getProvider } from './repo/providers';
import { getRoom, listParticipants, touchRoom } from './repo/rooms';
import { selectResponders } from './selection';
import type { MessageView, Participant, RoundResponder } from './types';

export type Emit = (event: string, data: unknown) => void;

export interface RunRoundOptions {
  roomId: string;
  /** Explicit @-mentioned agents; empty/undefined means every seated agent. */
  agentIds?: string[];
  userMessage?: string;
  send: Emit;
  signal: AbortSignal;
}

function toResponder(participant: Participant): RoundResponder {
  return {
    agentId: participant.agentId,
    name: participant.name,
    emoji: participant.emoji,
    color: participant.color,
    model: participant.model,
    providerName: participant.providerName,
    providerKind: participant.providerKind,
  };
}

function isConfigurationError(error: unknown): boolean {
  if (error instanceof LLMError && typeof error.status === 'number') {
    return error.status >= 400 && error.status < 500 && error.status !== 429;
  }
  return error instanceof AppError && error.status === 400;
}

export async function runRound(options: RunRoundOptions): Promise<void> {
  const { roomId, send, signal } = options;
  const room = getRoom(roomId);
  const participants = listParticipants(roomId);
  const seated = participants.filter((participant) => participant.enabled);
  const responders = selectResponders(seated, options.agentIds);

  let userMessageView: MessageView | null = null;
  if (options.userMessage) {
    userMessageView = createUserMessage(roomId, options.userMessage);
    send('user_message', userMessageView);
  }

  send('round_start', {
    roomId,
    responders: responders.map(toResponder),
    userMessageId: userMessageView?.id ?? null,
  });
  touchRoom(roomId);

  let outcome: 'complete' | 'stopped' | 'error' = 'complete';

  for (const participant of responders) {
    if (signal.aborted) {
      outcome = 'stopped';
      break;
    }

    const placeholder = createAgentPlaceholder(roomId, participant.agentId);
    const started = updateMessage(placeholder.id, { status: 'streaming' });
    send('agent_start', started);

    let content = '';
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let finishReason: string | undefined;

    try {
      const provider = getProvider(participant.providerId);
      const history = listContextMessages(roomId);
      const system = buildSystemPrompt(participant, room, participants);
      const turns = buildTurns(participant.agentId, history);
      if (turns.length === 0) throw new AppError('这场讨论还没有上下文');

      for await (const event of streamChat({
        provider,
        model: participant.model,
        system,
        turns,
        temperature: participant.temperature,
        signal,
        speakerName: participant.name,
        topic: room.title,
      })) {
        if (signal.aborted) break;
        if (event.type === 'text') {
          content += event.text;
          send('delta', { messageId: placeholder.id, text: event.text });
        } else if (event.type === 'usage') {
          if (typeof event.inputTokens === 'number') inputTokens = event.inputTokens;
          if (typeof event.outputTokens === 'number') outputTokens = event.outputTokens;
        } else if (event.type === 'finish') {
          finishReason = event.reason;
        }
      }

      if (signal.aborted) {
        const stopped = updateMessage(placeholder.id, {
          content: stripSpeakerPrefix(content, participant.name),
          status: 'stopped',
          error: '已手动停止',
          inputTokens,
          outputTokens,
        });
        send('agent_end', stopped);
        outcome = 'stopped';
        break;
      }

      const finished = updateMessage(placeholder.id, {
        content: stripSpeakerPrefix(content, participant.name),
        status: 'complete',
        error: null,
        inputTokens,
        outputTokens,
      });
      send('agent_end', finished);
      if (finishReason === 'length') {
        send('notice', {
          message: `${participant.name} 的回复达到长度上限，被截断了`,
          tone: 'warning',
        });
      }
    } catch (error) {
      const aborted = signal.aborted || isAbortError(error);

      if (aborted) {
        const stopped = updateMessage(placeholder.id, {
          content: stripSpeakerPrefix(content, participant.name),
          status: 'stopped',
          error: '已手动停止',
          inputTokens,
          outputTokens,
        });
        send('agent_end', stopped);
        outcome = 'stopped';
        break;
      }

      const message = errorMessage(error);
      const failed = updateMessage(placeholder.id, {
        content: stripSpeakerPrefix(content, participant.name),
        status: 'error',
        error: message,
        inputTokens,
        outputTokens,
      });
      send('agent_error', failed);
      outcome = 'error';

      if (isConfigurationError(error)) {
        send('fatal', { message });
        break;
      }
    }
  }

  touchRoom(roomId);
  send('done', { outcome });
}
