import { fail, handleApiError, parseJson } from '@/lib/api';
import { endRound, startRound } from '@/lib/active-rounds';
import { countMessages } from '@/lib/repo/messages';
import { getRoom } from '@/lib/repo/rooms';
import { runRound } from '@/lib/round';
import { createSseResponse } from '@/lib/sse-response';
import { roundInputSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    getRoom(id);
  } catch (error) {
    return handleApiError(error);
  }

  let input: ReturnType<typeof roundInputSchema.parse>;
  try {
    input = await parseJson(request, roundInputSchema);
  } catch (error) {
    return handleApiError(error);
  }

  if (countMessages(id) === 0) {
    return fail('先发一句话，再让大家继续讨论', 400);
  }

  const abort = startRound(id);
  if (!abort) {
    return fail('这桌正在发言，等它说完或者先点停止', 409);
  }

  return createSseResponse(request, abort, async (send, signal) => {
    try {
      await runRound({ roomId: id, agentIds: input.agentIds, send, signal });
    } finally {
      endRound(id);
    }
  });
}
