import type { Metadata } from 'next';

import { RoomsView } from '@/components/rooms/rooms-view';
import { listAgentViews } from '@/lib/repo/agents';
import { listRoomSummaries } from '@/lib/repo/rooms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '讨论',
};

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const rooms = listRoomSummaries();
  const agents = listAgentViews();
  const params = await searchParams;

  return (
    <RoomsView
      rooms={rooms}
      agents={agents}
      initialCreateOpen={params.new === '1'}
    />
  );
}
