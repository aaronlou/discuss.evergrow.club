'use client';

import { Children, isValidElement, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

import { cn } from '@/lib/cn';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) {
    return textOf((node.props as { children?: ReactNode }).children);
  }
  return '';
}

function CodeCard({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const first = Children.toArray(children)[0];
  const className = isValidElement(first)
    ? ((first.props as { className?: string }).className ?? '')
    : '';
  const language = /language-([\w-]+)/.exec(className)?.[1];
  const source = textOf(children).replace(/\n$/, '');

  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="group/code my-3 overflow-hidden border border-ink/20 bg-[#1d1b17]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-paper/45">
          {language ?? 'code'}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper/45 transition-colors hover:text-paper"
        >
          {copied ? <Check className="h-3 w-3" strokeWidth={2} /> : <Copy className="h-3 w-3" strokeWidth={1.8} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="!m-0 overflow-x-auto !bg-transparent !p-4 text-[12.5px] leading-[1.7]">
        {children}
      </pre>
    </div>
  );
}

const COMPONENTS: Components = {
  pre: ({ children }) => <CodeCard>{children}</CodeCard>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className={cn('overflow-x-auto')}>
      <table>{children}</table>
    </div>
  ),
};

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('salon-prose', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
