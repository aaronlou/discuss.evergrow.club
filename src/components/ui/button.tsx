import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'ink' | 'vermilion' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const VARIANTS: Record<ButtonVariant, string> = {
  ink: 'border-ink bg-ink text-paper hover:border-vermilion hover:bg-vermilion',
  vermilion:
    'border-vermilion bg-vermilion text-paper hover:border-vermilion-dark hover:bg-vermilion-dark',
  outline: 'border-line-strong bg-transparent text-ink hover:border-ink hover:bg-surface',
  ghost: 'border-transparent bg-transparent text-ink-soft hover:bg-paper-deep/70 hover:text-ink',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-[13px]',
  lg: 'h-12 px-6 text-sm',
  icon: 'h-10 w-10 p-0',
  'icon-sm': 'h-8 w-8 p-0',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function buttonStyles({
  variant = 'ink',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 border font-semibold tracking-[0.06em] transition-all duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'ink', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonStyles({ variant, size, className })} {...props} />
  );
});
