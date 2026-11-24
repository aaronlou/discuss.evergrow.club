'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square, AtSign } from 'lucide-react';

import { AgentSeal } from '@/components/agent-seal';
import { cn } from '@/lib/cn';
import { escapeRegExp } from '@/lib/format';
import type { Participant } from '@/lib/types';

interface MentionState {
  start: number;
  end: number;
  query: string;
  index: number;
}

function detectMention(value: string, caret: number): MentionState | null {
  const before = value.slice(0, caret);
  const match = /(^|\s)@([^\s@]{0,24})$/.exec(before);
  if (!match) return null;
  const start = before.lastIndexOf('@');
  if (start < 0) return null;
  return { start, end: caret, query: match[2], index: 0 };
}

export function Composer({
  participants,
  streaming,
  seed,
  onSend,
  onStop,
}: {
  participants: Participant[];
  streaming: boolean;
  seed: { text: string; nonce: number } | null;
  onSend: (content: string, mentions: string[]) => void;
  onStop: () => void;
}) {
  const active = participants.filter((participant) => participant.enabled);
  const [value, setValue] = useState('');
  const [mention, setMention] = useState<MentionState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.min(element.scrollHeight, 168)}px`;
  }, [value]);

  useEffect(() => {
    if (!seed) return;
    setValue(seed.text);
    requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(seed.text.length, seed.text.length);
    });
  }, [seed]);

  const suggestions = mention
    ? active
        .filter((participant) =>
          participant.name.toLowerCase().includes(mention.query.toLowerCase()),
        )
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(mention.query.toLowerCase()) ? 0 : 1;
          const bStarts = b.name.toLowerCase().startsWith(mention.query.toLowerCase()) ? 0 : 1;
          return aStarts - bStarts;
        })
    : [];

  const mentioned = active.filter((participant) =>
    new RegExp(
      `@${escapeRegExp(participant.name)}(?=$|\\s|[，。！？、,.!?：:；;])`,
    ).test(value),
  );

  function choose(participant: Participant) {
    if (!mention) return;
    const token = `@${participant.name} `;
    const next = value.slice(0, mention.start) + token + value.slice(mention.end);
    setValue(next);
    setMention(null);
    requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.focus();
      const caret = mention.start + token.length;
      element.setSelectionRange(caret, caret);
    });
  }

  function insertAgent(participant: Participant) {
    const needsSpace = value.length > 0 && !/\s$/.test(value);
    const next = `${value}${needsSpace ? ' ' : ''}@${participant.name} `;
    setValue(next);
    requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(next.length, next.length);
    });
  }

  function submit() {
    if (streaming) return;
    const content = value.trim();
    if (!content || active.length === 0) return;
    onSend(content, mentioned.map((participant) => participant.agentId));
    setValue('');
    setMention(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mention && suggestions.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        setMention((current) =>
          current
            ? {
                ...current,
                index: (current.index + delta + suggestions.length) % suggestions.length,
              }
            : current,
        );
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        choose(suggestions[mention.index] ?? suggestions[0]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMention(null);
        return;
      }
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submit();
      return;
    }
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      event.nativeEvent.keyCode !== 229
    ) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="shrink-0 border-t border-line bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-[880px] px-4 pb-4 pt-3 sm:px-8">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            本轮发言
          </span>
          {active.map((participant) => (
            <button
              key={participant.agentId}
              type="button"
              onClick={() => insertAgent(participant)}
              title={`点名 ${participant.name}`}
              className="inline-flex items-center gap-1.5 border border-line bg-surface/70 px-2 py-0.5 text-[10.5px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: participant.color }}
              />
              {participant.name}
            </button>
          ))}
          {active.length === 0 ? (
            <span className="text-[10.5px] text-vermilion">还没有角色在场</span>
          ) : null}
          <span className="ml-auto hidden font-mono text-[9px] uppercase tracking-[0.1em] text-muted/70 sm:block">
            {mentioned.length > 0
              ? `已点名 ${mentioned.map((item) => item.name).join('、')}`
              : '未 @ 时全体回应'}
          </span>
        </div>

        <div className="relative">
          {mention && suggestions.length > 0 ? (
            <div className="absolute bottom-[calc(100%+6px)] left-0 z-30 w-[min(100%,300px)] border border-line bg-surface shadow-lift">
              <p className="border-b border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                点名发言 · 仅被 @ 的角色回应
              </p>
              <ul role="listbox" aria-label="选择要 @ 的角色">
                {suggestions.map((participant, index) => {
                  const selected = index === mention.index;
                  return (
                    <li key={participant.agentId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          choose(participant);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                          selected ? 'bg-ink text-paper' : 'text-ink hover:bg-paper-deep/60',
                        )}
                      >
                        <AgentSeal
                          name={participant.name}
                          emoji={participant.emoji}
                          color={participant.color}
                          size="xs"
                        />
                        <span className="text-[12.5px]">{participant.name}</span>
                        <span
                          className={cn(
                            'ml-auto truncate font-mono text-[8.5px] uppercase tracking-[0.1em]',
                            selected ? 'text-paper/55' : 'text-muted',
                          )}
                        >
                          {participant.providerName}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div
            className={cn(
              'flex items-end gap-2 border bg-surface px-3 py-2.5 transition-colors',
              streaming ? 'border-line' : 'border-line focus-within:border-ink',
            )}
          >
            <AtSign
              aria-hidden
              className="mb-2 hidden h-4 w-4 shrink-0 text-muted/60 sm:block"
              strokeWidth={1.6}
            />
            <textarea
              ref={textareaRef}
              value={value}
              rows={1}
              onChange={(event) => {
                const next = event.target.value;
                setValue(next);
                const caret = event.target.selectionStart ?? next.length;
                setMention(detectMention(next, caret));
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => window.setTimeout(() => setMention(null), 120)}
              placeholder={
                active.length > 0
                  ? '说点什么，让圆桌转起来…（@ 可点名）'
                  : '先邀请一位角色入席…'
              }
              className="max-h-[168px] min-h-[44px] flex-1 resize-none bg-transparent py-1.5 text-[16px] leading-relaxed text-ink placeholder:text-muted/55 focus:outline-none sm:text-[14.5px]"
            />

            {streaming ? (
              <button
                type="button"
                onClick={onStop}
                className="mb-0.5 inline-flex h-9 shrink-0 items-center gap-1.5 border border-line-strong bg-paper-deep px-3 text-[11.5px] font-medium text-ink-soft transition-colors hover:border-vermilion hover:text-vermilion"
              >
                <Square className="h-3 w-3" strokeWidth={2.2} />
                停止
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!value.trim() || active.length === 0}
                aria-label="发送"
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-ink bg-ink text-paper transition-colors hover:border-vermilion hover:bg-vermilion disabled:pointer-events-none disabled:border-line-strong disabled:bg-paper-deep disabled:text-muted"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-muted">
          <span>
            {streaming
              ? '角色正在依次发言，它们能看见彼此刚说的话。'
              : 'Enter 发送 · Shift + Enter 换行 · @ 点名'}
          </span>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.12em] sm:block">
            {active.length} voices
          </span>
        </div>
      </div>
    </div>
  );
}
