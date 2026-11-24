'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

import { AgentSeal } from '@/components/agent-seal';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, Hint, Input, Select, Textarea } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiGet, apiSend } from '@/lib/api-client';
import { AGENT_COLORS, AGENT_EMOJIS, KIND_LABELS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { AgentView, PublicProvider } from '@/lib/types';

interface FormState {
  name: string;
  emoji: string;
  color: string;
  persona: string;
  providerId: string;
  model: string;
  temperature: number;
}

function toForm(agent: AgentView | null, providers: PublicProvider[]): FormState {
  const fallback = providers[0];
  return {
    name: agent?.name ?? '',
    emoji: agent?.emoji ?? '🪶',
    color: agent?.color ?? AGENT_COLORS[0],
    persona: agent?.persona ?? '',
    providerId: agent?.providerId ?? fallback?.id ?? '',
    model: agent?.model ?? fallback?.models[0] ?? '',
    temperature: agent?.temperature ?? 0.8,
  };
}

export function AgentDialog({
  open,
  agent,
  providers,
  onClose,
  onSaved,
}: {
  open: boolean;
  agent: AgentView | null;
  providers: PublicProvider[];
  onClose: () => void;
  onSaved: (agent: AgentView) => void;
}) {
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(() => toForm(agent, providers));
  const [modelOptions, setModelOptions] = useState<string[]>(agent?.provider.models ?? []);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = toForm(agent, providers);
    setForm(next);
    setModelOptions(
      providers.find((provider) => provider.id === next.providerId)?.models ?? [],
    );
    setLoadingModels(false);
    setSaving(false);
    setError(null);
  }, [open, agent, providers]);

  const selectedProvider = providers.find((provider) => provider.id === form.providerId);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleProviderChange(providerId: string) {
    const provider = providers.find((item) => item.id === providerId);
    setForm((current) => ({
      ...current,
      providerId,
      model: provider?.models[0] ?? '',
    }));
    setModelOptions(provider?.models ?? []);
  }

  async function loadModels() {
    if (!form.providerId || loadingModels) return;
    setLoadingModels(true);
    try {
      const data = await apiGet<{ models: string[] }>(`/api/providers/${form.providerId}/models`);
      setModelOptions(data.models);
      if (data.models.length > 0 && !form.model) update('model', data.models[0]);
      push({
        title: `拉到 ${data.models.length} 个模型`,
        description: data.models.length === 0 ? '该服务没有返回模型列表，请手动填写。' : undefined,
        tone: 'success',
      });
    } catch (cause) {
      push({
        title: '拉取模型失败',
        description: cause instanceof Error ? cause.message : '请检查接入配置',
        tone: 'error',
      });
    } finally {
      setLoadingModels(false);
    }
  }

  async function save() {
    if (saving) return;
    setError(null);
    if (!form.name.trim()) {
      setError('给角色起个名字。');
      return;
    }
    if (!form.providerId) {
      setError('请选择一个模型接入。');
      return;
    }
    if (!form.model.trim()) {
      setError('请填写模型名。');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        emoji: form.emoji.trim() || '◐',
        color: form.color,
        persona: form.persona.trim(),
        providerId: form.providerId,
        model: form.model.trim(),
        temperature: form.temperature,
      };
      const saved = agent
        ? await apiSend<AgentView>(`/api/agents/${agent.id}`, 'PATCH', payload)
        : await apiSend<AgentView>('/api/agents', 'POST', payload);
      push({
        title: agent ? '角色已更新' : '新角色已入席',
        description: `${saved.name} · ${saved.provider.name} / ${saved.model}`,
        tone: 'success',
      });
      onSaved(saved);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '保存失败';
      setError(message);
      push({ title: '没能保存角色', description: message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={agent ? 'Edit cast member' : 'New cast member'}
      title={agent ? '调整这位角色' : '请一位新角色入席'}
      description="角色设定决定了它在圆桌上的视角和脾气。模型只是嗓子，设定才是脑子。"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="vermilion" onClick={() => void save()} disabled={saving}>
            {saving ? '保存中…' : agent ? '保存修改' : '让它入席'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 border border-line bg-surface px-4 py-3">
          <AgentSeal
            name={form.name || '新角色'}
            emoji={form.emoji}
            color={form.color}
            size="lg"
          />
          <div className="min-w-0">
            <p
              className="truncate font-display text-[22px] leading-none tracking-tight"
              style={{ color: form.color }}
            >
              {form.name || '未命名角色'}
            </p>
            <p className="mt-1.5 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              {selectedProvider?.name ?? '未选择接入'} · {form.model || '未选择模型'}
            </p>
          </div>
          <span className="ml-auto hidden font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted/60 sm:block">
            live preview
          </span>
        </div>

        <Field label="角色名" htmlFor="agent-name" hint="2–6 个字最好记，比如「阿澜」「图灵」。">
          <Input
            id="agent-name"
            value={form.name}
            maxLength={24}
            autoFocus
            onChange={(event) => update('name', event.target.value)}
            placeholder="例如：阿澜"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel>表情</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {AGENT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`选择表情 ${emoji}`}
                  onClick={() => update('emoji', emoji)}
                  className={cn(
                    'flex h-[30px] w-[30px] items-center justify-center border text-[15px] transition-colors',
                    form.emoji === emoji
                      ? 'border-vermilion bg-vermilion/10'
                      : 'border-line bg-surface/60 hover:border-line-strong',
                  )}
                >
                  {emoji}
                </button>
              ))}
              <input
                aria-label="自定义表情"
                value={form.emoji}
                maxLength={8}
                placeholder="自定义"
                onChange={(event) => update('emoji', event.target.value)}
                className="h-[30px] w-[52px] border border-line bg-surface px-1 text-center text-[13px] focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div>
            <FieldLabel>标识色</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              {AGENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`选择颜色 ${color}`}
                  onClick={() => update('color', color)}
                  className={cn(
                    'h-6 w-6 rounded-full border transition-transform',
                    form.color.toLowerCase() === color.toLowerCase()
                      ? 'scale-110 border-ink ring-1 ring-ink ring-offset-2 ring-offset-surface'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
              <label className="relative inline-flex h-6 w-9 cursor-pointer items-center justify-center border border-dashed border-line-strong text-[10px] text-muted hover:border-ink">
                <input
                  type="color"
                  value={form.color}
                  onChange={(event) => update('color', event.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="自定义颜色"
                />
                +
              </label>
            </div>
          </div>
        </div>

        <Field
          label="角色设定"
          htmlFor="agent-persona"
          hint="写清楚它关心什么、如何推理、语气如何、反对什么。具体的偏见比完美的人设更有用。"
        >
          <Textarea
            id="agent-persona"
            value={form.persona}
            rows={5}
            maxLength={4000}
            onChange={(event) => update('persona', event.target.value)}
            placeholder="例如：产品思考者。总是从真实用户与具体场景出发，讨厌空泛的宏大叙事；会先问「谁、在什么情况下、为什么需要它」，再谈方案。"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="模型接入" htmlFor="agent-provider">
            <Select
              id="agent-provider"
              value={form.providerId}
              onChange={(event) => handleProviderChange(event.target.value)}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.kind === 'mock'
                    ? provider.name
                    : `${provider.name} · ${KIND_LABELS[provider.kind]}`}
                </option>
              ))}
            </Select>
            {selectedProvider && selectedProvider.kind !== 'mock' && !selectedProvider.hasKey ? (
              <p className="mt-1.5 text-[11px] leading-relaxed text-vermilion">
                该接入还没有 API Key，发言时会失败。先到「接入」页补上。
              </p>
            ) : (
              <Hint>角色发言时会调用这个接入。</Hint>
            )}
          </Field>

          <Field label="模型" htmlFor="agent-model">
            <div className="flex gap-2">
              <Input
                id="agent-model"
                value={form.model}
                list="agent-model-options"
                onChange={(event) => update('model', event.target.value)}
                placeholder="deepseek-chat"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="拉取模型列表"
                title="从接入服务拉取模型列表"
                onClick={() => void loadModels()}
                disabled={loadingModels || !form.providerId}
              >
                {loadingModels ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" strokeWidth={1.7} />
                )}
              </Button>
            </div>
            <datalist id="agent-model-options">
              {modelOptions.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
            <Hint>可以直接输入，也可以拉取该接入的模型列表。</Hint>
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <FieldLabel className="mb-0">表达温度</FieldLabel>
            <span className="font-mono text-[10px] tracking-[0.1em] text-muted">
              {form.temperature.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={form.temperature}
            onChange={(event) => update('temperature', Number(event.target.value))}
            aria-label="表达温度"
            className="w-full accent-vermilion"
          />
          <div className="mt-1 flex justify-between font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted">
            <span>克制 · 稳定</span>
            <span>发散 · 冒险</span>
          </div>
        </div>

        {error ? (
          <p className="border-l-2 border-vermilion bg-vermilion/5 px-3 py-2 text-[12px] leading-relaxed text-vermilion">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
