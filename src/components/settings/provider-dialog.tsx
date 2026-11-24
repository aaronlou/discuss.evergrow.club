'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldLabel, Hint, Input, Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiSend } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { PROVIDER_PRESETS } from '@/lib/constants';
import type { ProviderKind, PublicProvider } from '@/lib/types';

interface TestResult {
  ok: boolean;
  latencyMs: number;
  message: string;
  models?: string[];
}

interface FormState {
  presetId: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  modelsText: string;
}

function presetForm(presetId: string): FormState {
  const preset = PROVIDER_PRESETS.find((item) => item.id === presetId) ?? PROVIDER_PRESETS[0];
  return {
    presetId: preset.id,
    name: preset.id === 'custom' ? '' : preset.label,
    kind: preset.kind,
    baseUrl: preset.baseUrl,
    apiKey: '',
    modelsText: preset.models.join(', '),
  };
}

export function ProviderDialog({
  open,
  provider,
  initialPreset,
  onClose,
  onSaved,
}: {
  open: boolean;
  provider: PublicProvider | null;
  initialPreset?: string | null;
  onClose: () => void;
  onSaved: (provider: PublicProvider) => void;
}) {
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(() => presetForm('deepseek'));
  const [clearKey, setClearKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (provider) {
      setForm({
        presetId: 'custom',
        name: provider.name,
        kind: provider.kind === 'mock' ? 'openai' : provider.kind,
        baseUrl: provider.baseUrl,
        apiKey: '',
        modelsText: provider.models.join(', '),
      });
    } else {
      setForm(presetForm(initialPreset || 'deepseek'));
    }
    setClearKey(false);
    setShowKey(false);
    setTesting(false);
    setTestResult(null);
    setSaving(false);
    setError(null);
  }, [open, provider, initialPreset]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(presetId: string) {
    setForm((current) => ({ ...presetForm(presetId), apiKey: current.apiKey }));
    setClearKey(false);
    setTestResult(null);
  }

  const parsedModels = form.modelsText
    .split(/[,，\n]/)
    .map((model) => model.trim())
    .filter(Boolean);

  async function test() {
    if (testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await apiSend<TestResult>('/api/providers/test', 'POST', {
        ...(provider ? { providerId: provider.id } : {}),
        name: form.name.trim() || '模型接入',
        kind: form.kind,
        baseUrl: form.baseUrl.trim(),
        ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
        model: parsedModels[0],
      });
      setTestResult(result);
      if (result.models && result.models.length > 0) {
        update('modelsText', result.models.join(', '));
      }
      push({ title: '连接成功', description: result.message, tone: 'success' });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '连接失败';
      setTestResult({ ok: false, latencyMs: 0, message });
      push({ title: '连接失败', description: message, tone: 'error' });
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    if (saving) return;
    setError(null);
    if (!form.name.trim()) {
      setError('给这个接入起个名字。');
      return;
    }
    if (form.kind !== 'mock' && !form.baseUrl.trim()) {
      setError('请填写 Base URL，例如 https://api.deepseek.com/v1。');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        kind: form.kind,
        baseUrl: form.baseUrl.trim(),
        models: parsedModels,
      };
      if (clearKey) payload.apiKey = null;
      else if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim();

      const saved = provider
        ? await apiSend<PublicProvider>(`/api/providers/${provider.id}`, 'PATCH', payload)
        : await apiSend<PublicProvider>('/api/providers', 'POST', payload);

      push({ title: provider ? '接入已更新' : '接入已添加', description: saved.name, tone: 'success' });
      onSaved(saved);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '保存失败';
      setError(message);
      push({ title: '没能保存接入', description: message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={provider ? 'Edit connection' : 'New connection'}
      title={provider ? '调整模型接入' : '请一个模型进来'}
      description="OpenAI 兼容服务只需 Base URL 与 Key；Claude 使用原生 Messages 协议。"
      footer={
        <>
          <Button
            variant="outline"
            className="mr-auto"
            onClick={() => void test()}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
            )}
            {testing ? '测试中…' : '测试连接'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="vermilion" onClick={() => void save()} disabled={saving}>
            {saving ? '保存中…' : provider ? '保存' : '添加接入'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <FieldLabel>快速选择</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {PROVIDER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  'border px-2.5 py-1.5 text-left text-[11px] transition-colors',
                  form.presetId === preset.id
                    ? 'border-ink bg-surface text-ink'
                    : 'border-line bg-transparent text-ink-soft hover:border-line-strong',
                )}
              >
                <span className="block font-medium leading-none">{preset.label}</span>
                <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-muted">
                  {preset.note}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="名称" htmlFor="provider-name">
            <Input
              id="provider-name"
              value={form.name}
              maxLength={40}
              onChange={(event) => update('name', event.target.value)}
              placeholder="例如：DeepSeek"
            />
          </Field>

          <Field label="协议" htmlFor="provider-kind">
            <Select
              id="provider-kind"
              value={form.kind}
              onChange={(event) => update('kind', event.target.value as ProviderKind)}
            >
              <option value="openai">OpenAI 兼容 /chat/completions</option>
              <option value="anthropic">Anthropic /v1/messages</option>
            </Select>
          </Field>
        </div>

        <Field
          label="Base URL"
          htmlFor="provider-base"
          hint="OpenAI 兼容服务通常需要包含 /v1；Anthropic 填根地址即可。自建网关、Ollama、国内兼容服务都可以填这里。"
        >
          <Input
            id="provider-base"
            value={form.baseUrl}
            onChange={(event) => update('baseUrl', event.target.value)}
            placeholder="https://api.deepseek.com/v1"
            spellCheck={false}
          />
        </Field>

        <Field
          label="API Key"
          htmlFor="provider-key"
          hint={
            provider
              ? '留空则保持原来的 Key。Key 只保存在本机 SQLite，接口返回时只给掩码。'
              : 'Key 只保存在本机 SQLite，不会出现在页面源码里。'
          }
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="provider-key"
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={(event) => {
                  update('apiKey', event.target.value);
                  if (event.target.value) setClearKey(false);
                }}
                placeholder={provider ? `已保存 ${provider.keyHint}，留空不改` : 'sk-…'}
                autoComplete="off"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showKey ? '隐藏 Key' : '显示 Key'}
                onClick={() => setShowKey((current) => !current)}
                className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center text-muted transition-colors hover:text-ink"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.6} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.6} />
                )}
              </button>
            </div>
          </div>

          {provider && provider.hasKey ? (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setClearKey((current) => !current);
                  update('apiKey', '');
                }}
                className={cn(
                  'font-mono text-[9px] uppercase tracking-[0.12em] underline underline-offset-2 transition-colors',
                  clearKey ? 'text-vermilion' : 'text-muted hover:text-vermilion',
                )}
              >
                {clearKey ? '保存后将清除 Key（点击撤销）' : '清除已保存的 Key'}
              </button>
            </div>
          ) : null}
        </Field>

        <Field
          label="常用模型"
          htmlFor="provider-models"
          hint="用逗号分隔，创建角色时会作为候选。也可以点「测试连接」自动拉取。"
        >
          <Input
            id="provider-models"
            value={form.modelsText}
            onChange={(event) => update('modelsText', event.target.value)}
            placeholder="deepseek-chat, deepseek-reasoner"
            spellCheck={false}
          />
          {parsedModels.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parsedModels.map((model) => (
                <span
                  key={model}
                  className="border border-line bg-surface px-1.5 py-0.5 font-mono text-[9px] text-ink-soft"
                >
                  {model}
                </span>
              ))}
            </div>
          ) : null}
        </Field>

        {testResult ? (
          <div
            className={cn(
              'border-l-2 px-3 py-2 text-[11.5px] leading-relaxed',
              testResult.ok
                ? 'border-moss bg-moss/5 text-moss'
                : 'border-vermilion bg-vermilion/5 text-vermilion',
            )}
          >
            {testResult.ok ? '连接成功' : '连接失败'} · {testResult.message}
            {testResult.latencyMs > 0 ? ` · ${testResult.latencyMs}ms` : ''}
          </div>
        ) : null}

        {error ? (
          <p className="border-l-2 border-vermilion bg-vermilion/5 px-3 py-2 text-[12px] leading-relaxed text-vermilion">
            {error}
          </p>
        ) : null}

        <div className="border border-line bg-surface/60 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            安全提示
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            Key 以明文保存在本机的 <code className="font-mono">data/roundtable.db</code>
            ，仅由服务端读取。不要把数据文件提交到 Git；本项目已默认忽略它。
          </p>
        </div>
      </div>
    </Modal>
  );
}
