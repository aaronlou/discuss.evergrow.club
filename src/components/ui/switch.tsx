'use client';

import { cn } from '@/lib/cn';

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-[18px] w-[34px] shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-40',
        checked ? 'border-vermilion bg-vermilion' : 'border-line-strong bg-paper-deep',
      )}
    >
      <span
        className={cn(
          'absolute left-[2px] h-[12px] w-[12px] rounded-full bg-surface shadow-sm transition-transform duration-200',
          checked && 'translate-x-[16px]',
        )}
      />
    </button>
  );
}
