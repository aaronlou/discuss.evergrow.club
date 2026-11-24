'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/cn';

const WIDTHS = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
};

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof WIDTHS;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/50 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'animate-rise relative flex max-h-[92dvh] w-full flex-col border border-line bg-paper shadow-lift',
          WIDTHS[size],
        )}
      >
        <header className="flex items-start justify-between gap-6 border-b border-line px-6 py-5">
          <div className="min-w-0">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 className="mt-1.5 font-display text-[26px] leading-tight tracking-tight">{title}</h2>
            {description ? (
              <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="-mr-2 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-paper-deep/40 px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
