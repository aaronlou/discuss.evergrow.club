'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { AgentDialog } from '@/components/agents/agent-dialog';
import { AgentSeal } from '@/components/agent-seal';
import { KindBadge } from '@/components/kind-badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiSend } from '@/lib/api-client';
import type { AgentView, PublicProvider } from '@/lib/types';

export function AgentsStudio({
  initialAgents,
  providers,
}: {
  initialAgents: AgentView[];
  providers: PublicProvider[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [agents, setAgents] = useState(initialAgents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgentView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgentView | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(agent: AgentView) {
    setEditing(agent);
    setDialogOpen(true);
  }

  function handleSaved(agent: AgentView) {
    setAgents((current) => {
      const index = current.findIndex((item) => item.id === agent.id);
      if (index < 0) return [...current, agent];
      const next = [...current];
      next[index] = agent;
      return next;
    });
    setDialogOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await apiSend(`/api/agents/${deleteTarget.id}`, 'DELETE');
      setAgents((current) => current.filter((agent) => agent.id !== deleteTarget.id));
      push({
        title: '角色已离席',
        description: '它的历史发言会保留，并标记为「已离开的角色」。',
        tone: 'success',
      });
      setDeleteTarget(null);
      router.refresh();
    } catch (cause) {
      push({
        title: '没能删除角色',
        description: cause instanceof Error ? cause.message : '请重试',
        tone: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 pb-20 pt-10 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div className="max-w-2xl">
          <p className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-vermilion" />
            The cast
          </p>
          <h1 className="display-title mt-5 text-[clamp(2.4rem,5.4vw,4rem)]">谁坐在桌边？</h1>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted">
            每个角色都有自己的模型、性格与说话方式。它不会附和，除非真的同意；也不会假装中立，如果有明确的立场。
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 sm:items-end">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            新建角色
          </Button>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            {agents.length} cast members
          </p>
        </div>
      </header>

      {agents.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <article
              key={agent.id}
              className="group flex flex-col border border-line bg-surface/80 transition-colors hover:border-line-strong"
            >
              <div className="h-[3px] w-full" style={{ backgroundColor: agent.color }} />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <AgentSeal
                    name={agent.name}
                    emoji={agent.emoji}
                    color={agent.color}
                    size="lg"
                  />
                  <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button
                      type="button"
                      aria-label={`编辑 ${agent.name}`}
                      onClick={() => openEdit(agent)}
                      className="flex h-7 w-7 items-center justify-center border border-transparent text-muted transition-colors hover:border-line hover:bg-paper hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      aria-label={`删除 ${agent.name}`}
                      onClick={() => setDeleteTarget(agent)}
                      className="flex h-7 w-7 items-center justify-center border border-transparent text-muted transition-colors hover:border-vermilion/40 hover:bg-vermilion/5 hover:text-vermilion"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </button>
                  </div>
                </div>

                <h2 className="mt-4 font-display text-[25px] leading-none tracking-tight text-ink">
                  {agent.name}
                </h2>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <KindBadge kind={agent.provider.kind} />
                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    {agent.model}
                  </span>
                </div>

                <p className="mt-3.5 line-clamp-4 flex-1 text-[12px] leading-relaxed text-muted">
                  {agent.persona || '还没有写角色设定。点右上角编辑，给它一个明确的偏见。'}
                </p>

                <footer className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {!agent.provider.hasKey && agent.provider.kind !== 'mock' ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-vermilion" />
                    ) : (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-moss/70" />
                    )}
                    <span className="truncate">{agent.provider.name}</span>
                  </span>
                  <span className="shrink-0">temp {agent.temperature.toFixed(1)}</span>
                </footer>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 border border-dashed border-line-strong bg-surface/50 px-6 py-20 text-center">
          <span className="stamp-square mx-auto text-vermilion">席</span>
          <p className="mt-5 font-display text-[28px] tracking-tight">桌边还空着。</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
            先请一位角色入席。给它一个明确的视角，比给它一个完美的性格更重要。
          </p>
          <Button className="mt-6" onClick={openCreate}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            新建角色
          </Button>
        </div>
      )}

      <div className="mt-14 flex items-start gap-4 border-t border-line pt-6">
        <p className="font-display text-[17px] italic leading-relaxed text-muted">
          “一个有偏见的角色，胜过十个礼貌的助手。”
        </p>
        <span className="ml-auto shrink-0 font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted/60">
          house rule · 01
        </span>
      </div>

      <section className="mt-8 grid gap-7 sm:grid-cols-3" aria-label="角色设定建议">
        {[
          {
            index: '01 / Perspective',
            title: '给它一个偏见',
            body: '「只关心可行性」比「聪明、专业、有经验」更能产生分歧。',
          },
          {
            index: '02 / Voice',
            title: '让它听起来像一个人',
            body: '爱追问、爱冷幽默、句子很短，都比堆砌形容词有效。',
          },
          {
            index: '03 / Blind spot',
            title: '留一处盲区',
            body: '允许它有不懂的事，别的角色才有机会真正补上。',
          },
        ].map((tip) => (
          <div key={tip.index} className="border-t border-line/70 pt-4">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-vermilion/80">
              {tip.index}
            </p>
            <h3 className="mt-2 font-display text-[19px] leading-tight tracking-tight">{tip.title}</h3>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{tip.body}</p>
          </div>
        ))}
      </section>

      <AgentDialog
        open={dialogOpen}
        agent={editing}
        providers={providers}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        eyebrow="Remove cast member"
        title="请这位角色离席？"
        description="角色设定会被删除，但已有讨论中的历史发言会保留。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="vermilion" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? '删除中…' : '删除角色'}
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="flex items-center gap-3 border border-line bg-surface px-4 py-3">
            <AgentSeal
              name={deleteTarget.name}
              emoji={deleteTarget.emoji}
              color={deleteTarget.color}
              size="md"
            />
            <div className="min-w-0">
              <p className="font-display text-[18px] leading-none">{deleteTarget.name}</p>
              <p className="mt-1.5 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {deleteTarget.provider.name} · {deleteTarget.model}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
