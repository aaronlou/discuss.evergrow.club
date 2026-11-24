import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/wght-italic.css';
import '@fontsource-variable/source-sans-3';
import './globals.css';

import { AppSidebar } from '@/components/app-sidebar';
import { ToastProvider } from '@/components/ui/toast';
import { listRoomSummaries } from '@/lib/repo/rooms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: '圆桌 · 多智能体沙龙',
    template: '%s · 圆桌',
  },
  description: '把一个问题放到桌子中央，让几位 AI 角色看见彼此、轮流发言。',
};

export const viewport: Viewport = {
  themeColor: '#f3eee3',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const rooms = listRoomSummaries();

  return (
    <html lang="zh-CN">
      <body>
        <ToastProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:border focus:border-ink focus:bg-surface focus:px-4 focus:py-2 focus:text-sm"
          >
            跳到正文
          </a>
          <div className="flex min-h-dvh">
            <AppSidebar rooms={rooms} />
            <div id="main" className="min-w-0 flex-1 pt-14 lg:pt-0">
              {children}
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
