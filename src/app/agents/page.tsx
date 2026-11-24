import type { Metadata } from 'next';

import { AgentsStudio } from '@/components/agents/agents-studio';
import { listAgentViews } from '@/lib/repo/agents';
import { listPublicProviders } from '@/lib/repo/providers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '角色',
};

export default function AgentsPage() {
  const agents = listAgentViews();
  const providers = listPublicProviders();

  return <AgentsStudio initialAgents={agents} providers={providers} />;
}
