import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';

const CONTROL =
  'w-full border border-line bg-surface px-3 text-[16px] text-ink placeholder:text-muted/60 transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/15 disabled:cursor-not-allowed disabled:opacity-50 sm:text-[14px]';

export function FieldLabel({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted',
        className,
      )}
    >
      {children}
    </label>
  );
}

export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-1.5 text-[11.5px] leading-relaxed text-muted', className)}>{children}</p>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, 'h-11', className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea ref={ref} className={cn(CONTROL, 'min-h-[96px] py-2.5 leading-relaxed', className)} {...props} />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(CONTROL, 'h-11 appearance-none pr-9', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          strokeWidth={1.6}
        />
      </div>
    );
  },
);

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}
