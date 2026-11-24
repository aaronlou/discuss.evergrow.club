'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  ChevronLeft,
  MoreHorizontal,
  PanelRight,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { AgentSeal } from '@/components/agent-seal';
import { Composer } from '@/components/chat/composer';
import { MessageItem, QueuedMessage } from '@/components/chat/message-item';
import { ParticipantsPanel } from '@/components/chat/participants-panel';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiGet, apiSend, ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { STARTER_PROMPTS } from '@/lib/constants';
import { openEventStream } from '@/lib/stream-client';
import type {
  AgentView,
  MessageView,
  Participant,
  RoomBundle,
  RoomRecord,
  RoundResponder,
} from '@/lib/types';

interface RoundStartPayload {
  roomId: string;
  responders: RoundResponder[];
  userMessageId: string | null;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function RoomMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="更多操作"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-8 w-8 items-center justify-center border transition-colors',
          open
            ? 'border-line bg-surface text-ink'
            : 'border-transparent text-muted hover:border-line hover:bg-surface hover:text-ink',
        )}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1 w-40 border border-line bg-surface py-1 shadow-lift">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-ink-soft transition-colors hover:bg-paper-deep/60 hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.7} />
            重命名
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-vermilion transition-colors hover:bg-vermilion/5"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
            删除讨论
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function RoomView({
  initialRoom,
  initialParticipants,
  initialMessages,
  allAgents,
}: {
  initialRoom: RoomRecord;
  initialParticipants: Participant[];
  initialMessages: MessageView[];
  allAgents: AgentView[];
}) {
  const router = useRouter();
  const { push } = useToast();

  const [room, setRoom] = useState(initialRoom);
  const [participants, setParticipants] = useState(initialParticipants);
  const [messages, setMessages] = useState(initialMessages);
  const [queued, setQueued] = useState<RoundResponder[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(initialRoom.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [seed, setSeed] = useState<{ text: string; nonce: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);

  const enabledParticipants = participants.filter((participant) => participant.enabled);

  useEffect(() => {
    if (!atBottom) return;
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, queued, atBottom]);

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    setAtBottom(distance < 120);
  }

  function scrollToBottom() {
    setAtBottom(true);
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }

  async function runRound(url: string, body: unknown) {
    if (streaming) return;
    if (enabledParticipants.length === 0) {
      push({ title: '还没有可以发言的角色', description: '先在右侧邀请或开启一位。', tone: 'error' });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    stopRequestedRef.current = false;
    setStreaming(true);
    setNotice(null);
    setQueued([]);
    setSpeaking(null);
    setAtBottom(true);

    try {
      await openEventStream(
        url,
        body,
        (event, payload) => {
          switch (event) {
            case 'user_message': {
              const message = payload as MessageView;
              if (message.role !== 'user') break;
              setMessages((current) =>
                current.some((item) => item.id === message.id) ? current : [...current, message],
              );
              break;
            }
            case 'round_start': {
              const data = payload as RoundStartPayload;
              setQueued(data.responders);
              break;
            }
            case 'agent_start': {
              const message = payload as MessageView;
              setQueued((current) =>
                current.filter((responder) => responder.agentId !== message.agentId),
              );
              setSpeaking(message.agent?.name ?? null);
              setMessages((current) => {
                const exists = current.some((item) => item.id === message.id);
                return exists
                  ? current.map((item) => (item.id === message.id ? message : item))
                  : [...current, message];
              });
              break;
            }
            case 'delta': {
              const data = payload as { messageId: string; text: string };
              setMessages((current) =>
                current.map((message) =>
                  message.id === data.messageId
                    ? { ...message, content: message.content + data.text, status: 'streaming' }
                    : message,
                ),
              );
              break;
            }
            case 'agent_end':
            case 'agent_error': {
              const message = payload as MessageView;
              setMessages((current) => {
                const exists = current.some((item) => item.id === message.id);
                return exists
                  ? current.map((item) => (item.id === message.id ? message : item))
                  : [...current, message];
              });
              break;
            }
            case 'notice': {
              const data = payload as { message: string };
              push({ title: data.message, tone: 'default' });
              break;
            }
            case 'fatal': {
              const data = payload as { message: string };
              setNotice(data.message);
              push({ title: '这一轮提前结束了', description: data.message, tone: 'error' });
              break;
            }
            case 'done':
              break;
            default:
              break;
          }
        },
        controller.signal,
      );
    } catch (error) {
      if (!isAbortError(error)) {
        const message =
          error instanceof ApiError || error instanceof Error
            ? error.message
            : '连接中断，请重试';
        setNotice(message);
        push({ title: '没能完成这一轮', description: message, tone: 'error' });
      }
    } finally {
      const interrupted = stopRequestedRef.current;
      abortRef.current = null;
      setStreaming(false);
      setQueued([]);
      setSpeaking(null);
      // If the stream was aborted client-side, the final agent_end frame may
      // never arrive. Settle any in-flight bubble locally so it stops "typing".
      setMessages((current) =>
        current.map((message) =>
          message.status === 'streaming'
            ? {
                ...message,
                status: 'stopped',
                error: interrupted
                  ? null
                  : message.content
                    ? '连接中断，回复未完成'
                    : '连接中断，没有收到内容',
              }
            : message,
        ),
      );
      router.refresh();
    }
  }

  function handleSend(content: string, mentions: string[]) {
    void runRound(`/api/rooms/${room.id}/messages`, {
      content,
      ...(mentions.length > 0 ? { mentions } : {}),
    });
  }

  function continueRound() {
    if (messages.length === 0) {
      push({ title: '先由你开个头', description: '发第一句话之后，角色们才能接话。', tone: 'default' });
      return;
    }
    void runRound(`/api/rooms/${room.id}/round`, {});
  }

  async function stop() {
    stopRequestedRef.current = true;
    abortRef.current?.abort();
    try {
      await apiSend(`/api/rooms/${room.id}/stop`, 'POST');
    } catch {
      // the round may already be over
    }
  }

  function toggleParticipant(agentId: string, enabled: boolean) {
    const next = participants.map((participant) =>
      participant.agentId === agentId ? { ...participant, enabled } : participant,
    );
    const activeIds = next.filter((participant) => participant.enabled).map((p) => p.agentId);
    if (activeIds.length === 0) {
      push({ title: '至少保留一位发言人', tone: 'error' });
      return;
    }

    const previous = participants;
    setParticipants(next);
    void apiSend(`/api/rooms/${room.id}`, 'PATCH', { activeAgentIds: activeIds })
      .then(() => router.refresh())
      .catch((error: unknown) => {
        setParticipants(previous);
        push({
          title: '没能更新在场角色',
          description: error instanceof Error ? error.message : '请重试',
          tone: 'error',
        });
      });
  }

  async function invite(agentId: string) {
    const nextAgentIds = [...participants.map((participant) => participant.agentId), agentId];
    try {
      await apiSend(`/api/rooms/${room.id}`, 'PATCH', { agentIds: nextAgentIds });
      const bundle = await apiGet<RoomBundle>(`/api/rooms/${room.id}`);
      setParticipants(bundle.participants);
      push({ title: '新角色已入席', description: '下一轮就会开口。', tone: 'success' });
      router.refresh();
    } catch (error) {
      push({
        title: '没能邀请角色',
        description: error instanceof Error ? error.message : '请重试',
        tone: 'error',
      });
      throw error;
    }
  }

  function openRename() {
    setRenameValue(room.title);
    setRenameOpen(true);
  }

  async function saveTitle() {
    const title = renameValue.trim();
    if (!title || savingTitle) return;
    setSavingTitle(true);
    try {
      await apiSend(`/api/rooms/${room.id}`, 'PATCH', { title });
      setRoom((current) => ({ ...current, title }));
      setRenameOpen(false);
      push({ title: '名字已更新', tone: 'success' });
      router.refresh();
    } catch (error) {
      push({
        title: '没能重命名',
        description: error instanceof Error ? error.message : '请重试',
        tone: 'error',
      });
    } finally {
      setSavingTitle(false);
    }
  }

  async function removeRoom() {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiSend(`/api/rooms/${room.id}`, 'DELETE');
      router.push('/rooms');
      router.refresh();
    } catch (error) {
      push({
        title: '没能删除讨论',
        description: error instanceof Error ? error.message : '请重试',
        tone: 'error',
      });
      setDeleting(false);
    }
  }

  const allMock =
    participants.length > 0 && participants.every((participant) => participant.providerKind === 'mock');
  const isEmpty = messages.length === 0 && !streaming && queued.length === 0;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      <header className="shrink-0 border-b border-line bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1180px] items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
          <Link
            href="/rooms"
            aria-label="回到讨论列表"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink lg:hidden"
          >
            <ChevronLeft className="h-4.5 w-4.5" strokeWidth={1.8} />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate font-display text-[19px] leading-tight tracking-tight sm:text-[23px]">
                {room.title}
              </h1>
              {streaming ? (
                <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-vermilion sm:inline-flex">
                  <span className="live-dot" />
                  {speaking ? `${speaking} 发言中` : '进行中'}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              <span className="text-vermilion">{enabledParticipants.length} 位在场</span>
              <span className="text-line-strong">/</span>
              <span>{messages.length} 条发言</span>
              <span className="hidden text-line-strong sm:inline">/</span>
              <span className="hidden sm:inline">依次发言</span>
            </div>
          </div>

          <div className="hidden items-center -space-x-2 md:flex">
            {participants.slice(0, 4).map((participant) => (
              <AgentSeal
                key={participant.agentId}
                name={participant.name}
                emoji={participant.emoji}
                color={participant.color}
                size="sm"
                dimmed={!participant.enabled}
                className="ring-2 ring-paper"
              />
            ))}
            {participants.length > 4 ? (
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line bg-paper-deep font-mono text-[9px] text-muted ring-2 ring-paper">
                +{participants.length - 4}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={continueRound}
              disabled={streaming || messages.length === 0}
              aria-label="再聊一轮"
              className="sm:hidden"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={continueRound}
              disabled={streaming || messages.length === 0}
              className="hidden sm:inline-flex"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
              再聊一轮
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPanelOpen(true)}
              aria-label="查看在场角色"
              className="xl:hidden"
            >
              <PanelRight className="h-4 w-4" strokeWidth={1.7} />
            </Button>
            <RoomMenu onRename={openRename} onDelete={() => setDeleteOpen(true)} />
          </div>
        </div>
      </header>

      {allMock ? (
        <div className="shrink-0 border-b border-ochre/25 bg-ochre/[0.06] px-4 py-1.5 text-center text-[10.5px] text-ochre">
          当前是演示模式，回复由本地模板生成。
          <Link href="/settings" className="ml-1 underline underline-offset-2 hover:text-ink">
            接入真实模型 →
          </Link>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="absolute inset-0 overflow-y-auto"
            >
              <div
                className={cn(
                  'mx-auto w-full max-w-[860px] px-4 py-7 sm:px-8 sm:py-9',
                  isEmpty && 'flex min-h-full flex-col justify-center',
                )}
              >
                {notice ? (
                  <div className="mb-6 border-l-2 border-vermilion bg-vermilion/5 px-4 py-3 text-[12px] leading-relaxed text-vermilion">
                    {notice}
                  </div>
                ) : null}

                {isEmpty ? (
                  <div className="animate-rise mx-auto max-w-xl py-4 text-center sm:py-10">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-line-strong bg-surface/50">
                      <span className="font-display text-[26px] leading-none text-vermilion">言</span>
                    </div>
                    <p className="eyebrow mt-5">The floor is yours</p>
                    <h2 className="mt-2.5 font-display text-[clamp(26px,4vw,34px)] leading-tight tracking-tight">
                      第一位发言人，是你。
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-muted">
                      写下一个值得争论的问题。发送后，
                      {enabledParticipants.length > 0
                        ? `${enabledParticipants.length} 位角色会依次回应，并且能看见彼此说过的话。`
                        : '记得先邀请一位角色入席。'}
                    </p>

                    <div className="mt-7 grid gap-2 text-left">
                      {STARTER_PROMPTS.map((prompt, index) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setSeed({ text: prompt, nonce: Date.now() })}
                          className="group flex items-start gap-4 border border-line bg-surface/70 px-4 py-3 text-left transition-colors hover:border-ink hover:bg-surface"
                        >
                          <span className="mt-0.5 font-mono text-[10px] text-line-strong transition-colors group-hover:text-vermilion">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="flex-1 text-[12.5px] leading-relaxed text-ink-soft transition-colors group-hover:text-ink">
                            {prompt}
                          </span>
                          <ArrowUpRight
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                            strokeWidth={1.8}
                          />
                        </button>
                      ))}
                    </div>

                    <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.18em] text-muted/60">
                      点一条作为开头 · 也可以自己写
                    </p>
                  </div>
                ) : (
                  <div className="space-y-7">
                    {messages.map((message) => (
                      <MessageItem key={message.id} message={message} />
                    ))}
                    {queued.map((responder) => (
                      <QueuedMessage key={`queued-${responder.agentId}`} responder={responder} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!atBottom ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="pointer-events-auto inline-flex items-center gap-1.5 border border-line bg-surface px-3 py-1.5 text-[11px] text-ink shadow-paper transition-colors hover:border-ink"
                >
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.8} />
                  回到最新
                </button>
              </div>
            ) : null}
          </div>

          <Composer
            participants={participants}
            streaming={streaming}
            seed={seed}
            onSend={handleSend}
            onStop={() => void stop()}
          />
        </div>

        <aside className="hidden w-[302px] shrink-0 border-l border-line xl:flex xl:flex-col">
          <ParticipantsPanel
            participants={participants}
            allAgents={allAgents}
            locked={streaming}
            onToggle={toggleParticipant}
            onInvite={invite}
          />
        </aside>
      </div>

      {panelOpen ? (
        <div className="fixed inset-0 z-[80] xl:hidden">
          <button
            type="button"
            aria-label="关闭角色面板"
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
          />
          <aside className="animate-rise absolute right-0 top-0 h-full w-[320px] max-w-[92vw] border-l border-line bg-paper shadow-lift">
            <ParticipantsPanel
              participants={participants}
              allAgents={allAgents}
              locked={streaming}
              onToggle={toggleParticipant}
              onInvite={invite}
              onClose={() => setPanelOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        eyebrow="Rename"
        title="给这场讨论改个名字"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameOpen(false)} disabled={savingTitle}>
              取消
            </Button>
            <Button variant="vermilion" onClick={() => void saveTitle()} disabled={savingTitle}>
              {savingTitle ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <Field label="讨论主题" htmlFor="rename-title">
          <Input
            id="rename-title"
            value={renameValue}
            maxLength={80}
            autoFocus
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void saveTitle();
              }
            }}
          />
        </Field>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        eyebrow="Delete"
        title="把这张桌子撤掉？"
        description="讨论和所有历史发言都会被永久删除，无法恢复。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              留着
            </Button>
            <Button variant="vermilion" onClick={() => void removeRoom()} disabled={deleting}>
              {deleting ? '删除中…' : '删除讨论'}
            </Button>
          </>
        }
      >
        <div className="border border-line bg-surface px-4 py-3">
          <p className="flex items-center gap-2 font-display text-[17px] text-ink">
            <Trash2 className="h-4 w-4 text-vermilion" strokeWidth={1.7} />
            {room.title}
          </p>
          <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
            {messages.length} 条发言 · {participants.length} 位角色
          </p>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          如果你只是想换个话题，可以新建一场讨论，而不必删除这里的历史。
        </p>
      </Modal>


      <Link
        href="/rooms"
        className="sr-only"
      >
        返回讨论列表
      </Link>
    </div>
  );
}
