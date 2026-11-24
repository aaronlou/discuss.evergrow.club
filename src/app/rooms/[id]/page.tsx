import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RoomView } from '@/components/chat/room-view';
import { listAgentViews } from '@/lib/repo/agents';
import { getRoomBundle, getRoom } from '@/lib/repo/rooms';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const room = getRoom(id);
    return { title: room.title };
  } catch {
    return { title: '讨论' };
  }
}

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let bundle;
  try {
    bundle = getRoomBundle(id);
  } catch {
    notFound();
  }

  const allAgents = listAgentViews();

  return (
    <RoomView
      initialRoom={bundle.room}
      initialParticipants={bundle.participants}
      initialMessages={bundle.messages}
      allAgents={allAgents}
    />
  );
}
