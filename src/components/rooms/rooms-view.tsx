'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Plus } from 'lucide-react';

import { NewRoomDialog } from '@/components/rooms/new-room-dialog';
import { RoundTableGraphic } from '@/components/rooms/round-table-graphic';
import { Button, buttonStyles } from '@/components/ui/button';
import { useState } from 'react';
import { formatRelative } from '@/lib/format';
import type { AgentView, RoomRecord, RoomSummary } from '@/lib/types';

export function RoomsView({
  rooms,
  agents,
  initialCreateOpen,
}: {
  rooms: RoomSummary[];
  agents: AgentView[];
  initialCreateOpen: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialCreateOpen);

  function closeDialog() {
    setOpen(false);
    if (initialCreateOpen) router.replace('/rooms', { scroll: false });
  }

  function handleCreated(room: RoomRecord) {
    setOpen(false);
    router.push(`/rooms/${room.id}`);
    router.refresh();
  }

  const modelCount = new Set(agents.map((agent) => `${agent.providerId}:${agent.model}`)).size;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pb-20 sm:px-8 lg:px-12">
      <section className="grid gap-10 pb-14 pt-10 lg:grid-cols-[1.35fr_0.85fr] lg:items-center lg:pb-20 lg:pt-16">
        <div className="stagger-rise">
          <p className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-vermilion" />
            A salon of many minds
          </p>

          <h1 className="display-title mt-6 text-[clamp(2.9rem,7.2vw,5.4rem)]">
            让思想，
            <br />
            <span className="relative inline-block text-vermilion">
              在桌上
              <svg
                aria-hidden
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                className="absolute -bottom-1.5 left-0 h-2.5 w-full text-vermilion/35"
              >
                <path
                  d="M2 8c40-5 92-6 196-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            相遇。
          </h1>

          <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-ink-soft/90">
            召集几位性格不同的 AI 角色，把一个问题放到桌面中央。它们能听见彼此，也会因为意见不同而争起来；你随时可以决定谁开口。
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              发起新讨论
            </Button>
            <Link href="/agents" className={buttonStyles({ variant: 'outline', size: 'lg' })}>
              管理角色
            </Link>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-5">
            <div>
              <p className="font-display text-2xl leading-none text-ink">{rooms.length}</p>
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                场讨论
              </p>
            </div>
            <div>
              <p className="font-display text-2xl leading-none text-ink">{agents.length}</p>
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                位角色
              </p>
            </div>
            <div>
              <p className="font-display text-2xl leading-none text-ink">{modelCount}</p>
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                个模型
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto hidden w-full max-w-[420px] lg:block lg:justify-self-end">
          <RoundTableGraphic agents={agents} />
        </div>
      </section>

      <section aria-labelledby="salon-list-title">
        <div className="flex items-end justify-between gap-4 border-b border-ink pb-3">
          <h2 id="salon-list-title" className="font-display text-[26px] leading-none tracking-tight">
            桌上的讨论
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {rooms.length} salons
          </p>
        </div>

        {rooms.length > 0 ? (
          <ul className="divide-y divide-line">
            {rooms.map((room, index) => (
              <li key={room.id} className="stagger-rise">
                <Link
                  href={`/rooms/${room.id}`}
                  className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 py-6 transition-colors sm:gap-7"
                >
                  <span className="pt-1 font-display text-[22px] leading-none text-line-strong transition-colors group-hover:text-vermilion">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="min-w-0">
                    <h3 className="font-display text-[22px] leading-snug tracking-tight text-ink transition-colors group-hover:text-vermilion sm:text-[25px]">
                      {room.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-1 text-[13px] leading-relaxed text-muted">
                      {room.lastSnippet ?? '还没有人开口。推门进去，说第一句话。'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {room.participants.slice(0, 4).map((participant) => (
                        <span
                          key={participant.agentId}
                          className="inline-flex items-center gap-1.5 border border-line bg-surface/60 px-2 py-0.5 text-[10.5px] text-ink-soft"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: participant.color }}
                          />
                          {participant.name}
                          {!participant.enabled ? (
                            <span className="text-muted/60">（旁听）</span>
                          ) : null}
                        </span>
                      ))}
                      <span className="ml-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
                        {room.messageCount} 条发言
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-1">
                    <span
                      suppressHydrationWarning
                      className="hidden whitespace-nowrap text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:block"
                    >
                      {formatRelative(room.lastMessageAt)}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center border border-line text-muted transition-colors group-hover:border-vermilion group-hover:bg-vermilion group-hover:text-paper">
                      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 border border-dashed border-line-strong bg-surface/50 px-6 py-16 text-center">
            <span className="stamp-square mx-auto text-vermilion">桌</span>
            <p className="mt-5 font-display text-[26px] tracking-tight">桌上还空着。</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
              发起第一场讨论，把那个一直没想通的问题放上来。角色们会给你不止一个答案。
            </p>
            <Button className="mt-6" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              发起新讨论
            </Button>
          </div>
        )}
      </section>

      <NewRoomDialog
        open={open}
        onClose={closeDialog}
        agents={agents}
        onCreated={handleCreated}
      />
    </div>
  );
}
