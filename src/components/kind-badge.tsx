import { KIND_LABELS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { ProviderKind } from '@/lib/types';

const TONES: Record<ProviderKind, string> = {
  openai: 'border-indigo/30 text-indigo bg-indigo/5',
  anthropic: 'border-ochre/40 text-ochre bg-ochre/5',
  mock: 'border-line-strong text-muted bg-paper-deep/60',
};

export function KindBadge({ kind, className }: { kind: ProviderKind; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em]',
        TONES[kind],
        className,
      )}
    >
      {KIND_LABELS[kind]}
    </span>
  );
}
