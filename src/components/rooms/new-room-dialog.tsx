'use client';

import { useEffect, useState } from 'react';

import { AgentSeal } from '@/components/agent-seal';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiSend } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { firstNameSentence } from '@/lib/format';
import type { AgentView, RoomRecord } from '@/lib/types';

export function NewRoomDialog({
  open,
  onClose,
  agents,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  agents: AgentView[];
  onCreated: (room: RoomRecord) => void;
}) {
  const { push } = useToast();
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setSelected(agents.map((agent) => agent.id));
    setError(null);
    setSaving(false);
  }, [open, agents]);

  function toggle(agentId: string) {
    setSelected((current) =>
      current.includes(agentId)
        ? current.filter((id) => id !== agentId)
        : [...current, agentId],
    );
  }

  async function submit() {
    if (saving) return;
    setError(null);
    if (!title.trim()) {
      setError('先给这场讨论起个名字。');
      return;
    }
    if (selected.length === 0) {
      setError('至少邀请一位角色入席。');
      return;
    }
    setSaving(true);
    try {
      const room = await apiSend<RoomRecord>('/api/rooms', 'POST', {
        title: title.trim(),
        agentIds: selected,
      });
      push({ title: '圆桌已摆好', description: '进去说第一句话吧。', tone: 'success' });
      onCreated(room);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '创建失败';
      setError(message);
      push({ title: '没能创建讨论', description: message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="New salon"
      title="摆一张新圆桌"
      description="选好角色，写下要讨论的问题。入席顺序就是它们的发言顺序。"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="vermilion" onClick={submit} disabled={saving || agents.length === 0}>
            {saving ? '正在摆桌…' : `入席 · ${selected.length} 位`}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Field
          label="讨论主题"
          htmlFor="room-title"
          hint="它会出现在房间顶部，也作为角色们的背景信息。"
        >
          <Input
            id="room-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="例如：AI 群聊需要一位主持人吗？"
            maxLength={80}
            autoFocus
          />
        </Field>

        <div>
          <div className="mb-2 flex items-end justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              入席角色
            </p>
            {agents.length > 0 ? (
              <div className="flex items-center gap-3 text-[10.5px] text-muted">
                <button
                  type="button"
                  onClick={() => setSelected(agents.map((agent) => agent.id))}
                  className="transition-colors hover:text-ink"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="transition-colors hover:text-ink"
                >
                  清空
                </button>
              </div>
            ) : null}
          </div>

          {agents.length === 0 ? (
            <p className="border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-center text-[12.5px] text-muted">
              还没有角色。先到「角色」页创建一位，再来摆桌。
            </p>
          ) : (
            <div className="grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {agents.map((agent) => {
                const checked = selected.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => toggle(agent.id)}
                    aria-pressed={checked}
                    className={cn(
                      'flex items-start gap-3 border p-3 text-left transition-colors',
                      checked
                        ? 'border-ink bg-surface'
                        : 'border-line bg-transparent hover:border-line-strong',
                    )}
                  >
                    <AgentSeal
                      name={agent.name}
                      emoji={agent.emoji}
                      color={agent.color}
                      size="sm"
                      dimmed={!checked}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-display text-[16px] leading-none text-ink">
                          {agent.name}
                        </span>
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center border',
                            checked
                              ? 'border-vermilion bg-vermilion text-paper'
                              : 'border-line-strong',
                          )}
                        >
                          {checked ? (
                            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
                              <path
                                d="M2 6.2 4.8 9 10 3.4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="square"
                              />
                            </svg>
                          ) : null}
                        </span>
                      </span>
                      <span className="mt-1 block truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
                        {agent.model} · {agent.provider.name}
                      </span>
                      <span className="mt-1.5 block line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                        {firstNameSentence(agent.persona) || '还没有写角色设定'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error ? (
          <p className="border-l-2 border-vermilion bg-vermilion/5 px-3 py-2 text-[12px] text-vermilion">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
