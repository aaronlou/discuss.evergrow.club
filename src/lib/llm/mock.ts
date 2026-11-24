import type { ModelEvent, StreamRequest } from './types';

const ANGLES = [
  '关键不在于让每个角色都多说一点，而在于让分歧变得有用。如果所有人只是把同一件事换三种说法，群聊就退化成了三份并列的独白。',
  '我会先钉死三个工程约束：上下文怎么裁剪、发言怎么排队、失败怎么收场。这三件事不定，界面越热闹，第二轮越撑不住。',
  '这里有一个容易被忽略的成本：每多一个角色，上下文和等待时间都近似线性增长。用户要的不是更多声音，而是更快的共识或更清楚的分歧。',
  '我倾向于把「谁先说」当成一个显式的产品设计，而不是随机顺序。座位顺序本身就在暗示这场讨论的结构。',
  '一个讨论室最稀缺的不是观点，而是记忆。如果第二轮的 AI 不记得第一轮为什么转向，它就只是换了三次皮套的客服。',
  '我会把「人能否随时打断」排在功能列表第一。多智能体最容易犯的错，是把发言权从人手里悄悄拿走。',
];

const QUESTIONS = [
  '所以我想反问：第一眼打开时，你希望看到的是热闹，还是秩序？',
  '如果只能保留一个交互，你会保留「选角色」还是「看得见彼此在听」？',
  '我们是不是该先定义“这一轮算讨论成功”的标准，再谈功能清单？',
  '要不要先用最笨的方式跑一遍：三个人、一条消息、一次完整的轮流发言？',
  '如果三个人最后都同意，你会不会反而更警惕？',
  '你愿意为一轮真正的分歧多等三十秒吗？',
];

const BRIDGES = [
  '我先接住这个问题。',
  '我持一个稍微不同的判断。',
  '在给结论之前，我想先拆一层。',
  '这里我想补一个视角。',
];

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0;
  }
  return value;
}

function snippet(text: string, max: number): string {
  const cleaned = text
    .replace(/^(主持人|【[^】]+】)\s*[：:]\s*/, '')
    .replace(/^(?:@\S+\s*)+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

function nameSeed(name: string): number {
  let total = 0;
  for (const char of name) total += char.codePointAt(0) ?? 0;
  return total;
}

function bridgeFor(req: StreamRequest, seed: number): string {
  const last = req.turns[req.turns.length - 1];
  if (!last) return BRIDGES[seed % BRIDGES.length];

  if (last.content.startsWith('主持人：')) {
    return `回到主持人刚才的问题「${snippet(last.content, 40)}」，我想从这儿往下走。`;
  }

  const speaker = /^【([^】]+)】/.exec(last.content)?.[1];
  if (speaker) return `听完${speaker}的说法，我补一个角度。`;

  return '沿着刚才的讨论，我补一个角度。';
}

export function buildMockReply(req: StreamRequest): string {
  const seed = hash(`${req.speakerName ?? ''}|${req.topic ?? ''}`);
  const turns = req.turns.length;
  const identity = nameSeed(req.speakerName ?? 'mock');

  const bridge = bridgeFor(req, seed);
  const angle = ANGLES[(identity + turns) % ANGLES.length];
  const question = QUESTIONS[(identity * 3 + turns) % QUESTIONS.length];

  return `${bridge}\n\n${angle}\n\n${question}`;
}

export async function* streamMock(req: StreamRequest): AsyncGenerator<ModelEvent> {
  const reply = buildMockReply(req);
  const seed = hash(req.speakerName ?? 'mock');

  for (let index = 0; index < reply.length; ) {
    const size = 2 + ((seed + index) % 4);
    const text = reply.slice(index, index + size);
    index += size;
    if (req.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    yield { type: 'text', text };
    await new Promise((resolve) => setTimeout(resolve, 18));
  }

  yield { type: 'finish', reason: 'stop' };
  yield {
    type: 'usage',
    inputTokens: Math.max(1, Math.round(req.turns.reduce((n, turn) => n + turn.content.length, 0) / 3)),
    outputTokens: Math.round(reply.length / 2),
  };
}
