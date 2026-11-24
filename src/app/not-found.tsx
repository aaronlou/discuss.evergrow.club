import Link from 'next/link';

import { buttonStyles } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[78dvh] flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">404 · Empty seat</p>
      <h1 className="display-title mt-4 text-[clamp(2.6rem,8vw,4.4rem)]">这个座位空着。</h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
        你要找的讨论可能已经被收起，或者从未存在。回到圆桌，重新挑起一个话题。
      </p>
      <Link href="/rooms" className={buttonStyles({ variant: 'ink', className: 'mt-8' })}>
        回到圆桌
      </Link>
    </div>
  );
}
