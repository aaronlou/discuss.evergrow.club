import { LLMError } from './types';

export function trimBase(baseUrl: string, fallback: string): string {
  const value = (baseUrl || fallback).trim().replace(/\/+$/, '');
  return value;
}

export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  if (base.endsWith(`/${path}`)) return base;
  return `${base}/${path.replace(/^\/+/, '')}`;
}

export function timeoutSignal(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export function requireKey(providerName: string, apiKey: string | null): string {
  if (!apiKey) {
    throw new LLMError(`「${providerName}」还没有填写 API Key，请到「接入」页配置`, 400);
  }
  return apiKey;
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'))
  );
}
