'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';

import { KindBadge } from '@/components/kind-badge';
import { ProviderDialog } from '@/components/settings/provider-dialog';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiSend } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { KIND_LABELS, PROVIDER_PRESETS } from '@/lib/constants';
import type { PublicProvider } from '@/lib/types';

interface TestFeedback {
  ok: boolean;
  message: string;
  latencyMs: number;
}

export function ProvidersStudio({ initialProviders }: { initialProviders: PublicProvider[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [providers, setProviders] = useState(initialProviders);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PublicProvider | null>(null);
  const [preset, setPreset] = useState<string | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, TestFeedback>>({});
  const [deleteTarget, setDeleteTarget] = useState<PublicProvider | null>(null);
  const [deleting, setDeleting] = useState(false);

  const modelCount = new Set(providers.flatMap((provider) => provider.models)).size;
  const onlyMock = providers.every((provider) => provider.kind === 'mock');
  const quickPresets = ['deepseek', 'hunyuan', 'mimo', 'zhipu']
    .map((id) => PROVIDER_PRESETS.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  function openCreate(presetId = 'deepseek') {
    setEditing(null);
    setPreset(presetId);
    setDialogOpen(true);
  }

  function openEdit(provider: PublicProvider) {
    setEditing(provider);
    setPreset(null);
    setDialogOpen(true);
  }

  function handleSaved(provider: PublicProvider) {
    setProviders((current) => {
      const index = current.findIndex((item) => item.id === provider.id);
      if (index < 0) return [...current, provider];
      const next = [...current];
      next[index] = provider;
      return next;
    });
    setDialogOpen(false);
    router.refresh();
  }

  async function test(provider: PublicProvider) {
    if (testing[provider.id]) return;
    setTesting((current) => ({ ...current, [provider.id]: true }));
    setFeedback((current) => {
      const next = { ...current };
      delete next[provider.id];
      return next;
    });
    try {
      const result = await apiSend<TestFeedback>('/api/providers/test', 'POST', {
        providerId: provider.id,
        name: provider.name,
        kind: provider.kind,
        baseUrl: provider.baseUrl,
        model: provider.models[0],
      });
      setFeedback((current) => ({ ...current, [provider.id]: result }));
    } catch (cause) {
      setFeedback((current) => ({
        ...current,
        [provider.id]: {
          ok: false,
          latencyMs: 0,
          message: cause instanceof Error ? cause.message : '连接失败',
        },
      }));
    } finally {
      setTesting((current) => ({ ...current, [provider.id]: false }));
    }
  }

  async function remove() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await apiSend(`/api/providers/${deleteTarget.id}`, 'DELETE');
      setProviders((current) => current.filter((provider) => provider.id !== deleteTarget.id));
      push({ title: '接入已移除', description: deleteTarget.name, tone: 'success' });
      setDeleteTarget(null);
      router.refresh();
    } catch (cause) {
      push({
        title: '没能删除接入',
        description: cause instanceof Error ? cause.message : '请重试',
        tone: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 pb-20 pt-10 sm:px-8 lg:px-12">
      <header className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-2xl">
          <p className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-vermilion" />
            Models &amp; keys
          </p>
          <h1 className="display-title mt-5 text-[clamp(2.4rem,5.4vw,4rem)]">把模型请进来。</h1>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted">
            任何兼容 OpenAI Chat Completions 的服务都能接入，Claude 走原生协议。角色只是引用「接入 + 模型名」，换模型不用重写人设。
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 lg:items-end">
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            添加接入
          </Button>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            {providers.length} provider{providers.length === 1 ? '' : 's'} · {modelCount} model
            {modelCount === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      <div className="mt-2 divide-y divide-line">
        {providers.map((provider) => {
          const result = feedback[provider.id];
          const loading = Boolean(testing[provider.id]);
          const ready = provider.kind === 'mock' || provider.hasKey;

          return (
            <div
              key={provider.id}
              className="grid gap-5 py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      ready ? 'bg-moss' : 'bg-vermilion',
                    )}
                    aria-hidden
                  />
                  <h2 className="font-display text-[24px] leading-none tracking-tight text-ink">
                    {provider.name}
                  </h2>
                  <KindBadge kind={provider.kind} />
                  {provider.kind === 'mock' ? (
                    <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-muted/60">
                      built in
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 truncate font-mono text-[10.5px] text-muted">
                  {provider.baseUrl || '本地模板，无需 Base URL'}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    key
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[9.5px]',
                      ready ? 'text-ink-soft' : 'text-vermilion',
                    )}
                  >
                    {provider.kind === 'mock'
                      ? '不需要'
                      : provider.hasKey
                        ? provider.keyHint
                        : '未设置'}
                  </span>
                  <span className="mx-1 h-3 w-px bg-line" />
                  {provider.models.slice(0, 5).map((model) => (
                    <span
                      key={model}
                      className="border border-line bg-surface/70 px-1.5 py-0.5 font-mono text-[9px] text-ink-soft"
                    >
                      {model}
                    </span>
                  ))}
                  {provider.models.length > 5 ? (
                    <span className="font-mono text-[9px] text-muted">
                      +{provider.models.length - 5}
                    </span>
                  ) : null}
                </div>

                {result ? (
                  <p
                    className={cn(
                      'mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed',
                      result.ok ? 'text-moss' : 'text-vermilion',
                    )}
                  >
                    {result.ok ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                    )}
                    <span>
                      {result.message}
                      {result.latencyMs > 0 ? ` · ${result.latencyMs}ms` : ''}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void test(provider)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                  )}
                  {loading ? '测试中' : '测试连接'}
                </Button>

                {provider.kind !== 'mock' ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(provider)}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.7} />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`删除 ${provider.name}`}
                      onClick={() => setDeleteTarget(provider)}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {onlyMock ? (
        <section className="mt-10 border border-line bg-surface/40 px-5 py-6 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow">Quick start</p>
              <h2 className="mt-1.5 font-display text-[24px] leading-tight tracking-tight">
                先请一个真实模型进来
              </h2>
            </div>
            <p className="max-w-md text-[11.5px] leading-relaxed text-muted">
              演示模式不消耗额度，但回复是本地模板。接入真实模型后，角色的设定才会真正生效。
            </p>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quickPresets.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openCreate(item.id)}
                className="group border border-line bg-surface px-3 py-3 text-left transition-colors hover:border-ink"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-[17px] leading-none">{item.label}</span>
                  <Plus
                    className="h-3.5 w-3.5 text-muted transition-colors group-hover:text-vermilion"
                    strokeWidth={1.8}
                  />
                </span>
                <span className="mt-1.5 block font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted">
                  {item.note}
                </span>
                <span className="mt-2 block truncate font-mono text-[8px] text-muted/60">
                  {item.baseUrl || '自定义 Base URL'}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-10 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
        <div className="border border-line bg-surface/60 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            接入是如何工作的
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            角色保存的是「接入 ID + 模型名」。修改接入的地址或 Key 会立即影响所有引用它的角色，不需要逐个改。
          </p>
        </div>
        <div className="border border-line bg-surface/60 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            密钥存放
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            Key 以明文写入本机 <code className="font-mono">data/roundtable.db</code>
            ，只由服务端读取；浏览器接口只返回掩码。请勿提交数据目录。
          </p>
        </div>
      </div>

      <ProviderDialog
        open={dialogOpen}
        provider={editing}
        initialPreset={preset}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        eyebrow="Remove connection"
        title="移除这个模型接入？"
        description="如果有角色正在使用它，删除会被拒绝。请先为那些角色切换接入。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="vermilion" onClick={() => void remove()} disabled={deleting}>
              {deleting ? '删除中…' : '删除接入'}
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="border border-line bg-surface px-4 py-3">
            <p className="font-display text-[20px] leading-none">{deleteTarget.name}</p>
            <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
              {KIND_LABELS[deleteTarget.kind]} · {deleteTarget.baseUrl || '本地模板'}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
