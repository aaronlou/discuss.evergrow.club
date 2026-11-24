import { cn } from '@/lib/cn';
import { hexAlpha } from '@/lib/format';

const SIZES = {
  xs: 24,
  sm: 30,
  md: 38,
  lg: 54,
  xl: 72,
} as const;

export type AgentSealSize = keyof typeof SIZES;

export function AgentSeal({
  name,
  emoji,
  color,
  size = 'md',
  className,
  dimmed = false,
}: {
  name: string;
  emoji: string;
  color: string;
  size?: AgentSealSize;
  className?: string;
  dimmed?: boolean;
}) {
  const pixels = SIZES[size];
  return (
    <span
      title={name}
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border leading-none select-none',
        dimmed && 'opacity-40 grayscale',
        className,
      )}
      style={{
        width: pixels,
        height: pixels,
        backgroundColor: hexAlpha(color, 0.16),
        borderColor: hexAlpha(color, 0.42),
        boxShadow: `inset 0 0 0 1px ${hexAlpha(color, 0.08)}`,
        fontSize: pixels * 0.44,
      }}
    >
      <span style={{ transform: 'translateY(0.02em)' }}>{emoji || name.slice(0, 1)}</span>
    </span>
  );
}
