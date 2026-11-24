import type { Metadata } from 'next';

import { ProvidersStudio } from '@/components/settings/providers-studio';
import { listPublicProviders } from '@/lib/repo/providers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '接入',
};

export default function SettingsPage() {
  const providers = listPublicProviders();
  return <ProvidersStudio initialProviders={providers} />;
}
