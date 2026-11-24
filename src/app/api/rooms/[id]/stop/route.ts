import { fail, ok } from '@/lib/api';
import { stopRound } from '@/lib/active-rounds';
import { getRoom } from '@/lib/repo/rooms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    getRoom(id);
  } catch (error) {
    return fail('讨论不存在', 404);
  }
  return ok({ stopped: stopRound(id) });
}
