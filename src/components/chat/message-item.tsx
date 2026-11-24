import { AgentSeal } from '@/components/agent-seal';
import { Markdown } from '@/components/markdown';
import { cn } from '@/lib/cn';
import { formatClock, formatTokens } from '@/lib/format';
import type { MessageView, RoundResponder } from '@/lib/types';

export function TypingDots() {
  return (
    <span className="typing-dots" aria-label="正在输入">
      <span />
      <span />
      <span />
    </span>
  );
}

export function QueuedMessage({ responder }: { responder: RoundResponder }) {
  return (
    <div className="flex gap-3.5 opacity-60 sm:gap-4">
      <AgentSeal name={responder.name} emoji={responder.emoji} color={responder.color} />
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span
            className="font-display text-[17px] leading-none tracking-tight"
            style={{ color: responder.color }}
          >
            {responder.name}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {responder.model}
          </span>
        </header>
        <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-muted">
          <TypingDots />
          准备发言…
        </div>
      </div>
    </div>
  );
}

export function MessageItem({ message }: { message: MessageView }) {
  if (message.role === 'user') {
    return (
      <article className="animate-rise flex justify-end">
        <div className="max-w-[88%] sm:max-w-[76%]">
          <div className="mb-1.5 flex items-center justify-end gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            <span>主持人</span>
            <span className="h-px w-4 bg-line-strong" />
            <time suppressHydrationWarning dateTime={message.createdAt}>
              {formatClock(message.createdAt)}
            </time>
          </div>
          <div className="whitespace-pre-wrap border border-ink bg-ink px-4 py-3 text-[14.5px] leading-relaxed text-paper shadow-paper">
            {message.content}
          </div>
        </div>
      </article>
    );
  }

  const agent = message.agent ?? {
    id: 'departed',
    name: '已离开的角色',
    emoji: '◌',
    color: '#8A8272',
    model: '',
    providerName: '',
  };
  const streaming = message.status === 'streaming';
  const queued = message.status === 'queued';
  const tokens = formatTokens(message.inputTokens, message.outputTokens);

  return (
    <article className="animate-rise flex gap-3.5 sm:gap-4">
      <AgentSeal name={agent.name} emoji={agent.emoji} color={agent.color} />

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h3
            className="font-display text-[17px] leading-none tracking-tight"
            style={{ color: agent.color }}
          >
            {agent.name}
          </h3>
          {agent.model ? (
            <span className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              {agent.model}
            </span>
          ) : null}
          <time
            suppressHydrationWarning
            dateTime={message.createdAt}
            className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted/60"
          >
            {formatClock(message.createdAt)}
          </time>
          {streaming ? (
            <span className="ml-0.5 inline-flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-vermilion">
              <span className="live-dot" />
              发言中
            </span>
          ) : null}
          {agent.providerName ? (
            <span className="ml-auto hidden font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted/45 sm:block">
              {agent.providerName}
            </span>
          ) : null}
        </header>

        <div className="mt-2.5">
          {queued ? (
            <div className="flex items-center gap-2 text-[11.5px] text-muted">
              <TypingDots />
              准备发言…
            </div>
          ) : message.content ? (
            <>
              <Markdown
                content={message.content}
                className={streaming ? 'is-streaming' : undefined}
              />
            </>
          ) : streaming ? (
            <div className="flex items-center gap-2 text-[11.5px] text-muted">
              <TypingDots />
              正在组织语言…
            </div>
          ) : (
            <p className="text-[13px] italic text-muted">（没有内容）</p>
          )}
        </div>

        {message.error ? (
          <div className="mt-2.5 border-l-2 border-vermilion bg-vermilion/5 px-3 py-2 text-[11.5px] leading-relaxed text-vermilion">
            {message.error}
          </div>
        ) : null}

        {message.status === 'stopped' && message.content ? (
          <p className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted/60">
            已停止
          </p>
        ) : null}

        {tokens && !streaming ? (
          <footer className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted/45">
            {tokens} tokens
          </footer>
        ) : null}
      </div>
    </article>
  );
}
