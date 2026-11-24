import { cn } from '@/lib/cn';

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="brand-seal" aria-hidden>
        圆桌
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[22px] leading-none tracking-tight text-ink">圆桌</span>
        <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-[0.3em] text-muted">
          Roundtable
        </span>
      </span>
    </div>
  );
}
