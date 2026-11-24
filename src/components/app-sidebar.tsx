'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Database,
  Menu,
  MessagesSquare,
  Plus,
  Plug,
  Users,
  X,
} from 'lucide-react';

import { AgentSeal } from '@/components/agent-seal';
import { Brand } from '@/components/brand';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import type { RoomSummary } from '@/lib/types';

const NAV = [
  { href: '/rooms', label: '讨论', en: 'Salons', icon: MessagesSquare },
  { href: '/agents', label: '角色', en: 'Cast', icon: Users },
  { href: '/settings', label: '接入', en: 'Models', icon: Plug },
];

function navActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  rooms,
  onNavigate,
}: {
  rooms: RoomSummary[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-6 pb-6 pt-7">
        <Link href="/rooms" onClick={onNavigate} aria-label="圆桌首页">
          <Brand />
        </Link>
      </div>

      <div className="px-4">
        <Link
          href="/rooms?new=1"
          onClick={onNavigate}
          className="group flex h-10 w-full items-center justify-between border border-ink bg-ink px-3 text-[12px] font-semibold tracking-[0.08em] text-paper transition-colors hover:border-vermilion hover:bg-vermilion"
        >
          <span className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            发起讨论
          </span>
          <span className="font-mono text-[9px] tracking-[0.16em] text-paper/50">NEW</span>
        </Link>
      </div>

      <nav className="mt-7 space-y-0.5 px-3" aria-label="主导航">
        {NAV.map((item) => {
          const active = navActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 border-l-2 py-2.5 pl-3 pr-2 transition-colors',
                active
                  ? 'border-vermilion bg-surface text-ink'
                  : 'border-transparent text-ink-soft hover:bg-surface/60 hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.6} />
              <span className="flex-1 text-[13px] font-medium">{item.label}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                {item.en}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between px-6">
          <p className="eyebrow">最近的圆桌</p>
          <Link
            href="/rooms"
            onClick={onNavigate}
            className="text-[10px] text-muted transition-colors hover:text-ink"
          >
            全部
          </Link>
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {rooms.slice(0, 5).map((room) => {
            const active = pathname === `/rooms/${room.id}`;
            return (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                onClick={onNavigate}
                className={cn(
                  'group flex items-start gap-2.5 border-l px-3 py-2.5 transition-colors',
                  active
                    ? 'border-vermilion bg-surface'
                    : 'border-transparent hover:bg-surface/70',
                )}
              >
                <span className="mt-0.5 flex -space-x-1.5">
                  {room.participants.slice(0, 3).map((participant) => (
                    <AgentSeal
                      key={participant.agentId}
                      name={participant.name}
                      emoji={participant.emoji}
                      color={participant.color}
                      size="xs"
                      className="ring-1 ring-paper"
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] leading-snug text-ink-soft transition-colors group-hover:text-ink">
                    {room.title}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted/80">
                    {room.messageCount} 条 · {formatRelative(room.lastMessageAt)}
                  </span>
                </span>
              </Link>
            );
          })}

          {rooms.length === 0 ? (
            <p className="px-3 text-[11.5px] leading-relaxed text-muted">桌上还空着，发起第一场吧。</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 border-t border-line px-6 py-4">
        <p className="flex items-center gap-2 text-[10.5px] text-muted">
          <span className="live-dot" />
          本地运行 · SQLite
        </p>
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted/60">
          <Database className="h-3 w-3" strokeWidth={1.6} />
          discuss.evergrow.club
        </p>
      </div>
    </div>
  );
}

export function AppSidebar({ rooms }: { rooms: RoomSummary[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60] flex h-14 items-center justify-between border-b border-line bg-paper/85 px-4 backdrop-blur-md lg:hidden">
        <Link href="/rooms" className="flex items-center gap-2.5" aria-label="圆桌首页">
          <span className="flex h-7 w-7 items-center justify-center border border-vermilion font-display text-[13px] text-vermilion">
            圆
          </span>
          <span className="font-display text-lg tracking-tight">圆桌</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/rooms?new=1"
            aria-label="发起讨论"
            className="flex h-9 w-9 items-center justify-center text-ink-soft transition-colors hover:text-vermilion"
          >
            <Plus className="h-4.5 w-4.5" strokeWidth={1.8} />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="打开菜单"
            className="flex h-9 w-9 items-center justify-center text-ink-soft transition-colors hover:text-ink"
          >
            <Menu className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>
      </header>

      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 border-r border-line bg-paper/55 lg:flex lg:flex-col">
        <SidebarContent rooms={rooms} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="关闭菜单"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
          />
          <aside className="animate-rise absolute left-0 top-0 h-full w-[282px] border-r border-line bg-paper shadow-lift">
            <button
              type="button"
              aria-label="关闭菜单"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <SidebarContent rooms={rooms} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <Link
        href="/settings"
        aria-label="模型接入"
        className="fixed bottom-5 left-5 z-[50] hidden h-10 w-10 items-center justify-center border border-line bg-surface text-muted shadow-paper transition-colors hover:border-ink hover:text-ink lg:hidden"
      >
        <ArrowUpRight className="h-4 w-4" strokeWidth={1.6} />
      </Link>
    </>
  );
}
