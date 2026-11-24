'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, Loader2, Plus, UserPlus, X } from 'lucide-react';

import { AgentSeal } from '@/components/agent-seal';
import { KindBadge } from '@/components/kind-badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/cn';
import { firstNameSentence } from '@/lib/format';
import type { AgentView, Participant } from '@/lib/types';

export function ParticipantsPanel({
  participants,
  allAgents,
  locked,
  onToggle,
  onInvite,
  onClose,
}: {
  participants: Participant[];
  allAgents: AgentView[];
  locked: boolean;
  onToggle: (agentId: string, enabled: boolean) => void;
  onInvite: (agentId: string) => Promise<void>;
  onClose?: () => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const enabledCount = participants.filter((participant) => participant.enabled).length;
  const available = allAgents.filter(
    (agent) => !participants.some((participant) => participant.agentId === agent.id),
  );

  async function invite(agentId: string) {
    setPendingId(agentId);
    try {
      await onInvite(agentId);
      setInviteOpen(false);
    } catch {
      // the parent surfaces the error as a toast
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper/40">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="eyebrow">In the room</p>
          <h2 className="mt-1 font-display text-[19px] leading-none tracking-tight">在场角色</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.1em] text-muted">
            {enabledCount}/{participants.length}
          </span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={1.7} />
            </button>
          ) : null}
        </div>
      </header>

      <p className="border-b border-line/70 px-5 py-2.5 text-[10.5px] leading-relaxed text-muted">
        关闭开关的角色本轮只旁听。发言顺序就是下面的座位顺序。
      </p>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {participants.map((participant, index) => (
          <div
            key={participant.agentId}
            className={cn(
              'border px-3 py-3 transition-colors',
              participant.enabled
                ? 'border-line bg-surface/80'
                : 'border-dashed border-line bg-transparent',
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-[8.5px] text-line-strong">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <AgentSeal
                  name={participant.name}
                  emoji={participant.emoji}
                  color={participant.color}
                  size="sm"
                  dimmed={!participant.enabled}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      'truncate font-display text-[15px] leading-none tracking-tight',
                      participant.enabled ? 'text-ink' : 'text-muted',
                    )}
                  >
                    {participant.name}
                  </p>
                  <span className="ml-auto">
                    <Switch
                      checked={participant.enabled}
                      disabled={locked}
                      onCheckedChange={(checked) => onToggle(participant.agentId, checked)}
                      label={`${participant.name} 参与本轮发言`}
                    />
                  </span>
                </div>

                <p className="mt-1.5 truncate font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted">
                  {participant.model}
                </p>

                <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
                  {firstNameSentence(participant.persona) || '还没有写角色设定'}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-mono text-[8px] uppercase tracking-[0.1em] text-muted/70">
                    {participant.providerName}
                  </span>
                  <KindBadge kind={participant.providerKind} />
                  {!participant.providerHasKey && participant.providerKind !== 'mock' ? (
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-vermilion">
                      缺少 Key
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-line p-4">
        <button
          type="button"
          onClick={() => setInviteOpen((current) => !current)}
          className="flex h-9 w-full items-center justify-between border border-line-strong px-3 text-[12px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <span className="flex items-center gap-2">
            <UserPlus className="h-3.5 w-3.5" strokeWidth={1.7} />
            邀请角色
          </span>
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', inviteOpen && 'rotate-180')}
            strokeWidth={1.7}
          />
        </button>

        {inviteOpen ? (
          <div className="max-h-52 overflow-y-auto border border-line bg-surface">
            {available.length > 0 ? (
              available.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  disabled={pendingId !== null}
                  onClick={() => void invite(agent.id)}
                  className="flex w-full items-center gap-2.5 border-b border-line/70 px-3 py-2 text-left transition-colors last:border-0 hover:bg-paper-deep/50 disabled:opacity-50"
                >
                  <AgentSeal
                    name={agent.name}
                    emoji={agent.emoji}
                    color={agent.color}
                    size="xs"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] text-ink">{agent.name}</span>
                    <span className="block truncate font-mono text-[8px] uppercase tracking-[0.1em] text-muted">
                      {agent.model}
                    </span>
                  </span>
                  {pendingId === agent.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-muted" strokeWidth={1.8} />
                  )}
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-[11px] text-muted">
                所有角色都已经入席。
              </p>
            )}
          </div>
        ) : null}

        <Link
          href="/agents"
          className="block text-center font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
        >
          管理角色设定 →
        </Link>
      </div>
    </div>
  );
}
