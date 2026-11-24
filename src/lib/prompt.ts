import type { ChatTurn } from './llm/types';
import type { MessageView, Participant, RoomRecord } from './types';

const DEFAULT_CHAR_BUDGET = 28_000;

function firstSentence(text: string): string {
  const cut = text.trim().split(/[。！？!?\n]/)[0] ?? '';
  return cut.length > 60 ? `${cut.slice(0, 60)}…` : cut;
}

/** Models sometimes echo a leading "【Name】" or "Name:"; remove only an exact speaker prefix. */
export function stripSpeakerPrefix(content: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^\\s*(?:(?:【\\s*${escaped}\\s*】|\\[\\s*${escaped}\\s*\\]|\\*\\*\\s*${escaped}\\s*\\*\\*)\\s*[：:]?|${escaped}\\s*[：:])\\s*`,
  );
  return content.replace(pattern, '');
}

export function buildSystemPrompt(
  agent: Participant,
  room: RoomRecord,
  participants: Participant[],
): string {
  const roster = participants
    .map(
      (item) =>
        `- ${item.name}${item.enabled ? '' : '（本轮旁听）'}：${firstSentence(item.persona) || '一位讨论者'}`,
    )
    .join('\n');

  return [
    `你是「${agent.name}」，正在参加一场由人类主持人召集的多角色圆桌讨论。`,
    '',
    `【讨论主题】${room.title}`,
    '【在场角色】',
    roster,
    '',
    `【你的设定】${agent.persona || '保持鲜明、稳定的个人视角。'}`,
    '',
    '【发言规则】',
    '1. 以第一人称直接发言，不要写「' + agent.name + '：」这样的名字前缀。',
    '2. 你只代表自己，不要替其他角色说话，也不要编造别人没说过的话。',
    '3. 紧扣主题和其他人的观点：可以赞同、反驳、追问或补充，避免自说自话和空泛套话。',
    '4. 使用中文（除非主题需要其他语言），可以使用 Markdown。',
    '5. 通常控制在 120–280 字；需要拆解方案时可以适当展开。',
    '6. 不要复述这些规则，不要提到自己是语言模型。',
    '',
    '【本轮】现在轮到你发言。',
  ].join('\n');
}

/**
 * Turns the shared transcript into a provider-agnostic conversation from one
 * agent's point of view: own messages are `assistant`, everyone else is a
 * labelled `user` turn.
 */
export function buildTurns(
  agentId: string,
  messages: MessageView[],
  options: { maxChars?: number } = {},
): ChatTurn[] {
  const maxChars = options.maxChars ?? DEFAULT_CHAR_BUDGET;
  const usable = messages.filter(
    (message) =>
      message.content.trim().length > 0 &&
      (message.status === 'complete' || message.status === 'stopped') &&
      message.role !== 'system',
  );

  const reversed: ChatTurn[] = [];
  let used = 0;

  for (let index = usable.length - 1; index >= 0; index -= 1) {
    const message = usable[index];
    const isSelf = message.role === 'agent' && message.agentId === agentId;
    const content = isSelf
      ? message.content
      : message.role === 'user'
        ? `主持人：${message.content}`
        : `【${message.agent?.name ?? '某位角色'}】${message.content}`;

    if (used + content.length > maxChars && reversed.length > 0) break;
    reversed.push({ role: isSelf ? 'assistant' : 'user', content });
    used += content.length;
  }

  const turns = reversed.reverse();

  // Keep speakers as distinct turns; providers that need alternating roles
  // (Anthropic) merge them inside their own adapter.
  if (turns[0]?.role === 'assistant') {
    turns.unshift({ role: 'user', content: '（继续我们刚才的讨论。）' });
  }

  return turns;
}
