'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/cn';

export type ToastTone = 'default' | 'success' | 'error';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  push: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_BORDER: Record<ToastTone, string> = {
  default: 'border-l-ink',
  success: 'border-l-moss',
  error: 'border-l-vermilion',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = `toast-${crypto.randomUUID()}`;
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-32 z-[120] flex w-[min(92vw,400px)] flex-col gap-2 sm:right-6 sm:top-20"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'animate-rise pointer-events-auto flex items-start gap-3 border border-line border-l-2 bg-surface px-4 py-3 shadow-lift',
              TONE_BORDER[toast.tone ?? 'default'],
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => dismiss(toast.id)}
              className="mt-0.5 text-muted transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast 必须在 ToastProvider 内使用');
  return context;
}
